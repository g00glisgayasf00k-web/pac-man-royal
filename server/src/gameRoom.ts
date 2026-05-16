import { Server, Socket } from 'socket.io';
import type { GameSnapshot, InputPayload, OnlineLobbySnapshot } from '../../shared/gameTypes.js';
import * as Engine from '../../shared/gameEngine.js';

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
}

export class GameRoom {
  code: string;
  hostId: string;
  players: Map<string, RoomPlayer> = new Map();
  engine: InstanceType<typeof GameEngine> | null = null;
  interval: ReturnType<typeof setInterval> | null = null;
  status: 'lobby' | 'playing' | 'ended' = 'lobby';
  autoStartAt: number | null = null;
  private autoStartTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(code: string, hostId: string, hostName: string, hostSocket: Socket) {
    this.code = code;
    this.hostId = hostId;
    this.addPlayer(hostId, hostName, hostSocket, 0);
  }

  addPlayer(socketId: string, name: string, socket: Socket | null, preferredSlot?: number): RoomPlayer | null {
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
    this.players.set(socketId, player);
    return player;
  }

  fillWithAI() {
    const names = ['Red Bot', 'Pink Bot', 'Cyan Bot', 'Orange Bot'];
    let i = 0;
    while (this.players.size < MAX_PLAYERS) {
      const id = `ai-${this.code}-${i}`;
      this.addPlayer(id, names[i] ?? `Bot ${i}`, null, this.players.size);
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
    this.engine.step(1 / 60);
    if (this.engine.status === 'ended') this.status = 'ended';
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
  name: string
): { room: GameRoom; player: RoomPlayer } | { error: string } {
  let best: GameRoom | null = null;
  let bestSize = 0;

  for (const room of rooms.values()) {
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
    const room = new GameRoom(code, socket.id, name || 'Player', socket);
    rooms.set(code, room);
    return { room, player: room.players.get(socket.id)! };
  }

  const added = best.addPlayer(socket.id, name || 'Player', socket);
  if (!added) return { error: 'Could not join lobby' };
  return { room: best, player: added };
}

export function attachRoomHandlers(io: Server, rooms: Map<string, GameRoom>) {
  io.on('connection', (socket) => {
    socket.on('quick-join', ({ name }: { name: string }, cb) => {
      const result = findOrCreateMatchmakingRoom(rooms, socket, name);
      if ('error' in result) {
        return cb({ ok: false, error: result.error });
      }

      const { room, player } = result;
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
    });

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

  setInterval(() => {
    for (const [code, room] of rooms) {
      if (room.status !== 'playing' || !room.engine) continue;
      room.tick();
      const snap = room.getSnapshot();
      if (snap) io.to(code).emit('game-state', snap);
    }
  }, 1000 / 60);
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
  };
}
