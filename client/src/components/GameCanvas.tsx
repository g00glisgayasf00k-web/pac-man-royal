import { useEffect, useRef } from 'react';
import { GameSnapshot } from '../../../shared/gameTypes';
import { renderGame } from '../game/renderer';

interface Props {
  snapshot: GameSnapshot | null;
  /** Latest sim state — updated every physics step without waiting on React */
  liveSnapshotRef?: React.RefObject<GameSnapshot | null>;
}

export function GameCanvas({ snapshot, liveSnapshotRef }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const snapRef = useRef(snapshot);
  snapRef.current = snapshot;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

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
      const snap = liveSnapshotRef?.current ?? snapRef.current;
      if (snap) renderGame(ctx, snap, rect.width, rect.height);
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [liveSnapshotRef]);

  return <canvas ref={canvasRef} className="game-canvas" aria-label="Pac-Man Battle Royale game board" />;
}
