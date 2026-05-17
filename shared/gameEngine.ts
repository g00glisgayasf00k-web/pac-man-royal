import {
  CAPTURE_COOLDOWN_MS,
  CHERRY_RESPAWN_MS,
  Direction,
  GameSnapshot,
  GHOST_HEAD_START_MS,
  LANE_CENTER_EPS,
  MOVE_SPEED,
  PELLET_POINTS,
  PLAYER_SLOT_COLORS,
  PlayerState,
  POWER_PELLET_POINTS,
  POWER_PELLET_RESPAWN_MS,
  POWER_SPEED_MS,
  POWER_SPEED_MULT,
  MATCH_DURATION_MS,
  PELLET_RESPAWN_MS,
  RESPAWN_MS,
} from './gameTypes';
import {
  FRUIT_POINTS,
  FruitState,
  getFruitSpawnCandidates,
  pickRandomFruitKind,
} from './fruits';
import {
  chooseGhostDirection,
  choosePacmanDirection,
  oppositeDir,
  type ActorTile,
} from './ai';
import {
  getBattleStartPosition,
  isTunnelApproachRow,
  isTunnelRow,
  isWalkable,
  isWall,
  TUNNEL_ROW,
  MAZE_COLS,
  wrapCol,
  wrapWorldX,
  MAZE_LAYOUT,
  MAZE_ROWS,
  tileCenter,
  worldToTile,
} from './maze';

const DIRS: Record<Direction, { dx: number; dy: number }> = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
  none: { dx: 0, dy: 0 },
};

function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clonePellets(): {
  pellets: boolean[][];
  powerPellets: boolean[][];
  pelletRespawnAt: number[][];
  powerRespawnAt: number[][];
} {
  const pellets: boolean[][] = [];
  const powerPellets: boolean[][] = [];
  const pelletRespawnAt: number[][] = [];
  const powerRespawnAt: number[][] = [];
  for (let row = 0; row < MAZE_ROWS; row++) {
    pellets[row] = [];
    powerPellets[row] = [];
    pelletRespawnAt[row] = [];
    powerRespawnAt[row] = [];
    for (let col = 0; col < MAZE_COLS; col++) {
      const ch = MAZE_LAYOUT[row][col];
      pellets[row][col] = ch === '.';
      powerPellets[row][col] = ch === 'o';
      pelletRespawnAt[row][col] = 0;
      powerRespawnAt[row][col] = 0;
    }
  }
  return { pellets, powerPellets, pelletRespawnAt, powerRespawnAt };
}

export function createInitialPlayers(
  configs: { id: string; name: string; slot: number; isAI: boolean }[]
): PlayerState[] {
  const pacmanIndex =
    configs.length > 0 ? Math.floor(Math.random() * configs.length) : 0;
  return configs.map((c, i) => {
    const start = getBattleStartPosition(c.slot);
    return {
      id: c.id,
      name: c.name,
      color: PLAYER_SLOT_COLORS[c.slot] ?? '#fff',
      role: i === pacmanIndex ? 'pacman' : 'ghost',
      x: start.x,
      y: start.y,
      dir: 'none',
      nextDir: 'none',
      score: 0,
      isAI: c.isAI,
      slot: c.slot,
      captureCooldownUntil: 0,
      respawnUntil: 0,
      speedBoostUntil: 0,
    };
  });
}

export class GameEngine {
  tick = 0;
  players: PlayerState[] = [];
  pellets: boolean[][] = [];
  powerPellets: boolean[][] = [];
  private pelletRespawnAt: number[][] = [];
  private powerRespawnAt: number[][] = [];
  matchEndsAt = 0;
  pelletRevision = 0;
  private pelletSnapCache: { revision: number; pellets: boolean[][]; powerPellets: boolean[][] } | null =
    null;
  fruit: FruitState | null = null;
  winnerId: string | null = null;
  winnerName: string | null = null;
  status: 'playing' | 'ended' = 'playing';
  pacmanId = '';
  ghostsReleasedAt = 0;
  private aiTimer = 0;
  private nextFruitSpawnAt = 0;
  private fruitIdSeq = 0;
  /** Base move speed for this match (defaults to MOVE_SPEED) */
  private moveSpeed: number;

  constructor(
    playerConfigs: { id: string; name: string; slot: number; isAI: boolean }[],
    options?: { moveSpeed?: number }
  ) {
    this.moveSpeed = options?.moveSpeed ?? MOVE_SPEED;
    const { pellets, powerPellets, pelletRespawnAt, powerRespawnAt } = clonePellets();
    this.pellets = pellets;
    this.powerPellets = powerPellets;
    this.pelletRespawnAt = pelletRespawnAt;
    this.powerRespawnAt = powerRespawnAt;
    this.matchEndsAt = Date.now() + MATCH_DURATION_MS;
    this.players = createInitialPlayers(playerConfigs);
    const pac = this.players.find((p) => p.role === 'pacman');
    this.pacmanId = pac?.id ?? this.players[0].id;
    this.ghostsReleasedAt = Date.now() + GHOST_HEAD_START_MS;
    this.spawnFruit();
  }

  private bumpPellets() {
    this.pelletRevision++;
    this.pelletSnapCache = null;
  }

  private pelletArraysForSnapshot() {
    if (!this.pelletSnapCache || this.pelletSnapCache.revision !== this.pelletRevision) {
      this.pelletSnapCache = {
        revision: this.pelletRevision,
        pellets: this.pellets.map((r) => [...r]),
        powerPellets: this.powerPellets.map((r) => [...r]),
      };
    }
    return this.pelletSnapCache;
  }

  getSnapshot(): GameSnapshot {
    const pellets = this.pelletArraysForSnapshot();
    return {
      tick: this.tick,
      players: this.players.map((p) => ({ ...p })),
      pellets: pellets.pellets,
      powerPellets: pellets.powerPellets,
      pelletRevision: this.pelletRevision,
      fruit: this.fruit ? { ...this.fruit } : null,
      ghostsReleasedAt: this.ghostsReleasedAt,
      matchEndsAt: this.matchEndsAt,
      winnerId: this.winnerId,
      winnerName: this.winnerName,
      status: this.status,
      pacmanId: this.pacmanId,
    };
  }

  setInput(playerId: string, direction: Direction) {
    const p = this.players.find((pl) => pl.id === playerId);
    if (!p || this.status === 'ended' || direction === 'none') return;
    if (Date.now() < this.ghostsReleasedAt) return;
    p.nextDir = direction;
    if (p.dir === 'none' && this.isAtIntersectionCenter(p) && this.canTurn(p, direction)) {
      p.dir = direction;
      this.snapToLane(p);
    }
  }

  step(dt: number) {
    if (this.status === 'ended') return;
    this.tick++;
    const now = Date.now();
    this.aiTimer += dt;
    if (this.aiTimer > 0.06) {
      this.aiTimer = 0;
      this.runAI();
    }
    this.updatePelletRespawns(now);
    this.updateFruit(now);

    for (const p of this.players) {
      if (p.respawnUntil > now) continue;
      if (now < this.ghostsReleasedAt) continue;
      this.movePlayer(p, dt, now);
      this.collectPickups(p, now);
    }
    if (now >= this.ghostsReleasedAt) {
      this.checkCaptures(now);
    }
    this.checkWin();
  }

  /** Same base speed for every player. Only the current Pac-Man may move faster (power pellet). */
  private getMoveSpeed(p: PlayerState, now: number): number {
    const isPac = p.id === this.pacmanId && p.role === 'pacman';
    if (isPac && p.speedBoostUntil > now) {
      return this.moveSpeed * POWER_SPEED_MULT;
    }
    return this.moveSpeed;
  }

  private updatePelletRespawns(now: number) {
    let changed = false;
    for (let row = 0; row < MAZE_ROWS; row++) {
      for (let col = 0; col < MAZE_COLS; col++) {
        const pelletAt = this.pelletRespawnAt[row]?.[col] ?? 0;
        if (pelletAt > 0 && now >= pelletAt) {
          this.pellets[row][col] = true;
          this.pelletRespawnAt[row][col] = 0;
          changed = true;
        }
        const powerAt = this.powerRespawnAt[row]?.[col] ?? 0;
        if (powerAt > 0 && now >= powerAt) {
          this.powerPellets[row][col] = true;
          this.powerRespawnAt[row][col] = 0;
          changed = true;
        }
      }
    }
    if (changed) this.bumpPellets();
  }

  private updateFruit(now: number) {
    if (!this.fruit && now >= this.nextFruitSpawnAt) {
      this.spawnFruit();
    }
  }

  private spawnFruit() {
    const candidates = getFruitSpawnCandidates();
    if (!candidates.length) return;
    const spot = candidates[Math.floor(Math.random() * candidates.length)];
    this.fruit = {
      id: `fruit-${++this.fruitIdSeq}`,
      kind: pickRandomFruitKind(),
      col: spot.col,
      row: spot.row,
    };
    this.nextFruitSpawnAt = Number.MAX_SAFE_INTEGER;
  }

  private collectPickups(p: PlayerState, now: number) {
    const { col, row } = worldToTile(p.x, p.y);
    const isPac = p.id === this.pacmanId && p.role === 'pacman';

    if (isPac && this.pellets[row]?.[col]) {
      this.pellets[row][col] = false;
      this.pelletRespawnAt[row][col] = now + PELLET_RESPAWN_MS;
      this.bumpPellets();
      p.score += PELLET_POINTS;
    }

    if (this.powerPellets[row]?.[col]) {
      this.powerPellets[row][col] = false;
      this.powerRespawnAt[row][col] = now + POWER_PELLET_RESPAWN_MS;
      this.bumpPellets();
      p.score += POWER_PELLET_POINTS;
      if (isPac) {
        p.speedBoostUntil = Math.max(p.speedBoostUntil, now + POWER_SPEED_MS);
      }
    }

    if (
      isPac &&
      this.fruit &&
      col === this.fruit.col &&
      row === this.fruit.row
    ) {
      p.score += FRUIT_POINTS[this.fruit.kind];
      this.fruit = null;
      this.nextFruitSpawnAt = now + CHERRY_RESPAWN_MS;
    }
  }

  private toActor(p: PlayerState): ActorTile {
    return {
      col: Math.floor(p.x),
      row: Math.floor(p.y),
      dir: p.dir,
      slot: p.slot,
      x: p.x,
      y: p.y,
    };
  }

  private applyAIDirection(p: PlayerState, d: Direction) {
    if (d === 'none' || !this.canTurn(p, d)) return;
    p.nextDir = d;
    if (p.dir === 'none' || this.isAtIntersectionCenter(p)) {
      p.dir = d;
      this.snapToLane(p);
    }
  }

  private runAI() {
    const pac = this.players.find((p) => p.id === this.pacmanId);
    if (!pac) return;

    const now = Date.now();
    const blinky = this.players.find((p) => p.role === 'ghost' && p.slot === 1 && p.respawnUntil <= now);
    const ghostPositions = this.players
      .filter((g) => g.role === 'ghost' && g.respawnUntil <= now && g.id !== pac.id)
      .map((g) => ({ x: g.x, y: g.y }));

    for (const p of this.players) {
      if (!p.isAI || p.respawnUntil > now) continue;
      if (now < this.ghostsReleasedAt) continue;

      if (p.role === 'pacman' && p.id === this.pacmanId) {
        const d = choosePacmanDirection(
          this.toActor(p),
          this.pellets,
          this.powerPellets,
          ghostPositions
        );
        this.applyAIDirection(p, d);
      } else if (p.role === 'ghost' && now >= this.ghostsReleasedAt) {
        const d = chooseGhostDirection(
          this.toActor(p),
          this.toActor(pac),
          blinky ? this.toActor(blinky) : null
        );
        this.applyAIDirection(p, d);
      }
    }
  }

  private canTurn(p: PlayerState, dir: Direction): boolean {
    if (dir === 'none') return false;
    const { dx, dy } = DIRS[dir];
    const { col, row } = worldToTile(p.x, p.y);
    const nc = dx !== 0 && isTunnelRow(row) ? wrapCol(col + dx, row) : col + dx;
    return isWalkable(nc, row + dy);
  }

  private tileCenterAt(x: number, y: number) {
    return { cx: Math.floor(x) + 0.5, cy: Math.floor(y) + 0.5 };
  }

  private isAtIntersectionCenter(p: PlayerState): boolean {
    const { cx, cy } = this.tileCenterAt(p.x, p.y);
    return Math.abs(p.x - cx) < LANE_CENTER_EPS && Math.abs(p.y - cy) < LANE_CENTER_EPS;
  }

  private snapToLane(p: PlayerState) {
    const { cx, cy } = this.tileCenterAt(p.x, p.y);
    if (p.dir === 'left' || p.dir === 'right') {
      p.y = cy;
    } else if (p.dir === 'up' || p.dir === 'down') {
      p.x = cx;
    }
  }

  private nudgeTowardLaneCenter(p: PlayerState, dt: number, now: number) {
    const { cx, cy } = this.tileCenterAt(p.x, p.y);
    const rate = this.getMoveSpeed(p, now) * 5 * dt;
    if (p.dir === 'left' || p.dir === 'right') {
      const d = cy - p.y;
      if (Math.abs(d) <= rate) p.y = cy;
      else p.y += Math.sign(d) * rate;
    } else if (p.dir === 'up' || p.dir === 'down') {
      const d = cx - p.x;
      if (Math.abs(d) <= rate) p.x = cx;
      else p.x += Math.sign(d) * rate;
    }
  }

  private tryApplyQueuedTurn(p: PlayerState) {
    if (p.nextDir === 'none' || p.nextDir === p.dir) return;
    if (!this.isAtIntersectionCenter(p)) return;
    if (!this.canTurn(p, p.nextDir)) return;
    p.dir = p.nextDir;
    this.snapToLane(p);
  }

  private wouldHitWall(x: number, y: number, dir: Direction): boolean {
    const { dx, dy } = DIRS[dir];
    const probeX = x + dx * 0.42;
    const probeY = y + dy * 0.42;
    let { col, row } = worldToTile(probeX, probeY);
    if (isTunnelRow(row) && dx !== 0) {
      col = wrapCol(col, row);
      return !isWalkable(col, row);
    }
    return isWall(col, row);
  }

  private movePlayer(p: PlayerState, dt: number, now: number) {
    if (p.dir === 'none') {
      if (
        p.nextDir !== 'none' &&
        this.isAtIntersectionCenter(p) &&
        this.canTurn(p, p.nextDir)
      ) {
        p.dir = p.nextDir;
        this.snapToLane(p);
      } else {
        return;
      }
    }

    this.nudgeTowardLaneCenter(p, dt, now);
    this.tryApplyQueuedTurn(p);

    const { dx, dy } = DIRS[p.dir];
    const speed = this.getMoveSpeed(p, now) * dt;
    let nx = p.x + dx * speed;
    let ny = p.y + dy * speed;

    if (dx !== 0) ny = Math.floor(p.y) + 0.5;
    if (dy !== 0) nx = Math.floor(p.x) + 0.5;

    const tunnelRow = Math.floor(ny);
    if (isTunnelRow(tunnelRow) && dx !== 0) {
      nx = wrapWorldX(nx, tunnelRow);
    }

    if (this.wouldHitWall(p.x, p.y, p.dir)) {
      const { row } = worldToTile(p.x, p.y);
      if (
        isTunnelApproachRow(row) &&
        (p.dir === 'left' || p.dir === 'right') &&
        p.nextDir === 'none'
      ) {
        const vDir: Direction = row < TUNNEL_ROW ? 'down' : 'up';
        if (!this.wouldHitWall(p.x, p.y, vDir)) {
          p.dir = vDir;
          this.snapToLane(p);
        } else {
          const { cx, cy } = this.tileCenterAt(p.x, p.y);
          p.x = cx;
          p.y = cy;
          return;
        }
      } else {
        const { cx, cy } = this.tileCenterAt(p.x, p.y);
        p.x = cx;
        p.y = cy;
        return;
      }
    }

    p.x = nx;
    p.y = ny;

    const { col, row } = worldToTile(p.x, p.y);
    if (isWall(col, row) && !(isTunnelRow(row) && dx !== 0)) {
      const c = tileCenter(col, row);
      p.x = c.x;
      p.y = c.y;
    }
  }

  private checkCaptures(now: number) {
    const pac = this.players.find((p) => p.id === this.pacmanId && p.role === 'pacman');
    if (!pac || pac.respawnUntil > now) return;

    for (const ghost of this.players) {
      if (ghost.role !== 'ghost' || ghost.id === pac.id) continue;
      if (ghost.respawnUntil > now || ghost.captureCooldownUntil > now) continue;
      if (pac.captureCooldownUntil > now) continue;
      if (dist(pac, ghost) < 0.55) {
        this.swapRoles(pac, ghost, now);
        break;
      }
    }
  }

  private swapRoles(oldPac: PlayerState, newPac: PlayerState, now: number) {
    oldPac.role = 'ghost';
    newPac.role = 'pacman';
    this.pacmanId = newPac.id;
    oldPac.speedBoostUntil = 0;
    newPac.speedBoostUntil = 0;
    const od = oldPac.dir;
    oldPac.dir = oppositeDir(newPac.dir === 'none' ? 'down' : newPac.dir);
    newPac.dir = od === 'none' ? 'up' : od;
    oldPac.nextDir = 'none';
    newPac.nextDir = 'none';
    oldPac.captureCooldownUntil = now + CAPTURE_COOLDOWN_MS;
    newPac.captureCooldownUntil = now + CAPTURE_COOLDOWN_MS;
    oldPac.respawnUntil = now + RESPAWN_MS;
    const pen = getBattleStartPosition(oldPac.slot);
    oldPac.x = pen.x;
    oldPac.y = pen.y;
  }

  private checkWin() {
    if (Date.now() < this.matchEndsAt) return;

    let winner = this.players[0];
    for (const p of this.players) {
      if (p.score > winner.score) winner = p;
    }
    const top = winner.score;
    const tied = this.players.filter((p) => p.score === top);
    if (tied.length > 1) {
      winner = tied.reduce((a, b) => (a.slot < b.slot ? a : b));
    }

    this.status = 'ended';
    this.winnerId = winner.id;
    this.winnerName = winner.name;
  }
}
