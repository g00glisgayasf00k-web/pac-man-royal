import { Server, Socket } from 'socket.io';
import {
  FIXED_DT,
  MAX_SIM_STEPS_PER_FRAME,
  ghostNameForSlot,
  type GameSnapshot,
  type InputPayload,
  type OnlineLobbySnapshot,
} from '../../shared/gameTypes.js';
import * as Engine from '../../shared/gameEngine.js';
import { recordGameResultForUser } from './leaderboard.js';
import { getUserByToken } from './auth.js';

const { GameEngine } = Engine;

const MAX_PLAYERS = 5;
const MIN_PLAYERS_TO_START = 2;
const AUTO_START_COUNTDOWN_MS = 12_000;

export interface RoomPlayer {
  id: string;
  name: string;
  slot: number;
  isAI: boolean;
  socketId: string | null;
  userId?: string;
  username?: string;
  displayName?: string;
}

export class GameRoom {
  code: string;
  hostId: string;
  players: Map<string, RoomPlayer> = new Map();
  engine: InstanceType<typeof GameEngine> | null = null;
  interval: ReturnType<typeof setInterval> | null = null;
  status: 'lobby' | 'playing' | 'ended' = 'lobby';
  /** Invite-only — excluded from quick-match pool */
  private = false;
  autoStartAt: number | null = null;
  private autoStartTimer: ReturnType<typeof setTimeout> | null = null;
  private resultsRecorded = false;

  constructor(
    code: string,
    hostId: string,
    hostName: string,
    hostSocket: Socket,
    account?: { id: string; username: string; displayName: string } | null,
    isPrivate = false
  ) {
    this.code = code;
    this.hostId = hostId;
    this.private = isPrivate;
    this.addPlayer(hostId, hostName, hostSocket, 0, account);
  }

  addPlayer(
    socketId: string,
    name: string,
    socket: Socket | null,
    preferredSlot?: number,
    account?: { id: string; username: string; displayName: string } | null
  ): RoomPlayer | null {
    if (this.players.size >= MAX_PLAYERS) return null;
    const used = new Set([...this.players.values()].map((p) => p.slot));
    let slot = preferredSlot ?? 0;
    while (used.has(slot) && slot < MAX_PLAYERS) slot++;
    if (used.has(slot)) return null;
    const player: RoomPlayer = {
      id: socketId,
      name: name.slice(0, 16) || `Player ${slot + 1}`,
      slot,
      isAI: !socket,
      socketId: socket?.id ?? null,
    };
    if (account) {
      player.userId = account.id;
      player.username = account.username;
      player.displayName = account.displayName;
    }
    this.players.set(socketId, player);
    return player;
  }

  fillWithAI() {
    let i = 0;
    while (this.players.size < MAX_PLAYERS) {
      const id = `ai-${this.code}-${i}`;
      const added = this.addPlayer(id, 'GHOST', null);
      if (!added) break;
      added.name = ghostNameForSlot(added.slot);
      i++;
    }
  }

  removePlayer(socketId: string) {
    this.players.delete(socketId);
    if (this.players.size === 0) this.stop();
  }

  humanCount(): number {
    return [...this.players.values()].filter((p) => !p.isAI).length;
  }

  cancelAutoStart() {
    if (this.autoStartTimer) clearTimeout(this.autoStartTimer);
    this.autoStartTimer = null;
    this.autoStartAt = null;
  }

  scheduleAutoStart(io: Server) {
    if (this.autoStartTimer || this.status !== 'lobby') return;
    if (this.humanCount() < MIN_PLAYERS_TO_START) return;

    this.autoStartAt = Date.now() + AUTO_START_COUNTDOWN_MS;
    this.autoStartTimer = setTimeout(() => {
      this.autoStartTimer = null;
      this.autoStartAt = null;
      if (this.status === 'lobby' && this.humanCount() >= MIN_PLAYERS_TO_START) {
        this.start(io);
      }
    }, AUTO_START_COUNTDOWN_MS);

    io.to(this.code).emit('lobby-update', getLobbyState(this));
  }

  tryAutoStart(io: Server) {
    if (this.status !== 'lobby') return;

    if (this.players.size >= MAX_PLAYERS) {
      this.cancelAutoStart();
      this.start(io);
      return;
    }

    if (this.humanCount() >= MIN_PLAYERS_TO_START && !this.autoStartTimer) {
      this.scheduleAutoStart(io);
    }
  }

  start(io?: Server) {
    if (this.status !== 'lobby') return;
    this.cancelAutoStart();
    this.fillWithAI();
    const configs = [...this.players.values()]
      .sort((a, b) => a.slot - b.slot)
      .map((p) => ({ id: p.id, name: p.name, slot: p.slot, isAI: p.isAI }));
    this.engine = new GameEngine(configs);
    this.status = 'playing';
    this.resultsRecorded = false;

    const snap = this.getSnapshot();
    if (snap && io) {
      io.to(this.code).emit('game-started', { code: this.code });
      io.to(this.code).emit('game-state', snap);
    }
  }

  handleInput(payload: InputPayload) {
    this.engine?.setInput(payload.playerId, payload.direction);
  }

  tick() {
    if (!this.engine || this.status !== 'playing') return;
    this.engine.step(FIXED_DT);
    if (this.engine.status === 'ended') {
      this.status = 'ended';
      void this.recordResults();
    }
  }

  private async recordResults() {
    if (this.resultsRecorded || !this.engine) return;
    this.resultsRecorded = true;
    const snap = this.engine.getSnapshot();
    const winnerId = snap.winnerId;
    for (const rp of this.players.values()) {
      if (rp.isAI || !rp.userId || !rp.username || !rp.displayName) continue;
      const ps = snap.players.find((p) => p.id === rp.id);
      if (!ps) continue;
      try {
        await recordGameResultForUser(
          rp.userId,
          rp.username,
          rp.displayName,
          ps.score,
          rp.id === winnerId,
          'online'
        );
      } catch (err) {
        console.error('Leaderboard record failed:', err);
      }
    }
  }

  getSnapshot(): GameSnapshot | null {
    return this.engine?.getSnapshot() ?? null;
  }

  stop() {
    this.cancelAutoStart();
    if (this.interval) clearInterval(this.interval);
    this.interval = null;
    this.engine = null;
  }
}

function randomRoomCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

/** Join the fullest open lobby, or create a new one. */
export function findOrCreateMatchmakingRoom(
  rooms: Map<string, GameRoom>,
  socket: Socket,
  name: string,
  account?: { id: string; username: string; displayName: string } | null
): { room: GameRoom; player: RoomPlayer } | { error: string } {
  let best: GameRoom | null = null;
  let bestSize = 0;

  for (const room of rooms.values()) {
    if (room.private) continue;
    if (room.status !== 'lobby') continue;
    if (room.players.size >= MAX_PLAYERS) continue;
    if (room.humanCount() === 0) continue;
    if (room.players.size > bestSize) {
      best = room;
      bestSize = room.players.size;
    }
  }

  if (!best) {
    const code = randomRoomCode();
    const room = new GameRoom(code, socket.id, name || 'Player', socket, account, false);
    rooms.set(code, room);
    return { room, player: room.players.get(socket.id)! };
  }

  const added = best.addPlayer(socket.id, name || 'Player', socket, undefined, account);
  if (!added) return { error: 'Could not join lobby' };
  return { room: best, player: added };
}

export function createPrivateRoom(
  rooms: Map<string, GameRoom>,
  socket: Socket,
  name: string,
  account?: { id: string; username: string; displayName: string } | null
): { room: GameRoom; player: RoomPlayer } {
  let code = randomRoomCode();
  while (rooms.has(code)) code = randomRoomCode();
  const room = new GameRoom(code, socket.id, name || 'Player', socket, account, true);
  rooms.set(code, room);
  return { room, player: room.players.get(socket.id)! };
}

export function joinRoomByCode(
  rooms: Map<string, GameRoom>,
  socket: Socket,
  rawCode: string,
  name: string,
  account?: { id: string; username: string; displayName: string } | null
): { room: GameRoom; player: RoomPlayer } | { error: string } {
  const code = rawCode.trim().toUpperCase();
  if (!code) return { error: 'Enter a room code' };
  const room = rooms.get(code);
  if (!room) return { error: 'Room not found' };
  if (room.status !== 'lobby') return { error: 'That game has already started' };
  if (room.players.size >= MAX_PLAYERS) return { error: 'Room is full' };
  const added = room.addPlayer(socket.id, name || 'Player', socket, undefined, account);
  if (!added) return { error: 'Could not join room' };
  return { room, player: added };
}

type JoinCallback = (res: {
  ok: boolean;
  code?: string;
  playerId?: string;
  slot?: number;
  lobby?: OnlineLobbySnapshot;
  error?: string;
}) => void;

function finishJoin(
  io: Server,
  socket: Socket,
  room: GameRoom,
  player: RoomPlayer,
  cb: JoinCallback
) {
  socket.join(room.code);
  room.tryAutoStart(io);
  io.to(room.code).emit('lobby-update', getLobbyState(room));
  const lobby = getLobbyState(room);
  cb({
    ok: true,
    code: room.code,
    playerId: socket.id,
    slot: player.slot,
    lobby,
  });
}

export function attachRoomHandlers(io: Server, rooms: Map<string, GameRoom>) {
  io.on('connection', (socket) => {
    socket.on('quick-join', async ({ name, token }: { name: string; token?: string }, cb) => {
      const account = await getUserByToken(token);
      const result = findOrCreateMatchmakingRoom(rooms, socket, name, account);
      if ('error' in result) {
        return cb({ ok: false, error: result.error });
      }
      finishJoin(io, socket, result.room, result.player, cb);
    });

    socket.on('create-room', async ({ name, token }: { name: string; token?: string }, cb) => {
      const account = await getUserByToken(token);
      const { room, player } = createPrivateRoom(rooms, socket, name, account);
      finishJoin(io, socket, room, player, cb);
    });

    socket.on(
      'join-room',
      async (
        { name, token, code }: { name: string; token?: string; code: string },
        cb: JoinCallback
      ) => {
        const account = await getUserByToken(token);
        const result = joinRoomByCode(rooms, socket, code, name, account);
        if ('error' in result) {
          return cb({ ok: false, error: result.error });
        }
        finishJoin(io, socket, result.room, result.player, cb);
      }
    );

    socket.on('input', (payload: InputPayload & { code: string }) => {
      const room = rooms.get(payload.code);
      room?.handleInput(payload);
    });

    socket.on('disconnect', () => {
      for (const [code, room] of rooms) {
        if (!room.players.has(socket.id)) continue;

        room.removePlayer(socket.id);
        room.cancelAutoStart();

        if (room.players.size === 0) {
          rooms.delete(code);
        } else if (room.status === 'lobby') {
          io.to(code).emit('lobby-update', getLobbyState(room));
          room.tryAutoStart(io);
        }
      }
    });
  });

  let simAccum = 0;
  let lastTick = performance.now();

  setInterval(() => {
    const now = performance.now();
    let elapsed = (now - lastTick) / 1000;
    lastTick = now;
    if (elapsed > 0.25) elapsed = 0.25;
    simAccum += elapsed;

    let steps = 0;
    while (simAccum >= FIXED_DT && steps < MAX_SIM_STEPS_PER_FRAME) {
      for (const [, room] of rooms) {
        if (room.status === 'playing' && room.engine) room.tick();
      }
      simAccum -= FIXED_DT;
      steps++;
    }

    for (const [code, room] of rooms) {
      if (room.status !== 'playing' || !room.engine) continue;
      const snap = room.getSnapshot();
      if (snap) io.to(code).emit('game-state', snap);
    }
  }, 8);
}

function getLobbyState(room: GameRoom): OnlineLobbySnapshot {
  return {
    code: room.code,
    players: [...room.players.values()].map((p) => ({
      id: p.id,
      name: p.name,
      slot: p.slot,
      isAI: p.isAI,
    })),
    status: room.status,
    maxPlayers: MAX_PLAYERS,
    autoStartAt: room.autoStartAt,
    private: room.private,
  };
}
