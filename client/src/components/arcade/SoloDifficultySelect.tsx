import {
  SoloDifficulty,
  soloDifficultyLabel,
  soloDifficultySpeedMultiplier,
} from '../../../../shared/gameTypes';

type Props = {
  difficulty: SoloDifficulty;
  onDifficultyChange: (difficulty: SoloDifficulty) => void;
};

const LEVELS: SoloDifficulty[] = ['easy', 'medium', 'hard'];

export function SoloDifficultySelect({ difficulty, onDifficultyChange }: Props) {
  return (
    <div className="solo-difficulty-select">
      <p className="section-label">— DIFFICULTY —</p>
      <div className="solo-difficulty-tabs">
        {LEVELS.map((level) => (
          <button
            key={level}
            type="button"
            className={difficulty === level ? 'active' : ''}
            onClick={() => onDifficultyChange(level)}
          >
            {soloDifficultyLabel(level).toUpperCase()}
          </button>
        ))}
      </div>
      <p className="arcade-mode-hint">
        Speed ×{soloDifficultySpeedMultiplier(difficulty)} for Pac-Man and all ghosts.
        {difficulty === 'easy' && ' Standard pace.'}
        {difficulty === 'medium' && ' Twice as fast as Easy.'}
        {difficulty === 'hard' && ' Four times as fast as Easy.'}
      </p>
    </div>
  );
}
