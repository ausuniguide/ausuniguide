/* UniPath web — wizard, scoring over CRICOS data, results, ARIA narrative, share + lead capture. */
(function () {
  'use strict';
  var E = window.Engine, esc = E.esc;
  var FIELDS = window.UP_FIELDS, UNIS = window.UP_UNIS; // injected by build
  var LIVING = 29710; // Home Affairs 12-month living-cost figure for Subclass 500 (A$), as at Sep 2026
  var METRO = ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide', 'Canberra', 'Hobart', 'Darwin'];

  var STEPS = [
    { key: 'field', q: 'What do you want to study?', help: 'Pick the closest area — you can refine later.', cls: '',
      opts: Object.keys(FIELDS).map(function (k) { return { v: k, t: FIELDS[k].label, i: FIELDS[k].icon }; }) },
    { key: 'level', q: 'Which level?', help: '', cls: 'one',
      opts: [{ v: 'UG', t: 'Undergraduate', s: 'Bachelor degree (usually 3–4 years)', i: '🎓' }, { v: 'PG', t: 'Postgraduate coursework', s: 'Masters, Graduate Diploma or Certificate', i: '📘' }] },
    { key: 'background', q: 'What’s your current education?', help: 'This helps ARIA flag entry issues early.', cls: 'one',
      opts: [{ v: 'high_school', t: 'Finishing / finished high school', i: '🏫' }, { v: 'diploma', t: 'Diploma or some university', i: '📄' }, { v: 'bachelor', t: 'Bachelor degree', i: '🎓' }, { v: 'masters', t: 'Masters degree', i: '📚' }, { v: 'work', t: 'Working professional', i: '💼' }] },
    { key: 'english', q: 'Your English test score (IELTS or equivalent)?', help: 'PTE / TOEFL scores convert — pick the nearest IELTS band.', cls: 'three',
      opts: [{ v: 'not_yet', t: 'Not taken yet' }, { v: '5.5', t: '5.5' }, { v: '6.0', t: '6.0' }, { v: '6.5', t: '6.5' }, { v: '7.0+', t: '7.0 or higher' }] },
    { key: 'budget', q: 'Tuition budget per year?', help: 'Tuition only, in Australian dollars. Living costs are added separately.', cls: '',
      opts: [{ v: 'lt30', t: 'Under A$30k' }, { v: '30-40', t: 'A$30–40k' }, { v: '40-50', t: 'A$40–50k' }, { v: '50-60', t: 'A$50–60k' }, { v: 'gt60', t: 'Over A$60k' }, { v: 'unsure', t: 'Not sure yet' }] },
    { key: 'city', q: 'Where would you like to live?', help: 'Regional campuses are often cheaper and can carry extra post-study work rights.', cls: '',
      opts: [{ v: 'any', t: 'Anywhere', i: '🇦🇺' }, { v: 'Sydney', t: 'Sydney' }, { v: 'Melbourne', t: 'Melbourne' }, { v: 'Brisbane', t: 'Brisbane' }, { v: 'Perth', t: 'Perth' }, { v: 'Adelaide', t: 'Adelaide' }, { v: 'Canberra', t: 'Canberra' }, { v: 'Gold Coast', t: 'Gold Coast' }, { v: 'Hobart', t: 'Hobart' }, { v: 'regional', t: 'Regional / lower cost' }] },
    { key: 'intake', q: 'When do you want to start?', help: '', cls: '',
      opts: [{ v: 'feb-2027', t: 'Feb 2027' }, { v: 'jul-2027', t: 'Jul 2027' }, { v: '2028', t: '2028' }, { v: 'unsure', t: 'Not sure' }] }
  ];
  var CAP = { lt30: 30000, '30-40': 40000, '40-50': 50000, '50-60': 60000, gt60: Infinity, unsure: Infinity };
  var CORE = { 'it': /computer science|information technology|software|cyber|computing|information systems|\bit\b/, 'data-ai': /data science|artificial intelligence|machine learning|\bai\b|data analytics|data engineering/,
    'business': /business|management|marketing|mba|commerce|entrepreneur/, 'accounting-finance': /accounting|finance|actuar|banking|financial/, 'engineering': /engineering/, 'nursing': /nursing/,
    'health': /health|physiotherapy|occupational|nutrition|social work|exercise|speech|podiatry|radiograph/, 'medicine': /medicine|pharmacy|dent|medical|surgery/, 'education': /teaching|education/,
    'law': /\blaw|juris|legal/, 'psychology': /psycholog/, 'society': /arts|social|international relations|humanities|communication|criminology|politic/,
    'creative': /design|media|arts|film|music|fashion|animation|games/, 'architecture': /architecture|construction|urban|planning|property|built environment/,
    'science': /science|biotech|biomed|chemistry|physics|mathematic|statistics/, 'environment': /environment|agricult|sustainab|climate|conservation|marine/ };
  var LEVEL_PREF = { UG: { 'Bachelor': 1, 'Honours': .55, 'Associate Degree': .5 }, PG: { 'Masters': 1, 'Masters (Extended)': .9, 'Grad Diploma': .7, 'Grad Certificate': .55 } };

  var state = { step: 0, a: { status: 'international' }, courses: null, started: false, ranked: null, report: null };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var wz = $('#wizard'), out = $('#results');

  function renderStep() {
    var s = STEPS[state.step];
    var html = '<div class="wz-top"><div class="wz-progress" aria-hidden="true"><i style="width:' + Math.round(state.step / STEPS.length * 100) + '%"></i></div>' +
      '<span class="wz-step-label">Step ' + (state.step + 1) + ' of ' + STEPS.length + '</span></div>' +
      '<h2 class="wz-q" id="wzq" tabindex="-1">' + esc(s.q) + '</h2>' + (s.help ? '<p class="wz-help">' + esc(s.help) + '</p>' : '') +
      '<div class="opts ' + s.cls + '" role="group" aria-labelledby="wzq">' +
      s.opts.map(function (o) {
        var on = state.a[s.key] === o.v;
        return '<button type="button" class="opt" aria-pressed="' + on + '" data-v="' + esc(o.v) + '">' + (o.i ? '<span class="ico" aria-hidden="true">' + o.i + '</span>' : '') +
          '<span>' + esc(o.t) + (o.s ? '<small>' + esc(o.s) + '</small>' : '') + '</span></button>';
      }).join('') + '</div>' +
      '<div class="wz-nav">' + (state.step > 0 ? '<button type="button" class="linkbtn" id="wzBack">← Back</button>' : '<span class="small muted">No sign-up needed · free</span>') +
      '<span class="small muted">' + (state.step === STEPS.length - 1 ? 'Last question' : '') + '</span></div>';
    wz.innerHTML = html;
    wz.querySelectorAll('.opt').forEach(function (b) { b.addEventListener('click', function () { choose(s.key, b.dataset.v); }); });
    var back = $('#wzBack'); if (back) back.addEventListener('click', function () { state.step--; renderStep(); });
    if (state.started) $('#wzq').focus({ preventScroll: true });
  }
  function choose(k, v) {
    if (!state.started) { state.started = true; E.track('wizard_start', { first: k }); }
    state.a[k] = v;
    E.track('wizard_step', { step: state.step + 1, key: k, value: v });
    if (k === 'field') loadCourses(v); // prefetch while they answer the rest
    if (state.step < STEPS.length - 1) { state.step++; renderStep(); } else finish();
  }
  function loadCourses(field) {
    state.coursesFor = field;
    // Script-tag loader (works over http and when opened from disk; JSON fetch is blocked on file://)
    state.coursesP = new Promise(function (resolve, reject) {
      window.__UP_C = window.__UP_C || {};
      if (window.__UP_C[field]) return resolve(window.__UP_C[field]);
      var s = document.createElement('script'); s.src = 'data/courses/' + field + '.js'; s.async = true;
      s.onload = function () { window.__UP_C[field] ? resolve(window.__UP_C[field]) : reject(new Error('empty')); };
      s.onerror = reject; document.head.appendChild(s);
    });
    return state.coursesP;
  }

  function score(rows, a) {
    var cap = CAP[a.budget], pref = LEVEL_PREF[a.level];
    var list = [];
    rows.forEach(function (r) {
      var c = { code: r[0], uni: UNIS[r[1]], name: r[2], level: r[3], tier: r[4], weeks: r[5], fee: r[6], annual: r[7], cities: r[8], work: r[9] === 1 };
      if (c.tier !== a.level || !(c.level in pref)) return;
      if ((a.background === 'high_school' || a.background === 'diploma') && /graduate entry/i.test(c.name)) return;
      var bf = cap === Infinity ? Math.max(.35, 1 - c.annual / 120000) : (c.annual <= cap ? 1 : Math.max(0, 1 - (c.annual - cap) / cap * 3));
      var cf = a.city === 'any' ? 1 : a.city === 'regional' ? (c.cities.some(function (x) { return METRO.indexOf(x) === -1; }) ? 1 : .15) : (c.cities.indexOf(a.city) > -1 ? 1 : .15);
      var lf = pref[c.level];
      if (a.level === 'PG' && a.background === 'work' && c.level === 'Grad Certificate') lf = .85;
      if (c.name.indexOf('/') > -1) lf *= .8; // double degrees: longer and costlier
      var core = CORE[a.field], nm = c.name.toLowerCase();
      var rel = core && core.test(nm) ? 1 : .55;
      var s = Math.round(100 * (.4 * bf + .25 * cf + .15 * lf + .2 * rel) + (c.work ? 2 : 0));
      c.score = Math.min(97, s); c.overBudget = cap !== Infinity && c.annual > cap; c.cityMatch = cf === 1;
      c.years = Math.max(c.weeks / 52, .5);
      c.total = Math.round(c.fee + LIVING * c.years);
      list.push(c);
    });
    list.sort(function (x, y) { return y.score - x.score || x.annual - y.annual; });
    var top = [], perUni = {}, seen = {};
    for (var i = 0; i < list.length && top.length < 5; i++) {
      var c = list[i], k = c.uni.code, nk = k + '|' + c.name.toLowerCase();
      if ((perUni[k] || 0) >= 2 || seen[nk]) continue;
      perUni[k] = (perUni[k] || 0) + 1; seen[nk] = 1; top.push(c);
    }
    return { top: top, all: list };
  }

  function finish() {
    E.track('wizard_complete', state.a);
    wz.innerHTML = '<div class="wz-top"><div class="wz-progress"><i style="width:100%"></i></div><span class="wz-step-label">Done</span></div><h2 class="wz-q">Matching you against every CRICOS-registered course…</h2><span class="skeleton"></span><span class="skeleton w80"></span><span class="skeleton w60"></span>';
    (state.coursesFor === state.a.field ? state.coursesP : loadCourses(state.a.field)).then(function (rows) {
      state.ranked = score(rows, state.a);
      renderResults();
      requestNarrative();
    }).catch(function () { wz.innerHTML = '<p>Sorry — we couldn’t load course data. Please refresh and try again.</p>'; });
  }

  function fmt(n) { return E.money(n); }
  function pickCard(c, i) {
    var badges = (c.overBudget ? '<span class="badge warn">Above budget</span> ' : '<span class="badge good">Within budget</span> ') + (c.cityMatch ? '' : '<span class="badge">Other city</span> ') + (c.work ? '<span class="badge">Includes placement</span>' : '');
    return '<article class="pick" id="c-' + esc(c.code) + '">' +
      '<div class="pick-top"><div><div class="small muted">#' + (i + 1) + ' · ' + esc(c.level) + '</div><h3>' + esc(c.name) + '</h3>' +
      '<div class="sub"><a href="universities/' + esc(c.uni.slug) + '.html">' + esc(c.uni.name) + '</a> · ' + esc(c.cities.join(', ')) + '</div></div>' +
      '<div class="fit" style="--v:' + c.score + '" aria-label="Fit score ' + c.score + ' out of 100"><b>' + c.score + '</b><span>fit</span></div></div>' +
      '<ul class="facts"><li><b>' + fmt(c.annual) + '</b>/yr tuition</li><li>' + (Math.round(c.years * 10) / 10) + ' yrs</li><li>Total incl. living ≈ <b>' + fmt(c.total) + '</b></li><li class="muted">CRICOS ' + esc(c.code) + '</li></ul>' +
      '<div>' + badges + '</div>' +
      '<div class="aria" data-aria="' + esc(c.code) + '"><div class="who">ARIA</div><span class="skeleton"></span><span class="skeleton w80"></span></div>' +
      '</article>';
  }
  function renderResults(fromReport) {
    var r = state.ranked, a = state.a, f = FIELDS[a.field];
    var warn = (a.level === 'PG' && (a.background === 'high_school' || a.background === 'diploma')) ? '<p class="badge warn" style="display:inline-block;margin-bottom:10px">Heads-up: postgraduate courses usually require a completed bachelor degree.</p>' : '';
    var hiEng = /nursing|education|medicine|health/.test(a.field);
    warn += '<p class="small muted" style="margin:4px 0 0">English: ' + (a.english === 'not_yet' ? 'you haven\u2019t taken a test yet — most courses ask for IELTS 6.0–6.5 overall' : 'you entered IELTS ' + esc(a.english) + '. Most coursework programs ask for 6.0–6.5') + (hiEng ? '; <b>' + esc(f.label) + ' courses often require 7.0 or higher</b>' : '') + '. Requirements are set per course — check each course page.</p>';
    if (!r.top.length) {
      out.innerHTML = '<div class="card"><h2>No exact matches</h2><p>No ' + (a.level === 'UG' ? 'undergraduate' : 'postgraduate') + ' ' + esc(f.label) + ' courses matched. Try “Anywhere” for location or a wider budget.</p><button class="btn btn-primary" id="restart">Start again</button></div>';
      $('#restart').onclick = restart; out.classList.remove('hidden'); wz.closest('.wizard-col').classList.add('hidden'); return;
    }
    out.innerHTML =
      '<div class="results-head"><div><p class="eyebrow">Your shortlist</p><h2 id="resTitle" tabindex="-1">' + r.top.length + ' best-fit ' + esc(f.label) + ' courses</h2>' +
      '<p class="muted small">Ranked from ' + r.all.length.toLocaleString() + ' matching courses on the official CRICOS register (Sep 2026) · budget, location and course type.</p>' + warn + '</div>' +
      '<div class="sharebar no-print"><button class="btn btn-ghost btn-sm" id="restart">Edit answers</button><button class="btn btn-ghost btn-sm" onclick="window.print()" data-track="print_click">Save as PDF</button></div></div>' +
      '<div class="summary" id="ariaSummary" aria-live="polite"><div class="who eyebrow">ARIA’s read</div><span class="skeleton"></span><span class="skeleton w80"></span><span class="skeleton w60"></span></div>' +
      '<div class="rank">' + r.top.map(pickCard).join('') + '</div>' +
      '<div class="card no-print" id="shareCard" style="margin-top:16px"><h3>Share this shortlist</h3><p class="muted small">Send it to family, a friend applying too, or your student group. The link opens this exact report.</p>' +
      '<div class="sharebar"><button class="btn btn-primary btn-sm" data-share="native">Share…</button><button class="btn btn-ghost btn-sm" data-share="whatsapp">WhatsApp</button><button class="btn btn-ghost btn-sm" data-share="facebook">Facebook</button><button class="btn btn-ghost btn-sm" data-share="copy">Copy link</button></div><p class="small muted" id="shareHint">Preparing your share link…</p></div>' +
      '<div class="card" style="margin-top:16px"><h3>Next steps</h3><ol class="steps" id="nextSteps"><li>Check each course page for English and academic entry requirements.</li><li>Confirm fees with the university — CRICOS figures are estimates.</li><li>Look for scholarships with your shortlisted universities.</li></ol><p class="small muted" id="budgetNote" style="margin-top:12px"></p></div>' +
      '<div class="cta-panel no-print" style="margin-top:16px">' +
        '<div class="card"><h3>Ask ARIA about this shortlist</h3><p class="muted small">3 free follow-up questions — e.g. “Which of these is cheapest overall?” or “What does CRICOS mean?”</p><form class="ask" id="askForm"><label class="sr-only" for="askQ">Your question</label><input id="askQ" maxlength="300" placeholder="Ask a question…" required><button class="btn btn-primary btn-sm" type="submit">Ask</button></form><div id="answers"></div></div>' +
        '<div class="card"><h3>Get deadline reminders</h3><p class="muted small">We’ll email this shortlist plus application and scholarship deadline reminders for your intake. No spam; unsubscribe anytime.</p>' +
        '<form class="inline-form" data-lead="reminders" data-done="Done — your shortlist is on its way to your inbox, and we’ll remind you before your intake deadlines."><label class="sr-only" for="em1">Email</label><input type="email" id="em1" name="email" placeholder="you@email.com" required autocomplete="email"><button class="btn btn-primary btn-sm" type="submit">Email me</button><label class="consent"><input type="checkbox" name="consent"> Also send occasional study-in-Australia tips</label><p class="form-msg"></p></form></div>' +
      '</div>' +
      '<div class="card no-print" style="margin-top:16px"><h3>Want more than a shortlist?</h3><p class="muted small">We’re building <b>UniPath Premium</b>: unlimited ARIA chat, side-by-side course comparison, an application tracker and scholarship matching. Founding-member price A$9.99/month.</p>' +
      '<form class="inline-form" data-lead="premium_interest" data-price="AUD9.99" data-done="You’re on the early-access list — we’ll email you first. Nothing is charged."><label class="sr-only" for="em2">Email</label><input type="email" id="em2" name="email" placeholder="you@email.com" required><button class="btn btn-ghost btn-sm" type="submit" data-track="premium_interest">Join early access</button><p class="form-msg"></p></form>' +
      '<p class="small muted" style="margin-top:10px">Prefer the app? <a href="https://play.google.com/store/apps/details?id=com.mustansir.yaqub.ausuniguide&utm_source=web&utm_medium=results" data-track="app_click" rel="noopener">UniPath on Google Play</a></p></div>' +
      '<details class="card no-print" style="margin-top:16px" id="allCourses"><summary><b>See all ' + r.all.length.toLocaleString() + ' matching courses</b></summary><div id="allTable" style="margin-top:12px"></div></details>' +
      '<p class="notice">Course list and fees: CRICOS register, Australian Government (data.gov.au), September 2026 — fees are provider estimates and change; confirm with the university. Living cost uses the A$29,710/yr figure Home Affairs uses for student visas. General information only — not migration or financial advice.</p>';
    out.classList.remove('hidden');
    wz.closest('.wizard-col').classList.add('hidden');
    document.querySelector('.hero-grid').classList.add('hidden');
    $('#restart').onclick = restart;
    out.querySelectorAll('[data-share]').forEach(function (b) { b.addEventListener('click', function () { doShare(b.dataset.share); }); });
    $('#allCourses').addEventListener('toggle', function (e) { if (e.target.open) { E.track('all_courses_open', {}); renderAll(); } }, { once: true });
    $('#askForm').addEventListener('submit', ask);
    E.bindLeadForms(out, function () { return { report_id: state.report, note: state.a.field + '|' + state.a.level + '|' + state.a.intake }; });
    E.track('result_view', { n: r.top.length, matches: r.all.length, field: a.field, level: a.level, from_report: !!fromReport });
    if (!fromReport) { window.scrollTo({ top: out.getBoundingClientRect().top + window.scrollY - 70, behavior: 'smooth' }); $('#resTitle').focus({ preventScroll: true }); }
  }
  function renderAll() {
    var rows = state.ranked.all.slice(0, 300);
    $('#allTable').innerHTML = '<div class="table-wrap" tabindex="0" role="region" aria-label="Scrollable table"><table><thead><tr><th>Course</th><th>University</th><th>City</th><th class="num">Tuition / yr</th><th class="num">Fit</th></tr></thead><tbody>' +
      rows.map(function (c) { return '<tr><td>' + esc(c.name) + ' <span class="muted small">' + esc(c.level) + '</span></td><td><a href="universities/' + esc(c.uni.slug) + '.html">' + esc(c.uni.short) + '</a></td><td>' + esc(c.cities.slice(0, 2).join(', ')) + '</td><td class="num">' + fmt(c.annual) + '</td><td class="num">' + c.score + '</td></tr>'; }).join('') +
      '</tbody></table></div>' + (state.ranked.all.length > 300 ? '<p class="small muted">Showing top 300.</p>' : '');
  }
  function requestNarrative() {
    var picks = state.ranked.top.map(function (c) { return { code: c.code, uni: c.uni.name, name: c.name, level: c.level, weeks: c.weeks, annual: c.annual, fee: c.fee, cities: c.cities, score: c.score }; });
    var t0 = Date.now();
    E.api({ action: 'generate', inputs: state.a, picks: picks }).then(function (r) {
      if (r.id) {
        state.report = r.id; history.replaceState(null, '', location.pathname + '?r=' + r.id + location.hash);
        $('#shareHint').textContent = 'Link ready: ' + E.reportUrl(r.id).split('&utm')[0];
      } else $('#shareHint').textContent = 'Sharing is unavailable right now.';
      if (r.narrative) { paintNarrative(r.narrative); E.track('aria_complete', { ms: Date.now() - t0, cached: !!r.cached, report_id: r.id }); }
      else { paintNarrativeError(r.message); E.track('aria_error', { status: r._status, error: r.error }); }
    }).catch(function () { paintNarrativeError(); E.track('aria_error', { status: 0 }); });
  }
  function paintNarrative(n) {
    $('#ariaSummary').innerHTML = '<div class="who eyebrow">ARIA’s read</div><h2>' + esc(n.headline) + '</h2><p>' + esc(n.summary) + '</p>';
    (n.courses || []).forEach(function (c) {
      var el = out.querySelector('[data-aria="' + (window.CSS && CSS.escape ? CSS.escape(c.code) : c.code) + '"]');
      if (el) el.innerHTML = '<div class="who">ARIA</div><p>' + esc(c.why) + '</p>' + (c.check ? '<p class="check"><b>Check:</b> ' + esc(c.check) + '</p>' : '');
    });
    out.querySelectorAll('.aria .skeleton').forEach(function (s) { s.parentNode.remove(); });
    if (n.next_steps && n.next_steps.length) $('#nextSteps').innerHTML = n.next_steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('');
    if (n.budget) $('#budgetNote').textContent = n.budget;
  }
  function paintNarrativeError(msg) {
    $('#ariaSummary').innerHTML = '<div class="who eyebrow">ARIA</div><p>' + esc(msg || 'ARIA couldn’t write the explanation just now — your ranked shortlist above is still valid.') + '</p>';
    out.querySelectorAll('.aria').forEach(function (s) { s.remove(); });
  }
  function doShare(ch) {
    if (!state.report) { E.toast('Share link is still being prepared…'); return; }
    var f = FIELDS[state.a.field];
    E.share({ channel: ch, id: state.report, url: E.reportUrl(state.report), title: 'My Australian uni shortlist — ' + f.label, text: 'My ' + f.label + ' shortlist for studying in Australia (fees + total cost) from UniPath:' });
  }
  function ask(e) {
    e.preventDefault();
    var q = $('#askQ').value.trim(); if (!q) return;
    if (!state.report) { E.toast('One moment — ARIA is still preparing your report.'); return; }
    var box = document.createElement('div'); box.className = 'answer'; box.innerHTML = '<b>You:</b> ' + esc(q) + '\n<span class="skeleton"></span>'; $('#answers').appendChild(box);
    $('#askQ').value = ''; E.track('followup_ask', { report_id: state.report, len: q.length });
    E.api({ action: 'followup', id: state.report, question: q }).then(function (r) {
      box.innerHTML = '<b>You:</b> ' + esc(q) + '\n\n<b>ARIA:</b> ' + esc(r.answer || r.message || 'Sorry, I couldn’t answer that right now.');
      if (r.remaining === 0) { $('#askForm').innerHTML = '<p class="small muted">You’ve used the free follow-ups. Join Premium early access below for unlimited ARIA.</p>'; }
    });
  }
  function restart() { E.track('wizard_restart', {}); state.step = 0; state.report = null; out.classList.add('hidden'); wz.closest('.wizard-col').classList.remove('hidden'); document.querySelector('.hero-grid').classList.remove('hidden'); history.replaceState(null, '', location.pathname); renderStep(); document.getElementById('app').scrollIntoView({ behavior: 'smooth' }); }

  // Re-open a report (?r=ID) — e.g. after refresh
  var rq = new URLSearchParams(location.search).get('r');
  if (rq) { location.replace('report.html?id=' + encodeURIComponent(rq)); return; }
  renderStep();
  document.querySelectorAll('[data-start]').forEach(function (b) { b.addEventListener('click', function () { document.getElementById('app').scrollIntoView({ behavior: 'smooth' }); setTimeout(function () { var o = wz.querySelector('.opt'); if (o) o.focus(); }, 400); }); });
  window.UP = { score: score, state: state };
})();
