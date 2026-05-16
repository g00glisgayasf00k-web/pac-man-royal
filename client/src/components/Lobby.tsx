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
import { DualLeaderboards } from './arcade/OverallLeaderboard';
import './lobby/lobby.css';

interface Props {
  displayName: string;
  username: string;
  onStart: (mode: GameMode, name: string) => void;
  onLogout: () => void;
}

export function Lobby({ displayName, username, onStart, onLogout }: Props) {
  const [tab, setTab] = useState<'solo' | 'online'>('solo');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onStart(tab === 'solo' ? 'local' : 'online', displayName.trim() || 'Player');
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
      <DualLeaderboards limit={5} />

      <div className="lobby-mode">
        <p className="section-label">— GAME MODE —</p>
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
            Join matches with other players. The game starts when all 5 player slots are full.
          </p>
        )}
      </div>

      <p className="insert blink">— PRESS START —</p>

      <form onSubmit={submit}>
        <div className="btn-row lobby-start-row">
          <button type="submit" className="btn-play">
            ▶ {tab === 'solo' ? 'START GAME' : 'JOIN GAME'}
          </button>
        </div>
      </form>

      <ArcadeFooter />
    </ArcadeGate>
  );
}
