import { useCallback, useState } from 'react';
import { GameMode, OnlineLaunchOptions, SoloLaunchOptions } from '../../shared/gameTypes';
import { fetchMe, logout } from './auth/api';
import {
  clearSession,
  hasCompletedOnboarding,
  loadSession,
  markOnboardingComplete,
  saveSession,
} from './auth/session';
import type { AuthSession } from './auth/types';
import { AuthScreen } from './components/AuthScreen';
import { OnboardingScreen } from './components/OnboardingScreen';
import { AdminScreen } from './components/AdminScreen';
import { WelcomeScreen } from './components/WelcomeScreen';
import GameApp from './GameApp';

function isAdminPath() {
  const p = window.location.pathname.replace(/\/$/, '') || '/';
  return p === '/admin';
}

type Phase = 'welcome' | 'auth' | 'onboarding' | 'game' | 'boot';

export default function App() {
  const [phase, setPhase] = useState<Phase>('welcome');
  const [session, setSession] = useState<AuthSession | null>(null);
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
    async (mode: GameMode, online?: OnlineLaunchOptions, solo?: SoloLaunchOptions) => {
      setLaunchMode(mode);
      if (online) setOnlineLaunch(online);
      if (solo) setSoloLaunch(solo);
      setPhase('boot');
      const saved = loadSession();
      if (!saved?.token) {
        setPhase('auth');
        return;
      }
      try {
        const user = await fetchMe(saved.token);
        const next = { token: saved.token, user };
        saveSession(next);
        setSession(next);
        enterGame(next, mode, online);
      } catch {
        clearSession();
        setPhase('auth');
      }
    },
    [enterGame]
  );

  const handleAuthSuccess = (s: AuthSession) => {
    saveSession(s);
    setSession(s);
    enterGame(s, launchMode);
  };

  const handleOnboardingComplete = () => {
    if (session) markOnboardingComplete(session.user.id);
    setPhase('game');
  };

  const handleLogout = async () => {
    if (session?.token) await logout(session.token);
    clearSession();
    setSession(null);
    setPhase('auth');
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
      <WelcomeScreen
        onPlay={continueToGame}
        onLogout={session ? handleLogout : undefined}
        leaderboardRefreshKey={leaderboardRefreshKey}
      />
    );
  }

  if (phase === 'boot') {
    return (
      <div className="gate-screen welcome-screen">
        <div className="welcome-inner">
          <p className="welcome-hint">Checking account…</p>
        </div>
      </div>
    );
  }

  if (phase === 'auth') {
    return <AuthScreen onSuccess={handleAuthSuccess} />;
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

  return (
    <WelcomeScreen
      onPlay={continueToGame}
      onLogout={session ? handleLogout : undefined}
      leaderboardRefreshKey={leaderboardRefreshKey}
    />
  );
}
