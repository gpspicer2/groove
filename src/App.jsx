import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './auth/AuthContext';
import AuthScreen from './auth/AuthScreen';
import BaselineFlow from './features/baseline/BaselineFlow';
import ClientApp from './ClientApp';
import TrainerApp from './TrainerApp';
import { supabase } from './lib/supabaseClient';
import { INK, TEXT_SOFT } from './theme';

function Shell() {
  const { user, profile, isTrainer, loading } = useAuth();
  const [baselineDone, setBaselineDone] = useState(null); // null = not checked yet
  const [checkingBaseline, setCheckingBaseline] = useState(true);

  useEffect(() => {
    if (!user || isTrainer) { setCheckingBaseline(false); return; }
    (async () => {
      const { data } = await supabase.from('baseline_responses').select('submitted_at').eq('user_id', user.id).maybeSingle();
      setBaselineDone(Boolean(data?.submitted_at));
      setCheckingBaseline(false);
    })();
  }, [user, isTrainer]);

  if (loading || (user && !profile) || (user && !isTrainer && checkingBaseline)) {
    return (
      <div style={{ background: INK }} className="min-h-[100svh] flex items-center justify-center">
        <span style={{ color: TEXT_SOFT, fontFamily: 'Inter, sans-serif' }} className="text-sm">Loading…</span>
      </div>
    );
  }

  if (!user) return <AuthScreen />;
  if (isTrainer) return <TrainerApp />;
  if (!baselineDone) return <BaselineFlow userId={user.id} onComplete={() => setBaselineDone(true)} />;
  return <ClientApp />;
}

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}
