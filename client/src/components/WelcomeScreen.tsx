import { useEffect, useState } from 'react';

type Props = {
  onDone: () => void;
};

export function WelcomeScreen({ onDone }: Props) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const start = performance.now();
    const duration = 2200;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setProgress(Math.round(t * 100));
      if (t < 1) raf = requestAnimationFrame(tick);
      else onDone();
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [onDone]);

  return (
    <div
      className="gate-screen welcome-screen"
      onClick={onDone}
      onKeyDown={(e) => e.key === 'Enter' && onDone()}
      role="button"
      tabIndex={0}
    >
      <div className="welcome-inner">
        <div className="welcome-logo" aria-hidden>
          <span className="welcome-pac" />
        </div>
        <h1>Pac-Man Battle Royale</h1>
        <p className="welcome-tagline">Eat. Chase. Become Pac-Man.</p>
        <div className="welcome-loader">
          <div className="welcome-loader-fill" style={{ width: `${progress}%` }} />
        </div>
        <p className="welcome-hint">{progress < 100 ? 'Loading…' : 'Tap to continue'}</p>
      </div>
    </div>
  );
}
