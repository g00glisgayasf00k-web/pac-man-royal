import { isWalkable, MAZE_COLS, MAZE_ROWS } from './maze.js';

export type FruitKind = 'cherry' | 'orange' | 'apple' | 'lemon';

export const FRUIT_KINDS: FruitKind[] = ['cherry', 'orange', 'apple', 'lemon'];

export const FRUIT_POINTS: Record<FruitKind, number> = {
  cherry: 25,
  orange: 50,
  apple: 75,
  lemon: 100,
};

export const FRUIT_LABELS: Record<FruitKind, string> = {
  cherry: 'Cherry',
  orange: 'Orange',
  apple: 'Apple',
  lemon: 'Lemon',
};

export interface FruitState {
  id: string;
  kind: FruitKind;
  col: number;
  row: number;
}

function inGhostHouse(col: number, row: number): boolean {
  return row >= 15 && row <= 21 && col >= 10 && col <= 17;
}

let spawnCache: { col: number; row: number }[] | null = null;

export function getFruitSpawnCandidates(): { col: number; row: number }[] {
  if (spawnCache) return spawnCache;
  const list: { col: number; row: number }[] = [];
  for (let row = 3; row < MAZE_ROWS - 3; row++) {
    for (let col = 1; col < MAZE_COLS - 1; col++) {
      if (!isWalkable(col, row) || inGhostHouse(col, row)) continue;
      list.push({ col, row });
    }
  }
  spawnCache = list;
  return list;
}

export function pickRandomFruitKind(): FruitKind {
  return FRUIT_KINDS[Math.floor(Math.random() * FRUIT_KINDS.length)];
}
