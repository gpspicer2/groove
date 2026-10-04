import React from 'react';
import { AuthProvider, useAuth } from './auth/AuthContext';
import AuthScreen from './auth/AuthScreen';
import ClientApp from './ClientApp';
import TrainerApp from './TrainerApp';
import { INK, TEXT_SOFT } from './theme';

function Shell() {
  const { user, profile, isTrainer, loading, recovering, finishRecovery } = useAuth();

  if (loading || (user && !profile)) {
    return (
      <div style={{ background: INK }} className="min-h-[100svh] flex items-center justify-center">
        <span style={{ color: TEXT_SOFT, fontFamily: 'Manrope, sans-serif' }} className="text-sm">Loading…</span>
      </div>
    );
  }

  if (!user) return <AuthScreen />;
  if (recovering) return <AuthScreen recovering onRecovered={finishRecovery} />;
  if (isTrainer) return <TrainerApp />;
  // The one-time app tour (new-client walkthrough) and the baseline
  // intake prompt both live inside ClientApp now, as overlays on the
  // real app, rather than gating access to it here.
  return <ClientApp />;
}

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}
