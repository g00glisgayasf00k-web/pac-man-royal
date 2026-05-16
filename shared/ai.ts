import { Direction } from './gameTypes';
import {
  GHOST_PEN_EXIT_TILE,
  isGhostPenArea,
  isWalkable,
  MAZE_COLS,
  MAZE_ROWS,
} from './maze';

const DIRS: Direction[] = ['up', 'down', 'left', 'right'];
const DELTAS: Record<Direction, { dx: number; dy: number }> = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
  none: { dx: 0, dy: 0 },
};

export function oppositeDir(d: Direction): Direction {
  const m: Record<Direction, Direction> = {
    up: 'down',
    down: 'up',
    left: 'right',
    right: 'left',
    none: 'none',
  };
  return m[d];
}

function key(col: number, row: number) {
  return `${col},${row}`;
}

function clampTile(col: number, row: number): { col: number; row: number } {
  let c = col;
  let r = row;
  if (c < 0) c = 0;
  if (c >= MAZE_COLS) c = MAZE_COLS - 1;
  if (r < 0) r = 0;
  if (r >= MAZE_ROWS) r = MAZE_ROWS - 1;
  while (!isWalkable(c, r) && r < MAZE_ROWS - 1) r++;
  while (!isWalkable(c, r) && c < MAZE_COLS - 1) c++;
  return { col: c, row: r };
}

/** BFS path length in tiles; Infinity if unreachable */
export function bfsDistance(
  fromCol: number,
  fromRow: number,
  toCol: number,
  toRow: number
): number {
  if (fromCol === toCol && fromRow === toRow) return 0;
  if (!isWalkable(toCol, toRow)) return Infinity;

  const seen = new Set<string>([key(fromCol, fromRow)]);
  const q: { col: number; row: number; dist: number }[] = [{ col: fromCol, row: fromRow, dist: 0 }];

  while (q.length) {
    const { col, row, dist } = q.shift()!;
    for (const dir of DIRS) {
      const { dx, dy } = DELTAS[dir];
      const nc = col + dx;
      const nr = row + dy;
      const k = key(nc, nr);
      if (!isWalkable(nc, nr) || seen.has(k)) continue;
      if (nc === toCol && nr === toRow) return dist + 1;
      seen.add(k);
      q.push({ col: nc, row: nr, dist: dist + 1 });
    }
  }
  return Infinity;
}

/** First direction to take on shortest path toward target */
export function bfsFirstDirection(
  fromCol: number,
  fromRow: number,
  toCol: number,
  toRow: number,
  forbidDir: Direction = 'none'
): Direction {
  if (fromCol === toCol && fromRow === toRow) return 'none';
  if (!isWalkable(toCol, toRow)) return 'none';

  type Node = { col: number; row: number; first: Direction | null };
  const seen = new Set<string>([key(fromCol, fromRow)]);
  const q: Node[] = [{ col: fromCol, row: fromRow, first: null }];

  while (q.length) {
    const { col, row, first } = q.shift()!;
    for (const dir of DIRS) {
      if (first === null && forbidDir !== 'none' && dir === forbidDir) continue;
      const { dx, dy } = DELTAS[dir];
      const nc = col + dx;
      const nr = row + dy;
      const k = key(nc, nr);
      if (!isWalkable(nc, nr) || seen.has(k)) continue;
      seen.add(k);
      const step = first ?? dir;
      if (nc === toCol && nr === toRow) return step;
      q.push({ col: nc, row: nr, first: step });
    }
  }
  return 'none';
}

export interface ActorTile {
  col: number;
  row: number;
  dir: Direction;
  slot: number;
  x: number;
  y: number;
}

export interface GhostTargetCtx {
  ghost: ActorTile;
  pac: ActorTile;
  blinky: ActorTile | null;
}

/** Classic ghost targeting by slot (1=red … 4=orange) */
export function getGhostTargetTile(ctx: GhostTargetCtx): { col: number; row: number } {
  const { ghost, pac, blinky } = ctx;
  const pacCol = Math.floor(pac.x);
  const pacRow = Math.floor(pac.y);
  const pacDir = pac.dir === 'none' ? 'left' : pac.dir;
  const { dx, dy } = DELTAS[pacDir];

  let targetCol = pacCol;
  let targetRow = pacRow;

  switch (ghost.slot) {
    case 1: // Blinky — direct chase
      break;
    case 2: // Pinky — ambush (4 tiles ahead of Pac-Man)
      targetCol = pacCol + dx * 4;
      targetRow = pacRow + dy * 4;
      break;
    case 3: { // Inky — flanks using Blinky + Pac-Man
      const bCol = blinky ? Math.floor(blinky.x) : pacCol;
      const bRow = blinky ? Math.floor(blinky.y) : pacRow;
      targetCol = pacCol + (pacCol - bCol);
      targetRow = pacRow + (pacRow - bRow);
      break;
    }
    case 4: { // Clyde — chase when far, scatter corner when close
      const d = Math.hypot(ghost.x - pac.x, ghost.y - pac.y);
      if (d < 8) {
        targetCol = 0;
        targetRow = MAZE_ROWS - 4;
      }
      break;
    }
    default:
      break;
  }

  return clampTile(targetCol, targetRow);
}

export function chooseGhostDirection(
  ghost: ActorTile,
  pac: ActorTile,
  blinky: ActorTile | null
): Direction {
  const col = Math.floor(ghost.x);
  const row = Math.floor(ghost.y);
  const forbid = ghost.dir !== 'none' ? oppositeDir(ghost.dir) : 'none';
  const target = getGhostTargetTile({ ghost, pac, blinky });

  const pathDir = bfsFirstDirection(col, row, target.col, target.row, forbid);
  if (pathDir !== 'none') return pathDir;

  // Fallback: greedy step toward target among legal turns
  const choices = DIRS.filter((d) => {
    if (d === forbid) return false;
    const { dx, dy } = DELTAS[d];
    return isWalkable(col + dx, row + dy);
  });
  if (!choices.length) return ghost.dir !== 'none' ? ghost.dir : 'left';

  let best = choices[0];
  let bestDist = Infinity;
  for (const d of choices) {
    const { dx, dy } = DELTAS[d];
    const d0 = bfsDistance(col + dx, row + dy, target.col, target.row);
    if (d0 < bestDist) {
      bestDist = d0;
      best = d;
    }
  }
  return best;
}

export function choosePacmanDirection(
  pac: ActorTile,
  pellets: boolean[][],
  powerPellets: boolean[][],
  ghostPositions: { x: number; y: number }[]
): Direction {
  const col = Math.floor(pac.x);
  const row = Math.floor(pac.y);
  const forbid = pac.dir !== 'none' ? oppositeDir(pac.dir) : 'none';

  if (isGhostPenArea(col, row)) {
    const exitDir = bfsFirstDirection(
      col,
      row,
      GHOST_PEN_EXIT_TILE.col,
      GHOST_PEN_EXIT_TILE.row,
      forbid
    );
    if (exitDir !== 'none') return exitDir;
  }

  const dangerRadius = 6;
  let nearestGhost = Infinity;
  for (const g of ghostPositions) {
    const d = Math.hypot(pac.x - g.x, pac.y - g.y);
    if (d < nearestGhost) nearestGhost = d;
  }

  // Flee when a ghost is close
  if (nearestGhost < dangerRadius && ghostPositions.length > 0) {
    let fleeCol = col;
    let fleeRow = row;
    let bestSafety = -1;
    for (let r = 0; r < MAZE_ROWS; r++) {
      for (let c = 0; c < MAZE_COLS; c++) {
        if (!isWalkable(c, r)) continue;
        const dPath = bfsDistance(col, row, c, r);
        if (dPath > 14) continue;
        let minGhost = Infinity;
        for (const g of ghostPositions) {
          const gCol = Math.floor(g.x);
          const gRow = Math.floor(g.y);
          const gd = bfsDistance(c, r, gCol, gRow);
          if (gd < minGhost) minGhost = gd;
        }
        if (minGhost > bestSafety) {
          bestSafety = minGhost;
          fleeCol = c;
          fleeRow = r;
        }
      }
    }
    const fleeDir = bfsFirstDirection(col, row, fleeCol, fleeRow, forbid);
    if (fleeDir !== 'none') return fleeDir;
  }

  // Hunt nearest pellet (prefer power pellets when safe)
  let bestCol = col;
  let bestRow = row;
  let bestScore = Infinity;

  for (let r = 0; r < MAZE_ROWS; r++) {
    for (let c = 0; c < MAZE_COLS; c++) {
      const hasDot = pellets[r]?.[c];
      const hasPower = powerPellets[r]?.[c];
      if (!hasDot && !hasPower) continue;

      const pathLen = bfsDistance(col, row, c, r);
      if (pathLen === Infinity) continue;

      let score = pathLen;
      if (hasPower && nearestGhost > 8) score -= 3;
      if (hasDot) score += 0;

      if (score < bestScore) {
        bestScore = score;
        bestCol = c;
        bestRow = r;
      }
    }
  }

  const huntDir = bfsFirstDirection(col, row, bestCol, bestRow, forbid);
  if (huntDir !== 'none') return huntDir;

  const choices = DIRS.filter((d) => {
    if (d === forbid) return false;
    const { dx, dy } = DELTAS[d];
    return isWalkable(col + dx, row + dy);
  });
  return choices[0] ?? 'left';
}
