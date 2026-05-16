import type { GameSnapshot, PlayerState } from '../../../shared/gameTypes';

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function lerpPlayer(from: PlayerState, to: PlayerState, t: number): PlayerState {
  return {
    ...to,
    x: lerp(from.x, to.x, t),
    y: lerp(from.y, to.y, t),
  };
}

function blendPlayers(from: GameSnapshot, to: GameSnapshot, t: number): PlayerState[] {
  return to.players.map((tp) => {
    const fp = from.players.find((p) => p.id === tp.id);
    return fp ? lerpPlayer(fp, tp, t) : tp;
  });
}

/** Smooth between two sim / network snapshots for display */
export function interpolateSnapshots(
  from: GameSnapshot,
  to: GameSnapshot,
  t: number
): GameSnapshot {
  const alpha = Math.max(0, Math.min(1, t));
  return { ...to, players: blendPlayers(from, to, alpha) };
}

/** Continue motion briefly when the next snapshot is late (online jitter) */
export function extrapolateSnapshots(
  from: GameSnapshot,
  to: GameSnapshot,
  /** 0 = at `to`, 1 = one blend period past `to` */
  past: number
): GameSnapshot {
  const p = Math.max(0, Math.min(1, past));
  const players = to.players.map((tp) => {
    const fp = from.players.find((x) => x.id === tp.id);
    if (!fp) return tp;
    const vx = tp.x - fp.x;
    const vy = tp.y - fp.y;
    return { ...tp, x: tp.x + vx * p, y: tp.y + vy * p };
  });
  return { ...to, players };
}
