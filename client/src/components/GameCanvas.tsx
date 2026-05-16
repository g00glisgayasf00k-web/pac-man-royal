import { useEffect, useRef } from 'react';
import { GameSnapshot, NETWORK_SNAPSHOT_HZ } from '../../../shared/gameTypes';
import { interpolateSnapshots } from '../game/interpolation';
import { renderGame } from '../game/renderer';

interface Props {
  snapshot: GameSnapshot | null;
  /** Latest sim state — updated every physics step without waiting on React */
  liveSnapshotRef?: React.RefObject<GameSnapshot | null>;
  /** Smooth 20Hz network snapshots between server ticks */
  interpolateOnline?: boolean;
}

export function GameCanvas({ snapshot, liveSnapshotRef, interpolateOnline }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const snapRef = useRef(snapshot);
  snapRef.current = snapshot;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const interpMs = 1000 / NETWORK_SNAPSHOT_HZ;
    const net = { prev: null as GameSnapshot | null, curr: null as GameSnapshot | null, at: 0 };

    let raf = 0;
    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const w = Math.floor(rect.width * dpr);
      const h = Math.floor(rect.height * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const raw = liveSnapshotRef?.current ?? snapRef.current;
      let snap = raw;
      if (raw && interpolateOnline) {
        if (net.curr?.tick !== raw.tick) {
          net.prev = net.curr;
          net.curr = raw;
          net.at = performance.now();
        }
        if (net.curr) {
          const t = Math.min(1, (performance.now() - net.at) / interpMs);
          snap = net.prev && t < 1 ? interpolateSnapshots(net.prev, net.curr, t) : net.curr;
        }
      }

      if (snap) renderGame(ctx, snap, rect.width, rect.height);
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [liveSnapshotRef, interpolateOnline]);

  return <canvas ref={canvasRef} className="game-canvas" aria-label="Pac-Man Battle Royale game board" />;
}
