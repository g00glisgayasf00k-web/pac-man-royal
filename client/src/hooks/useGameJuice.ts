import { useEffect, useRef, useState } from 'react';
import type { GameSnapshot } from '../../../shared/gameTypes';

const HIGH_SCORE_KEY = 'pacbr_high_score';

export function loadHighScore(): number {
  try {
    return Number(localStorage.getItem(HIGH_SCORE_KEY)) || 0;
  } catch {
    return 0;
  }
}

export function saveHighScore(score: number) {
  try {
    const prev = loadHighScore();
    if (score > prev) localStorage.setItem(HIGH_SCORE_KEY, String(score));
  } catch {
    /* ignore */
  }
}

export type JuiceEffects = {
  scorePop: boolean;
  powerGlow: boolean;
  shake: boolean;
  flash: boolean;
  scoreDelta: number | null;
};

const IDLE: JuiceEffects = {
  scorePop: false,
  powerGlow: false,
  shake: false,
  flash: false,
  scoreDelta: null,
};

function pulse(setter: (fn: (e: JuiceEffects) => JuiceEffects) => void, key: keyof JuiceEffects, ms: number) {
  setter((e) => ({ ...e, [key]: true }));
  window.setTimeout(() => setter((e) => ({ ...e, [key]: false })), ms);
}

/** UI-only feedback driven by snapshot diffs — no gameplay changes */
export function useGameJuice(snapshot: GameSnapshot | null, playerId: string) {
  const [effects, setEffects] = useState<JuiceEffects>(IDLE);
  const [highScore, setHighScore] = useState(loadHighScore);
  const [lives, setLives] = useState(3);
  const prevScore = useRef(0);
  const prevPower = useRef(false);
  const prevWasPac = useRef(false);
  const prevPacId = useRef<string | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (!snapshot || !playerId) return;

    const me = snapshot.players.find((p) => p.id === playerId);
    if (!me) return;

    const now = Date.now();
    const isPac = snapshot.pacmanId === playerId && me.role === 'pacman';
    const powerActive = isPac && me.speedBoostUntil > now;

    if (!initialized.current) {
      initialized.current = true;
      prevScore.current = me.score;
      prevPower.current = powerActive;
      prevWasPac.current = isPac;
      prevPacId.current = snapshot.pacmanId;
      setEffects((e) => ({ ...e, powerGlow: powerActive }));
      return;
    }

    if (me.score > prevScore.current) {
      const delta = me.score - prevScore.current;
      prevScore.current = me.score;
      if (me.score > highScore) {
        saveHighScore(me.score);
        setHighScore(me.score);
      }
      setEffects((e) => ({ ...e, scorePop: true, scoreDelta: delta }));
      window.setTimeout(
        () => setEffects((e) => ({ ...e, scorePop: false, scoreDelta: null })),
        520
      );
    }

    if (powerActive && !prevPower.current) {
      pulse(setEffects, 'flash', 320);
    }
    prevPower.current = powerActive;

    if (prevWasPac.current && !isPac && prevPacId.current === playerId) {
      setLives((l) => Math.max(0, l - 1));
      pulse(setEffects, 'shake', 420);
      pulse(setEffects, 'flash', 320);
    }

    prevWasPac.current = isPac;
    prevPacId.current = snapshot.pacmanId;

    setEffects((e) =>
      e.powerGlow === powerActive ? e : { ...e, powerGlow: powerActive }
    );
  }, [snapshot, playerId, highScore]);

  useEffect(() => {
    if (snapshot?.status === 'ended' && playerId) {
      const me = snapshot.players.find((p) => p.id === playerId);
      if (me && me.score > highScore) {
        saveHighScore(me.score);
        setHighScore(me.score);
      }
    }
  }, [snapshot?.status, snapshot, playerId, highScore]);

  useEffect(() => {
    if (!snapshot) {
      initialized.current = false;
      prevScore.current = 0;
      setLives(3);
      setEffects(IDLE);
    }
  }, [snapshot]);

  const level = snapshot
    ? 1 + Math.floor((snapshot.players.find((p) => p.id === playerId)?.score ?? 0) / 250)
    : 1;

  return { effects, highScore, lives, level };
}
