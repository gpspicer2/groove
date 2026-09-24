import React, { useState, useEffect, useRef } from 'react';
import { User, X, LogOut, Trash2, ChevronRight, Plus, Pencil, RotateCcw, ChevronDown, ChevronUp, Info, MessageCircle, Camera } from 'lucide-react';
import { useAuth } from './auth/AuthContext';
import { supabase } from './lib/supabaseClient';
import { deleteAccount } from './lib/api';
import { INK, INK_2, INK_3, PAPER, PAPER_DIM, TEXT_SOFT, LIME, SKY, BRICK } from './theme';
import Portal from './Portal';
import { predictedMaxHR, computeHrZones } from './lib/heartRate';
import BaselineFlow from './features/baseline/BaselineFlow';
import { VO2maxEstimator, OneRMEstimator } from './features/baseline/FitnessEstimates';
import Cropper from 'react-easy-crop';
import { getCroppedImageBlob } from './lib/cropImage';

export default function AccountMenu() {
  const [open, setOpen] = useState(false);
  const { profile } = useAuth();
  return (
    <>
      <button data-tour="account-button" onClick={() => setOpen(true)} className="p-0.5 -m-0.5 justify-self-end">
        {profile?.avatar_url ? (
          <img src={profile.avatar_url} alt="Account" className="w-7 h-7 rounded-full object-cover" />
        ) : (
          <User size={18} color={TEXT_SOFT} />
        )}
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
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteText, setDeleteText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

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

        <AvatarPicker userId={user.id} />

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

        {!isTrainer && <BaselineDataSection userId={user.id} />}

        {!isTrainer && (
          <SettingsSection
            userId={user.id}
            onChangePassword={() => setShowPassword(true)}
            onPaymentInfo={() => setShowPassword('payment')}
            onManageMovements={() => setShowMovements(true)}
          />
        )}

        <button
          onClick={signOut}
          style={{ color: PAPER_DIM }}
          className="w-full flex items-center justify-center gap-2 text-sm py-3 mb-2 mt-4"
        >
          <LogOut size={16} /> Sign Out
        </button>

        {!confirmingDelete ? (
          <button
            onClick={() => setConfirmingDelete(true)}
            style={{ color: BRICK }}
            className="w-full flex items-center justify-center gap-2 text-sm py-3"
          >
            <Trash2 size={16} /> Delete Account
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

function AvatarPicker({ userId }) {
  const { profile, updateProfile } = useAuth();
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [pickedImage, setPickedImage] = useState(null); // object URL awaiting crop

  function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Please choose an image file.'); return; }
    if (file.size > 15 * 1024 * 1024) { setError('Please choose an image under 15MB.'); return; }
    setError('');
    setPickedImage(URL.createObjectURL(file));
  }

  async function handleCropped(blob) {
    setPickedImage(null);
    setUploading(true);
    setError('');
    const path = `${userId}/avatar.jpg`;
    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, blob, { upsert: true, cacheControl: '3600', contentType: 'image/jpeg' });
    if (uploadError) { setUploading(false); setError(uploadError.message); return; }
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    // Same filename every time (one avatar per user) — bust the cache so
    // the new photo actually shows instead of a stale cached fetch.
    const url = `${data.publicUrl}?t=${Date.now()}`;
    const { error: profileError } = await updateProfile({ avatar_url: url });
    setUploading(false);
    if (profileError) setError(profileError.message);
  }

  return (
    <div className="flex flex-col items-center mb-4">
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        style={{ background: INK_3 }}
        className="relative w-16 h-16 rounded-full overflow-hidden flex items-center justify-center"
      >
        {profile?.avatar_url ? (
          <img src={profile.avatar_url} alt="Account" className="w-full h-full object-cover" />
        ) : (
          <User size={28} color={TEXT_SOFT} />
        )}
        <div style={{ background: 'rgba(0,0,0,0.45)' }} className="absolute inset-0 flex items-center justify-center">
          <Camera size={18} color={PAPER} />
        </div>
      </button>
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
      <div style={{ color: TEXT_SOFT }} className="text-sm mt-1.5">{uploading ? 'Uploading…' : 'Tap to change photo'}</div>
      {error && <div style={{ color: BRICK }} className="text-sm mt-1">{error}</div>}
      {pickedImage && (
        <AvatarCropModal
          image={pickedImage}
          onCancel={() => { URL.revokeObjectURL(pickedImage); setPickedImage(null); }}
          onSave={handleCropped}
        />
      )}
    </div>
  );
}

function AvatarCropModal({ image, onCancel, onSave }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!croppedAreaPixels) return;
    setSaving(true);
    const blob = await getCroppedImageBlob(image, croppedAreaPixels);
    URL.revokeObjectURL(image);
    onSave(blob);
  }

  return (
    <Portal>
      <div style={{ background: 'rgba(0,0,0,0.75)' }} className="fixed inset-0 z-[60] flex flex-col items-center justify-center px-4">
        <div style={{ background: INK_2 }} className="w-full max-w-sm rounded-2xl px-5 py-6">
          <h3 style={{ color: PAPER, fontFamily: 'Manrope, sans-serif' }} className="text-base text-center mb-4">Adjust your photo</h3>
          <div className="relative w-full" style={{ height: 280, background: INK_3, borderRadius: 12, overflow: 'hidden' }}>
            <Cropper
              image={image}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_, areaPixels) => setCroppedAreaPixels(areaPixels)}
            />
          </div>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full mt-4"
          />
          <div className="flex items-center gap-3 mt-4">
            <button onClick={onCancel} style={{ color: TEXT_SOFT }} className="flex-1 text-sm py-2.5">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving} style={{ background: LIME, color: INK }} className="flex-1 rounded-md py-2.5 text-sm font-medium">
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
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
  const { profile, updateProfile } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [age, setAge] = useState(null);
  const [ageInput, setAgeInput] = useState('');
  const [bodyweight, setBodyweight] = useState('');
  const [restingHr, setRestingHr] = useState('');
  const [maxHr, setMaxHr] = useState('');
  const [prescribedZone, setPrescribedZone] = useState(null);
  const [showPeakInfo, setShowPeakInfo] = useState(false);
  const [intakeDone, setIntakeDone] = useState(true);
  const [showBaselineForm, setShowBaselineForm] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: profileRow }, { data: baseline }] = await Promise.all([
        supabase.from('profiles').select('age, bodyweight_lb, resting_hr_bpm, max_hr_bpm, prescribed_hr_zone').eq('id', userId).maybeSingle(),
        supabase.from('baseline_responses').select('form_answers, submitted_at').eq('user_id', userId).maybeSingle(),
      ]);
      const resolvedAge = profileRow?.age != null ? Number(profileRow.age) : (baseline?.form_answers?.age ? Number(baseline.form_answers.age) : null);
      setAge(resolvedAge);
      setAgeInput(resolvedAge != null ? String(resolvedAge) : '');
      setBodyweight(profileRow?.bodyweight_lb != null ? String(profileRow.bodyweight_lb) : '');
      setRestingHr(profileRow?.resting_hr_bpm != null ? String(profileRow.resting_hr_bpm) : '');
      setMaxHr(profileRow?.max_hr_bpm != null ? String(profileRow.max_hr_bpm) : '');
      setPrescribedZone(profileRow?.prescribed_hr_zone || null);
      setIntakeDone(Boolean(baseline?.submitted_at));
      setLoading(false);
    })();
  }, [userId]);

  async function saveAge(value) {
    const numeric = value.trim() === '' ? null : parseInt(value, 10);
    setAge(numeric);
    await updateProfile({ age: numeric });
  }
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
          {!intakeDone && (
            <button
              onClick={() => setShowBaselineForm(true)}
              style={{ background: INK_2, color: SKY }}
              className="w-full rounded-md py-2.5 text-sm font-medium"
            >
              Finish your intake questionnaire →
            </button>
          )}
          <div>
            <div style={{ color: TEXT_SOFT }} className="text-sm uppercase tracking-wide mb-1 text-center">Age</div>
            <input
              type="number"
              inputMode="numeric"
              value={ageInput}
              onChange={(e) => setAgeInput(e.target.value)}
              onBlur={(e) => saveAge(e.target.value)}
              placeholder="—"
              style={{ background: INK_2, color: PAPER, fontFamily: 'Space Grotesk, sans-serif' }}
              className="w-20 rounded-md px-2 py-1.5 text-lg text-center outline-none mx-auto block"
            />
          </div>
          <div>
            <div style={{ color: TEXT_SOFT }} className="text-sm uppercase tracking-wide mb-2 text-center">Gender</div>
            <div className="flex items-center gap-2">
              {GENDER_OPTIONS.map((g) => {
                const selected = profile?.gender === g;
                return (
                  <button
                    key={g}
                    onClick={() => updateProfile({ gender: g })}
                    style={{ background: selected ? LIME : INK_2, color: selected ? INK : PAPER_DIM }}
                    className="flex-1 rounded-md py-2 text-sm font-medium"
                  >
                    {g}
                  </button>
                );
              })}
            </div>
          </div>
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
          <VO2maxEstimator userId={userId} profile={profile} updateProfile={updateProfile} />
          <OneRMEstimator userId={userId} />
        </div>
      ))}
      {showBaselineForm && (
        <BaselineFlow
          userId={userId}
          onClose={() => setShowBaselineForm(false)}
          onComplete={() => { setShowBaselineForm(false); setIntakeDone(true); }}
        />
      )}
    </div>
  );
}

function SettingsSection({ userId, onChangePassword, onPaymentInfo, onManageMovements }) {
  const { profile, updateProfile } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <div style={{ background: INK_3 }} className="rounded-md px-4 py-3 mb-2">
      <button onClick={() => setOpen((v) => !v)} className="w-full grid grid-cols-[24px_1fr_24px] items-center">
        <span />
        <span style={{ color: TEXT_SOFT }} className="text-sm uppercase tracking-wide font-bold">Settings</span>
        <span className="justify-self-end">{open ? <ChevronUp size={16} color={TEXT_SOFT} /> : <ChevronDown size={16} color={TEXT_SOFT} />}</span>
      </button>
      {open && (
        <div style={{ borderTop: `1px dashed ${INK_2}` }} className="mt-3 pt-3">
          <LinkRow label="Change Password" onClick={onChangePassword} />
          <LinkRow label="Payment Information" onClick={onPaymentInfo} />
          <LinkRow label="Manage Your Movements" onClick={onManageMovements} />

          <div style={{ color: TEXT_SOFT }} className="text-sm uppercase tracking-wide block text-center mb-2 mt-4">Week Starts On</div>
          <div className="flex items-center gap-2 mb-2">
            {['monday', 'sunday'].map((day) => {
              const selected = (profile?.week_start_day || 'sunday') === day;
              return (
                <button
                  key={day}
                  onClick={() => updateProfile({ week_start_day: day })}
                  style={{ background: selected ? LIME : INK_2, color: selected ? INK : PAPER_DIM }}
                  className="flex-1 rounded-md py-2.5 text-sm font-medium capitalize"
                >
                  {day}
                </button>
              );
            })}
          </div>

          <DeletedWorkoutsSection userId={userId} />
        </div>
      )}
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
