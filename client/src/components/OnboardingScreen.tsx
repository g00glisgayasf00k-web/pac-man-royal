import { useState } from 'react';

const STEPS = [
  {
    title: 'Battle Royale Pac-Man',
    body: 'Five players drop from the ghost box. One starts as Pac-Man — the rest hunt as ghosts. First to 1000 points wins.',
    icon: '👑',
  },
  {
    title: 'Catch to become Pac-Man',
    body: 'Tag Pac-Man and you instantly become him. The old Pac-Man respawns as a ghost in the pen. Roles swap all match long.',
    icon: '👻',
  },
  {
    title: 'Controls',
    body: 'Desktop: arrow keys. Mobile: swipe on the maze to move. Use the center tunnel to escape across the map.',
    icon: '🕹️',
  },
];

type Props = {
  displayName: string;
  onComplete: () => void;
};

export function OnboardingScreen({ displayName, onComplete }: Props) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div className="gate-screen onboarding-screen">
      <div className="onboarding-card">
        <p className="onboarding-greeting">Hey, {displayName}!</p>
        <div className="onboarding-icon" aria-hidden>
          {current.icon}
        </div>
        <h2>{current.title}</h2>
        <p className="onboarding-body">{current.body}</p>

        <div className="onboarding-dots">
          {STEPS.map((_, i) => (
            <span key={i} className={i === step ? 'active' : ''} />
          ))}
        </div>

        <div className="onboarding-actions">
          {!isLast && (
            <button type="button" className="btn-ghost" onClick={onComplete}>
              Skip
            </button>
          )}
          <button
            type="button"
            className="btn-primary"
            onClick={() => (isLast ? onComplete() : setStep((s) => s + 1))}
          >
            {isLast ? 'Play now' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
