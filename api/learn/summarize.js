import { supabaseAdmin } from '../_lib/supabaseAdmin.js';
import { getAuthedUser } from '../_lib/auth.js';

const CATEGORIES = ['Benefits', 'Strategy', 'Adherence'];

// Rejects addresses that point inside our own network.
function isPublicHttpUrl(raw) {
  let u;
  try { u = new URL(raw); } catch { return false; }
  if (!['http:', 'https:'].includes(u.protocol)) return false;
  const h = u.hostname.toLowerCase();
  if (h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal')) return false;
  if (/^(\d+\.){3}\d+$/.test(h) && /^(10\.|127\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|0\.)/.test(h)) return false;
  if (h.includes(':')) return false;
  return true;
}

function pageText(html) {
  return html
    .replace(/<(script|style|noscript|svg|nav|footer|header)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

// Greg pastes a link; this reads the page and drafts a catchy title, a short
// summary and a category. Coach only.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const user = await getAuthedUser(req);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(503).json({ error: 'Not set up yet: the ANTHROPIC_API_KEY is missing in Vercel.' });

  try {
    const { data: me } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single();
    if (me?.role !== 'trainer') return res.status(403).json({ error: 'Only the coach can do this' });

    const link = String(req.body?.url || '').trim();
    if (!isPublicHttpUrl(link)) return res.status(400).json({ error: 'That does not look like a web link.' });

    const page = await fetch(link, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GrooveBot/1.0)', Accept: 'text/html,application/xhtml+xml' },
      redirect: 'follow',
      signal: AbortSignal.timeout(10000),
    });
    if (!page.ok) return res.status(422).json({ error: `That page would not open (${page.status}). Some sites block this; paste the text yourself.` });
    const text = pageText((await page.text()).slice(0, 600000)).slice(0, 12000);
    if (text.length < 200) return res.status(422).json({ error: 'I could not read enough text from that page.' });

    const prompt = `You help a movement mentor named Greg post short reads for his clients (friends and family, not experts). Read this web page and write:
- title: catchy, plain words, under 8 words, no clickbait, no emoji
- summary: the main point or finding in 1-2 short sentences a non-expert understands; no jargon; say what the research found, do not exaggerate
- category: exactly one of Benefits (what movement does for body or mind), Strategy (how to train or move well), Adherence (sticking with it, habits, motivation)
Reply with only JSON: {"title": "...", "summary": "...", "category": "..."}

Page address: ${link}
Page text:
${text}`;

    const ai = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL || 'claude-haiku-5-5', max_tokens: 400, messages: [{ role: 'user', content: prompt }] }),
      signal: AbortSignal.timeout(30000),
    });
    if (!ai.ok) { console.error('summarize ai failed', ai.status, await ai.text()); return res.status(502).json({ error: 'The writing helper did not answer. Try again.' }); }
    const out = (await ai.json()).content?.map((b) => b.text || '').join('') || '';
    const parsed = JSON.parse(out.slice(out.indexOf('{'), out.lastIndexOf('}') + 1));
    const category = CATEGORIES.includes(parsed.category) ? parsed.category : 'Strategy';
    res.status(200).json({ title: `[${category}] ${String(parsed.title).trim()}`, summary: String(parsed.summary).trim() });
  } catch (err) {
    console.error('learn summarize failed', err);
    res.status(500).json({ error: 'Could not read that link. Try again, or write it yourself.' });
  }
}
