import { useEffect, useState } from 'react';
import { OnlineLobbySnapshot } from '../../../shared/gameTypes';
import { buildRoomInviteLink } from '../utils/roomInvite';

interface Props {
  lobby: OnlineLobbySnapshot;
  roomCode: string;
}

export function OnlineWaiting({ lobby, roomCode }: Props) {
  const [, setTick] = useState(0);
  const [copied, setCopied] = useState(false);
  const humans = lobby.players.filter((p) => !p.isAI);
  const now = Date.now();
  const secs =
    lobby.autoStartAt != null ? Math.max(0, Math.ceil((lobby.autoStartAt - now) / 1000)) : null;
  const code = roomCode || lobby.code;
  const isPrivate = lobby.private ?? false;

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 500);
    return () => clearInterval(id);
  }, []);

  const inviteLink = buildRoomInviteLink(code);

  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="online-waiting">
      <h2>{isPrivate ? 'Waiting for friends…' : 'Finding players…'}</h2>

      {code && (
        <div className="waiting-room-code">
          <p className="waiting-code-label">ROOM CODE</p>
          <p className="waiting-code-value">{code}</p>
          <button type="button" className="btn-sec waiting-copy-btn" onClick={copyInvite}>
            {copied ? 'LINK COPIED!' : 'COPY INVITE LINK'}
          </button>
          <p className="waiting-invite-preview">{inviteLink}</p>
          {isPrivate && (
            <p className="waiting-hint">
              Friends can open the link or enter code <strong>{code}</strong> on the welcome screen.
            </p>
          )}
        </div>
      )}

      <p className="waiting-count">
        {humans.length} / {lobby.maxPlayers} players in lobby
      </p>
      {humans.length < 2 && (
        <p className="waiting-hint">Waiting for more players to join…</p>
      )}
      {secs != null && humans.length >= 2 && (
        <p className="waiting-hint">Match starts in {secs}s (empty slots filled with bots)</p>
      )}
      <ul className="waiting-players">
        {humans.map((p) => (
          <li key={p.id}>
            <span className="dot" style={{ background: `hsl(${p.slot * 72}, 80%, 55%)` }} />
            {p.name}
          </li>
        ))}
      </ul>
    </div>
  );
}
