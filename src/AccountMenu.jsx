import React, { useState, useEffect } from 'react';
import { User, X, LogOut, Trash2, ChevronRight, Plus, Pencil, RotateCcw, ChevronDown, ChevronUp, Info, MessageCircle } from 'lucide-react';
import { useAuth } from './auth/AuthContext';
import { supabase } from './lib/supabaseClient';
import { deleteAccount } from './lib/api';
import { INK, INK_2, INK_3, PAPER, PAPER_DIM, TEXT_SOFT, LIME, SKY, BRICK } from './theme';
import Portal from './Portal';
import { predictedMaxHR, computeHrZones } from './lib/heartRate';

export default function AccountMenu() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} style={{ color: TEXT_SOFT }} className="p-2 -m-2 justify-self-end">
        <User size={18} />
      </button>
      {open && <AccountModal onClose={() => setOpen(false)} />}
    </>
  );
}

const GENDER_OPTIONS = ['Female', 'Male', 'Other'];

function AccountModal({ onClose }) {
  const { user, profile, updateProfile, isTrainer, signOut } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showMovements, setShowMovements] = useState(false);
  const [age, setAge] = useState(profile?.age != null ? String(profile.age) : '');
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteText, setDeleteText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  async function saveAge(value) {
    const numeric = value.trim() === '' ? null : parseInt(value, 10);
    await updateProfile({ age: numeric });
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

  useEffect(() => {
    // The app's real scroll container is the tab content area (#app-scroll),
    // not the document body — lock that too, or content behind the modal
    // keeps scrolling.
    const scrollEl = document.getElementById('app-scroll');
    const prevBody = document.body.style.overflow;
    const prevScroll = scrollEl?.style.overflow;
    document.body.style.overflow = 'hidden';
    if (scrollEl) scrollEl.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevBody;
      if (scrollEl) scrollEl.style.overflow = prevScroll || '';
    };
  }, []);

  return (
    <Portal>
    <div style={{ background: 'rgba(0,0,0,0.6)' }} className="fixed inset-0 flex items-end md:items-center justify-center z-50">
      <div style={{ background: INK_2 }} className="w-full max-w-sm rounded-t-2xl md:rounded-2xl px-5 py-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 style={{ color: PAPER, fontFamily: 'Manrope, sans-serif' }} className="text-lg">Account</h2>
          <button onClick={onClose} style={{ color: TEXT_SOFT }} className="p-2 -m-2"><X size={20} /></button>
        </div>

        <div className="text-center mb-5">
          <div style={{ color: TEXT_SOFT }} className="text-sm uppercase tracking-wide mb-1">Signed in as</div>
          <div style={{ color: PAPER }} className="text-sm">{user.email}</div>
        </div>

        {!isTrainer && (
          <a
            href="sms:+16034754544"
            style={{ background: LIME, color: INK }}
            className="w-full flex items-center justify-center gap-2 rounded-md px-4 py-3 mb-2 text-sm font-medium"
          >
            <MessageCircle size={16} /> Message Greg
          </a>
        )}

        <LinkRow label="Change Password" onClick={() => setShowPassword(true)} />
        <LinkRow label="Payment Information" onClick={() => setShowPassword('payment')} />

        {!isTrainer && (
          <>
            <label style={{ color: TEXT_SOFT }} className="text-sm uppercase tracking-wide block text-center mb-2 mt-6">Age</label>
            <input
              type="number"
              inputMode="numeric"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              onBlur={(e) => saveAge(e.target.value)}
              placeholder="—"
              style={{ background: INK_3, color: PAPER, fontFamily: 'Space Grotesk, sans-serif' }}
              className="w-20 rounded-md px-2 py-2 text-sm outline-none text-center mb-1 mx-auto block"
            />
            <div style={{ color: TEXT_SOFT }} className="text-sm text-center mb-6">Used to estimate your heart rate zones</div>

            <label style={{ color: TEXT_SOFT }} className="text-sm uppercase tracking-wide block text-center mb-2">Gender</label>
            <div className="flex items-center gap-2 mb-6">
              {GENDER_OPTIONS.map((g) => {
                const selected = profile?.gender === g;
                return (
                  <button
                    key={g}
                    onClick={() => updateProfile({ gender: g })}
                    style={{ background: selected ? LIME : INK_3, color: selected ? INK : PAPER_DIM }}
                    className="flex-1 rounded-md py-2.5 text-sm font-medium"
                  >
                    {g}
                  </button>
                );
              })}
            </div>

            <label style={{ color: TEXT_SOFT }} className="text-sm uppercase tracking-wide block text-center mb-2">Week starts on</label>
            <div className="flex items-center gap-2 mb-6">
              {['monday', 'sunday'].map((day) => {
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

            <BaselineDataSection userId={user.id} />

            <LinkRow label="Manage Your Movements" onClick={() => setShowMovements(true)} />
            <DeletedWorkoutsSection userId={user.id} />
          </>
        )}

        <button
          onClick={signOut}
          style={{ color: PAPER_DIM }}
          className="w-full flex items-center justify-center gap-2 text-sm py-3 mb-2 mt-4"
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

    {showPassword === true && <PasswordModal onClose={() => setShowPassword(false)} />}
    {showPassword === 'payment' && <PaymentModal onClose={() => setShowPassword(false)} />}
    {showMovements && <MovementsModal onClose={() => setShowMovements(false)} />}
    </Portal>
  );
}

function LinkRow({ label, onClick }) {
  return (
    <button onClick={onClick} style={{ background: INK_3 }} className="w-full grid grid-cols-[16px_1fr_16px] items-center rounded-md px-4 py-3 mb-2">
      <span />
      <span style={{ color: PAPER }} className="text-sm text-center">{label}</span>
      <ChevronRight size={16} color={TEXT_SOFT} className="justify-self-end" />
    </button>
  );
}

function Popup({ title, onClose, children }) {
  return (
    <div style={{ background: 'rgba(0,0,0,0.7)' }} className="fixed inset-0 flex items-center justify-center z-[60] px-4" onClick={onClose}>
      <div style={{ background: INK_2 }} className="w-full max-w-sm rounded-2xl px-5 py-6 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 style={{ color: PAPER, fontFamily: 'Manrope, sans-serif' }} className="text-lg">{title}</h2>
          <button onClick={onClose} style={{ color: TEXT_SOFT }} className="p-2 -m-2"><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function PasswordModal({ onClose }) {
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  async function handleSave() {
    if (newPassword.length < 6) return;
    setSaving(true);
    setMessage('');
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSaving(false);
    if (error) { setMessage(error.message); return; }
    setMessage('Password updated.');
    setNewPassword('');
  }

  return (
    <Popup title="Change password" onClose={onClose}>
      <input
        type="password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        placeholder="New password (6+ characters)"
        style={{ background: INK_3, color: PAPER }}
        className="w-full rounded-md px-3 py-2.5 text-sm outline-none mb-2 text-center"
      />
      {message && <div style={{ color: message === 'Password updated.' ? LIME : BRICK }} className="text-sm text-center mb-2">{message}</div>}
      <button
        onClick={handleSave}
        disabled={newPassword.length < 6 || saving}
        style={{ background: INK_3, color: newPassword.length >= 6 ? PAPER : TEXT_SOFT }}
        className="w-full rounded-md py-2.5 text-sm font-medium"
      >
        {saving ? 'Saving…' : 'Update password'}
      </button>
    </Popup>
  );
}

function PaymentModal({ onClose }) {
  return (
    <Popup title="Payment information" onClose={onClose}>
      <div style={{ color: TEXT_SOFT }} className="text-sm text-center">
        Billing isn't set up yet — Greg will let you know when payment is ready to add here.
      </div>
    </Popup>
  );
}

function MovementsModal({ onClose }) {
  const { profile, updateProfile } = useAuth();
  const [input, setInput] = useState('');
  const [editingIndex, setEditingIndex] = useState(null);
  const [editValue, setEditValue] = useState('');
  const movements = profile?.custom_activities || [];

  async function addMovement() {
    const trimmed = input.trim();
    if (!trimmed || movements.includes(trimmed)) return;
    await updateProfile({ custom_activities: [...movements, trimmed] });
    setInput('');
  }

  async function removeMovement(name) {
    await updateProfile({ custom_activities: movements.filter((m) => m !== name) });
  }

  function startEdit(i) {
    setEditingIndex(i);
    setEditValue(movements[i]);
  }

  async function saveEdit(i) {
    const trimmed = editValue.trim();
    if (!trimmed) { setEditingIndex(null); return; }
    const next = movements.map((m, idx) => (idx === i ? trimmed : m));
    await updateProfile({ custom_activities: next });
    setEditingIndex(null);
  }

  return (
    <Popup title="Your movements" onClose={onClose}>
      <div style={{ color: TEXT_SOFT }} className="text-sm text-center mb-4">
        Custom activities you've added show up as options in Move's "everyday movement" picker.
      </div>
      {movements.length === 0 ? (
        <div style={{ color: TEXT_SOFT }} className="text-sm text-center mb-4">You haven't added any yet.</div>
      ) : (
        <div className="space-y-2 mb-4">
          {movements.map((m, i) => (
            <div key={m} style={{ background: INK_3 }} className="flex items-center gap-2 rounded-md px-3 py-2">
              {editingIndex === i ? (
                <input
                  autoFocus
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={() => saveEdit(i)}
                  onKeyDown={(e) => e.key === 'Enter' && saveEdit(i)}
                  style={{ background: INK_2, color: PAPER }}
                  className="flex-1 rounded-md px-2 py-1.5 text-sm outline-none"
                />
              ) : (
                <span style={{ color: PAPER }} className="flex-1 text-sm">{m}</span>
              )}
              <button onClick={() => startEdit(i)} style={{ color: TEXT_SOFT }} className="p-1.5 -m-1"><Pencil size={14} /></button>
              <button onClick={() => removeMovement(m)} style={{ color: TEXT_SOFT }} className="p-1.5 -m-1"><X size={14} /></button>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Add a movement…"
          style={{ background: INK_3, color: PAPER }}
          className="flex-1 rounded-md px-3 py-2.5 text-sm outline-none text-center"
        />
        <button
          onClick={addMovement}
          disabled={!input.trim()}
          style={{ background: input.trim() ? LIME : INK_3, color: input.trim() ? INK : TEXT_SOFT }}
          className="rounded-md px-4 py-2.5 text-sm font-medium flex items-center gap-1"
        >
          <Plus size={14} /> Add
        </button>
      </div>
    </Popup>
  );
}

function BaselineDataSection({ userId }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [age, setAge] = useState(null);
  const [bodyweight, setBodyweight] = useState('');
  const [restingHr, setRestingHr] = useState('');
  const [maxHr, setMaxHr] = useState('');
  const [prescribedZone, setPrescribedZone] = useState(null);
  const [showPeakInfo, setShowPeakInfo] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: profileRow }, { data: baseline }] = await Promise.all([
        supabase.from('profiles').select('age, bodyweight_lb, resting_hr_bpm, max_hr_bpm, prescribed_hr_zone').eq('id', userId).maybeSingle(),
        supabase.from('baseline_responses').select('form_answers').eq('user_id', userId).maybeSingle(),
      ]);
      setAge(profileRow?.age != null ? Number(profileRow.age) : (baseline?.form_answers?.age ? Number(baseline.form_answers.age) : null));
      setBodyweight(profileRow?.bodyweight_lb != null ? String(profileRow.bodyweight_lb) : '');
      setRestingHr(profileRow?.resting_hr_bpm != null ? String(profileRow.resting_hr_bpm) : '');
      setMaxHr(profileRow?.max_hr_bpm != null ? String(profileRow.max_hr_bpm) : '');
      setPrescribedZone(profileRow?.prescribed_hr_zone || null);
      setLoading(false);
    })();
  }, [userId]);

  async function saveBodyweight(value) {
    const numeric = value.trim() === '' ? null : parseFloat(value);
    await supabase.from('profiles').update({ bodyweight_lb: numeric }).eq('id', userId);
  }
  async function saveHr(field, value) {
    const numeric = value.trim() === '' ? null : parseFloat(value);
    await supabase.from('profiles').update({ [field]: numeric, ...(field === 'max_hr_bpm' ? { max_hr_measured: numeric != null } : {}) }).eq('id', userId);
  }

  const restingHrNum = restingHr.trim() === '' ? null : parseFloat(restingHr);
  const maxHrNum = maxHr.trim() === '' ? (predictedMaxHR(age) || null) : parseFloat(maxHr);
  const maxHrIsPredicted = maxHr.trim() === '' && maxHrNum != null;

  return (
    <div style={{ background: INK_3 }} className="rounded-md px-4 py-3 mb-2">
      <button onClick={() => setOpen((v) => !v)} className="w-full grid grid-cols-[24px_1fr_24px] items-center">
        <span />
        <span style={{ color: SKY }} className="text-sm uppercase tracking-wide font-bold">Baseline Data</span>
        <span className="justify-self-end">{open ? <ChevronUp size={16} color={TEXT_SOFT} /> : <ChevronDown size={16} color={TEXT_SOFT} />}</span>
      </button>
      {open && (loading ? (
        <div style={{ color: TEXT_SOFT }} className="text-sm text-center mt-3">Loading…</div>
      ) : (
        <div style={{ borderTop: `1px dashed ${INK_2}` }} className="mt-3 pt-3 space-y-4">
          <div>
            <div style={{ color: TEXT_SOFT }} className="text-sm uppercase tracking-wide mb-1 text-center">Bodyweight</div>
            <div className="flex items-center justify-center gap-2">
              <input
                type="number"
                inputMode="decimal"
                value={bodyweight}
                onChange={(e) => setBodyweight(e.target.value)}
                onBlur={(e) => saveBodyweight(e.target.value)}
                placeholder="—"
                style={{ background: INK_2, color: PAPER, fontFamily: 'Space Grotesk, sans-serif' }}
                className="w-20 rounded-md px-2 py-1.5 text-lg text-center outline-none"
              />
              <span style={{ color: TEXT_SOFT }} className="text-sm">lb</span>
            </div>
          </div>
          <div>
            <div style={{ color: TEXT_SOFT }} className="text-sm uppercase tracking-wide mb-2 text-center">Heart rate</div>
            {prescribedZone && (
              <div style={{ color: SKY }} className="text-sm mb-2 text-center">Your coach recommends the {prescribedZone} zone</div>
            )}
            <div className="flex items-center justify-center gap-4 mb-2">
              <div>
                <div style={{ color: TEXT_SOFT }} className="text-sm mb-1">Resting</div>
                <input
                  type="number"
                  inputMode="numeric"
                  value={restingHr}
                  onChange={(e) => setRestingHr(e.target.value)}
                  onBlur={(e) => saveHr('resting_hr_bpm', e.target.value)}
                  placeholder="—"
                  style={{ background: INK_2, color: PAPER, fontFamily: 'Space Grotesk, sans-serif' }}
                  className="w-16 rounded-md px-2 py-1.5 text-lg text-center outline-none"
                />
              </div>
              <div>
                <div style={{ color: TEXT_SOFT }} className="text-sm mb-1 flex items-center gap-1">
                  Peak{maxHrIsPredicted ? ' (est.)' : ''}
                  <button onClick={() => setShowPeakInfo((v) => !v)} style={{ color: TEXT_SOFT }} className="p-0.5 -m-0.5">
                    <Info size={12} />
                  </button>
                </div>
                <input
                  type="number"
                  inputMode="numeric"
                  value={maxHr}
                  onChange={(e) => setMaxHr(e.target.value)}
                  onBlur={(e) => saveHr('max_hr_bpm', e.target.value)}
                  placeholder={maxHrIsPredicted ? String(maxHrNum) : '—'}
                  style={{ background: INK_2, color: PAPER, fontFamily: 'Space Grotesk, sans-serif' }}
                  className="w-16 rounded-md px-2 py-1.5 text-lg text-center outline-none"
                />
              </div>
            </div>
            {showPeakInfo && (
              <div style={{ background: INK_2, color: PAPER_DIM }} className="rounded-md px-3 py-2.5 text-sm text-left mb-2">
                HRmax is the theoretical highest heart rate your body can reach. HRpeak is the highest you've actually measured — say, during a hard effort or a real test. HRpeak is usually the more accurate number to train off of. We default to an age-predicted estimate unless you enter your own.
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function DeletedWorkoutsSection({ userId }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [workouts, setWorkouts] = useState([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('workouts')
        .select('id, started_at, muscle_groups, activities')
        .eq('user_id', userId)
        .not('deleted_at', 'is', null)
        .order('started_at', { ascending: false });
      setWorkouts(data || []);
      setLoading(false);
    })();
  }, [userId]);

  async function restore(id) {
    const { error } = await supabase.from('workouts').update({ deleted_at: null }).eq('id', id);
    if (error) return;
    setWorkouts((prev) => prev.filter((w) => w.id !== id));
  }

  if (!loading && workouts.length === 0) return null;

  return (
    <div style={{ background: INK_3 }} className="rounded-md px-4 py-3 mb-2">
      <button onClick={() => setOpen((v) => !v)} className="w-full grid grid-cols-[24px_1fr_24px] items-center">
        <span />
        <span style={{ color: TEXT_SOFT }} className="text-sm uppercase tracking-wide">Deleted Workouts {!loading && `(${workouts.length})`}</span>
        <span className="justify-self-end">{open ? <ChevronUp size={16} color={TEXT_SOFT} /> : <ChevronDown size={16} color={TEXT_SOFT} />}</span>
      </button>
      {open && (
        <div style={{ borderTop: `1px dashed ${INK_2}` }} className="mt-3 pt-3 space-y-2">
          {loading ? (
            <div style={{ color: TEXT_SOFT }} className="text-sm text-center">Loading…</div>
          ) : (
            workouts.map((w) => (
              <div key={w.id} className="flex flex-col items-center gap-1">
                <div style={{ color: PAPER_DIM }} className="text-sm">
                  {[...(w.muscle_groups || []), ...(w.activities || [])].join(' + ') || 'Workout'}
                </div>
                <div style={{ color: TEXT_SOFT }} className="text-sm">
                  {new Date(w.started_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
                <button onClick={() => restore(w.id)} style={{ color: LIME }} className="text-sm flex items-center gap-1 py-1 px-1">
                  <RotateCcw size={14} /> Restore
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
