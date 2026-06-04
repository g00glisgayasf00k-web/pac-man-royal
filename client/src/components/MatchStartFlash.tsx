import { useEffect, useState } from 'react';

interface Props {
  active: boolean;
  onDone?: () => void;
}

/** Brief "GO!" flash when a match begins — presentation only */
export function MatchStartFlash({ active, onDone }: Props) {
  const [phase, setPhase] = useState<'hidden' | 'ready' | 'go' | 'done'>('hidden');

  useEffect(() => {
    if (!active) {
      setPhase('hidden');
      return;
    }
    if (phase !== 'hidden') return;
    setPhase('ready');
    const t1 = window.setTimeout(() => setPhase('go'), 600);
    const t2 = window.setTimeout(() => {
      setPhase('done');
      onDone?.();
    }, 1400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [active, phase, onDone]);

  if (phase === 'hidden' || phase === 'done') return null;

  return (
    <div className={`match-start-flash match-start-flash--${phase}`} aria-live="polite">
      <span>{phase === 'ready' ? 'READY' : 'GO!'}</span>
    </div>
  );
}
