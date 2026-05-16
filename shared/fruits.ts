import { isWalkable, MAZE_COLS, MAZE_ROWS } from './maze';

export const CHERRY_POINTS = 100;

export interface FruitState {
  id: string;
  col: number;
  row: number;
}

function inGhostHouse(col: number, row: number): boolean {
  return row >= 15 && row <= 21 && col >= 10 && col <= 17;
}

let spawnCache: { col: number; row: number }[] | null = null;

export function getCherrySpawnCandidates(): { col: number; row: number }[] {
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
