# Builds a debug APK and copies it to ../android-apk/
param(
  [string]$ServerUrl = ""
)

$ErrorActionPreference = "Stop"
$Root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$AndroidApp = Join-Path $Root "android-app"
$Client = Join-Path $Root "client"
$OutDir = Join-Path $Root "android-apk"
$Jdk = "C:\Program Files\Android\Android Studio\jbr"
$Sdk = "$env:LOCALAPPDATA\Android\Sdk"

if (-not (Test-Path "$Jdk\bin\java.exe")) {
  Write-Error "Android Studio JDK not found at $Jdk. Install Android Studio or set JDK path in this script."
}
if (-not (Test-Path $Sdk)) {
  Write-Error "Android SDK not found at $Sdk"
}

$env:JAVA_HOME = $Jdk
$env:ANDROID_HOME = $Sdk
$env:PATH = "$Jdk\bin;$Sdk\platform-tools;$env:PATH"

Write-Host ">> Generating Pac-Royale launcher icons..."
python (Join-Path $AndroidApp "scripts\generate_android_icons.py")

Write-Host ">> Building web client..."
Push-Location $Client
if ($ServerUrl) {
  $env:VITE_SERVER_URL = $ServerUrl
  Write-Host "   VITE_SERVER_URL=$ServerUrl"
}
npm run build
if ($ServerUrl) { Remove-Item Env:VITE_SERVER_URL -ErrorAction SilentlyContinue }
Pop-Location

Write-Host ">> Syncing Capacitor..."
Push-Location $AndroidApp
npx cap sync android

Write-Host ">> Building debug APK (Gradle)..."
Push-Location (Join-Path $AndroidApp "android")
& .\gradlew.bat assembleDebug --no-daemon
Pop-Location
Pop-Location

$ApkSrc = Join-Path $AndroidApp "android\app\build\outputs\apk\debug\app-debug.apk"
if (-not (Test-Path $ApkSrc)) {
  Write-Error "APK not found at $ApkSrc"
}

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$ApkDst = Join-Path $OutDir "Pac-Royale.apk"
Copy-Item -Force $ApkSrc $ApkDst

Write-Host ""
Write-Host "Done! APK: $ApkDst" -ForegroundColor Green
