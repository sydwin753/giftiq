# Giftiq

Launch-ready static landing page for `Giftiq`, a gift recommendation app concept.

## What is in this repo

- `index.html` is the public homepage and product story
- `styles.css` contains the full visual system and responsive layout
- `script.js` powers reveal animations and the interactive gift demo
- `.github/workflows/pages.yml` deploys the site to GitHub Pages

## Run locally

Open `index.html` directly, or start a simple local server:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## Publish on GitHub Pages

1. Push this repo to GitHub.
2. In GitHub, open `Settings -> Pages`.
3. Set the source to `GitHub Actions`.
4. Push to `main` again if Pages has not built yet.

The included workflow will publish the site automatically.

## Before you go live

- Update `CNAME` if you are not using `sydneyholzman.com`
- Replace `hello@giftiq.app` with your real contact or waitlist link
- Add real app screenshots, product links, or beta signup destination
- Tighten the homepage copy once your positioning is final
