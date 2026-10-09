import React, { useState } from 'react';
import { AuthProvider, useAuth } from './auth/AuthContext';
import AuthScreen from './auth/AuthScreen';
import ClientApp from './ClientApp';
import TrainerApp from './TrainerApp';
import ConsentScreen from './features/screening/ConsentScreen';
import ScreeningFlow from './features/screening/ScreeningFlow';
import { INK, TEXT_SOFT } from './theme';

function Shell() {
  const { user, profile, isTrainer, loading, switching, recovering, finishRecovery } = useAuth();
  // Keeps the screening on screen to show its result after it saves.
  const [screeningOpen, setScreeningOpen] = useState(false);
  // Lets someone step back from the first health question to re-read the consent.
  const [rereadConsent, setRereadConsent] = useState(false);

  if (loading || switching || (user && !profile)) {
    return (
      <div style={{ background: INK }} className="min-h-[100svh] flex items-center justify-center">
        <span style={{ color: TEXT_SOFT, fontFamily: 'Outfit, sans-serif' }} className="text-sm">Loading…</span>
      </div>
    );
  }

  if (!user) return <AuthScreen />;
  if (recovering) return <AuthScreen recovering onRecovered={finishRecovery} />;
  if (isTrainer) return <TrainerApp />;
  // First run for clients: consent, then the health check, then the app.
  if (!profile.consented_at || rereadConsent) return <ConsentScreen onBackToHealthCheck={() => setRereadConsent(false)} />;
  if (!profile.screening || screeningOpen) {
    return <ScreeningFlow onSaving={() => setScreeningOpen(true)} onDone={() => setScreeningOpen(false)} onBack={profile.screening ? undefined : () => setRereadConsent(true)} />;
  }
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
