import { useCallback, useRef } from 'react';
import type { TouchEvent } from 'react';
import { Direction } from '../../../shared/gameTypes';

const MIN_SWIPE_PX = 28;

export function useSwipeInput(
  enabled: boolean,
  onDirection: (dir: Direction) => void
) {
  const startRef = useRef<{ x: number; y: number } | null>(null);

  const onTouchStart = useCallback(
    (e: TouchEvent<HTMLElement>) => {
      if (!enabled || e.touches.length !== 1) return;
      const t = e.touches[0];
      startRef.current = { x: t.clientX, y: t.clientY };
    },
    [enabled]
  );

  const onTouchEnd = useCallback(
    (e: TouchEvent<HTMLElement>) => {
      if (!enabled || !startRef.current) return;
      const t = e.changedTouches[0];
      if (!t) return;

      const dx = t.clientX - startRef.current.x;
      const dy = t.clientY - startRef.current.y;
      startRef.current = null;

      const absX = Math.abs(dx);
      const absY = Math.abs(dy);
      if (absX < MIN_SWIPE_PX && absY < MIN_SWIPE_PX) return;

      if (absX >= absY) {
        onDirection(dx > 0 ? 'right' : 'left');
      } else {
        onDirection(dy > 0 ? 'down' : 'up');
      }
    },
    [enabled, onDirection]
  );

  const onTouchCancel = useCallback(() => {
    startRef.current = null;
  }, []);

  return { onTouchStart, onTouchEnd, onTouchCancel };
}
