import { FormEvent, useState } from 'react';
import { GameMode } from '../../../shared/gameTypes';
import {
  ArcadeFooter,
  ArcadeGate,
  ArcadeHeader,
  ArcadePlayers,
  ArcadeRuleCards,
  ArcadeTargetScore,
} from './arcade/ArcadeLayout';
import './lobby/lobby.css';

interface Props {
  defaultName: string;
  username: string;
  onStart: (mode: GameMode, name: string) => void;
  onLogout: () => void;
}

export function Lobby({ defaultName, username, onStart, onLogout }: Props) {
  const [name, setName] = useState(defaultName);
  const [tab, setTab] = useState<'solo' | 'online'>('solo');
  const [showOptions, setShowOptions] = useState(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onStart(tab === 'solo' ? 'local' : 'online', name.trim() || 'Player');
  };

  return (
    <ArcadeGate className="lobby-gate">
      <div className="lobby-top-bar">
        <span className="lobby-user">@{username}</span>
        <button type="button" className="btn-sec" onClick={onLogout}>
          SIGN OUT
        </button>
      </div>

      <ArcadeHeader />
      <ArcadeRuleCards />
      <ArcadePlayers />
      <ArcadeTargetScore label="TARGET SCORE TO WIN" />

      {showOptions && (
        <div className="lobby-setup">
          <label>
            YOUR NAME
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={16}
              autoComplete="nickname"
            />
          </label>
          <div className="lobby-mode-tabs">
            <button
              type="button"
              className={tab === 'solo' ? 'active' : ''}
              onClick={() => setTab('solo')}
            >
              SOLO VS AI
            </button>
            <button
              type="button"
              className={tab === 'online' ? 'active' : ''}
              onClick={() => setTab('online')}
            >
              ONLINE
            </button>
          </div>
          {tab === 'online' && (
            <p className="lobby-hint">
              Join matches with other players. Game starts at 5 players or after a short countdown
              with 2+.
            </p>
          )}
        </div>
      )}

      <p className="insert blink">— PRESS START —</p>

      <form onSubmit={submit}>
        <div className="btn-row btn-row-form">
          <button type="submit" className="btn-play">
            ▶ {tab === 'solo' ? 'START GAME' : 'JOIN GAME'}
          </button>
          <button
            type="button"
            className={`btn-sec ${showOptions ? 'active' : ''}`}
            onClick={() => setShowOptions((v) => !v)}
          >
            OPTIONS
          </button>
        </div>
      </form>

      <ArcadeFooter />
    </ArcadeGate>
  );
}
