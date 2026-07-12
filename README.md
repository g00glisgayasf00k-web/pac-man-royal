# Pac-Royal

A multiplayer arcade battle for **5 players**: one Pac-Royal and four ghosts. When a ghost captures Pac-Royal, they **become** Pac-Royal. Highest score after the match timer wins.

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
| **Pac-Royal** | Eat pellets for points. Avoid ghosts. |
| **Ghost** | Catch Pac-Royal to become the new Pac-Royal. |

- **Role swap:** On capture, the catching ghost becomes Pac-Royal; the former Pac-Royal becomes that ghost.
- **Solo vs AI** and **Online** matchmaking.

## Deploy

See Render setup in this README / `render.yaml`. Select repo `g00glisgayasf00k-web/pac-man-royal`.

## Android APK

```powershell
cd android-app
.\scripts\build-apk.ps1
```

Output: `android-apk/Pac-Royal.apk`
