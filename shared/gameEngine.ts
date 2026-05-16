import {
  CAPTURE_COOLDOWN_MS,
  Direction,
  FRUIT_LIFETIME_MS,
  FRUIT_MAX_INTERVAL_MS,
  FRUIT_MIN_INTERVAL_MS,
  GameSnapshot,
  GHOST_SPEED_BASE,
  GHOST_SPEED_INTERVAL_MS,
  GHOST_SPEED_MAX_MULT,
  GHOST_SPEED_STEP,
  LANE_CENTER_EPS,
  MOVE_SPEED,
  PELLET_POINTS,
  PLAYER_SLOT_COLORS,
  PlayerState,
  POWER_PELLET_POINTS,
  POWER_SPEED_MS,
  POWER_SPEED_MULT,
  GHOST_HEAD_START_MS,
  RESPAWN_MS,
  WIN_SCORE,
} from './gameTypes';
import {
  FRUIT_DEFINITIONS,
  FruitState,
  getFruitSpawnCandidates,
  randomFruitKind,
} from './fruits';
import {
  chooseGhostDirection,
  choosePacmanDirection,
  oppositeDir,
  type ActorTile,
} from './ai';
import {
  findSpawnPoints,
  getBattleStartPosition,
  isWalkable,
  isWall,
  MAZE_COLS,
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

function clonePellets(): { pellets: boolean[][]; powerPellets: boolean[][] } {
  const pellets: boolean[][] = [];
  const powerPellets: boolean[][] = [];
  for (let row = 0; row < MAZE_ROWS; row++) {
    pellets[row] = [];
    powerPellets[row] = [];
    for (let col = 0; col < MAZE_COLS; col++) {
      const ch = MAZE_LAYOUT[row][col];
      pellets[row][col] = ch === '.';
      powerPellets[row][col] = ch === 'o';
    }
  }
  return { pellets, powerPellets };
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
      shieldUntil: 0,
      doubleScoreUntil: 0,
    };
  });
}

export class GameEngine {
  tick = 0;
  players: PlayerState[] = [];
  pellets: boolean[][] = [];
  powerPellets: boolean[][] = [];
  fruit: FruitState | null = null;
  ghostSpeedLevel = 0;
  ghostFreezeUntil = 0;
  winnerId: string | null = null;
  winnerName: string | null = null;
  status: 'playing' | 'ended' = 'playing';
  pacmanId = '';
  ghostsReleasedAt = 0;
  private aiTimer = 0;
  private gameStartAt = Date.now();
  private nextFruitSpawnAt = 0;
  private fruitIdSeq = 0;

  constructor(playerConfigs: { id: string; name: string; slot: number; isAI: boolean }[]) {
    const { pellets, powerPellets } = clonePellets();
    this.pellets = pellets;
    this.powerPellets = powerPellets;
    this.players = createInitialPlayers(playerConfigs);
    const pac = this.players.find((p) => p.role === 'pacman');
    this.pacmanId = pac?.id ?? this.players[0].id;
    this.gameStartAt = Date.now();
    this.ghostsReleasedAt = this.gameStartAt + GHOST_HEAD_START_MS;
    this.scheduleNextFruit();
  }

  private scheduleNextFruit() {
    const delay =
      FRUIT_MIN_INTERVAL_MS +
      Math.random() * (FRUIT_MAX_INTERVAL_MS - FRUIT_MIN_INTERVAL_MS);
    this.nextFruitSpawnAt = Date.now() + delay;
  }

  getSnapshot(): GameSnapshot {
    return {
      tick: this.tick,
      players: this.players.map((p) => ({ ...p })),
      pellets: this.pellets.map((r) => [...r]),
      powerPellets: this.powerPellets.map((r) => [...r]),
      fruit: this.fruit ? { ...this.fruit } : null,
      ghostSpeedLevel: this.ghostSpeedLevel,
      ghostFreezeUntil: this.ghostFreezeUntil,
      ghostsReleasedAt: this.ghostsReleasedAt,
      winnerId: this.winnerId,
      winnerName: this.winnerName,
      status: this.status,
      pacmanId: this.pacmanId,
    };
  }

  setInput(playerId: string, direction: Direction) {
    const p = this.players.find((pl) => pl.id === playerId);
    if (!p || this.status === 'ended' || direction === 'none') return;
    if (p.role === 'ghost' && Date.now() < this.ghostsReleasedAt) return;
    p.nextDir = direction;
    // Only commit direction when centered in the lane (or starting from standstill)
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
    this.updateGhostSpeed(now);
    this.updateFruits(now);

    for (const p of this.players) {
      if (p.respawnUntil > now) continue;
      if (p.role === 'ghost' && now < this.ghostsReleasedAt) continue;
      this.movePlayer(p, dt, now);
      if (p.role === 'pacman' && p.id === this.pacmanId) {
        this.eatPellets(p, now);
        this.tryEatFruit(p, now);
      }
    }
    if (now >= this.ghostsReleasedAt) {
      this.checkCaptures(now);
    }
    this.checkWin();
  }

  private ghostsAreReleased(now: number): boolean {
    return now >= this.ghostsReleasedAt;
  }

  private updateGhostSpeed(now: number) {
    const elapsed = now - this.gameStartAt;
    const level = Math.floor(elapsed / GHOST_SPEED_INTERVAL_MS);
    if (level > this.ghostSpeedLevel) {
      this.ghostSpeedLevel = level;
    }
  }

  private getGhostSpeedMultiplier(now: number): number {
    let mult =
      GHOST_SPEED_BASE + this.ghostSpeedLevel * GHOST_SPEED_STEP;
    mult = Math.min(mult, GHOST_SPEED_MAX_MULT);
    if (this.ghostFreezeUntil > now) mult *= 0.45;
    return mult;
  }

  private getMoveSpeed(p: PlayerState, now: number): number {
    if (p.role === 'ghost') {
      return MOVE_SPEED * this.getGhostSpeedMultiplier(now);
    }
    if (p.id === this.pacmanId && p.role === 'pacman' && p.speedBoostUntil > now) {
      return MOVE_SPEED * POWER_SPEED_MULT;
    }
    return MOVE_SPEED;
  }

  private updateFruits(now: number) {
    if (this.fruit && now >= this.fruit.despawnAt) {
      this.fruit = null;
    }
    if (!this.fruit && now >= this.nextFruitSpawnAt) {
      this.spawnFruit(now);
    }
  }

  private spawnFruit(now: number) {
    const candidates = getFruitSpawnCandidates();
    if (!candidates.length) return;
    const spot = candidates[Math.floor(Math.random() * candidates.length)];
    this.fruit = {
      id: `fruit-${++this.fruitIdSeq}`,
      kind: randomFruitKind(),
      col: spot.col,
      row: spot.row,
      despawnAt: now + FRUIT_LIFETIME_MS,
    };
    this.scheduleNextFruit();
  }

  private tryEatFruit(p: PlayerState, now: number) {
    if (!this.fruit || p.id !== this.pacmanId) return;
    const { col, row } = worldToTile(p.x, p.y);
    if (col !== this.fruit.col || row !== this.fruit.row) return;

    const def = FRUIT_DEFINITIONS[this.fruit.kind];
    const mult = p.doubleScoreUntil > now ? 2 : 1;
    p.score += def.points * mult;

    if (def.speedBoostMs) {
      p.speedBoostUntil = Math.max(p.speedBoostUntil, now + def.speedBoostMs);
    }
    if (def.shieldMs) {
      p.shieldUntil = Math.max(p.shieldUntil, now + def.shieldMs);
    }
    if (def.doubleScoreMs) {
      p.doubleScoreUntil = Math.max(p.doubleScoreUntil, now + def.doubleScoreMs);
    }
    if (def.freezeGhostsMs) {
      this.ghostFreezeUntil = Math.max(this.ghostFreezeUntil, now + def.freezeGhostsMs);
    }

    this.fruit = null;
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

      if (p.role === 'pacman' && p.id === this.pacmanId) {
        const d = choosePacmanDirection(
          this.toActor(p),
          this.pellets,
          this.powerPellets,
          ghostPositions
        );
        this.applyAIDirection(p, d);
      } else if (p.role === 'ghost' && this.ghostsAreReleased(now)) {
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
    return isWalkable(col + dx, row + dy);
  }

  private tileCenterAt(x: number, y: number) {
    return { cx: Math.floor(x) + 0.5, cy: Math.floor(y) + 0.5 };
  }

  /** Both axes centered — required to change direction at an intersection */
  private isAtIntersectionCenter(p: PlayerState): boolean {
    const { cx, cy } = this.tileCenterAt(p.x, p.y);
    return Math.abs(p.x - cx) < LANE_CENTER_EPS && Math.abs(p.y - cy) < LANE_CENTER_EPS;
  }

  /** Snap perpendicular axis so movement stays in the lane center */
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
    const { col, row } = worldToTile(probeX, probeY);
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

    if (this.wouldHitWall(p.x, p.y, p.dir)) {
      if (dx !== 0) {
        let wrapped = nx;
        if (wrapped < 0) wrapped += MAZE_COLS;
        if (wrapped >= MAZE_COLS) wrapped -= MAZE_COLS;
        if (!this.wouldHitWall(wrapped, ny, p.dir)) {
          p.x = wrapped;
          p.y = ny;
          return;
        }
      }
      const { cx, cy } = this.tileCenterAt(p.x, p.y);
      p.x = cx;
      p.y = cy;
      return;
    }

    p.x = nx;
    p.y = ny;

    const { col, row } = worldToTile(p.x, p.y);
    if (isWall(col, row)) {
      const c = tileCenter(col, row);
      p.x = c.x;
      p.y = c.y;
    }
  }

  private eatPellets(p: PlayerState, now: number) {
    const { col, row } = worldToTile(p.x, p.y);
    const mult = p.doubleScoreUntil > now ? 2 : 1;
    if (this.pellets[row]?.[col]) {
      this.pellets[row][col] = false;
      p.score += PELLET_POINTS * mult;
    }
    if (this.powerPellets[row]?.[col]) {
      this.powerPellets[row][col] = false;
      p.score += POWER_PELLET_POINTS * mult;
      p.speedBoostUntil = Math.max(p.speedBoostUntil, now + POWER_SPEED_MS);
    }
  }

  private checkCaptures(now: number) {
    const pac = this.players.find((p) => p.id === this.pacmanId && p.role === 'pacman');
    if (!pac || pac.respawnUntil > now) return;

    for (const ghost of this.players) {
      if (ghost.role !== 'ghost' || ghost.id === pac.id) continue;
      if (ghost.respawnUntil > now || ghost.captureCooldownUntil > now) continue;
      if (pac.captureCooldownUntil > now) continue;
      if (pac.shieldUntil > now) continue;
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
    const od = oldPac.dir;
    oldPac.dir = oppositeDir(newPac.dir === 'none' ? 'down' : newPac.dir);
    newPac.dir = od === 'none' ? 'up' : od;
    oldPac.nextDir = 'none';
    newPac.nextDir = 'none';
    oldPac.captureCooldownUntil = now + CAPTURE_COOLDOWN_MS;
    newPac.captureCooldownUntil = now + CAPTURE_COOLDOWN_MS;
    oldPac.respawnUntil = now + RESPAWN_MS;
    const spawns = findSpawnPoints();
    const sp = spawns[oldPac.slot % spawns.length];
    const c = tileCenter(sp.col, sp.row);
    oldPac.x = c.x;
    oldPac.y = c.y;
  }

  private checkWin() {
    for (const p of this.players) {
      if (p.score >= WIN_SCORE) {
        this.status = 'ended';
        this.winnerId = p.id;
        this.winnerName = p.name;
        return;
      }
    }
  }
}
