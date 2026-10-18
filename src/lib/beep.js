// A quick double beep (and a double buzz where the phone allows it) for timers.
// iPhones cannot vibrate from a web app, so the beep is what they get; it plays through headphones too.
let ctx = null;

// Call from a tap (browsers only allow sound after one).
export function unlockAudio() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!ctx) ctx = new AC();
    if (ctx.state === 'suspended') ctx.resume();
  } catch { /* no audio */ }
}

export function doubleBeep() {
  try {
    unlockAudio();
    if (ctx) {
      const t = ctx.currentTime;
      [0, 0.22].forEach((d) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.0001, t + d);
        gain.gain.exponentialRampToValueAtTime(0.4, t + d + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.15);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t + d);
        osc.stop(t + d + 0.17);
      });
    }
  } catch { /* no audio */ }
  try { if (navigator.vibrate) navigator.vibrate([120, 80, 120]); } catch { /* not supported */ }
}

// Keeps the screen awake while a timer runs (so the beep isn't missed when the phone would have dimmed and locked).
let lock = null;
export async function keepAwake(on) {
  try {
    if (on && navigator.wakeLock) lock = await navigator.wakeLock.request('screen');
    else if (!on && lock) { await lock.release(); lock = null; }
  } catch { /* not allowed */ }
}
