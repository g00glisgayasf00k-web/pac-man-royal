import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { existsSync } from 'fs';
import { createServer } from 'http';
import path from 'path';
import { Server } from 'socket.io';
import { createAdminRouter } from './adminRoutes.js';
import { authRouter } from './authRoutes.js';
import { leaderboardRouter } from './leaderboardRoutes.js';
import { attachRoomHandlers, GameRoom } from './gameRoom.js';
import { disableDatabase, initDb, useDatabase } from './db.js';
import { applyLeaderboardEpochIfNeeded } from './leaderboardEpoch.js';
import { resolveClientDist } from './clientDist.js';

const PORT = Number(process.env.PORT) || 3001;
const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });
const rooms = new Map<string, GameRoom>();

attachRoomHandlers(io, rooms);

app.use('/api/auth', authRouter);
app.use('/api/leaderboard', leaderboardRouter);
app.use('/api/admin', createAdminRouter(rooms));

app.get('/api/health', (_req, res) => {
  const clientDist = resolveClientDist();
  res.json({
    ok: true,
    rooms: rooms.size,
    userStore: useDatabase() ? 'postgres' : 'file',
    clientDist,
    clientBuilt: existsSync(path.join(clientDist, 'index.html')),
  });
});

const clientDist = resolveClientDist();
if (!existsSync(path.join(clientDist, 'index.html'))) {
  console.error(`Client build missing at ${clientDist} — run npm run build`);
} else {
  console.log(`Serving client from ${clientDist}`);
}

app.use(
  express.static(clientDist, {
    index: false,
    maxAge: '1h',
  })
);

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/socket.io')) {
    next();
    return;
  }
  const assetPath = path.join(clientDist, req.path);
  if (req.path.includes('.') && existsSync(assetPath)) {
    res.sendFile(assetPath);
    return;
  }
  res.sendFile(path.join(clientDist, 'index.html'), (err) => {
    if (err) res.status(404).send('Build client first: npm run build');
  });
});

async function start() {
  try {
    if (useDatabase()) {
      try {
        await initDb();
      } catch (err) {
        disableDatabase();
        console.warn('PostgreSQL unavailable — using file storage.', err);
      }
    }
    const reset = await applyLeaderboardEpochIfNeeded();
    if (reset) {
      console.log('Leaderboard and match history cleared for new 3-minute scoring.');
    }
    if (useDatabase()) {
      console.log('User accounts: PostgreSQL');
    } else {
      console.log('User accounts: local JSON (server/data) — no DATABASE_URL');
    }
  } catch (err) {
    console.error('Failed to start:', err);
    process.exit(1);
  }

  httpServer.listen(PORT, () => {
    console.log(`Pac-Man Battle Royale server on port ${PORT}`);
  });
}

void start();
