import type { FruitKind, FruitState } from './fruits';

export const WIN_SCORE = 1000;
export const PELLET_POINTS = 10;
export const POWER_PELLET_POINTS = 50;
export const TILE_SIZE = 16;
export const TICK_MS = 1000 / 60;
/** Tiles per second — tuned for keyboard control */
export const MOVE_SPEED = 2.2;
/** How close to tile center (in tiles) before a turn is allowed */
export const LANE_CENTER_EPS = 0.1;
export const CAPTURE_COOLDOWN_MS = 1500;
export const RESPAWN_MS = 1200;
/** Pac-Man may move before ghosts leave the center pen */
export const GHOST_HEAD_START_MS = 2000;

/** Power pellet speed multiplier and duration */
export const POWER_SPEED_MULT = 1.5;
export const POWER_SPEED_MS = 8000;

/** Ghost base speed relative to Pac-Man */
export const GHOST_SPEED_BASE = 0.92;
/** Ghost speed +10% every N seconds */
export const GHOST_SPEED_INTERVAL_MS = 20000;
export const GHOST_SPEED_STEP = 0.1;
export const GHOST_SPEED_MAX_MULT = 1.65;

/** Fruit spawn timing */
export const FRUIT_MIN_INTERVAL_MS = 12000;
export const FRUIT_MAX_INTERVAL_MS = 22000;
export const FRUIT_LIFETIME_MS = 12000;

export type Direction = 'up' | 'down' | 'left' | 'right' | 'none';
export type GameMode = 'local' | 'online';
export type Role = 'pacman' | 'ghost';

/** Persistent player tint by slot */
export const PLAYER_SLOT_COLORS = [
  '#FFD700',
  '#FF4444',
  '#FF69B4',
  '#00FFFF',
  '#FF8C00',
] as const;

export interface Vec2 {
  x: number;
  y: number;
}

export interface PlayerState {
  id: string;
  name: string;
  color: string;
  role: Role;
  x: number;
  y: number;
  dir: Direction;
  nextDir: Direction;
  score: number;
  isAI: boolean;
  slot: number;
  captureCooldownUntil: number;
  respawnUntil: number;
  /** 1.5× move speed while active (power pellet / fruit) */
  speedBoostUntil: number;
  /** Cannot be captured by ghosts */
  shieldUntil: number;
  /** Pellets worth 2× points */
  doubleScoreUntil: number;
}

export interface GameSnapshot {
  tick: number;
  players: PlayerState[];
  pellets: boolean[][];
  powerPellets: boolean[][];
  fruit: FruitState | null;
  ghostSpeedLevel: number;
  ghostFreezeUntil: number;
  /** Timestamp when ghosts may leave the center spawn */
  ghostsReleasedAt: number;
  winnerId: string | null;
  winnerName: string | null;
  status: 'playing' | 'ended';
  pacmanId: string;
}

export interface InputPayload {
  playerId: string;
  direction: Direction;
}

export interface OnlineLobbyPlayer {
  id: string;
  name: string;
  slot: number;
  isAI: boolean;
}

export interface OnlineLobbySnapshot {
  code: string;
  players: OnlineLobbyPlayer[];
  status: 'lobby' | 'playing' | 'ended';
  maxPlayers: number;
  /** Unix ms when the match auto-starts (null if not scheduled yet) */
  autoStartAt: number | null;
}

export const PLAYER_COLORS = ['#FFD700', '#FF4444', '#FF69B4', '#00FFFF', '#FF8C00'];
export const PLAYER_NAMES = ['Yellow', 'Red', 'Pink', 'Cyan', 'Orange'];

export type { FruitKind, FruitState };
