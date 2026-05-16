import { useState } from 'react';
import { GameMode, OnlineJoinMode, OnlineLaunchOptions } from '../../../shared/gameTypes';
import { ArcadeFooter, ArcadeGate, ArcadeHeader } from './arcade/ArcadeLayout';
import { ArcadeModeSelect, tabToGameMode } from './arcade/ArcadeModeSelect';
import { OnlineJoinSelect } from './arcade/OnlineJoinSelect';
import './lobby/lobby.css';

interface Props {
  displayName: string;
  username: string;
  onStart: (mode: GameMode, online?: OnlineLaunchOptions) => void;
  onLogout: () => void;
}

export function GameModeMenu({ displayName, username, onStart, onLogout }: Props) {
  const [tab, setTab] = useState<'solo' | 'online'>('solo');
  const [onlineJoinMode, setOnlineJoinMode] = useState<OnlineJoinMode>('quick');
  const [joinCode, setJoinCode] = useState('');

  const launch = () => {
    const mode = tabToGameMode(tab);
    if (mode === 'online') {
      if (onlineJoinMode === 'join' && joinCode.trim().length < 4) return;
      onStart(mode, { joinMode: onlineJoinMode, code: joinCode.trim() || undefined });
      return;
    }
    onStart(mode);
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

      {tab === 'online' && (
        <OnlineJoinSelect
          joinMode={onlineJoinMode}
          joinCode={joinCode}
          onJoinModeChange={setOnlineJoinMode}
          onJoinCodeChange={setJoinCode}
        />
      )}

      <p className="insert blink">— PRESS START —</p>

      <div className="btn-row lobby-start-row">
        <button
          type="button"
          className="btn-play"
          disabled={tab === 'online' && onlineJoinMode === 'join' && joinCode.trim().length < 4}
          onClick={launch}
        >
          ▶{' '}
          {tab === 'solo'
            ? 'START GAME'
            : onlineJoinMode === 'create'
              ? 'CREATE ROOM'
              : onlineJoinMode === 'join'
                ? 'JOIN ROOM'
                : 'QUICK MATCH'}
        </button>
      </div>

      <p className="arcade-mode-hint" style={{ textAlign: 'center', marginTop: 8 }}>
        Playing as {displayName}
      </p>

      <ArcadeFooter />
    </ArcadeGate>
  );
}
