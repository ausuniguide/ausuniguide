# UniPath Australia — web (demo build)

Browser version of UniPath: a 60-second course finder that ranks all ~10,800 CRICOS-registered university courses for an international student's field, level, budget and city, then has ARIA (Claude) explain the shortlist. No install, no sign-up.

**Status:** working demo, 24 Sep 2026. **Not published yet.**

## Try the demo
- Double-click `site/index.html`. It opens in your browser and talks to the live backend.
- Or serve it: `cd site && python3 -m http.server 8080`, then open http://localhost:8080.
- Share links from a local demo point at your own computer. They become public URLs once `SHARE_BASE` is set at publish.

## What's inside
| Path | What it is |
|---|---|
| `site/` | Built static site, ready for GitHub Pages or Cloudflare Pages (index, report, 39 university pages, fee comparison, privacy, sitemap) |
| `src/` | Source: `app.js` (wizard + scoring), `report.js` (shared-report page), `theme.css`, CRICOS-derived data |
| `shared/` | Engine shared with EmergingMarketIQ: `engine.js` (analytics, API, share, lead capture) and `base.css` |
| `build.mjs` | Zero-dependency generator: `node build.mjs` |
| `supabase/` | Backend source: `aria-web` edge function, plus the `web_*` tables migration |
| `analytics/funnel.sql` | Funnel, source, device, return-visit, virality and lead queries |
| `ops/` | CRICOS import script, and the hardened source of the app's `aria` function (deployed 24 Sep 2026) |

## Refresh course data (monthly)
1. Download `cricos-courses.csv`, `cricos-course-locations.csv` and `cricos-institutions.csv` from https://data.gov.au/data/dataset/cricos.
2. Run `python3 ops/prep_cricos.py`. Adjust the paths at the top first.
3. Copy the output into `src/`, then run `node build.mjs`.

## Publish (after sign-off)
```
SITE_URL=https://<your-domain> SHARE_BASE=https://<your-domain> node build.mjs
```
Push `site/` to GitHub Pages or Cloudflare Pages. Before launch, clear the test data with the reset query at the bottom of `analytics/funnel.sql`.

## Backend
- Supabase project `ynfgpcaakydhtrhmqcur`. The edge function is `aria-web` (anonymous and rate-limited: 25 new reports per IP per day, 1,500 per day globally, identical requests cached).
- Tables: `web_reports`, `web_leads`, `web_events` (browsers can insert but not read), `web_rate_limits`, and the view `web_funnel_daily`.
- Model: Claude Haiku 4.5.
