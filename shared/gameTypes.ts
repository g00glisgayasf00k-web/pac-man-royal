import type { FruitState } from './fruits';

export const WIN_SCORE = 1000;
export const PELLET_POINTS = 10;
export const POWER_PELLET_POINTS = 50;
export const TILE_SIZE = 16;
export const TICK_MS = 1000 / 60;
/** Fixed simulation step (seconds) — decoupled from display refresh rate */
export const FIXED_DT = 1 / 60;
export const MAX_SIM_STEPS_PER_FRAME = 5;
/** Scoreboard React updates per second (canvas uses full sim rate via ref) */
export const UI_SNAPSHOT_HZ = 10;
/** Tiles per second — same for Pac-Man and ghosts */
export const MOVE_SPEED = 2.3;

/** Power pellet speed boost for whoever collects it */
export const POWER_SPEED_MULT = 1.5;
export const POWER_SPEED_MS = 8000;
export const POWER_PELLET_RESPAWN_MS = 30000;

/** Single fruit respawns after collection (30s) */
export const CHERRY_RESPAWN_MS = 30000;
export const FRUIT_RESPAWN_MS = CHERRY_RESPAWN_MS;

export const LANE_CENTER_EPS = 0.1;
export const CAPTURE_COOLDOWN_MS = 1500;
export const RESPAWN_MS = 1200;
export const GHOST_HEAD_START_MS = 2000;

export type Direction = 'up' | 'down' | 'left' | 'right' | 'none';
export type GameMode = 'local' | 'online';

/** How to enter an online match from the welcome screen */
export type OnlineJoinMode = 'quick' | 'create' | 'join';

export interface OnlineLaunchOptions {
  joinMode: OnlineJoinMode;
  /** Required when joinMode is 'join' */
  code?: string;
}
export type Role = 'pacman' | 'ghost';

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
  /** 1.5× move speed while active (power pellet) */
  speedBoostUntil: number;
}

export interface GameSnapshot {
  tick: number;
  players: PlayerState[];
  pellets: boolean[][];
  powerPellets: boolean[][];
  fruit: FruitState | null;
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
  autoStartAt: number | null;
  /** Invite-only room (not listed in quick match) */
  private?: boolean;
}

export const PLAYER_COLORS = ['#FFD700', '#FF4444', '#FF69B4', '#00FFFF', '#FF8C00'];

/** Display names matching the welcome screen player cards */
export const PACMAN_DISPLAY_NAME = 'PAC-MAN';
export const GHOST_AI_NAMES = ['BLINKY', 'PINKY', 'INKY', 'CLYDE'] as const;

export const PLAYER_NAMES = [PACMAN_DISPLAY_NAME, ...GHOST_AI_NAMES];

export function ghostNameForSlot(slot: number): string {
  if (slot >= 1 && slot <= GHOST_AI_NAMES.length) {
    return GHOST_AI_NAMES[slot - 1];
  }
  return `GHOST ${slot}`;
}

export type { FruitState };
