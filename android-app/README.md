# Android app (Capacitor)

Wraps the web client in a native Android shell.

## First-time setup

```powershell
cd android-app
npm install
```

## Build APK → `../android-apk/`

```powershell
.\scripts\build-apk.ps1
```

Icons are auto-generated (pixel-art Pac-Royal on dark maze background). To regenerate icons only:

```powershell
python scripts\generate_android_icons.py
```

### PixelLab icon (optional)

If you have [PixelLab](https://pixellab.ai) credits, generate a 512×512 icon via the PixelLab MCP (`create_ui_asset`) or the PixelLab web app, then apply it:

```powershell
python scripts\fetch_pixellab_icon.py --file path\to\pixellab-icon.png
# or
python scripts\fetch_pixellab_icon.py --url "https://..."
```

Then rebuild the APK.

With production server (online play):

```powershell
.\scripts\build-apk.ps1 -ServerUrl "https://your-app.onrender.com"
```

## Open in Android Studio

```powershell
npm run open
```

Requires Android Studio and the Android SDK (installed with Android Studio).
