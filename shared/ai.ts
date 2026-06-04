import { Direction } from './gameTypes.js';
import {
  GHOST_PEN_EXIT_TILE,
  GHOST_TUNNEL_ROW,
  isGhostPenArea,
  isTunnelMouthColumn,
  isTunnelRow,
  isWalkable,
  MAZE_COLS,
  MAZE_ROWS,
  TUNNEL_LEFT_MAX,
  TUNNEL_LEFT_MIN,
  TUNNEL_RIGHT_MAX,
  TUNNEL_RIGHT_MIN,
  TUNNEL_ROW,
  wrapCol,
} from './maze.js';

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

function stepTile(col: number, row: number, dir: Direction): { col: number; row: number } | null {
  const { dx, dy } = DELTAS[dir];
  const nr = row + dy;
  const nc = dy === 0 && isTunnelRow(row) ? wrapCol(col + dx, row) : col + dx;
  if (!isWalkable(nc, nr)) return null;
  return { col: nc, row: nr };
}

function clampTile(col: number, row: number): { col: number; row: number } {
  let c = col;
  let r = row;
  if (c < 0) c = 0;
  if (c >= MAZE_COLS) c = MAZE_COLS - 1;
  if (r < 0) r = 0;
  if (r >= MAZE_ROWS) r = MAZE_ROWS - 1;
  while (!isWalkable(c, r) && r < MAZE_ROWS - 1) r++;
  while (!isWalkable(c, r) && r > 0) r--;
  while (!isWalkable(c, r) && c < MAZE_COLS - 1) c++;
  while (!isWalkable(c, r) && c > 0) c--;
  return { col: c, row: r };
}

function snapMouthCol(col: number): number {
  if (col <= (TUNNEL_LEFT_MAX + TUNNEL_RIGHT_MIN) / 2) {
    return Math.max(TUNNEL_LEFT_MIN, Math.min(col, TUNNEL_LEFT_MAX));
  }
  return Math.max(TUNNEL_RIGHT_MIN, Math.min(col, TUNNEL_RIGHT_MAX));
}

function wantsHorizontalCross(col: number, targetCol: number, targetRow: number, tunnelRow: number): boolean {
  if (targetRow === tunnelRow && targetCol !== col) return true;
  const onLeft = col <= TUNNEL_LEFT_MAX;
  const targetOnLeft = targetCol <= TUNNEL_LEFT_MAX;
  return onLeft !== targetOnLeft;
}

function approachTunnelRow(
  col: number,
  row: number,
  targetCol: number,
  targetRow: number,
  tunnelRow: number,
  approachRows: number[],
  forbid: Direction
): Direction {
  if (row === tunnelRow || !approachRows.includes(row)) return 'none';
  if (!isTunnelMouthColumn(col) && !isTunnelMouthColumn(targetCol)) return 'none';
  if (!wantsHorizontalCross(col, targetCol, targetRow, tunnelRow)) return 'none';

  const mouthCol = snapMouthCol(targetCol);
  if (col !== mouthCol) {
    const hDir: Direction = mouthCol > col ? 'right' : 'left';
    if (hDir !== forbid) {
      const h = stepTile(col, row, hDir);
      if (h && isWalkable(h.col, h.row)) return hDir;
    }
  }

  const vDir: Direction = tunnelRow > row ? 'down' : 'up';
  if (vDir === forbid) return 'none';
  const v = stepTile(col, row, vDir);
  if (v && v.row === tunnelRow && isWalkable(v.col, v.row)) return vDir;
  return 'none';
}

function tunnelApproachDirection(
  col: number,
  row: number,
  targetCol: number,
  targetRow: number,
  forbid: Direction
): Direction {
  const side = approachTunnelRow(
    col,
    row,
    targetCol,
    targetRow,
    TUNNEL_ROW,
    [TUNNEL_ROW - 1, TUNNEL_ROW + 1],
    forbid
  );
  if (side !== 'none') return side;

  return approachTunnelRow(
    col,
    row,
    targetCol,
    targetRow,
    GHOST_TUNNEL_ROW,
    [GHOST_TUNNEL_ROW - 1, GHOST_TUNNEL_ROW + 1],
    forbid
  );
}

/** One BFS from start — tile distances for all reachable cells */
function bfsDistancesFrom(fromCol: number, fromRow: number): Map<string, number> {
  const dist = new Map<string, number>();
  if (!isWalkable(fromCol, fromRow)) return dist;

  const q: { col: number; row: number; d: number }[] = [{ col: fromCol, row: fromRow, d: 0 }];
  dist.set(key(fromCol, fromRow), 0);
  let qi = 0;

  while (qi < q.length) {
    const { col, row, d } = q[qi++];
    for (const dir of DIRS) {
      const next = stepTile(col, row, dir);
      if (!next) continue;
      const k = key(next.col, next.row);
      if (dist.has(k)) continue;
      dist.set(k, d + 1);
      q.push({ col: next.col, row: next.row, d: d + 1 });
    }
  }
  return dist;
}

/** BFS path length in tiles; Infinity if unreachable */
export function bfsDistance(
  fromCol: number,
  fromRow: number,
  toCol: number,
  toRow: number
): number {
  if (fromCol === toCol && fromRow === toRow) return 0;
  const dist = bfsDistancesFrom(fromCol, fromRow);
  return dist.get(key(toCol, toRow)) ?? Infinity;
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
  let qi = 0;

  while (qi < q.length) {
    const { col, row, first } = q[qi++];
    for (const dir of DIRS) {
      if (first === null && forbidDir !== 'none' && dir === forbidDir) continue;
      const next = stepTile(col, row, dir);
      if (!next) continue;
      const k = key(next.col, next.row);
      if (seen.has(k)) continue;
      seen.add(k);
      const step = first ?? dir;
      if (next.col === toCol && next.row === toRow) return step;
      q.push({ col: next.col, row: next.row, first: step });
    }
  }
  return 'none';
}

function nearestGhostDist(
  x: number,
  y: number,
  ghostPositions: { x: number; y: number }[]
): number {
  let nearest = Infinity;
  for (const g of ghostPositions) {
    nearest = Math.min(nearest, Math.hypot(x - g.x, y - g.y));
  }
  return nearest;
}

function chooseFleeDirection(
  col: number,
  row: number,
  forbid: Direction,
  ghostPositions: { x: number; y: number }[]
): Direction {
  let best: Direction = 'none';
  let bestSafety = -1;
  for (const dir of DIRS) {
    if (dir === forbid) continue;
    const next = stepTile(col, row, dir);
    if (!next) continue;
    const safety = nearestGhostDist(next.col + 0.5, next.row + 0.5, ghostPositions);
    if (safety > bestSafety) {
      bestSafety = safety;
      best = dir;
    }
  }
  return best;
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
    case 1:
      break;
    case 2:
      targetCol = pacCol + dx * 4;
      targetRow = pacRow + dy * 4;
      break;
    case 3: {
      const bCol = blinky ? Math.floor(blinky.x) : pacCol;
      const bRow = blinky ? Math.floor(blinky.y) : pacRow;
      targetCol = pacCol + (pacCol - bCol);
      targetRow = pacRow + (pacRow - bRow);
      break;
    }
    case 4: {
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

  const target = getGhostTargetTile({ ghost, pac, blinky });

  const tunnelDir = tunnelApproachDirection(col, row, target.col, target.row, forbid);
  if (tunnelDir !== 'none') return tunnelDir;

  const pathDir = bfsFirstDirection(col, row, target.col, target.row, forbid);
  if (pathDir !== 'none') return pathDir;

  const choices = DIRS.filter((d) => {
    if (d === forbid) return false;
    return stepTile(col, row, d) !== null;
  });
  if (!choices.length) return ghost.dir !== 'none' ? ghost.dir : 'left';

  const distFromNext = bfsDistancesFrom(target.col, target.row);
  let best = choices[0];
  let bestDist = Infinity;
  for (const d of choices) {
    const next = stepTile(col, row, d)!;
    const d0 = distFromNext.get(key(next.col, next.row)) ?? Infinity;
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

  const nearestGhost = nearestGhostDist(pac.x, pac.y, ghostPositions);
  const dangerRadius = 6;

  if (nearestGhost < dangerRadius && ghostPositions.length > 0) {
    const fleeDir = chooseFleeDirection(col, row, forbid, ghostPositions);
    if (fleeDir !== 'none') return fleeDir;
  }

  const distMap = bfsDistancesFrom(col, row);
  let bestCol = col;
  let bestRow = row;
  let bestScore = Infinity;

  for (let r = 0; r < MAZE_ROWS; r++) {
    for (let c = 0; c < MAZE_COLS; c++) {
      const hasDot = pellets[r]?.[c];
      const hasPower = powerPellets[r]?.[c];
      if (!hasDot && !hasPower) continue;

      const pathLen = distMap.get(key(c, r));
      if (pathLen === undefined) continue;

      let score = pathLen;
      if (hasPower && nearestGhost > 8) score -= 3;

      if (score < bestScore) {
        bestScore = score;
        bestCol = c;
        bestRow = r;
      }
    }
  }

  const tunnelDir = tunnelApproachDirection(col, row, bestCol, bestRow, forbid);
  if (tunnelDir !== 'none') return tunnelDir;

  const huntDir = bfsFirstDirection(col, row, bestCol, bestRow, forbid);
  if (huntDir !== 'none') return huntDir;

  const choices = DIRS.filter((d) => {
    if (d === forbid) return false;
    return stepTile(col, row, d) !== null;
  });
  return choices[0] ?? 'left';
}
