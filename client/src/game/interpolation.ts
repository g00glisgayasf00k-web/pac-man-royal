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

/** Smooth between two authoritative server snapshots for display */
export function interpolateSnapshots(
  from: GameSnapshot,
  to: GameSnapshot,
  t: number
): GameSnapshot {
  const alpha = Math.max(0, Math.min(1, t));
  const players = to.players.map((tp) => {
    const fp = from.players.find((p) => p.id === tp.id);
    return fp ? lerpPlayer(fp, tp, alpha) : tp;
  });
  return { ...to, players };
}
