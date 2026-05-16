import { useEffect, useRef } from 'react';
import { GameSnapshot } from '../../../shared/gameTypes';
import { extrapolateSnapshots, interpolateSnapshots } from '../game/interpolation';
import { renderGame } from '../game/renderer';

const EXTRAP_MAX_MS = 40;

interface Props {
  snapshot: GameSnapshot | null;
  /** Latest sim state — updated every physics step without waiting on React */
  liveSnapshotRef?: React.RefObject<GameSnapshot | null>;
  /** How often authoritative state advances (60 solo sim, 20 online net) */
  blendHz?: number;
}

export function GameCanvas({ snapshot, liveSnapshotRef, blendHz = 60 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const snapRef = useRef(snapshot);
  snapRef.current = snapshot;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
    if (!ctx) return;

    const blendMs = 1000 / blendHz;
    const net = { prev: null as GameSnapshot | null, curr: null as GameSnapshot | null, at: 0 };
    let layoutW = 0;
    let layoutH = 0;

    const syncCanvasSize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const w = Math.floor(rect.width * dpr);
      const h = Math.floor(rect.height * dpr);
      layoutW = rect.width;
      layoutH = rect.height;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    syncCanvasSize();
    const ro = new ResizeObserver(() => syncCanvasSize());
    ro.observe(canvas);

    let raf = 0;
    const draw = () => {
      const raw = liveSnapshotRef?.current ?? snapRef.current;
      let snap = raw;

      if (raw && liveSnapshotRef) {
        if (net.curr?.tick !== raw.tick) {
          net.prev = net.curr;
          net.curr = raw;
          net.at = performance.now();
        }
        if (net.curr) {
          const elapsed = performance.now() - net.at;
          const t = elapsed / blendMs;
          if (net.prev && t < 1) {
            snap = interpolateSnapshots(net.prev, net.curr, t);
          } else if (net.prev && elapsed < blendMs + EXTRAP_MAX_MS) {
            const past = (elapsed - blendMs) / blendMs;
            snap = extrapolateSnapshots(net.prev, net.curr, past);
          } else {
            snap = net.curr;
          }
        }
      }

      if (snap) renderGame(ctx, snap, layoutW, layoutH);
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [liveSnapshotRef, blendHz]);

  return <canvas ref={canvasRef} className="game-canvas" aria-label="Pac-Man Battle Royale game board" />;
}
