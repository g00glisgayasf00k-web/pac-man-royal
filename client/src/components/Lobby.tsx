import { FormEvent, useState } from 'react';
import { GameMode } from '../../../shared/gameTypes';

interface Props {
  onStart: (mode: GameMode, name: string) => void;
}

export function Lobby({ onStart }: Props) {
  const [name, setName] = useState('Player');
  const [tab, setTab] = useState<'solo' | 'online'>('solo');

  const submit = (e: FormEvent, mode: GameMode) => {
    e.preventDefault();
    onStart(mode, name.trim() || 'Player');
  };

  return (
    <div className="lobby">
      <header className="hero">
        <h1>Pac-Man Battle Royale</h1>
        <p className="tagline">
          One Pac-Man. Four ghosts. Catch Pac-Man to become him. First to <strong>1000</strong>{' '}
          points wins.
        </p>
      </header>

      <form
        className="lobby-card"
        onSubmit={(e) => submit(e, tab === 'solo' ? 'local' : 'online')}
      >
        <label>
          Your name
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={16} />
        </label>

        <div className="tabs">
          <button
            type="button"
            className={tab === 'solo' ? 'active' : ''}
            onClick={() => setTab('solo')}
          >
            Solo vs AI
          </button>
          <button
            type="button"
            className={tab === 'online' ? 'active' : ''}
            onClick={() => setTab('online')}
          >
            Online
          </button>
        </div>

        <button type="submit" className="btn-primary">
          {tab === 'solo' ? 'Play Solo' : 'Join Game'}
        </button>
      </form>

      <section className="rules">
        <h3>Rules</h3>
        <ul>
          <li>Only the current Pac-Man can eat pellets for points.</li>
          <li>Ghosts that tag Pac-Man instantly become the new Pac-Man.</li>
          <li>The former Pac-Man respawns as a ghost.</li>
          <li>Power pellets are worth 50 and give 1.5× speed for 8 seconds.</li>
          <li>Ghosts get faster every 20 seconds — stay sharp!</li>
          <li>Random fruits appear with bonus points and power-ups.</li>
        </ul>
        {tab === 'online' && (
          <p className="controls-hint">
            Join Game matches you with other players. The match starts when 5 join or after a short
            countdown with 2+ players.
          </p>
        )}
        <h3>Controls</h3>
        <p className="controls-hint">Arrow keys to move</p>
      </section>
    </div>
  );
}
