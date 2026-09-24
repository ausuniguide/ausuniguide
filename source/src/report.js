/* UniPath shared report page: report.html?id=XXXX — the landing page for every shared link. */
(function () {
  'use strict';
  var E = window.Engine, esc = E.esc, FIELDS = window.UP_FIELDS, UNIS = window.UP_UNIS;
  var byName = {}; UNIS.forEach(function (u) { byName[u.name] = u; });
  var el = document.getElementById('report');
  var id = new URLSearchParams(location.search).get('id') || '';
  if (!/^[A-Za-z0-9]{8}$/.test(id)) { el.innerHTML = notFound(); return; }
  E.api({ id: id }, 'GET').then(function (r) {
    if (!r || r.error || r.product !== 'unipath') { el.innerHTML = notFound(); E.track('report_not_found', { id: id }); return; }
    var mine = false; try { mine = (localStorage.getItem('eng_unipath_reports') || '').indexOf(id) > -1; } catch (e) {}
    var a = r.inputs, n = r.narrative || {}, f = FIELDS[a.field] || { label: a.field };
    var why = {}; (n.courses || []).forEach(function (c) { why[c.code] = c; });
    document.title = (n.headline || 'Australian university shortlist') + ' — UniPath Australia';
    el.innerHTML =
      '<p class="eyebrow">Shared shortlist · ' + esc(f.label) + ' · ' + (a.level === 'UG' ? 'Undergraduate' : 'Postgraduate') + (a.city && a.city !== 'any' ? ' · ' + esc(a.city) : '') + '</p>' +
      '<h1 style="font-size:clamp(1.7rem,4.5vw,2.6rem)">' + esc(n.headline || 'Australian university shortlist') + '</h1>' +
      '<p class="muted">' + esc(n.summary || '') + '</p>' +
      '<div class="card no-print" style="margin:18px 0;display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between"><div><b>Want a shortlist for your own situation?</b><div class="small muted">7 quick questions · free · no sign-up</div></div><a class="btn btn-primary" href="index.html?utm_source=report&utm_medium=cta#app" data-track="report_cta_own">Get my shortlist</a></div>' +
      '<div class="rank">' + r.picks.map(function (c, i) {
        var u = byName[c.uni]; var w = why[c.code] || {};
        var total = Math.round(c.fee + 29710 * Math.max(c.weeks / 52, .5));
        return '<article class="pick"><div class="pick-top"><div><div class="small muted">#' + (i + 1) + ' · ' + esc(c.level) + '</div><h3>' + esc(c.name) + '</h3><div class="sub">' +
          (u ? '<a href="universities/' + esc(u.slug) + '.html">' + esc(c.uni) + '</a>' : esc(c.uni)) + ' · ' + esc((c.cities || []).join(', ')) + '</div></div>' +
          '<div class="fit" style="--v:' + c.score + '"><b>' + c.score + '</b><span>fit</span></div></div>' +
          '<ul class="facts"><li><b>' + E.money(c.annual) + '</b>/yr tuition</li><li>' + (Math.round(c.weeks / 52 * 10) / 10) + ' yrs</li><li>Total incl. living ≈ <b>' + E.money(total) + '</b></li><li class="muted">CRICOS ' + esc(c.code) + '</li></ul>' +
          (w.why ? '<div class="aria"><div class="who">ARIA</div><p>' + esc(w.why) + '</p>' + (w.check ? '<p class="check"><b>Check:</b> ' + esc(w.check) + '</p>' : '') + '</div>' : '') + '</article>';
      }).join('') + '</div>' +
      (n.next_steps ? '<div class="card" style="margin-top:16px"><h3>Next steps</h3><ol class="steps">' + n.next_steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol>' + (n.budget ? '<p class="small muted" style="margin-top:12px">' + esc(n.budget) + '</p>' : '') + '</div>' : '') +
      '<div class="card no-print" style="margin-top:16px"><h3>Share</h3><div class="sharebar"><button class="btn btn-ghost btn-sm" data-share="native">Share…</button><button class="btn btn-ghost btn-sm" data-share="whatsapp">WhatsApp</button><button class="btn btn-ghost btn-sm" data-share="copy">Copy link</button><button class="btn btn-ghost btn-sm" onclick="window.print()" data-track="print_click">Save as PDF</button></div></div>' +
      '<div class="card no-print" style="margin-top:16px"><h3>Get deadline reminders for these courses</h3><form class="inline-form" data-lead="reminders" data-done="Done — the shortlist is on its way to your inbox, with reminders before the deadlines."><label class="sr-only" for="em">Email</label><input type="email" id="em" name="email" placeholder="you@email.com" required><button class="btn btn-primary btn-sm" type="submit">Email me</button><label class="consent"><input type="checkbox" name="consent"> Also send occasional study-in-Australia tips</label><p class="form-msg"></p></form></div>' +
      '<p class="notice">Generated ' + new Date(r.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) + '. Course list and fees: CRICOS register (data.gov.au), Sep 2026 — estimates; confirm with the university. General information only — not migration or financial advice.</p>';
    el.querySelectorAll('[data-share]').forEach(function (b) { b.addEventListener('click', function () { E.share({ channel: b.dataset.share, id: id, url: E.reportUrl(id), title: n.headline || 'University shortlist', text: 'Australian university shortlist from UniPath:' }); }); });
    E.bindLeadForms(el, { report_id: id, note: 'shared-report' });
    E.track('report_view', { report_id: id, from_share: /utm_source=share/.test(location.search), views: r.views });
  }).catch(function () { el.innerHTML = notFound(); });
  function notFound() { return '<h1>Report not found</h1><p class="muted">This link may be mistyped or expired.</p><a class="btn btn-primary" href="index.html#app">Build your own shortlist</a>'; }
})();
