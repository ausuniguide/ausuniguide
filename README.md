# UniPath Australia — web app (GitHub Pages)

**Live:** https://ausuniguide.github.io/ausuniguide/

This repo hosts the browser version of the product (a free 60-second wizard, ARIA analysis, shareable reports and SEO pages) **and** the Google Play policy pages.
**Do not move or rename** `privacy.html`, `terms.html` and `support.html`. The Play Store listing links to them.

- The site files at the root are generated. Source is in `source/`. To rebuild: `cd source && node build.mjs`, then copy `source/site/*` to the repo root. Never overwrite the policy pages.
- Backend: Supabase edge functions `aria-web`, `web-leads` and `web-mailer`. Source is in `source/supabase/`.
- Analytics queries: `source/analytics/funnel.sql`.

---

## Previous README
# UniPath Australia — Marketing Site

Official marketing and legal site for **UniPath Australia**, an Android app helping
international students navigate Australian university applications, visas and scholarships.

- **App:** UniPath Australia
- **Developer:** MustiIQ
- **Package:** com.mustansir.yaqub.ausuniguide
- **Support:** supportmarketiq@gmail.com
- **Live site:** https://ausuniguide.github.io/ausuniguide/

## Pages
| File | Purpose |
|------|---------|
| `index.html` | Landing page |
| `privacy.html` | Privacy Policy (linked in Google Play Console) |
| `terms.html` | Terms of Service |
| `support.html` | Help centre and contact |

## Deployment
Served via GitHub Pages from the `main` branch, root folder. Any push to `main`
triggers a rebuild. All internal links are relative so they resolve correctly on
the project-site path `/ausuniguide/`.
