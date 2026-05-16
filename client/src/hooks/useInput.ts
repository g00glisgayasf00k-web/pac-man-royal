import { useEffect } from 'react';
import { Direction } from '../../../shared/gameTypes';

const ARROW_KEYS: Record<string, Direction> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
};

export function useKeyboardInput(
  enabled: boolean,
  _slot: number,
  onDirection: (dir: Direction) => void
) {
  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (e: KeyboardEvent) => {
      const dir = ARROW_KEYS[e.key];
      if (!dir) return;
      e.preventDefault();
      onDirection(dir);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled, onDirection]);
}
