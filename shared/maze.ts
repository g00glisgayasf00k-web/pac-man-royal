/**
 * Classic Pac-Man maze (28×36) — enclosed border, no side warp tunnels.
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
  '||||||.||....||....||....|||',
  '||||||.||||| || |||||.||||||',
  '_____|.||||| || |||||.|_____',
  '_____|.||          ||.|_____',
  '_____|.|| |||--||| ||.|_____',
  '||||||.|| |______| ||.||||||',
  '||||||.||          ||.||||||',
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
  '|.||||.||....||....||.||||.|',
  '|.||||||||||.||.||||||||||.|',
  '|.||||||||||.||.||||||||||.|',
  '|..........................|',
  '||||||||||||||||||||||||||||',
  '____________________________',
  '____________________________',
];

export const MAZE_ROWS = MAZE_LAYOUT.length;
export const MAZE_COLS = MAZE_LAYOUT[0].length;

/** Central box floor inside the ghost house */
export const BATTLE_CENTER_SPAWN = { col: 14, row: 20 };

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
  { col: 14, row: 33 },
  { col: 14, row: 20 },
  { col: 14, row: 20 },
  { col: 14, row: 17 },
  { col: 14, row: 17 },
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

/** No warp tunnels in the enclosed layout */
export function isTunnelRow(_row: number): boolean {
  return false;
}

export function wrapCol(col: number, _row: number): number {
  return col;
}

export function wrapWorldX(x: number, _row: number): number {
  return x;
}

export function tileCenter(col: number, row: number): { x: number; y: number } {
  return { x: col + 0.5, y: row + 0.5 };
}

export function worldToTile(x: number, y: number): { col: number; row: number } {
  return { col: Math.floor(x), row: Math.floor(y) };
}

/** True inside the central box, gate, or side exit lanes */
export function isGhostPenArea(col: number, row: number): boolean {
  if (row === BATTLE_CENTER_SPAWN.row && col >= 9 && col <= 17) return true;
  if (row === BATTLE_CENTER_SPAWN.row + 1 && col >= 13 && col <= 15 && isGate(col, row)) return true;
  if ((col === 9 || col === 18) && row >= 11 && row <= BATTLE_CENTER_SPAWN.row + 1) return true;
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
