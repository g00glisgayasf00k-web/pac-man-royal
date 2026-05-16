import type { ReactNode } from 'react';
import { WIN_SCORE } from '../../../../shared/gameTypes';
import {
  BlinkySprite,
  ClydeSprite,
  InkySprite,
  PacManSprite,
  PinkySprite,
} from '../welcome/WelcomeSprites';
import '../../styles/arcade-shell.css';

export function ArcadeCorners() {
  return (
    <>
      <div className="corner tl" />
      <div className="corner tr" />
      <div className="corner bl" />
      <div className="corner br" />
    </>
  );
}

export function ArcadeHeader() {
  return (
    <>
      <p className="arcade-tagline">5 PLAYERS · 1 WINNER</p>
      <h1 className="arcade-title">
        PAC-MAN<span>BATTLE ROYALE</span>
      </h1>
      <div className="arcade-divider" />
    </>
  );
}

export function ArcadeRuleCards() {
  return (
    <div className="how-it-works">
      <div className="rule-card">
        <span className="rule-icon" aria-hidden>
          🟡
        </span>
        <p className="rule-text">
          <strong>BE PAC-MAN</strong>
          Eat pellets &amp; power-ups to rack up points. Stay ahead — ghosts are hunting you.
        </p>
      </div>
      <div className="rule-card">
        <span className="rule-icon" aria-hidden>
          👻
        </span>
        <p className="rule-text">
          <strong>HUNT AS A GHOST</strong>
          Chase down Pac-Man. Tag them and YOU become Pac-Man — stealing the lead.
        </p>
      </div>
      <div className="rule-card">
        <span className="rule-icon" aria-hidden>
          🔄
        </span>
        <p className="rule-text">
          <strong>TAG MECHANIC</strong>
          When a ghost catches Pac-Man, roles swap instantly. The ex-Pac-Man becomes a ghost.
        </p>
      </div>
      <div className="rule-card">
        <span className="rule-icon" aria-hidden>
          ⚡
        </span>
        <p className="rule-text">
          <strong>POWER PELLETS</strong>
          Anyone can grab them for points. Pac-Man gets 1.5× speed. Respawn every 30s.
        </p>
      </div>
    </div>
  );
}

export function ArcadePlayers() {
  return (
    <section className="players-section" aria-label="Players">
      <p className="section-label">— THE PLAYERS —</p>
      <div className="players-grid">
        <div className="player-card is-pac">
          <div className="player-sprite">
            <PacManSprite />
          </div>
          <p className="player-name">PAC-MAN</p>
          <span className="player-tag tag-pac">ACTIVE</span>
        </div>
        <div className="player-card is-ghost-r">
          <div className="player-sprite">
            <BlinkySprite />
          </div>
          <p className="player-name">BLINKY</p>
          <span className="player-tag tag-ghost">GHOST</span>
        </div>
        <div className="player-card is-ghost-p">
          <div className="player-sprite">
            <PinkySprite />
          </div>
          <p className="player-name">PINKY</p>
          <span className="player-tag tag-ghost">GHOST</span>
        </div>
        <div className="player-card is-ghost-b">
          <div className="player-sprite">
            <InkySprite />
          </div>
          <p className="player-name">INKY</p>
          <span className="player-tag tag-ghost">GHOST</span>
        </div>
        <div className="player-card is-ghost-o">
          <div className="player-sprite">
            <ClydeSprite />
          </div>
          <p className="player-name">CLYDE</p>
          <span className="player-tag tag-ghost">GHOST</span>
        </div>
      </div>
    </section>
  );
}

export function ArcadeTargetScore({ label }: { label: string }) {
  return (
    <div className="target-bar">
      <span className="target-icon" aria-hidden>
        🏆
      </span>
      <div className="target-info">
        <p className="target-label">{label}</p>
        <div className="target-track">
          <div className="target-fill" style={{ width: '100%' }} />
        </div>
        <p className="target-pts">
          {WIN_SCORE.toLocaleString()} <span>POINTS</span>
        </p>
      </div>
    </div>
  );
}

export function ArcadeFooter() {
  return (
    <footer className="arcade-footer">
      <div className="lives-row" aria-hidden>
        <span className="life-pac" />
        <span className="life-pac" />
        <span className="life-pac" />
      </div>
      <span className="footer-text">© PAC-MAN BATTLE ROYALE</span>
      <span className="footer-text">v1.0</span>
    </footer>
  );
}

type GateProps = {
  children: ReactNode;
  className?: string;
};

export function ArcadeGate({ children, className = '' }: GateProps) {
  return (
    <div className={`gate-screen arcade-gate ${className}`.trim()}>
      <div className="arcade-screen">
        <ArcadeCorners />
        {children}
      </div>
    </div>
  );
}
