import { useState } from 'react';
import { GameMode } from '../../../shared/gameTypes';
import { ArcadeFooter, ArcadeGate, ArcadeHeader } from './arcade/ArcadeLayout';
import { ArcadeModeSelect, tabToGameMode } from './arcade/ArcadeModeSelect';
import './lobby/lobby.css';

interface Props {
  displayName: string;
  username: string;
  onStart: (mode: GameMode) => void;
  onLogout: () => void;
}

export function GameModeMenu({ displayName, username, onStart, onLogout }: Props) {
  const [tab, setTab] = useState<'solo' | 'online'>('solo');

  const launch = () => {
    onStart(tabToGameMode(tab));
  };

  return (
    <ArcadeGate className="lobby-gate mode-menu-gate">
      <div className="lobby-top-bar">
        <span className="lobby-user">@{username}</span>
        <button type="button" className="btn-sec" onClick={onLogout}>
          SIGN OUT
        </button>
      </div>

      <ArcadeHeader />
      <ArcadeModeSelect tab={tab} onTabChange={setTab} />

      <p className="insert blink">— PRESS START —</p>

      <div className="btn-row lobby-start-row">
        <button type="button" className="btn-play" onClick={launch}>
          ▶ {tab === 'solo' ? 'START GAME' : 'JOIN GAME'}
        </button>
      </div>

      <p className="arcade-mode-hint" style={{ textAlign: 'center', marginTop: 8 }}>
        Playing as {displayName}
      </p>

      <ArcadeFooter />
    </ArcadeGate>
  );
}
