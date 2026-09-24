// UniPath web — static site generator (no dependencies). Usage: node build.mjs  [SITE_URL=https://... node build.mjs]
import fs from 'node:fs'; import path from 'node:path'; import url from 'node:url';
const ROOT = path.dirname(url.fileURLToPath(import.meta.url));
const SRC = path.join(ROOT, 'src'), OUT = path.join(ROOT, 'site'), SHARED = path.join(ROOT, 'shared');
const SITE_URL = (process.env.SITE_URL || 'https://ausuniguide.github.io/ausuniguide').replace(/\/$/, '');
const CONFIG = {
  product: 'unipath',
  supabaseUrl: 'https://ynfgpcaakydhtrhmqcur.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InluZmdwY2Fha3lkaHRyaG1xY3VyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1ODY0NTcsImV4cCI6MjA5MjE2MjQ1N30.aGFGyF_9UP0yFxmG5YLPSShx3ENsHw_3sDOzNdQqElk',
  siteUrl: process.env.SHARE_BASE ?? SITE_URL, // empty = relative links (local demo). Set at publish.
  debug: !!process.env.DEBUG,
};
const DATA_DATE = 'September 2026';
const FIELD_META = {
  'it': ['IT & Computer Science', '💻'], 'data-ai': ['Data Science & AI', '🤖'], 'business': ['Business & Management', '📈'],
  'accounting-finance': ['Accounting & Finance', '🧮'], 'engineering': ['Engineering', '⚙️'], 'nursing': ['Nursing', '🩺'],
  'health': ['Health & Allied Health', '❤️'], 'medicine': ['Medicine, Dentistry & Pharmacy', '💊'], 'education': ['Teaching & Education', '🍎'],
  'law': ['Law & Justice', '⚖️'], 'psychology': ['Psychology', '🧠'], 'society': ['Arts, Humanities & Social Sciences', '🌏'],
  'creative': ['Creative Arts, Media & Design', '🎨'], 'architecture': ['Architecture & Construction', '🏛️'], 'science': ['Science', '🔬'],
  'environment': ['Agriculture & Environment', '🌿'],
};
const FIELDS = Object.fromEntries(Object.entries(FIELD_META).map(([k, [label, icon]]) => [k, { label, icon }]));
const unis = JSON.parse(fs.readFileSync(path.join(SRC, 'universities.json'), 'utf8'));
const allRows = Object.keys(FIELDS).flatMap((f) => JSON.parse(fs.readFileSync(path.join(SRC, 'courses', f + '.json'), 'utf8')).map((r) => ({ f, r })));
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (n) => (n == null ? '—' : 'A$' + Math.round(n).toLocaleString('en-AU'));
const median = (a) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
fs.rmSync(OUT, { recursive: true, force: true });
const w = (p, s) => { const f = path.join(OUT, p); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, s); };

// per-university course lists (dedupe across field shards)
const byUni = new Map();
for (const { f, r } of allRows) {
  const u = unis[r[1]]; if (!byUni.has(u.code)) byUni.set(u.code, new Map());
  const m = byUni.get(u.code); const cur = m.get(r[0]);
  if (cur) cur.fields.add(f); else m.set(r[0], { code: r[0], name: r[2], level: r[3], tier: r[4], weeks: r[5], fee: r[6], annual: r[7], cities: r[8], fields: new Set([f]) });
}
const totalCourses = new Set(allRows.map((x) => x.r[0])).size;

function layout({ title, desc, canonical, body, rel = '', scripts = '', jsonld = null, ogType = 'website', noindex = false }) {
  return `<!doctype html>
<html lang="en-AU">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
${noindex ? '<meta name="robots" content="noindex">' : `<link rel="canonical" href="${SITE_URL}/${canonical}">`}
<meta name="theme-color" content="#0A2540">
<meta property="og:type" content="${ogType}"><meta property="og:site_name" content="UniPath Australia">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${SITE_URL}/${canonical}"><meta property="og:image" content="${SITE_URL}/assets/og.png">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="${rel}assets/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${rel}assets/base.css"><link rel="stylesheet" href="${rel}assets/theme.css">
${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld)}</script>` : ''}
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="site-head"><div class="wrap">
<a class="brand" href="${rel}index.html"><span class="brand-mark" aria-hidden="true">★</span><span>UniPath<span class="muted" style="font-weight:500"> Australia</span></span></a>
<nav class="nav" aria-label="Main"><a class="hide-sm" href="${rel}universities/index.html">University fees</a><a class="hide-sm" href="${rel}index.html#how">How it works</a><a class="btn btn-primary btn-sm" href="${rel}index.html#app" data-track="nav_cta">Start free</a></nav>
</div></header>
<main id="main">${body}</main>
<footer class="site-foot"><div class="wrap cols">
<div><b>UniPath Australia</b><p>Independent study-planning tool for international students. Not affiliated with any university or government agency. We don’t take commissions from universities.</p><p class="small">Data: CRICOS register, Australian Government (data.gov.au), ${DATA_DATE}. General information only — not migration, legal or financial advice.</p></div>
<div><b>Explore</b><ul><li><a href="${rel}index.html#app">Course finder</a></li><li><a href="${rel}universities/index.html">University fees compared</a></li><li><a href="https://play.google.com/store/apps/details?id=com.mustansir.yaqub.ausuniguide&utm_source=web&utm_medium=footer" rel="noopener" data-track="app_click">Android app</a></li></ul></div>
<div><b>About</b><ul><li><a href="${rel}web-privacy.html">Website privacy</a></li><li><a href="${rel}privacy.html">App privacy policy</a></li><li><a href="mailto:supportmarketiq@gmail.com">Contact</a></li><li>© 2026 MustiIQ · Melbourne</li></ul></div>
</div></footer>
<script>window.ENGINE_CONFIG=${JSON.stringify(CONFIG)};</script>
<script src="${rel}assets/engine.js"></script>
${scripts}
</body></html>`;
}
const dataScript = (rel) => `<script>window.UP_FIELDS=${JSON.stringify(FIELDS)};window.UP_UNIS=${JSON.stringify(unis.map((u) => ({ code: u.code, name: u.name, short: u.short, slug: u.slug })))};</script>`;

// ---------- index ----------
const pgMed = unis.filter((u) => u.median_pg).sort((a, b) => a.median_pg - b.median_pg);
const index = layout({
  title: 'UniPath Australia — Find the right Australian university (and what it really costs)',
  desc: `Free course finder for international students. Answer 7 questions and get a ranked shortlist from ${totalCourses.toLocaleString()} CRICOS-registered courses at ${unis.length} universities, with total cost including living expenses.`,
  canonical: '',
  jsonld: [{ '@context': 'https://schema.org', '@type': 'WebApplication', name: 'UniPath Australia course finder', applicationCategory: 'EducationalApplication', operatingSystem: 'Web, Android', offers: { '@type': 'Offer', price: '0', priceCurrency: 'AUD' }, url: SITE_URL + '/' },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [
      ['Where does UniPath get its course and fee data?', 'From the Commonwealth Register of Institutions and Courses for Overseas Students (CRICOS), published by the Australian Government on data.gov.au. It lists every course a provider is registered to offer international students, with estimated tuition. We refresh it monthly.'],
      ['How much money do I need for living costs on a student visa?', 'For the Subclass 500 student visa, Home Affairs uses A$29,710 for 12 months of living costs (as at September 2026). Actual costs depend on your city and lifestyle — always check the current figure on immi.homeaffairs.gov.au.'],
      ['How many hours can international students work in Australia?', 'Student visa holders can generally work up to 48 hours per fortnight during study periods and unlimited hours during scheduled course breaks. Check current conditions on the Home Affairs website.'],
      ['Is UniPath free?', 'Yes. The course finder, shortlist and university fee pages are free with no sign-up. A Premium plan with unlimited ARIA chat is in development.'],
    ].map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) }],
  body: `
<section class="hero"><div class="wrap hero-grid">
  <div>
    <p class="eyebrow">For international students · Free · No sign-up</p>
    <h1>Find the right Australian university — <em>and what it will really cost.</em></h1>
    <p class="lede">Answer 7 quick questions. Get a ranked shortlist from all ${totalCourses.toLocaleString()} CRICOS-registered courses at ${unis.length} universities, with total cost including living expenses — explained by ARIA, our AI advisor.</p>
    <div class="hero-cta"><a class="btn btn-primary" href="#app" data-start data-track="hero_cta">Get my shortlist — 60 seconds</a><a class="btn btn-ghost" href="universities/index.html" data-track="hero_fees">Compare university fees</a></div>
    <ul class="trust"><li>Official government course data</li><li>Updated monthly</li><li>No agent commissions</li></ul>
  </div>
  <div class="wizard-col" id="app"><div class="wizard" id="wizard" aria-live="polite"><noscript>The course finder needs JavaScript. You can still <a href="universities/index.html">browse university fees</a>.</noscript></div><ul class="trust-under"><li>Official government course data</li><li>No agent commissions</li><li><a href="universities/index.html">Compare all university fees</a></li></ul></div>
</div>
<div class="wrap"><div id="results" class="hidden" aria-live="polite"></div></div>
</section>

<section class="section section-alt" id="how"><div class="wrap">
  <p class="eyebrow">How it works</p><h2>From “where do I even start?” to a shortlist you can act on</h2>
  <div class="grid-3" style="margin-top:22px">
    <div class="card"><h3>1 · Tell us about you</h3><p class="muted">Study area, level, background, English score, budget, city and intake. Seven taps.</p></div>
    <div class="card"><h3>2 · We rank every option</h3><p class="muted">A transparent model scores every registered course on budget fit, location and course type — then ARIA explains the trade-offs in plain English.</p></div>
    <div class="card"><h3>3 · Share, save, act</h3><p class="muted">Send the shortlist to family on WhatsApp, save it as a PDF, ask ARIA follow-up questions and get deadline reminders.</p></div>
  </div>
</div></section>

<section class="section"><div class="wrap">
  <p class="eyebrow">Free guide</p><h2>Lowest median postgraduate tuition by university</h2>
  <p class="muted">Median annual tuition across each university’s CRICOS-registered postgraduate coursework programs. <a href="universities/index.html">See all ${unis.length} universities →</a></p>
  <div class="table-wrap" tabindex="0" role="region" aria-label="Scrollable table" style="margin-top:14px"><table><thead><tr><th>University</th><th>Main city</th><th class="num">Median PG tuition / yr</th></tr></thead><tbody>
  ${pgMed.slice(0, 8).map((u) => `<tr><td><a href="universities/${u.slug}.html">${esc(u.name)}</a></td><td>${esc(u.cities[0] || '')}</td><td class="num">${money(u.median_pg)}</td></tr>`).join('')}
  </tbody></table></div>
  <p class="small muted" style="margin-top:8px">Source: CRICOS register, ${DATA_DATE}. Medians hide big differences between courses — use the course finder for your field.</p>
</div></section>

<section class="section band"><div class="wrap" style="display:grid;gap:22px">
  <div><p class="eyebrow" style="color:#E5A442">Why trust these numbers</p><h2>Built on the register universities must report to</h2>
  <p class="muted" style="max-width:62ch">Every course here comes from CRICOS — the Australian Government register of courses that institutions are approved to offer to student-visa holders. We don’t accept commissions, so the ranking is about fit, not who pays us. Fees are provider estimates; always confirm with the university before you apply.</p></div>
  <a class="btn btn-primary" style="justify-self:start" href="#app" data-start data-track="band_cta">Build my shortlist</a>
</div></section>

<section class="section"><div class="wrap" style="max-width:820px">
  <h2>Quick answers</h2>
  <details class="card" style="margin-bottom:10px"><summary><b>How much money do I need for living costs?</b></summary><p style="margin-top:10px">For the Subclass 500 student visa, Home Affairs uses <b>A$29,710</b> for 12 months of living costs (as at ${DATA_DATE}). Rent in Sydney and Melbourne usually pushes real costs higher; regional cities are cheaper. Always check <a href="https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500" rel="noopener">the current figure</a>.</p></details>
  <details class="card" style="margin-bottom:10px"><summary><b>Can I work while I study?</b></summary><p style="margin-top:10px">Generally up to 48 hours per fortnight during study periods, and unlimited hours in scheduled course breaks. Conditions change — confirm on the Home Affairs website.</p></details>
  <details class="card" style="margin-bottom:10px"><summary><b>What IELTS score do I need?</b></summary><p style="margin-top:10px">Most coursework programs ask for IELTS 6.0–6.5 overall; nursing, teaching and some health courses often need 7.0+. Requirements are set per course — check the course page before applying.</p></details>
  <details class="card"><summary><b>Does UniPath give visa advice?</b></summary><p style="margin-top:10px">No. We provide general information only. For advice about your personal visa situation, speak to a registered migration agent (MARA) or visit immi.homeaffairs.gov.au.</p></details>
</div></section>`,
  scripts: dataScript('') + '<script src="assets/app.js"></script>',
});
w('index.html', index);

// ---------- report ----------
w('report.html', layout({ title: 'Shared shortlist — UniPath Australia', desc: 'An Australian university shortlist with fees and total cost of study, generated by UniPath Australia.', canonical: 'report.html', noindex: true,
  body: `<section class="section" style="padding-top:28px"><div class="wrap" style="max-width:900px"><div id="report" aria-live="polite"><span class="skeleton"></span><span class="skeleton w80"></span><span class="skeleton w60"></span></div></div></section>`,
  scripts: dataScript('') + '<script src="assets/report.js"></script>' }));

// ---------- universities index ----------
const uniRows = [...unis].sort((a, b) => a.name.localeCompare(b.name));
w('universities/index.html', layout({ rel: '../', canonical: 'universities/', title: `Australian university fees for international students (2026–27): all ${unis.length} compared`,
  desc: `Median annual tuition for undergraduate and postgraduate courses at ${unis.length} Australian universities, from the official CRICOS register (${DATA_DATE}). Sort, compare and find courses in your budget.`,
  jsonld: { '@context': 'https://schema.org', '@type': 'Dataset', name: 'Australian university tuition for international students (CRICOS-derived)', description: 'Median annual tuition by university and level, derived from the CRICOS register.', creator: { '@type': 'Organization', name: 'UniPath Australia' }, isBasedOn: 'https://data.gov.au/data/dataset/cricos', dateModified: '2026-09-01', license: 'https://creativecommons.org/licenses/by/4.0/' },
  body: `<section class="section" style="padding-top:20px"><div class="wrap">
  <nav class="breadcrumb"><a href="../index.html">Home</a> › University fees</nav>
  <h1 style="font-size:clamp(1.8rem,4.5vw,2.8rem)">Australian university fees for international students, compared</h1>
  <p class="muted" style="max-width:70ch">Median annual tuition across each university’s CRICOS-registered courses. Tap a column to sort. Medians are a starting point — fees vary a lot by course, so use the <a href="../index.html#app">course finder</a> for your field.</p>
  <div class="table-wrap" tabindex="0" role="region" aria-label="Scrollable table" style="margin-top:14px"><table id="uniTable"><thead><tr><th><button data-k="0">University</button></th><th><button data-k="1">Main city</button></th><th class="num"><button data-k="2">Median UG / yr</button></th><th class="num"><button data-k="3">Median PG / yr</button></th><th class="num"><button data-k="4">Courses</button></th></tr></thead><tbody>
  ${uniRows.map((u) => `<tr><td><a href="${u.slug}.html">${esc(u.name)}</a></td><td>${esc(u.cities[0] || u.state)}</td><td class="num" data-v="${u.median_ug || 0}">${money(u.median_ug)}</td><td class="num" data-v="${u.median_pg || 0}">${money(u.median_pg)}</td><td class="num" data-v="${u.n_courses}">${u.n_courses}</td></tr>`).join('')}
  </tbody></table></div>
  <p class="notice">Source: CRICOS register (Australian Government, data.gov.au), ${DATA_DATE}. Annual tuition = registered tuition ÷ course length. UG = bachelor-level, PG = masters/graduate coursework. Fees are provider estimates; confirm with the university.</p>
  <div class="card" style="margin-top:18px;display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between"><div><b>Which of these fits your budget and field?</b><div class="small muted">Get a ranked shortlist in 60 seconds.</div></div><a class="btn btn-primary" href="../index.html#app" data-track="fees_cta">Get my shortlist</a></div>
</div></section>`,
  scripts: `<script>(function(){var t=document.getElementById('uniTable'),dir={};t.querySelectorAll('th button').forEach(function(b){b.addEventListener('click',function(){var k=+b.dataset.k,rows=[].slice.call(t.tBodies[0].rows);dir[k]=!dir[k];rows.sort(function(x,y){var a=x.cells[k],c=y.cells[k];var va=a.dataset.v!=null?+a.dataset.v:a.textContent,vc=c.dataset.v!=null?+c.dataset.v:c.textContent;return (va>vc?1:va<vc?-1:0)*(dir[k]?1:-1);});rows.forEach(function(r){t.tBodies[0].appendChild(r);});Engine.track('table_sort',{k:k});});});})();</script>` }));

// ---------- university pages ----------
for (const u of unis) {
  const cs = [...(byUni.get(u.code)?.values() ?? [])].sort((a, b) => a.tier.localeCompare(b.tier) || a.name.localeCompare(b.name));
  const fieldStats = Object.keys(FIELDS).map((f) => { const xs = cs.filter((c) => c.fields.has(f) && c.weeks >= 52); return { f, n: xs.length, ug: median(xs.filter((c) => c.tier === 'UG').map((c) => c.annual)), pg: median(xs.filter((c) => c.tier === 'PG').map((c) => c.annual)) }; }).filter((x) => x.n > 0).sort((a, b) => b.n - a.n);
  const cheapestPG = cs.filter((c) => c.tier === 'PG' && c.level === 'Masters' && c.weeks >= 52).sort((a, b) => a.annual - b.annual)[0];
  const faq = [
    [`How much does ${u.name} cost for international students?`, `Based on the CRICOS register (${DATA_DATE}), median annual tuition at ${u.name} is ${money(u.median_ug)} for undergraduate courses and ${money(u.median_pg)} for postgraduate coursework. Fees vary by course — see the full list on this page.`],
    [`How many courses can international students take at ${u.name}?`, `${u.name} has ${u.n_courses} undergraduate and postgraduate coursework programs registered on CRICOS (${u.n_ug} undergraduate, ${u.n_pg} postgraduate).`],
    ...(cheapestPG ? [[`What is the lowest-cost master’s at ${u.name}?`, `On the CRICOS register, ${cheapestPG.name} has the lowest estimated annual tuition among ${u.short}’s master’s programs of a year or longer, at about ${money(cheapestPG.annual)} per year.`]] : []),
  ];
  w(`universities/${u.slug}.html`, layout({ rel: '../', canonical: `universities/${u.slug}.html`,
    title: `${u.name} fees for international students 2026–27 — all ${u.n_courses} courses`,
    desc: `${u.name} international tuition: median ${money(u.median_ug)}/yr undergraduate, ${money(u.median_pg)}/yr postgraduate. Full list of ${u.n_courses} CRICOS-registered courses with fees and campuses.`,
    jsonld: [{ '@context': 'https://schema.org', '@type': 'CollegeOrUniversity', name: u.name, url: u.website || undefined, address: { '@type': 'PostalAddress', addressRegion: u.state, addressCountry: 'AU' } },
      { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
      { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL + '/' }, { '@type': 'ListItem', position: 2, name: 'University fees', item: SITE_URL + '/universities/' }, { '@type': 'ListItem', position: 3, name: u.name }] }],
    body: `<section class="section" style="padding-top:20px"><div class="wrap">
  <nav class="breadcrumb"><a href="../index.html">Home</a> › <a href="index.html">University fees</a> › ${esc(u.short)}</nav>
  <h1 style="font-size:clamp(1.8rem,4.5vw,2.8rem)">${esc(u.name)}: fees and courses for international students</h1>
  <p class="muted">${esc(u.cities.join(' · '))} · CRICOS provider ${esc(u.code)}${u.website ? ` · <a href="${esc(u.website)}" rel="noopener nofollow">Official website</a>` : ''}</p>
  <div class="kpis" style="margin:18px 0">
    <div class="kpi"><b>${money(u.median_ug)}</b><span>median undergraduate tuition / yr</span></div>
    <div class="kpi"><b>${money(u.median_pg)}</b><span>median postgraduate tuition / yr</span></div>
    <div class="kpi"><b>${u.n_courses}</b><span>registered courses (${u.n_ug} UG · ${u.n_pg} PG)</span></div>
    <div class="kpi"><b>A$29,710</b><span>Home Affairs living-cost figure / yr</span></div>
  </div>
  <div class="card" style="margin-bottom:18px;display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between"><div><b>Is ${esc(u.short)} the right fit for you?</b><div class="small muted">Compare it against every other university for your field and budget.</div></div><a class="btn btn-primary" href="../index.html#app" data-track="uni_cta" data-label="${esc(u.short)}">Get my shortlist</a></div>
  <h2 style="font-size:1.4rem">Tuition by study area</h2>
  <div class="table-wrap" tabindex="0" role="region" aria-label="Scrollable table"><table><thead><tr><th>Study area</th><th class="num">Courses</th><th class="num">Median UG / yr</th><th class="num">Median PG / yr</th></tr></thead><tbody>
  ${fieldStats.map((x) => `<tr><td>${FIELDS[x.f].icon} ${esc(FIELDS[x.f].label)}</td><td class="num">${x.n}</td><td class="num">${money(x.ug)}</td><td class="num">${money(x.pg)}</td></tr>`).join('')}
  </tbody></table></div>
  <h2 style="font-size:1.4rem;margin-top:28px">All courses</h2>
  <label class="sr-only" for="flt">Filter courses</label><input id="flt" placeholder="Filter courses, e.g. “data” or “nursing”" style="width:100%;min-height:46px;padding:10px 14px;border-radius:12px;border:1.5px solid var(--line-strong);font:inherit;margin-bottom:10px">
  <div class="table-wrap" tabindex="0" role="region" aria-label="Scrollable table"><table id="courses"><thead><tr><th>Course</th><th>Level</th><th>Campus</th><th class="num">Years</th><th class="num">Tuition / yr</th><th class="num">Total tuition</th></tr></thead><tbody>
  ${cs.map((c) => `<tr><td>${esc(c.name)} <span class="small muted">CRICOS ${c.code}</span></td><td>${esc(c.level)}</td><td>${esc(c.cities.slice(0, 2).join(', '))}</td><td class="num">${Math.round((c.weeks / 52) * 10) / 10}</td><td class="num">${money(c.annual)}</td><td class="num">${money(c.fee)}</td></tr>`).join('')}
  </tbody></table></div>
  <h2 style="font-size:1.4rem;margin-top:28px">Common questions</h2>
  ${faq.map(([q, a]) => `<details class="card" style="margin-bottom:10px"><summary><b>${esc(q)}</b></summary><p style="margin-top:10px">${esc(a)}</p></details>`).join('')}
  <p class="notice">Source: CRICOS register (Australian Government, data.gov.au), ${DATA_DATE}. Tuition is the provider’s registered estimate for the full course; annual figure = total ÷ course length. Entry requirements and scholarships are set by the university — confirm on the official website. UniPath is independent and not affiliated with ${esc(u.name)}.</p>
</div></section>`,
    scripts: `<script>(function(){var i=document.getElementById('flt'),rows=[].slice.call(document.querySelectorAll('#courses tbody tr')),t;i.addEventListener('input',function(){var q=i.value.toLowerCase();rows.forEach(function(r){r.style.display=r.textContent.toLowerCase().indexOf(q)>-1?'':'none';});clearTimeout(t);t=setTimeout(function(){if(q)Engine.track('uni_filter',{q:q.slice(0,40)});},900);});})();</script>` }));
}

// ---------- privacy, 404, sitemap, robots ----------
w('web-privacy.html', layout({ canonical: 'web-privacy.html', title: 'Privacy — UniPath Australia web', desc: 'How the UniPath Australia website handles your data.', body: `<section class="section"><div class="wrap" style="max-width:760px"><h1 style="font-size:2rem">Privacy on the UniPath website</h1>
<p>This page covers the website. The Android app’s policy is <a href="https://ausuniguide.github.io/ausuniguide/privacy.html">here</a>. Operator: MustiIQ, Melbourne, Australia · supportmarketiq@gmail.com.</p>
<h2 style="font-size:1.3rem">What we collect</h2><ul>
<li><b>Your course-finder answers and shortlist</b> — stored so your report link works and so we can improve recommendations. They don’t identify you.</li>
<li><b>Usage analytics</b> — page views, button clicks, device type, language, time zone, referring site and campaign tags, linked to a random ID kept in your browser. No cookies, no advertising trackers, no IP addresses stored (we keep a one-way hash only for abuse limits).</li>
<li><b>Your email</b> — only if you give it to us, for the purpose you chose (reminders, early access). Marketing emails only if you tick the box.</li></ul>
<h2 style="font-size:1.3rem">AI processing</h2><p>Your answers and shortlist (never your email) are sent to Anthropic’s Claude API to write ARIA’s explanation.</p>
<h2 style="font-size:1.3rem">Your choices</h2><p>Email us to access or delete your data. Clearing your browser storage resets your random ID.</p></div></section>` }));

w('unsubscribe.html', layout({ canonical: 'unsubscribe.html', noindex: true, title: 'Unsubscribe', desc: 'Unsubscribe from emails', body: `<section class="section"><div class="wrap" style="max-width:640px"><h1 style="font-size:2rem">Unsubscribe</h1><p id="u-msg" class="muted">One moment…</p></div></section>`,
  scripts: `<script>(function(){var t=new URLSearchParams(location.search).get('t')||'',m=document.getElementById('u-msg');if(!/^[0-9a-f]{32}$/.test(t)){m.textContent='This unsubscribe link is not valid. Reply to any of our emails and we will remove you.';return;}Engine.fn('web-leads',{action:'unsub',token:t}).then(function(r){m.textContent=r&&r.ok?'You have been unsubscribed. You will not receive further emails from us.':'Sorry, something went wrong. Reply to any of our emails and we will remove you.';Engine.track('unsubscribe',{ok:!!(r&&r.ok)});}).catch(function(){m.textContent='Connection problem — please try again.';});})();</script>` }));
w('404.html', layout({ canonical: '404.html', noindex: true, title: 'Page not found — UniPath Australia', desc: 'Page not found', body: '<section class="section"><div class="wrap"><h1>Page not found</h1><p><a class="btn btn-primary" href="index.html#app">Find courses</a></p></div></section>' }));
const pages = ['', 'universities/', ...unis.map((u) => `universities/${u.slug}.html`), 'web-privacy.html'];
w('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map((p) => `<url><loc>${SITE_URL}/${p}</loc><lastmod>2026-09-24</lastmod></url>`).join('\n')}\n</urlset>\n`);
w('robots.txt', `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`);

// ---------- assets + data ----------
fs.mkdirSync(path.join(OUT, 'assets'), { recursive: true });
for (const f of ['engine.js', 'base.css']) fs.copyFileSync(path.join(SHARED, f), path.join(OUT, 'assets', f));
for (const f of ['app.js', 'report.js', 'theme.css', 'favicon.svg', 'og.png']) if (fs.existsSync(path.join(SRC, f))) fs.copyFileSync(path.join(SRC, f), path.join(OUT, 'assets', f));
fs.mkdirSync(path.join(OUT, 'data', 'courses'), { recursive: true });
for (const f of Object.keys(FIELDS)) {
  const raw = fs.readFileSync(path.join(SRC, 'courses', f + '.json'), 'utf8');
  fs.writeFileSync(path.join(OUT, 'data', 'courses', f + '.json'), raw); // for API/partners
  fs.writeFileSync(path.join(OUT, 'data', 'courses', f + '.js'), `window.__UP_C=window.__UP_C||{};window.__UP_C[${JSON.stringify(f)}]=${raw};`);
}
fs.writeFileSync(path.join(OUT, '.nojekyll'), '');
console.log(`built ${pages.length + 2} pages → ${OUT} (courses: ${totalCourses}, unis: ${unis.length})`);
