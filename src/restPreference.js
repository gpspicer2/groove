// Whether logging a set auto-starts the rest-timer banner. Lives in
// localStorage rather than the profiles table — simple per-device
// preference, not something that strictly needs to sync across devices.
// Defaults to off: an uninvited timer reads as the app deciding how you
// rest rather than you.
const KEY = 'groove:autoStartRestTimer';

export function getAutoStartRestTimer() {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function setAutoStartRestTimer(value) {
  try {
    localStorage.setItem(KEY, value ? '1' : '0');
  } catch {
    // Private browsing / storage blocked — the toggle just won't persist.
  }
}
