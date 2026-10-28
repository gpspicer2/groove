import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from '../lib/icons';
import Wordmark from '../Wordmark';
import { invitePromoActive } from '../lib/membership';
import { INK, INK_2, INK_3, PAPER, PAPER_DIM, TEXT_SOFT, PLUM, SKY } from '../theme';

// Optional intro video: set VITE_INVITE_VIDEO to a YouTube link (or video id) in Vercel and it appears here.
function videoEmbed() {
  const raw = String(import.meta.env.VITE_INVITE_VIDEO || '').trim();
  if (!raw) return null;
  const m = raw.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([A-Za-z0-9_-]{11})/) || raw.match(/^([A-Za-z0-9_-]{11})$/);
  return m ? `https://www.youtube-nocookie.com/embed/${m[1]}` : null;
}

const POINTS = [
  ['Log Your Physical Activity', 'For when you walk, lift, stretch, dance at a wedding or mow the lawn. Your weekly goals are tracked for you.'],
  ['Plans Built on Science', 'Goals and programs follow American College of Sports Medicine guidelines.'],
  ['Learn as You Go', 'Short, plain explanations of why movement works.'],
];

// What someone sees first when they open a shared invite link: who built this, what it does, what it costs.
export default function InviteWelcome({ onStart, onSignIn }) {
  const [showCompare, setShowCompare] = useState(false);
  const video = videoEmbed();
  const free = invitePromoActive();

  return (
    <div style={{ background: INK, fontFamily: 'Outfit, sans-serif' }} className="min-h-[100svh] px-4 pt-[5svh] pb-10">
      <div className="max-w-sm mx-auto">
        <div style={{ background: INK_2, borderTop: `2px solid ${PLUM}` }} className="rounded-lg px-5 py-6 text-center">
          <Wordmark height={40} className="mb-4 mx-auto block" />
          <img src="/greg.jpg" alt="Dr. Greg Spicer" className="w-20 h-20 rounded-full object-cover mx-auto mb-3" />
          <h1 style={{ color: PLUM }} className="text-xl font-medium mb-1">Meet Dr. Greg Spicer</h1>
          <p style={{ color: PAPER_DIM }} className="text-sm mb-4">
            A professor and exercise physiologist with a PhD in exercise physiology and years of experience helping students, clients, patients, and athletes. Groove puts that expertise in your pocket.
          </p>

          {video && (
            <div className="rounded-md overflow-hidden mb-4" style={{ aspectRatio: '16 / 9' }}>
              <iframe title="A welcome from Dr. Greg Spicer" src={video} className="w-full h-full" allow="encrypted-media; picture-in-picture" allowFullScreen />
            </div>
          )}

          <div className="space-y-3 mb-4">
            {POINTS.map(([title, body]) => (
              <div key={title}>
                <div style={{ color: PAPER }} className="text-base font-medium">{title}</div>
                <div style={{ color: TEXT_SOFT }} className="text-sm">{body}</div>
              </div>
            ))}
          </div>

          <div style={{ background: INK_3 }} className="rounded-md px-4 py-3 mb-4">
            {free && <div style={{ color: SKY }} className="text-sm font-semibold mb-1">Free to join right now.</div>}
            <div style={{ color: PAPER }} className="text-sm"><b>Groove</b>: the app, with your goals, programs and tidbits</div>
            <div style={{ color: PAPER }} className="text-sm mt-1"><b>Groove (with Greg)</b>: adds mentorship</div>
            <div style={{ color: TEXT_SOFT }} className="text-xs">a monthly 15-minute call and weekly notes on your progress from Greg</div>
          </div>

          <button onClick={onStart} style={{ background: PLUM, color: INK }} className="w-full rounded-md py-3 text-base font-medium mb-2">Get Started</button>
          <button onClick={onSignIn} style={{ color: TEXT_SOFT }} className="text-sm py-1">Already have an account? Sign in</button>
        </div>

        <button
          onClick={() => setShowCompare((v) => !v)}
          style={{ background: INK_2, color: PAPER }}
          className="w-full mt-3 rounded-lg px-4 py-3 text-sm font-medium flex items-center justify-between"
        >
          How Is This Different From a Personal Trainer?
          {showCompare ? <ChevronUp size={16} color={TEXT_SOFT} /> : <ChevronDown size={16} color={TEXT_SOFT} />}
        </button>
        {showCompare && <img src="/invite-compare.png" alt="Personal trainer compared with Groove (with Greg)" className="w-full rounded-lg mt-2" />}
        <p style={{ color: TEXT_SOFT }} className="text-xs text-center mt-4">Groove provides movement tracking and education, not medical advice.</p>
      </div>
    </div>
  );
}
