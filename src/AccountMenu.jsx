import React, { useState } from 'react';
import { User, X, LogOut, Trash2 } from 'lucide-react';
import { useAuth } from './auth/AuthContext';
import { supabase } from './lib/supabaseClient';
import { deleteAccount } from './lib/api';
import { INK, INK_2, INK_3, PAPER, PAPER_DIM, TEXT_SOFT, LIME, BRICK } from './theme';

export default function AccountMenu() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} style={{ color: TEXT_SOFT }} className="p-2 -m-2 justify-self-start">
        <User size={18} />
      </button>
      {open && <AccountModal onClose={() => setOpen(false)} />}
    </>
  );
}

function AccountModal({ onClose }) {
  const { user, profile, updateProfile, signOut } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteText, setDeleteText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  async function handlePasswordSave() {
    if (newPassword.length < 6) return;
    setPasswordSaving(true);
    setPasswordMessage('');
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPasswordSaving(false);
    if (error) { setPasswordMessage(error.message); return; }
    setPasswordMessage('Password updated.');
    setNewPassword('');
  }

  async function handleDelete() {
    if (deleteText !== 'DELETE') return;
    setDeleting(true);
    setError('');
    try {
      await deleteAccount();
      await signOut();
    } catch (e) {
      setDeleting(false);
      setError(e.message);
    }
  }

  return (
    <div style={{ background: 'rgba(0,0,0,0.6)' }} className="fixed inset-0 flex items-end md:items-center justify-center z-50">
      <div style={{ background: INK_2 }} className="w-full max-w-sm rounded-t-2xl md:rounded-2xl px-5 py-6">
        <div className="flex items-center justify-between mb-5">
          <h2 style={{ color: PAPER, fontFamily: 'Manrope, sans-serif' }} className="text-lg">Account</h2>
          <button onClick={onClose} style={{ color: TEXT_SOFT }} className="p-2 -m-2"><X size={20} /></button>
        </div>

        <div className="text-center mb-5">
          <div style={{ color: TEXT_SOFT }} className="text-sm uppercase tracking-wide mb-1">Signed in as</div>
          <div style={{ color: PAPER }} className="text-sm">{user.email}</div>
        </div>

        <label style={{ color: TEXT_SOFT }} className="text-sm uppercase tracking-wide block text-center mb-2">Change password</label>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="New password (6+ characters)"
          style={{ background: INK_3, color: PAPER }}
          className="w-full rounded-md px-3 py-2.5 text-sm outline-none mb-2 text-center"
        />
        {passwordMessage && <div style={{ color: passwordMessage === 'Password updated.' ? LIME : BRICK }} className="text-sm text-center mb-2">{passwordMessage}</div>}
        <button
          onClick={handlePasswordSave}
          disabled={newPassword.length < 6 || passwordSaving}
          style={{ background: newPassword.length >= 6 ? INK_3 : INK_3, color: newPassword.length >= 6 ? PAPER : TEXT_SOFT }}
          className="w-full rounded-md py-2.5 text-sm font-medium mb-6"
        >
          {passwordSaving ? 'Saving…' : 'Update password'}
        </button>

        <label style={{ color: TEXT_SOFT }} className="text-sm uppercase tracking-wide block text-center mb-2">Week starts on</label>
        <div className="flex items-center gap-2 mb-6">
          {['sunday', 'monday'].map((day) => {
            const selected = (profile?.week_start_day || 'sunday') === day;
            return (
              <button
                key={day}
                onClick={() => updateProfile({ week_start_day: day })}
                style={{ background: selected ? LIME : INK_3, color: selected ? INK : PAPER_DIM }}
                className="flex-1 rounded-md py-2.5 text-sm font-medium capitalize"
              >
                {day}
              </button>
            );
          })}
        </div>

        <button
          onClick={signOut}
          style={{ color: PAPER_DIM }}
          className="w-full flex items-center justify-center gap-2 text-sm py-3 mb-2"
        >
          <LogOut size={16} /> Sign out
        </button>

        {!confirmingDelete ? (
          <button
            onClick={() => setConfirmingDelete(true)}
            style={{ color: BRICK }}
            className="w-full flex items-center justify-center gap-2 text-sm py-3"
          >
            <Trash2 size={16} /> Delete account
          </button>
        ) : (
          <div style={{ borderTop: `1px dashed ${INK_3}` }} className="pt-4 mt-2">
            <p style={{ color: BRICK }} className="text-sm text-center mb-3">
              This permanently deletes your account and everything in it — baseline, workouts, journal, messages. This can't be undone.
            </p>
            <p style={{ color: TEXT_SOFT }} className="text-sm text-center mb-2">Type DELETE to confirm</p>
            <input
              type="text"
              value={deleteText}
              onChange={(e) => setDeleteText(e.target.value)}
              style={{ background: INK_3, color: PAPER }}
              className="w-full rounded-md px-3 py-2.5 text-sm outline-none mb-3 text-center"
            />
            {error && <div style={{ color: BRICK }} className="text-sm text-center mb-2">{error}</div>}
            <button
              onClick={handleDelete}
              disabled={deleteText !== 'DELETE' || deleting}
              style={{ background: deleteText === 'DELETE' ? BRICK : INK_3, color: deleteText === 'DELETE' ? PAPER : TEXT_SOFT }}
              className="w-full rounded-md py-3 text-sm font-medium"
            >
              {deleting ? 'Deleting…' : 'Permanently delete my account'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
