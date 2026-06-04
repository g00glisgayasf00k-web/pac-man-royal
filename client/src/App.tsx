import { useCallback, useState } from 'react';
import { GameMode, OnlineLaunchOptions, SoloLaunchOptions } from '../../shared/gameTypes';
import {
  createGuestSession,
  hasCompletedOnboarding,
  loadSession,
  markOnboardingComplete,
  saveSession,
} from './auth/session';
import type { AuthSession } from './auth/types';
import { OnboardingScreen } from './components/OnboardingScreen';
import { AdminScreen } from './components/AdminScreen';
import { WelcomeScreen } from './components/WelcomeScreen';
import GameApp from './GameApp';

function isAdminPath() {
  const p = window.location.pathname.replace(/\/$/, '') || '/';
  return p === '/admin';
}

type Phase = 'welcome' | 'onboarding' | 'game';

export default function App() {
  const [phase, setPhase] = useState<Phase>('welcome');
  const [session, setSession] = useState<AuthSession | null>(() => loadSession());
  const [launchMode, setLaunchMode] = useState<GameMode>('local');
  const [onlineLaunch, setOnlineLaunch] = useState<OnlineLaunchOptions>({ joinMode: 'quick' });
  const [soloLaunch, setSoloLaunch] = useState<SoloLaunchOptions>({ difficulty: 'easy' });
  const [leaderboardRefreshKey, setLeaderboardRefreshKey] = useState(0);

  const enterGame = useCallback(
    (s: AuthSession, mode: GameMode, online?: OnlineLaunchOptions, solo?: SoloLaunchOptions) => {
      setLaunchMode(mode);
      if (online) setOnlineLaunch(online);
      else if (mode === 'local') setOnlineLaunch({ joinMode: 'quick' });
      if (solo) setSoloLaunch(solo);
      else if (mode === 'local') setSoloLaunch({ difficulty: 'easy' });
      if (hasCompletedOnboarding(s.user.id)) {
        setPhase('game');
      } else {
        setPhase('onboarding');
      }
    },
    []
  );

  const continueToGame = useCallback(
    (mode: GameMode, online?: OnlineLaunchOptions, solo?: SoloLaunchOptions, displayName?: string) => {
      const name = displayName?.trim();
      if (!name || name.length < 2) return;

      const next = createGuestSession(name);
      saveSession(next);
      setSession(next);
      enterGame(next, mode, online, solo);
    },
    [enterGame]
  );

  const handleOnboardingComplete = () => {
    if (session) markOnboardingComplete(session.user.id);
    setPhase('game');
  };

  const handleExitToWelcome = () => {
    setLeaderboardRefreshKey((k) => k + 1);
    setPhase('welcome');
  };

  const handleScoreRecorded = useCallback(() => {
    setLeaderboardRefreshKey((k) => k + 1);
  }, []);

  if (isAdminPath()) {
    return <AdminScreen />;
  }

  if (phase === 'welcome') {
    return (
      <WelcomeScreen onPlay={continueToGame} leaderboardRefreshKey={leaderboardRefreshKey} />
    );
  }

  if (phase === 'onboarding' && session) {
    return (
      <OnboardingScreen displayName={session.user.displayName} onComplete={handleOnboardingComplete} />
    );
  }

  if (phase === 'game' && session) {
    return (
      <GameApp
        user={session.user}
        launchMode={launchMode}
        onlineLaunch={onlineLaunch}
        soloLaunch={soloLaunch}
        onExitToWelcome={handleExitToWelcome}
        onScoreRecorded={handleScoreRecorded}
      />
    );
  }

  return <WelcomeScreen onPlay={continueToGame} leaderboardRefreshKey={leaderboardRefreshKey} />;
}
