# Pac-Man Battle Royale

A production-ready multiplayer Pac-Man–inspired game for **5 players**: one Pac-Man and four ghosts. When a ghost captures Pac-Man, they **become** Pac-Man. The first player to **1000 points** from pellets wins.

## Quick start

```bash
npm install
cd client && npm install && cd ..
cd server && npm install && cd ..
npm run dev
```

- **Client:** http://localhost:5173  
- **Server:** http://localhost:3001  

## How to play

| Role | Goal |
|------|------|
| **Pac-Man** | Eat pellets for points. Avoid ghosts. |
| **Ghost** | Catch Pac-Man to become the new Pac-Man. |

- **Win condition:** First player to reach **1000 points** wins the match.
- **Role swap:** On capture, the catching ghost becomes Pac-Man; the former Pac-Man becomes that ghost.
- **Modes:** Solo vs AI, Online matchmaking (join a random lobby via Socket.io).

## Controls

Arrow keys to move (solo and online).

## Production build

```bash
npm run build
npm start
```

Serve the client `dist` behind the same host (default in production) or set `VITE_SERVER_URL` when building the client.

## Deploy on Render

1. Sign in at [render.com](https://render.com) and connect your GitHub account.
2. Click **New +** → **Blueprint** (or **Web Service** if you prefer manual setup).
3. Select the repo: `g00glisgayasf00k-web/pac-man-royal`.
4. If using **Blueprint**, Render reads `render.yaml` and creates the web service automatically.
5. If using **Web Service** manually, use these settings:

   | Setting | Value |
   |---------|--------|
   | **Root Directory** | *(leave blank)* |
   | **Build Command** | `npm install && npm run build` |
   | **Start Command** | `npm start` |
   | **Instance type** | Free (or paid for always-on) |

6. Click **Create Web Service** and wait for the first deploy to finish.
7. Open the URL Render gives you (e.g. `https://pac-man-royal.onrender.com`) and play.

**Notes**

- Online multiplayer uses WebSockets on the same URL as the game (no extra env vars needed).
- The free tier sleeps after ~15 minutes of no traffic; the first visit may take 30–60 seconds to wake up.
- For reliable multiplayer, use a paid instance so the server stays awake.

### Storage on Render (no database)

The default **`render.yaml`** deploys **only the web service** — no PostgreSQL. Accounts, leaderboard, and admin stats use JSON files under `server/data/` while the instance is running.

**Trade-off:** Render’s free tier **resets disk on each deploy**, and the service **sleeps** when idle. Sign-ups and scores may be lost after redeploys or long idle periods. That is fine for casual play; add Postgres later only if you need permanent accounts.

1. **New deploy:** **New +** → **Blueprint** → select this repo (uses `render.yaml`).
2. **Existing service that used Postgres:** open the web service → **Environment** → **delete** `DATABASE_URL` → save → **Manual Deploy**.
3. Optional: delete the unused Postgres instance in Render to avoid billing.

Check after deploy: `https://YOUR-APP.onrender.com/api/health` should show `"userStore": "file"`.

**Optional PostgreSQL:** set `DATABASE_URL` on the web service (and remove it from the blueprint-only flow). The server picks Postgres automatically when that variable is present.

## Publishing to Google Play Store

This game is a web app backed by a server. The usual approach is to wrap your **live Render URL** in an Android shell (TWA or Capacitor), not to rewrite the game in native code.

See **[PLAY_STORE.md](./PLAY_STORE.md)** for a full guide covering:

- Trusted Web Activity (Bubblewrap) — recommended
- Capacitor as an alternative
- Play Console requirements (privacy policy, content rating, `.aab` upload)
- Checklist and notes for online play, accounts, and naming
