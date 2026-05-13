# Marketing assets

Per-edition marketing material lives here. Most artifacts are generated, not hand-authored — they're built from the edition matrix in `src/lib/editions/` plus a per-edition customization hook the buyer fills in.

## Generated artifacts

### Landing pages

```bash
npx tsx scripts/generate-landing-pages.ts
```

Output: `landing-pages/<edition-slug>/index.html` (12 by default, 20 with `ALL=1`). Each page is self-contained Tailwind-via-CDN HTML — drop it on any static host (Vercel, Netlify, GitHub Pages, S3 + CloudFront).

To replace the contact email, edit the `ctaUrl` template in `scripts/generate-landing-pages.ts` line ~25, then regenerate.

### Screenshots

```bash
npx playwright install chromium    # one-time
npx tsx scripts/capture-landing-screenshots.ts                  # desktop
MOBILE=1 npx tsx scripts/capture-landing-screenshots.ts         # iPhone 14 Pro
```

Output: `docs/marketing/screenshots/desktop/<edition-slug>.png` (and `mobile/`). 12 desktop screenshots at 1440×900, full-page.

For the larger matrix called for in the sprint plan (192 screenshots = 12 editions × 4 pages × 2 locales × 2 themes), extend the capture script to iterate `/`, `/product/...`, `/dashboard/alerts`, `/admin` for each edition × locale × theme. A working dev server with `NEXT_PUBLIC_EDITION` set per build is required — i.e., build all 12 editions first, serve each, capture, repeat.

## Hand-authored artifacts (not in repo by default)

- **Demo videos** — 60s, 90s, 3min. Record with QuickTime or `ffmpeg -f x11grab` while clicking through the app on a dev server. Edit to add captions; export at 1080p H.264.
- **Social-media kit** — Twitter/X, LinkedIn, Instagram. Templates in `docs/marketing/social/` (not generated; copy `_template.md` and fill in).
- **Press kit** — logos, screenshots, and a one-paragraph "about" for journalists. Compile into a zip after first major release.

## Asset attribution

All in-repo marketing material is original. The Tailwind CDN reference in landing pages credits the framework via its automatic `<!-- ... -->` comment. No third-party imagery is used (placeholders are hex-based, replace at sale-time).
