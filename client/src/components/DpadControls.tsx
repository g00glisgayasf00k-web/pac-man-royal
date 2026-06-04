import { useCallback, useRef } from 'react';
import type { Direction } from '../../../shared/gameTypes';

interface Props {
  enabled: boolean;
  onDirection: (dir: Direction) => void;
}

export function DpadControls({ enabled, onDirection }: Props) {
  const repeatRef = useRef<number | null>(null);

  const press = useCallback(
    (dir: Direction) => {
      if (!enabled) return;
      onDirection(dir);
    },
    [enabled, onDirection]
  );

  const stopRepeat = useCallback(() => {
    if (repeatRef.current != null) {
      window.clearInterval(repeatRef.current);
      repeatRef.current = null;
    }
  }, []);

  const startRepeat = useCallback(
    (dir: Direction) => {
      press(dir);
      stopRepeat();
      repeatRef.current = window.setInterval(() => press(dir), 140);
    },
    [press, stopRepeat]
  );

  return (
    <footer className="arcade-controls" aria-label="Movement controls">
      <div className="arcade-dpad">
        <button
          type="button"
          className="arcade-dpad__btn arcade-dpad__btn--up"
          aria-label="Up"
          disabled={!enabled}
          onPointerDown={(e) => {
            e.preventDefault();
            startRepeat('up');
          }}
          onPointerUp={stopRepeat}
          onPointerLeave={stopRepeat}
          onPointerCancel={stopRepeat}
        />
        <button
          type="button"
          className="arcade-dpad__btn arcade-dpad__btn--left"
          aria-label="Left"
          disabled={!enabled}
          onPointerDown={(e) => {
            e.preventDefault();
            startRepeat('left');
          }}
          onPointerUp={stopRepeat}
          onPointerLeave={stopRepeat}
          onPointerCancel={stopRepeat}
        />
        <button
          type="button"
          className="arcade-dpad__btn arcade-dpad__btn--center"
          aria-hidden
          tabIndex={-1}
          disabled
        />
        <button
          type="button"
          className="arcade-dpad__btn arcade-dpad__btn--right"
          aria-label="Right"
          disabled={!enabled}
          onPointerDown={(e) => {
            e.preventDefault();
            startRepeat('right');
          }}
          onPointerUp={stopRepeat}
          onPointerLeave={stopRepeat}
          onPointerCancel={stopRepeat}
        />
        <button
          type="button"
          className="arcade-dpad__btn arcade-dpad__btn--down"
          aria-label="Down"
          disabled={!enabled}
          onPointerDown={(e) => {
            e.preventDefault();
            startRepeat('down');
          }}
          onPointerUp={stopRepeat}
          onPointerLeave={stopRepeat}
          onPointerCancel={stopRepeat}
        />
      </div>
      <p className="arcade-controls__hint">Swipe maze or use D-pad</p>
    </footer>
  );
}
