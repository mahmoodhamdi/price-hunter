# Price Hunter — Browser Extension (MV3)

This directory holds the source of the Chrome/Edge/Brave/Firefox browser extension. It is delivered as a ready-to-load scaffold; the website API endpoints it consumes already exist in `src/app/api/extension/*`.

## Files

```
extension/
├── manifest.v3.json         # Chromium MV3 manifest
├── background.js            # Service-worker (badge, message bus)
├── popup/
│   ├── index.html           # 360×N popup UI
│   ├── popup.css            # Light + dark theme
│   └── popup.js             # Wires storage, API, search, active-tab detection
├── content-scripts/
│   ├── amazon.js            # Detects Amazon product pages
│   └── noon.js              # Detects Noon product pages
└── icons/                   # 16/32/48/128 PNGs (placeholder, replace before store submission)
```

## Loading locally (Chrome / Edge / Brave)

1. Visit `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select this `extension/` directory
5. Open the popup, click "Settings", paste your API key from `https://<your-deployment>/dashboard/extension`

## Loading locally (Firefox)

Firefox supports MV3 with some differences. Until packaging is needed, use `web-ext run --source-dir extension/`.

## Publishing checklist

- [ ] Replace icon placeholders in `icons/` with the buyer's brand icons (16, 32, 48, 128, 256 PNG)
- [ ] Update the `name`, `description`, and `homepage_url` in `manifest.v3.json`
- [ ] Update the default `baseUrl` constant in `popup/popup.js` from `https://pricehunter.app` to the buyer's domain
- [ ] Bump `version`
- [ ] `zip -r price-hunter-extension.zip extension/`
- [ ] Upload to Chrome Web Store ($5 one-time developer fee) and AMO (free)

## API endpoints consumed

| Endpoint | Purpose |
|----------|---------|
| `GET /api/extension/whoami` | Identify the API key holder |
| `GET /api/extension/search?q=...` | Search products |
| `POST /api/extension/wishlist` | Add to wishlist |
| `POST /api/extension/alerts` | Create a price alert |

All endpoints require the `x-api-key` header. Users generate keys at `/dashboard/extension`.

## What's NOT included in the scaffold

- Real branding icons (placeholder hex squares; commission a designer)
- An options page (the popup currently shows a `Settings` link that opens the site)
- Web Push subscription handshake (the site handles this; the extension can mirror it if desired)
- Localization of popup copy (English-only; add `_locales/<lang>/messages.json` for i18n)
- An MV2 fallback for old Firefox (not required for current Firefox)

These are the listed deltas between the scaffold and a Chrome-Web-Store-ready extension. Estimated polish cost is 4-8 engineer hours plus designer time for icons.
