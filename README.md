# SquadUp — Live 9v9 Football Lineup

SquadUp is a mobile-first web app for managing 9v9 football match lineups in real time. Each player picks their spot on a responsive tactical field, and changes sync instantly across every connected device using Firebase Realtime Database. Built with vanilla HTML, CSS, and JavaScript.

## Features

- **One player per device** — Each device stores only its own player ID (profile) in `localStorage`. Cross-device identity is handled by the live lineup.
- **Real-time sync** — `onValue` listeners keep the pitch, bench, and join status in sync across all phones without refresh.
- **Smart slot rules** — Auto-fill field first (9), then bench (2 per team). If a team is full (9+2), joining is blocked.
- **Anti-overwrite & ownership** — Reads latest DB state before assigning. Transactions prevent stealing spots. You can only leave or move your own slot.
- **Tactical 9v9 field** — Clean, responsive pitch (portrait) with positions GK/LB/CB/RB/LM/CM/RM/ST. Blue vs Orange.
- **WhatsApp share** — One-tap share generates a clean English summary with positions, subs, and a link to join.
- **Offline awareness** — Connection pill shows Live/Offline. Joins are disabled while offline.
- **Avatar selection** — 10 pre-defined gradient SVG avatars.

## Tech stack

- HTML5, modern CSS (mobile-first, CSS vars, safe areas)
- Vanilla JavaScript (no frameworks)
- Firebase Realtime Database (v10 compat SDK via CDN)

## Getting started (local)

Open `index.html` in a browser. You need internet for Firebase. On first run, create your profile (name + avatar). Then join Blue/Orange (or tap an empty slot) and watch it sync live.

## Configuration

Edit `js/firebase-config.js`:
- `firebaseConfig` — the provided Firebase project config (already set).
- `APP_URL` — set to your GitHub Pages URL after deployment. It's used in the WhatsApp share message.

## GitHub Pages deployment

1. Push this repo to GitHub.
2. Enable GitHub Pages (Settings → Pages → Deploy from branch `main` / `docs` or root).
3. Copy the live URL (e.g. `https://oussamaode.github.io/futbol/`) and set `APP_URL` in `js/firebase-config.js`.
4. Commit and push the change.
5. Open the Pages URL on mobile to test live sync.

## File structure

```
index.html
css/styles.css
js/avatars.js        # Avatar SVG library
js/firebase-config.js # Firebase init + config
js/app.js            # Personal identity + onboarding
js/lineup.js         # Real-time lineup logic + sharing
```

## Notes

- The app stores only your own profile on the device. The full lineup is stored in Firebase under `matchLineup`.
- Transactions are used for claims/releases to avoid race conditions when multiple people tap at the same time.
- All UI text is in English and optimized for mobile (portrait).

## License

MIT
