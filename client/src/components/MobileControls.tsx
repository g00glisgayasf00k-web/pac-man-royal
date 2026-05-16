import type { PointerEvent } from 'react';
import { Direction } from '../../../shared/gameTypes';

type Props = {
  enabled: boolean;
  onDirection: (dir: Direction) => void;
};

const BUTTONS: { dir: Direction; label: string; className: string }[] = [
  { dir: 'up', label: '↑', className: 'dpad-up' },
  { dir: 'left', label: '←', className: 'dpad-left' },
  { dir: 'down', label: '↓', className: 'dpad-down' },
  { dir: 'right', label: '→', className: 'dpad-right' },
];

export function MobileControls({ enabled, onDirection }: Props) {
  if (!enabled) return null;

  const press =
    (dir: Direction) =>
    (e: PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      onDirection(dir);
    };

  return (
    <div
      className="mobile-controls"
      aria-label="Directional controls"
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="dpad">
        {BUTTONS.map(({ dir, label, className }) => (
          <button
            key={dir}
            type="button"
            className={`dpad-btn ${className}`}
            aria-label={dir}
            onPointerDown={press(dir)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
