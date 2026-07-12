/**
 * Classic Pac-Royale arcade maze (28×36) — authentic ROM layout.
 * | wall   _ out-of-bounds   (space) walkable   . pellet   o power   - ghost gate
 */
export const MAZE_LAYOUT: string[] = [
  '____________________________',
  '____________________________',
  '____________________________',
  '||||||||||||||||||||||||||||',
  '|............||............|',
  '|.||||.|||||.||.|||||.||||.|',
  '|o||||.|||||.||.|||||.||||o|',
  '|.||||.|||||.||.|||||.||||.|',
  '|..........................|',
  '|.||||.||.||||||||.||.||||.|',
  '|.||||.||.||||||||.||.||||.|',
  '|......||....||....||......|',
  '||||||.||||| || |||||.||||||',
  '_____|.||||| || |||||.|_____',
  '_____|.||          ||.|_____',
  '_____|.|| |||--||| ||.|_____',
  '||||||.|| |______| ||.||||||',
  '      .   |______|   .      ',
  '||||||.|| |______| ||.||||||',
  '_____|.|| |||||||| ||.|_____',
  '_____|.||          ||.|_____',
  '_____|.|| |||||||| ||.|_____',
  '||||||.|| |||||||| ||.||||||',
  '|............||............|',
  '|.||||.|||||.||.|||||.||||.|',
  '|.||||.|||||.||.|||||.||||.|',
  '|o..||.......  .......||..o|',
  '|||.||.||.||||||||.||.||.|||',
  '|||.||.||.||||||||.||.||.|||',
  '|......||....||....||......|',
  '|.||||||||||.||.||||||||||.|',
  '|.||||||||||.||.||||||||||.|',
  '|..........................|',
  '||||||||||||||||||||||||||||',
  '____________________________',
  '____________________________',
];

export const MAZE_ROWS = MAZE_LAYOUT.length;
export const MAZE_COLS = MAZE_LAYOUT[0].length;

/** Open floor inside the ghost-house centre box (below the pink gate) */
export const GHOST_PEN_FLOOR_ROW = 20;
export const GHOST_PEN_GATE_ROW = 15;

/** @deprecated Use GHOST_PEN_FLOOR_ROW — kept for imports */
export const BATTLE_CENTER_SPAWN = { col: 14, row: GHOST_PEN_FLOOR_ROW };

/** First walkable tile on the path out of the pen (up the left exit lane) */
export const GHOST_PEN_EXIT_TILE = { col: 9, row: 11 };

/** Side tunnel row — `......||....||....||......` */
export const TUNNEL_ROW = 11;
/** Ghost-house warp corridor — `      .   |______|   .      ` */
export const GHOST_TUNNEL_ROW = 17;

export const TUNNEL_LEFT_MIN = 0;
export const TUNNEL_LEFT_MAX = 6;
export const TUNNEL_RIGHT_MIN = 21;
export const TUNNEL_RIGHT_MAX = 26;
const TUNNEL_WRAP_DELTA = TUNNEL_RIGHT_MAX - TUNNEL_LEFT_MIN + 1;

/** One tile per player slot on the pen floor (not row 14 above the gate) */
export const GHOST_PEN_SPAWN_TILES: { col: number; row: number }[] = [
  { col: 14, row: GHOST_PEN_FLOOR_ROW },
  { col: 12, row: GHOST_PEN_FLOOR_ROW },
  { col: 16, row: GHOST_PEN_FLOOR_ROW },
  { col: 13, row: GHOST_PEN_FLOOR_ROW },
  { col: 15, row: GHOST_PEN_FLOOR_ROW },
];

export const CLASSIC_SPAWNS: { col: number; row: number }[] = [
  { col: 14, row: 33 },
  { col: 14, row: 20 },
  { col: 14, row: 20 },
  { col: 12, row: 17 },
  { col: 16, row: 17 },
];

export function isTunnelMouthColumn(col: number): boolean {
  return (
    (col >= TUNNEL_LEFT_MIN && col <= TUNNEL_LEFT_MAX) ||
    (col >= TUNNEL_RIGHT_MIN && col <= TUNNEL_RIGHT_MAX)
  );
}

export function tileAt(col: number, row: number): string {
  if (row < 0 || row >= MAZE_ROWS || col < 0 || col >= MAZE_COLS) return '_';
  return MAZE_LAYOUT[row][col];
}

export function isWall(col: number, row: number): boolean {
  const t = tileAt(col, row);
  return t === '|' || t === '_';
}

export function isGate(col: number, row: number): boolean {
  return tileAt(col, row) === '-';
}

export function isWalkable(col: number, row: number): boolean {
  const t = tileAt(col, row);
  return t === ' ' || t === '.' || t === 'o' || t === '-';
}

export function isTunnelRow(row: number): boolean {
  return row === TUNNEL_ROW || row === GHOST_TUNNEL_ROW;
}

export function wrapCol(col: number, row: number): number {
  if (!isTunnelRow(row)) return col;
  if (col < TUNNEL_LEFT_MIN) return col + TUNNEL_WRAP_DELTA;
  if (col > TUNNEL_RIGHT_MAX) return col - TUNNEL_WRAP_DELTA;
  return col;
}

export function wrapWorldX(x: number, row: number): number {
  if (!isTunnelRow(row)) return x;
  if (x < TUNNEL_LEFT_MIN) return x + TUNNEL_WRAP_DELTA;
  if (x >= TUNNEL_RIGHT_MAX + 1) return x - TUNNEL_WRAP_DELTA;
  return x;
}

export function tileCenter(col: number, row: number): { x: number; y: number } {
  return { x: col + 0.5, y: row + 0.5 };
}

export function worldToTile(x: number, y: number): { col: number; row: number } {
  return { col: Math.floor(x), row: Math.floor(y) };
}

export function isGhostPenArea(col: number, row: number): boolean {
  if (row === GHOST_PEN_FLOOR_ROW && col >= 9 && col <= 17) return true;
  if (row === GHOST_PEN_GATE_ROW && col >= 13 && col <= 15) return true;
  if ((col === 9 || col === 18) && row >= 11 && row <= GHOST_PEN_FLOOR_ROW + 1) return true;
  return false;
}

export function getBattleStartPosition(slot: number): { x: number; y: number } {
  const tile = GHOST_PEN_SPAWN_TILES[slot % GHOST_PEN_SPAWN_TILES.length];
  if (isWalkable(tile.col, tile.row)) {
    return tileCenter(tile.col, tile.row);
  }
  return tileCenter(BATTLE_CENTER_SPAWN.col, GHOST_PEN_FLOOR_ROW);
}

export function findSpawnPoints(): { col: number; row: number }[] {
  const spawns: { col: number; row: number }[] = [];
  for (const s of CLASSIC_SPAWNS) {
    if (isWalkable(s.col, s.row)) spawns.push({ col: s.col, row: s.row });
  }
  if (spawns.length >= 5) return spawns;
  for (let row = 0; row < MAZE_ROWS; row++) {
    for (let col = 0; col < MAZE_COLS; col++) {
      if (isWalkable(col, row) && !spawns.some((p) => p.col === col && p.row === row)) {
        spawns.push({ col, row });
        if (spawns.length >= 5) return spawns;
      }
    }
  }
  return spawns;
}
