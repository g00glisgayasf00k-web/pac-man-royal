# Pac-Royal — Android APK

This folder contains the installable Android app (debug build).

## Install on your phone

1. Copy `Pac-Royal.apk` to your Android device.
2. Open the file and allow **Install from unknown sources** if prompted.
3. Launch **Pac-Royal**.

## Controls

- **Solo vs AI:** works offline (bundled in the APK).
- **Online mode:** requires a live server. Rebuild the APK with your server URL:
  ```powershell
  cd android-app
  .\scripts\build-apk.ps1 -ServerUrl "https://your-app.onrender.com"
  ```

## Rebuild the APK

From the project root:

```powershell
cd android-app
npm install
.\scripts\build-apk.ps1
```

Optional: pass `-ServerUrl` for online multiplayer and leaderboards.

## Release build (Play Store)

Use Android Studio (`npm run open` in `android-app`) to generate a signed **App Bundle** (`.aab`).

See [PLAY_STORE.md](../PLAY_STORE.md) in the project root.
