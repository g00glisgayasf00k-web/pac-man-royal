import { isWalkable, MAZE_COLS, MAZE_ROWS } from './maze';

export type FruitKind = 'cherry' | 'strawberry' | 'orange' | 'apple' | 'grape';

export interface FruitDefinition {
  kind: FruitKind;
  label: string;
  color: string;
  points: number;
  /** Effect description for HUD */
  effect: string;
  speedBoostMs?: number;
  shieldMs?: number;
  doubleScoreMs?: number;
  freezeGhostsMs?: number;
}

export const FRUIT_DEFINITIONS: Record<FruitKind, FruitDefinition> = {
  cherry: {
    kind: 'cherry',
    label: 'Cherry',
    color: '#ff2d55',
    points: 100,
    effect: 'Speed boost',
    speedBoostMs: 4000,
  },
  strawberry: {
    kind: 'strawberry',
    label: 'Strawberry',
    color: '#ff4466',
    points: 200,
    effect: '2× pellet points',
    doubleScoreMs: 10000,
  },
  orange: {
    kind: 'orange',
    label: 'Orange',
    color: '#ff8c00',
    points: 150,
    effect: 'Slow ghosts',
    freezeGhostsMs: 7000,
  },
  apple: {
    kind: 'apple',
    label: 'Apple',
    color: '#ff3333',
    points: 150,
    effect: 'Shield',
    shieldMs: 8000,
  },
  grape: {
    kind: 'grape',
    label: 'Grape',
    color: '#9b59ff',
    points: 250,
    effect: 'Long speed boost',
    speedBoostMs: 8000,
  },
};

export const FRUIT_KINDS: FruitKind[] = ['cherry', 'strawberry', 'orange', 'apple', 'grape'];

export interface FruitState {
  id: string;
  kind: FruitKind;
  col: number;
  row: number;
  despawnAt: number;
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

export function randomFruitKind(): FruitKind {
  return FRUIT_KINDS[Math.floor(Math.random() * FRUIT_KINDS.length)];
}
