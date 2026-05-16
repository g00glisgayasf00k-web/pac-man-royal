import { useCallback, useState } from 'react';
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
import { WelcomeScreen } from './components/WelcomeScreen';
import GameApp from './GameApp';

type Phase = 'welcome' | 'auth' | 'onboarding' | 'game' | 'boot';

export default function App() {
  const [phase, setPhase] = useState<Phase>('welcome');
  const [session, setSession] = useState<AuthSession | null>(null);

  const enterGame = useCallback((s: AuthSession) => {
    if (hasCompletedOnboarding(s.user.id)) {
      setPhase('game');
    } else {
      setPhase('onboarding');
    }
  }, []);

  const afterWelcome = useCallback(async () => {
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
      enterGame(next);
    } catch {
      clearSession();
      setPhase('auth');
    }
  }, [enterGame]);

  const handleAuthSuccess = (s: AuthSession) => {
    saveSession(s);
    setSession(s);
    enterGame(s);
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

  if (phase === 'welcome') {
    return <WelcomeScreen onDone={afterWelcome} />;
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
    return <GameApp user={session.user} onLogout={handleLogout} />;
  }

  return <WelcomeScreen onDone={afterWelcome} />;
}
