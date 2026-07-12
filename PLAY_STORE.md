# Publishing Pac-Royale on Google Play

This project is a **web game** (React client + Node/Express server). You do not need to rewrite it in Kotlin or Flutter. The practical approach is to **wrap your live HTTPS site** in a small Android app and upload it to the Play Store.

Your app must stay connected to your deployed server (Render) for accounts, online multiplayer, and leaderboards.

---

## Recommended: Trusted Web Activity (TWA)

Google’s official way to publish a website as a Play Store app. The app opens your production URL in fullscreen Chrome.

### What you need

| Requirement | Notes |
|-------------|--------|
| **Live HTTPS site** | e.g. your Render URL (`https://your-app.onrender.com`) |
| **Google Play Developer account** | [One-time $25 USD](https://play.google.com/console/signup) |
| **Privacy policy URL** | Required because the game uses accounts and stores scores |
| **Digital Asset Links** | Proves your Android app owns your domain |

### Step-by-step

| Step | Action |
|------|--------|
| 1 | Deploy and stabilize your production URL on Render |
| 2 | Add a web app manifest and app icons (optional but helps TWA) |
| 3 | Install [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap): `npm install -g @bubblewrap/cli` |
| 4 | Run `bubblewrap init` — enter your HTTPS URL, app name, and package ID (e.g. `com.yourname.pacmanroyal`) |
| 5 | Run `bubblewrap build` — produces an `.aab` file for Play Console |
| 6 | Host `assetlinks.json` at `https://your-domain/.well-known/assetlinks.json` |
| 7 | Upload the `.aab` in [Google Play Console](https://play.google.com/console) |
| 8 | Complete store listing, content rating, data safety, and privacy policy |
| 9 | Submit for review (often a few days to a couple of weeks for a first app) |

### Why TWA fits this project

- **Online mode** keeps working — the app loads your real server
- **Auth and leaderboards** work without reimplementing them in native code
- **Fastest path** from your current codebase to the Play Store

---

## Alternative: Capacitor

[Capacitor](https://capacitorjs.com/) wraps your site in a native shell with more control (splash screen, icons, optional native plugins).

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init "Pac-Royale" com.yourname.pacroyale
```

For a server-backed game, either:

- Point the WebView at your **Render production URL**, or
- Bundle the client build and set `VITE_SERVER_URL` to your production API when building

Then:

```bash
cd client && npm run build
npx cap add android
npx cap sync
npx cap open android
```

In **Android Studio**: build a signed **Android App Bundle** (`.aab`) and upload it to Play Console.

Use Capacitor if you may add push notifications, haptics, or other native features later.

---

## What Google Play requires

- **App name, short description, full description**
- **Screenshots** (phone required; tablet optional)
- **Privacy policy** — required because you collect usernames/passwords and gameplay scores
- **Content rating** (IARC questionnaire — arcade games are often “Everyone”)
- **Target audience** (extra rules if the app targets children)
- **Data safety** form — declare account info and gameplay data you collect
- **Signed app bundle** (`.aab`) — Google Play expects AAB for new apps, not APK

---

## Notes specific to this game

| Topic | Guidance |
|--------|----------|
| **Online multiplayer** | The app must reach your Render server; do not ship an offline-only build unless you change the client config |
| **User accounts** | Allowed on Play Store; use HTTPS and a clear privacy policy |
| **App naming** | Prefer “Pac-Royale” as the store title and avoid official trademarked branding or logos to reduce rejection risk |
| **Render free tier** | The server sleeps after inactivity; cold starts can take 30–60 seconds and hurt reviews — a paid instance helps |
| **Controls** | Swipe controls are already implemented; test on real Android devices before release |

---

## Fastest path (checklist)

1. [ ] Production deploy on Render is stable
2. [ ] Privacy policy page is published (GitHub Pages, your site, or similar)
3. [ ] Install Bubblewrap and build an `.aab`
4. [ ] Pay $25 and create a Play Console developer account
5. [ ] Upload `.aab`, complete listing and compliance forms
6. [ ] Submit for review

---

## Approaches that are not a good fit

| Approach | Why |
|----------|-----|
| **Rewrite in Flutter / React Native** | Large effort; no advantage for an existing web + server game |
| **APK sideload only** | Not the Play Store; users install manually |
| **Bundle client without server URL** | Solo may work; online, auth, and leaderboards will break |

---

## Useful links

- [Google Play Console](https://play.google.com/console)
- [Bubblewrap (TWA)](https://github.com/GoogleChromeLabs/bubblewrap)
- [Capacitor Android docs](https://capacitorjs.com/docs/android)
- [Digital Asset Links](https://developer.android.com/training/app-links/verify-android-applinks)
- [Play App Signing](https://support.google.com/googleplay/android-developer/answer/9842756)

---

## Related project docs

- **[README.md](./README.md)** — local development, build, and Render deployment
- **`render.yaml`** — Blueprint deploy (web service only; no database by default)

If you want Play Store scaffolding added to this repo (manifest, icons, Bubblewrap or Capacitor config), open an issue or ask in development chat.
