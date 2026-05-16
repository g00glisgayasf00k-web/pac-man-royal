import { useEffect, useRef } from 'react';
import { GameSnapshot } from '../../../shared/gameTypes';
import { renderGame } from '../game/renderer';

interface Props {
  snapshot: GameSnapshot | null;
}

export function GameCanvas({ snapshot }: Props) {
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
      if (snapRef.current) renderGame(ctx, snapRef.current, rect.width, rect.height);
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);

  return <canvas ref={canvasRef} className="game-canvas" aria-label="Pac-Man Battle Royale game board" />;
}
