# Pac-Royale

A multiplayer arcade battle for **5 players**: one Pac-Royale and four ghosts. When a ghost captures Pac-Royale, they **become** Pac-Royale. Highest score after the match timer wins.

## Quick start

```bash
npm install
cd client && npm install && cd ..
cd server && npm install && cd ..
npm run dev
```

## Modes

| Role | Goal |
|------|------|
| **Pac-Royale** | Eat pellets for points. Avoid ghosts. |
| **Ghost** | Catch Pac-Royale to become the new Pac-Royale. |

- **Role swap:** On capture, the catching ghost becomes Pac-Royale; the former Pac-Royale becomes that ghost.
- **Solo vs AI** and **Online** matchmaking.

## Deploy

See Render setup in this README / `render.yaml`. Select repo `g00glisgayasf00k-web/pac-man-royal`.

## Android APK

```powershell
cd android-app
.\scripts\build-apk.ps1
```

Output: `android-apk/Pac-Royale.apk`

GitHub Actions also builds the APK on every push to `main` (workflow: **Build Android APK**). Download it from the run’s **Artifacts** tab as `Pac-Royale-apk`.
