import React, { useState } from 'react';
import { AuthProvider, useAuth } from './auth/AuthContext';
import AuthScreen from './auth/AuthScreen';
import OnboardingTour from './features/onboarding/OnboardingTour';
import ClientApp from './ClientApp';
import TrainerApp from './TrainerApp';
import { INK, TEXT_SOFT } from './theme';

function Shell() {
  const { user, profile, isTrainer, loading, updateProfile } = useAuth();
  // A signed-up client sees a quick one-time tour before anything else —
  // NOT the full baseline intake, which used to gate access here and
  // made people fill out a 5-page form before they'd even seen the app.
  // Baseline itself is now prompted from inside Birdseye instead, so
  // someone can look around first and fill it out on their own time.
  const [tourJustFinished, setTourJustFinished] = useState(false);

  if (loading || (user && !profile)) {
    return (
      <div style={{ background: INK }} className="min-h-[100svh] flex items-center justify-center">
        <span style={{ color: TEXT_SOFT, fontFamily: 'Inter, sans-serif' }} className="text-sm">Loading…</span>
      </div>
    );
  }

  if (!user) return <AuthScreen />;
  if (isTrainer) return <TrainerApp />;
  if (!profile.tour_done && !tourJustFinished) {
    return (
      <OnboardingTour
        onComplete={() => {
          setTourJustFinished(true);
          updateProfile({ tour_done: true });
        }}
      />
    );
  }
  return <ClientApp />;
}

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}
