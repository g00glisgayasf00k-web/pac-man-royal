
<style>
  @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  .screen {
    background: #000;
    border-radius: 12px;
    border: 3px solid #2121DE;
    padding: 28px 24px 36px;
    font-family: 'Press Start 2P', monospace;
    overflow: hidden;
    position: relative;
  }

  .corner { position: absolute; width: 12px; height: 12px; border-color: #2121DE; border-style: solid; }
  .corner.tl { top: 14px; left: 14px; border-width: 2px 0 0 2px; }
  .corner.tr { top: 14px; right: 14px; border-width: 2px 2px 0 0; }
  .corner.bl { bottom: 14px; left: 14px; border-width: 0 0 2px 2px; }
  .corner.br { bottom: 14px; right: 14px; border-width: 0 2px 2px 0; }

  .tagline { font-size: 8px; color: #FF8000; letter-spacing: 3px; text-align: center; margin-bottom: 8px; }

  .title { font-size: 28px; color: #FFE000; text-align: center; letter-spacing: 2px; line-height: 1.3; text-shadow: 3px 3px 0 #AA7000; }
  .title span { color: #FF4444; display: inline; }

  .divider { height: 2px; background: #2121DE; margin: 18px 0; opacity: 0.6; }

  .how-it-works {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-bottom: 18px;
  }

  .rule-card {
    background: #0a0a2a;
    border: 1px solid #2121DE;
    border-radius: 6px;
    padding: 12px 10px;
    display: flex;
    align-items: flex-start;
    gap: 10px;
  }

  .rule-icon { font-size: 18px; flex-shrink: 0; margin-top: 2px; }
  .rule-text { font-size: 7px; color: #ccc; line-height: 1.8; }
  .rule-text strong { color: #FFE000; display: block; margin-bottom: 4px; font-size: 7px; }

  .players-section { margin-bottom: 18px; }
  .section-label { font-size: 7px; color: #888; letter-spacing: 2px; text-align: center; margin-bottom: 12px; }

  .players-grid {
    display: flex;
    justify-content: center;
    gap: 14px;
    flex-wrap: wrap;
  }

  .player-card {
    background: #0a0a2a;
    border: 1.5px solid #333;
    border-radius: 8px;
    padding: 10px 8px;
    text-align: center;
    width: 96px;
    cursor: default;
  }

  .player-card.is-pac { border-color: #FFE000; }
  .player-card.is-ghost-r { border-color: #FF0000; }
  .player-card.is-ghost-p { border-color: #FFB8FF; }
  .player-card.is-ghost-b { border-color: #00FFDE; }
  .player-card.is-ghost-o { border-color: #FF8000; }

  .player-sprite { margin: 0 auto 8px; }

  .player-name { font-size: 6px; color: #fff; margin-bottom: 4px; }
  .player-tag  { font-size: 6px; padding: 2px 6px; border-radius: 3px; display: inline-block; }
  .tag-pac   { background: #332b00; color: #FFE000; }
  .tag-ghost { background: #0a0a2a; color: #888; border: 1px solid #333; }

  .target-bar {
    background: #0a0a2a;
    border: 1px solid #2121DE;
    border-radius: 8px;
    padding: 14px 16px;
    margin-bottom: 18px;
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .target-icon { font-size: 24px; flex-shrink: 0; }
  .target-info { flex: 1; }
  .target-label { font-size: 7px; color: #888; margin-bottom: 6px; }
  .target-track { height: 8px; background: #111; border-radius: 4px; overflow: hidden; border: 1px solid #333; }
  .target-fill  { height: 100%; background: #FFE000; border-radius: 4px; animation: fillUp 2s ease-out forwards; width: 0; }
  @keyframes fillUp { to { width: 100%; } }
  .target-pts   { font-size: 20px; color: #FFE000; margin-top: 6px; }
  .target-pts span { font-size: 9px; color: #888; }

  .blink { animation: blink 0.85s step-end infinite; }
  @keyframes blink { 50% { opacity: 0; } }

  .btn-row { display: flex; gap: 10px; justify-content: center; margin-bottom: 16px; }

  .btn-play {
    background: #FFE000; color: #000; border: none;
    font-family: 'Press Start 2P', monospace; font-size: 11px;
    padding: 14px 28px; border-radius: 4px; cursor: pointer;
    letter-spacing: 1px; box-shadow: 4px 4px 0 #AA9000;
    transition: transform 0.1s;
  }
  .btn-play:hover { background: #FFD000; transform: translateY(-2px); }
  .btn-play:active { transform: translateY(2px); box-shadow: 2px 2px 0 #AA9000; }

  .btn-sec {
    background: transparent; color: #aaa; border: 1px solid #444;
    font-family: 'Press Start 2P', monospace; font-size: 8px;
    padding: 14px 16px; border-radius: 4px; cursor: pointer;
    letter-spacing: 1px;
    transition: border-color 0.15s, color 0.15s;
  }
  .btn-sec:hover { border-color: #2121DE; color: #fff; }

  .footer { display: flex; justify-content: space-between; align-items: center; }
  .lives-row { display: flex; gap: 6px; align-items: center; }
  .life-pac {
    width: 14px; height: 14px; background: #FFE000; border-radius: 50%;
    clip-path: polygon(50% 50%, 100% 15%, 100% 0%, 0% 0%, 0% 100%, 100% 100%, 100% 85%);
  }
  .footer-text { font-size: 7px; color: #444; }

  .insert { font-size: 8px; color: #fff; text-align: center; letter-spacing: 1px; margin-bottom: 14px; }
</style>

<h2 style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)">Pac-Royal welcome screen — 5 players, first to 1000 points wins</h2>

<div class="screen">
  <div class="corner tl"></div><div class="corner tr"></div>
  <div class="corner bl"></div><div class="corner br"></div>

  <div class="tagline">5 PLAYERS · 1 WINNER</div>
  <div class="title">PAC-<span>ROYAL</span></div>

  <div class="divider"></div>

  <div class="how-it-works">
    <div class="rule-card">
      <div class="rule-icon">🟡</div>
      <div class="rule-text">
        <strong>BE PAC-ROYAL</strong>
        Eat pellets &amp; power-ups to rack up points. Stay ahead — ghosts are hunting you.
      </div>
    </div>
    <div class="rule-card">
      <div class="rule-icon">👻</div>
      <div class="rule-text">
        <strong>HUNT AS A GHOST</strong>
        Chase down Pac-Royal. Tag them and YOU become Pac-Royal — stealing the lead.
      </div>
    </div>
    <div class="rule-card">
      <div class="rule-icon">🔄</div>
      <div class="rule-text">
        <strong>TAG MECHANIC</strong>
        When a ghost catches Pac-Royal, roles swap instantly. The ex-Pac-Royal becomes a ghost.
      </div>
    </div>
    <div class="rule-card">
      <div class="rule-icon">⚡</div>
      <div class="rule-text">
        <strong>POWER PELLETS</strong>
        Pac-Royal eats a power pellet — ghosts turn blue &amp; vulnerable. Eat them for bonus pts!
      </div>
    </div>
  </div>

  <div class="players-section">
    <div class="section-label">— THE PLAYERS —</div>
    <div class="players-grid">

      <div class="player-card is-pac">
        <div class="player-sprite">
          <svg width="44" height="44" viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg">
            <circle cx="22" cy="22" r="18" fill="#FFE000"/>
            <polygon points="22,22 40,12 40,32" fill="#000"/>
            <circle cx="22" cy="12" r="3" fill="#000"/>
          </svg>
        </div>
        <div class="player-name">PAC-ROYAL</div>
        <span class="player-tag tag-pac">ACTIVE</span>
      </div>

      <div class="player-card is-ghost-r">
        <div class="player-sprite">
          <svg width="44" height="44" viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 22 C4 10 10 4 22 4 C34 4 40 10 40 22 L40 40 L34 34 L28 40 L22 34 L16 40 L10 34 L4 40 Z" fill="#FF0000"/>
            <circle cx="16" cy="20" r="4.5" fill="white"/><circle cx="28" cy="20" r="4.5" fill="white"/>
            <circle cx="17.5" cy="21.5" r="2.5" fill="#222D9E"/><circle cx="29.5" cy="21.5" r="2.5" fill="#222D9E"/>
          </svg>
        </div>
        <div class="player-name">BLINKY</div>
        <span class="player-tag tag-ghost">GHOST</span>
      </div>

      <div class="player-card is-ghost-p">
        <div class="player-sprite">
          <svg width="44" height="44" viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 22 C4 10 10 4 22 4 C34 4 40 10 40 22 L40 40 L34 34 L28 40 L22 34 L16 40 L10 34 L4 40 Z" fill="#FFB8FF"/>
            <circle cx="16" cy="20" r="4.5" fill="white"/><circle cx="28" cy="20" r="4.5" fill="white"/>
            <circle cx="17.5" cy="21.5" r="2.5" fill="#222D9E"/><circle cx="29.5" cy="21.5" r="2.5" fill="#222D9E"/>
          </svg>
        </div>
        <div class="player-name">PINKY</div>
        <span class="player-tag tag-ghost">GHOST</span>
      </div>

      <div class="player-card is-ghost-b">
        <div class="player-sprite">
          <svg width="44" height="44" viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 22 C4 10 10 4 22 4 C34 4 40 10 40 22 L40 40 L34 34 L28 40 L22 34 L16 40 L10 34 L4 40 Z" fill="#00CCDD"/>
            <circle cx="16" cy="20" r="4.5" fill="white"/><circle cx="28" cy="20" r="4.5" fill="white"/>
            <circle cx="17.5" cy="21.5" r="2.5" fill="#222D9E"/><circle cx="29.5" cy="21.5" r="2.5" fill="#222D9E"/>
          </svg>
        </div>
        <div class="player-name">INKY</div>
        <span class="player-tag tag-ghost">GHOST</span>
      </div>

      <div class="player-card is-ghost-o">
        <div class="player-sprite">
          <svg width="44" height="44" viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 22 C4 10 10 4 22 4 C34 4 40 10 40 22 L40 40 L34 34 L28 40 L22 34 L16 40 L10 34 L4 40 Z" fill="#FF8000"/>
            <circle cx="16" cy="20" r="4.5" fill="white"/><circle cx="28" cy="20" r="4.5" fill="white"/>
            <circle cx="17.5" cy="21.5" r="2.5" fill="#222D9E"/><circle cx="29.5" cy="21.5" r="2.5" fill="#222D9E"/>
          </svg>
        </div>
        <div class="player-name">CLYDE</div>
        <span class="player-tag tag-ghost">GHOST</span>
      </div>

    </div>
  </div>

  <div class="target-bar">
    <div class="target-icon">🏆</div>
    <div class="target-info">
      <div class="target-label">TARGET SCORE TO WIN</div>
      <div class="target-track"><div class="target-fill"></div></div>
      <div class="target-pts">1,000 <span>POINTS</span></div>
    </div>
  </div>

  <p class="insert blink">— PRESS START —</p>

  <div class="btn-row">
    <button class="btn-play" onclick="sendPrompt('Build the full Pac-Royal game — maze, 5-player logic, tag mechanic, score tracking to 1000 points ↗')">▶ START GAME ↗</button>
    <button class="btn-sec" onclick="sendPrompt('Show me the leaderboard and settings screen for Pac-Royal')">OPTIONS</button>
  </div>

  <div class="footer">
    <div class="lives-row">
      <div class="life-pac"></div>
      <div class="life-pac"></div>
      <div class="life-pac"></div>
    </div>
    <div class="footer-text">© PAC-ROYAL</div>
    <div class="footer-text">v1.0</div>
  </div>
</div>
