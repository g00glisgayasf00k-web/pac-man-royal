/**
 * Original Pac-Man arcade maze (28×36) — extracted from authentic ROM layout.
 * | wall   _ out-of-bounds   (space) walkable   . pellet   o power   - ghost gate
 */
export const MAZE_LAYOUT: string[] = [
  '____________________________',
  '____________________________',
  '____________________________',
  '||||||||||||||||||||||||||||',
  ' ............||............ ',
  '|.||||.|||||.||.|||||.||||.|',
  '|o||||.|||||.||.|||||.||||o|',
  '|.||||.|||||.||.|||||.||||.|',
  ' .......................... ',
  '|.||||.||.||||||||.||.||||.|',
  '|.||||.||.||||||||.||.||||.|',
  ' ......||....||....||...... ',
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
  ' ............||............ ',
  '|.||||.|||||.||.|||||.||||.|',
  '|.||||.|||||.||.|||||.||||.|',
  '|o..||.......  .......||..o|',
  '|||.||.||.||||||||.||.||.|||',
  '|||.||.||.||||||||.||.||.|||',
  ' ......||....||....||...... ',
  '|.||||||||||.||.||||||||||.|',
  '|.||||||||||.||.||||||||||.|',
  ' .......................... ',
  '||||||||||||||||||||||||||||',
  '____________________________',
  '____________________________',
];

export const MAZE_ROWS = MAZE_LAYOUT.length;
export const MAZE_COLS = MAZE_LAYOUT[0].length;

/** Ghost-pen floor inside the house (above the gate, not the strip below the cage) */
export const BATTLE_CENTER_SPAWN = { col: 14, row: 14 };

/** First walkable tile on the path out of the pen (up the left exit lane) */
export const GHOST_PEN_EXIT_TILE = { col: 9, row: 11 };

/** Tiny offsets so stacked sprites remain visible in the same tile */
export const BATTLE_START_OFFSETS: { dx: number; dy: number }[] = [
  { dx: 0, dy: 0 },
  { dx: -0.18, dy: -0.14 },
  { dx: 0.18, dy: -0.14 },
  { dx: -0.18, dy: 0.14 },
  { dx: 0.18, dy: 0.14 },
];

/** Classic spawn positions (tile coordinates) */
export const CLASSIC_SPAWNS: { col: number; row: number }[] = [
  { col: 14, row: 33 }, // Pac-Man start (bottom corridor)
  { col: 14, row: 14 }, // Blinky (above ghost house)
  { col: 14, row: 14 }, // Pinky (ghost pen floor)
  { col: 12, row: 17 }, // Inky
  { col: 16, row: 17 }, // Clyde
];

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

/** Horizontal side tunnels (wrap left edge to right edge) */
export function isTunnelRow(row: number): boolean {
  if (row < 0 || row >= MAZE_ROWS) return false;
  return isWalkable(1, row) && isWalkable(MAZE_COLS - 2, row);
}

export function wrapCol(col: number, row: number): number {
  if (!isTunnelRow(row)) return col;
  let c = col;
  while (c < 0) c += MAZE_COLS;
  while (c >= MAZE_COLS) c -= MAZE_COLS;
  return c;
}

export function tileCenter(col: number, row: number): { x: number; y: number } {
  return { x: col + 0.5, y: row + 0.5 };
}

export function worldToTile(x: number, y: number): { col: number; row: number } {
  return { col: Math.floor(x), row: Math.floor(y) };
}

/** True inside the ghost house or its exit lanes (not the corridor below the cage) */
export function isGhostPenArea(col: number, row: number): boolean {
  if (row === 14 && col >= 10 && col <= 17) return true;
  if (row === 15 && (col === 13 || col === 14 || col === 18)) return true;
  if ((col === 9 || col === 18) && row >= 11 && row <= 21) return true;
  return false;
}

export function getBattleStartPosition(slot: number): { x: number; y: number } {
  const center = tileCenter(BATTLE_CENTER_SPAWN.col, BATTLE_CENTER_SPAWN.row);
  const off = BATTLE_START_OFFSETS[slot % BATTLE_START_OFFSETS.length];
  let x = center.x + off.dx;
  let y = center.y + off.dy;
  const { col, row } = { col: Math.floor(x), row: Math.floor(y) };
  if (!isWalkable(col, row)) {
    const c = tileCenter(BATTLE_CENTER_SPAWN.col, BATTLE_CENTER_SPAWN.row);
    x = c.x;
    y = c.y;
  }
  return { x, y };
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
