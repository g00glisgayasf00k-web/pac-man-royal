import { useEffect, useState } from 'react';
import { OnlineLobbySnapshot } from '../../../shared/gameTypes';

interface Props {
  lobby: OnlineLobbySnapshot;
}

export function OnlineWaiting({ lobby }: Props) {
  const [, setTick] = useState(0);
  const humans = lobby.players.filter((p) => !p.isAI);
  const now = Date.now();
  const secs =
    lobby.autoStartAt != null ? Math.max(0, Math.ceil((lobby.autoStartAt - now) / 1000)) : null;

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 500);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="online-waiting">
      <h2>Finding players…</h2>
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
