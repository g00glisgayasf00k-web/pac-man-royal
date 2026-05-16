import { useState } from 'react';
import { OnlineLobbySnapshot } from '../../../shared/gameTypes';
import { buildRoomInviteLink } from '../utils/roomInvite';

interface Props {
  lobby: OnlineLobbySnapshot;
  roomCode: string;
}

export function OnlineWaiting({ lobby, roomCode }: Props) {
  const [copied, setCopied] = useState(false);
  const humans = lobby.players.filter((p) => !p.isAI);
  const code = roomCode || lobby.code;
  const slotsLeft = lobby.maxPlayers - humans.length;
  const isPrivate = lobby.private ?? false;

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
      {slotsLeft > 0 && (
        <p className="waiting-hint">
          Waiting for {slotsLeft} more player{slotsLeft === 1 ? '' : 's'} — game starts when the
          lobby is full ({lobby.maxPlayers}/{lobby.maxPlayers}).
        </p>
      )}
      {slotsLeft === 0 && <p className="waiting-hint">Lobby full — starting match…</p>}
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
