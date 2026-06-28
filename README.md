# AusUni Guide — Marketing Site

The public marketing site and legal pages for the AusUni Guide mobile app.
Static HTML — no build step required.

## Files

- `index.html` — Landing page (hero, features, pricing, FAQ, story, download CTA)
- `privacy.html` — Privacy Policy (required by Google Play)
- `terms.html` — Terms of Service (required for paid subscriptions)
- `support.html` — Support contact page (required by Google Play)
- `README.md` — This file

## Deploy to GitHub Pages

### 1. Create the repository

On GitHub:
1. Create a new public repo named `ausuniguide-site`
2. Do NOT initialise with README (we have one)

### 2. Push the files

From your terminal:

```bash
cd ~/Desktop/ausuniguide-site   # or wherever you put these files

git init
git add .
git commit -m "Initial site launch"
git branch -M main
git remote add origin https://github.com/mustansiryaqub/ausuniguide-site.git
git push -u origin main
```

### 3. Enable GitHub Pages

1. Go to your repo on GitHub → **Settings** → **Pages**
2. **Source**: Deploy from a branch
3. **Branch**: `main` → `/ (root)`
4. Click **Save**
5. Wait 1–2 minutes for first deploy

Your site will be live at:
**https://mustansiryaqub.github.io/ausuniguide-site/**

### 4. Update Google Play Console

In **Play Console → Store presence → Main store listing**:

- **Privacy Policy URL**:
  `https://mustansiryaqub.github.io/ausuniguide-site/privacy.html`
- **Support email**:
  `supportmarketiq@gmail.com`
- **Website**:
  `https://mustansiryaqub.github.io/ausuniguide-site/`

## Optional: Custom domain

If you ever buy `ausuniguide.com`:

1. Add the domain in **Settings → Pages → Custom domain**
2. Create a `CNAME` file in this repo with one line: `ausuniguide.com`
3. Point your domain's DNS to GitHub Pages (4 A records or 1 CNAME)

## Updating the site

Just edit the HTML files locally, then:

```bash
git add .
git commit -m "Update content"
git push
```

Changes go live within ~60 seconds.

## Design notes

- Font: Fraunces (display) + Inter (body), both from Google Fonts
- Palette: Sydney harbour navy + sandstone gold + eucalyptus green
- Mobile-first responsive — tested down to 320px wide
- No JavaScript dependencies, no build tools, no analytics
- Lighthouse-friendly: semantic HTML, alt text, accessible focus states

## Contact

Built and maintained by Mustansir Yaqub
Support: supportmarketiq@gmail.com
