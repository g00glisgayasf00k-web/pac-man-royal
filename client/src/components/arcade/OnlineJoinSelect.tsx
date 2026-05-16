import type { OnlineJoinMode } from '../../../../shared/gameTypes';

type Props = {
  joinMode: OnlineJoinMode;
  joinCode: string;
  onJoinModeChange: (mode: OnlineJoinMode) => void;
  onJoinCodeChange: (code: string) => void;
};

export function OnlineJoinSelect({
  joinMode,
  joinCode,
  onJoinModeChange,
  onJoinCodeChange,
}: Props) {
  return (
    <div className="online-join-select">
      <p className="section-label">— ONLINE —</p>
      <div className="online-join-tabs">
        <button
          type="button"
          className={joinMode === 'quick' ? 'active' : ''}
          onClick={() => onJoinModeChange('quick')}
        >
          QUICK MATCH
        </button>
        <button
          type="button"
          className={joinMode === 'create' ? 'active' : ''}
          onClick={() => onJoinModeChange('create')}
        >
          CREATE ROOM
        </button>
        <button
          type="button"
          className={joinMode === 'join' ? 'active' : ''}
          onClick={() => onJoinModeChange('join')}
        >
          JOIN CODE
        </button>
      </div>
      {joinMode === 'quick' && (
        <p className="arcade-mode-hint">
          Auto-join a random public lobby. The match starts when all 5 player slots are filled.
        </p>
      )}
      {joinMode === 'create' && (
        <p className="arcade-mode-hint">
          Create a private room and share the invite code with friends.
        </p>
      )}
      {joinMode === 'join' && (
        <div className="online-join-code-row">
          <input
            type="text"
            className="online-join-code-input"
            placeholder="ROOM CODE"
            value={joinCode}
            onChange={(e) =>
              onJoinCodeChange(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))
            }
            maxLength={8}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      )}
    </div>
  );
}

