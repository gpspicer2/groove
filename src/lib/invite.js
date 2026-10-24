// The link members share, and the text that goes with it. Opens the welcome page (see InviteWelcome) for new people.
export const INVITE_URL = 'https://groove-rho.vercel.app/?invite';
export const INVITE_TEXT = "Hey! I'm using Groove for movement tracking and guidance. It's built by Dr. Greg Spicer, a professor and exercise physiologist. Take a look:";

// Opens the phone's share sheet; falls back to copying the message. Returns 'shared' | 'copied' | 'failed'.
export async function shareInvite() {
  try {
    if (navigator.share) {
      await navigator.share({ title: 'Groove', text: INVITE_TEXT, url: INVITE_URL });
      return 'shared';
    }
  } catch (e) {
    if (e && e.name === 'AbortError') return 'shared'; // they closed the sheet; nothing went wrong
  }
  try {
    await navigator.clipboard.writeText(`${INVITE_TEXT}\n${INVITE_URL}`);
    return 'copied';
  } catch { return 'failed'; }
}
