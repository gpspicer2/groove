import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext(null);

// Greg uses a coach account and a personal client account. "Linking" them
// remembers both logins on this device so he can flip between the two views
// without typing a password each time. Saved the same way Supabase already
// saves the current login (in this browser's storage).
const LINK_KEY = 'groove:linkedAccounts';
function readLinked() {
  try { return JSON.parse(localStorage.getItem(LINK_KEY)) || {}; } catch { return {}; }
}
function writeLinked(obj) {
  try { localStorage.setItem(LINK_KEY, JSON.stringify(obj)); } catch { /* storage blocked */ }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [linked, setLinked] = useState(readLinked);
  // Set when someone arrives from a "reset your password" email link.
  const [recovering, setRecovering] = useState(false);
  const profileRef = useRef(null);
  profileRef.current = profile;

  function saveLinked(next) { writeLinked(next); setLinked(next); }

  async function loadProfile(userId) {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    setProfile(data || null);
    const all = readLinked();
    if (data && all[userId] && (all[userId].role !== data.role || all[userId].email !== data.email)) {
      saveLinked({ ...all, [userId]: { ...all[userId], role: data.role, email: data.email || all[userId].email } });
    }
    setSwitching(false);
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session) await loadProfile(data.session.user.id);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (event === 'PASSWORD_RECOVERY') setRecovering(true);
      setSession(newSession);
      if (newSession) {
        // Keep a linked account's saved login fresh as Supabase renews it.
        const all = readLinked();
        if (all[newSession.user.id]) {
          saveLinked({ ...all, [newSession.user.id]: { ...all[newSession.user.id], access_token: newSession.access_token, refresh_token: newSession.refresh_token } });
        }
        await loadProfile(newSession.user.id);
      } else {
        setProfile(null);
        setSwitching(false);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function updateProfile(fields) {
    if (!session?.user) return;
    const { data, error } = await supabase.from('profiles').update(fields).eq('id', session.user.id).select().single();
    if (!error && data) setProfile(data);
    return { error };
  }

  // Sign in to a second account and remember both, then return to the one
  // that was open.
  async function linkAccount(email, password) {
    const { data: cur } = await supabase.auth.getSession();
    const here = cur.session;
    if (!here) return { error: { message: 'Please sign in first.' } };
    const res = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (res.error) {
      await supabase.auth.setSession({ access_token: here.access_token, refresh_token: here.refresh_token });
      return { error: res.error };
    }
    const other = res.data.session;
    if (other.user.id === here.user.id) return { error: { message: "That's the account you're already using." } };
    const { data: otherProfile } = await supabase.from('profiles').select('role, email').eq('id', other.user.id).single();
    const all = readLinked();
    saveLinked({
      ...all,
      [here.user.id]: { email: here.user.email, role: profileRef.current?.role, access_token: here.access_token, refresh_token: here.refresh_token },
      [other.user.id]: { email: other.user.email, role: otherProfile?.role, access_token: other.access_token, refresh_token: other.refresh_token },
    });
    await supabase.auth.setSession({ access_token: here.access_token, refresh_token: here.refresh_token });
    return { error: null };
  }

  async function switchTo(userId) {
    const all = readLinked();
    const target = all[userId];
    if (!target) return { error: { message: 'That account is not linked on this device.' } };
    setSwitching(true);
    setTimeout(() => setSwitching(false), 10000); // never get stuck on the loading screen
    // Save the open account's latest login before leaving it.
    const { data: cur } = await supabase.auth.getSession();
    if (cur.session && all[cur.session.user.id]) {
      all[cur.session.user.id] = { ...all[cur.session.user.id], access_token: cur.session.access_token, refresh_token: cur.session.refresh_token };
      saveLinked(all);
    }
    const { error } = await supabase.auth.setSession({ access_token: target.access_token, refresh_token: target.refresh_token });
    if (error) {
      const next = { ...readLinked() }; delete next[userId]; saveLinked(next);
      setSwitching(false);
      return { error: { message: 'That login expired. Please link the account again.' } };
    }
    return { error: null };
  }

  function unlinkAccount(userId) {
    const next = { ...readLinked() }; delete next[userId]; saveLinked(next);
  }

  async function signOut() {
    // Signing out ends this login for good, so forget its saved copy.
    if (session?.user) unlinkAccount(session.user.id);
    return supabase.auth.signOut();
  }

  const others = Object.entries(linked)
    .filter(([id]) => id !== session?.user?.id)
    .map(([id, v]) => ({ id, email: v.email, role: v.role }));

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    updateProfile,
    // The one account allowed to see the coach side — everyone else who
    // signs up is a client. Simple ownership check rather than an
    // invite-code system, since there's only ever one coach for now.
    isTrainer: profile?.role === 'trainer',
    loading,
    switching,
    recovering,
    finishRecovery: () => setRecovering(false),
    signOut,
    reloadProfile: () => (session?.user ? loadProfile(session.user.id) : Promise.resolve()),
    linkedOthers: others,
    linkAccount,
    switchTo,
    unlinkAccount,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
