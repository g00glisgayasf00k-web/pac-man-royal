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

Serve the client `dist` behind the same host or set `VITE_SERVER_URL` when building the client.
