import React, { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { INK_2, INK_3, PAPER, PAPER_DIM, TEXT_SOFT, PLUM, BRICK, MOSS } from '../../theme';
import { MEMBERSHIP_PRICE, MEMBERSHIP_REQUIRED } from '../../lib/membership';
import { Avatar, Stat, SectionTitle } from './CoachParts';

const LABELS = {
  active: ['Paying', MOSS], trialing: ['Trial', MOSS], comped: ['Comped', PLUM],
  past_due: ['Past due', BRICK], canceled: ['Canceled', TEXT_SOFT],
};

export default function Members({ clients, onClientChanged }) {
  const [busyId, setBusyId] = useState(null);
  const paying = clients.filter((c) => c.membership_status === 'active' || c.membership_status === 'trialing').length;
  const comped = clients.filter((c) => c.membership_status === 'comped').length;
  const pastDue = clients.filter((c) => c.membership_status === 'past_due').length;
  const none = clients.filter((c) => !c.membership_status || c.membership_status === 'canceled').length;

  async function setComped(c, comp) {
    setBusyId(c.id);
    const next = comp ? 'comped' : null;
    const { error } = await supabase.from('profiles').update({ membership_status: next }).eq('id', c.id);
    setBusyId(null);
    if (!error) onClientChanged(c.id, { membership_status: next });
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Paying" value={paying} sub={`about $${paying * MEMBERSHIP_PRICE}/month`} color={MOSS} />
        <Stat label="Comped" value={comped} sub="free access" color={PLUM} />
        <Stat label="Past due" value={pastDue} color={pastDue ? BRICK : PAPER} />
        <Stat label="No plan yet" value={none} />
      </div>

      <div style={{ background: INK_2 }} className="rounded-2xl px-4 py-3 mt-4">
        <div style={{ color: PAPER }} className="text-sm font-medium">
          {MEMBERSHIP_REQUIRED ? 'Membership is required' : 'Membership is optional right now'}
        </div>
        <div style={{ color: TEXT_SOFT }} className="text-sm">
          {MEMBERSHIP_REQUIRED
            ? 'New members must join before using the app. Comped members skip the payment.'
            : 'Everyone still has full access. Turn on required membership when you are ready to charge.'}
        </div>
        <a href="https://dashboard.stripe.com" target="_blank" rel="noreferrer" style={{ color: PLUM }} className="inline-block text-sm font-medium mt-2 underline">Open Stripe dashboard</a>
      </div>

      <SectionTitle>Members</SectionTitle>
      <div style={{ background: INK_2 }} className="rounded-2xl overflow-hidden">
        {clients.length === 0 && <div style={{ color: TEXT_SOFT }} className="px-4 py-4 text-sm">No members yet.</div>}
        {clients.map((c, i) => {
          const label = LABELS[c.membership_status];
          const isComped = c.membership_status === 'comped';
          const canComp = !['active', 'trialing', 'past_due'].includes(c.membership_status);
          return (
            <div key={c.id} style={{ borderTop: i ? `1px solid color-mix(in srgb, ${TEXT_SOFT} 18%, transparent)` : 'none' }} className="flex items-center gap-3 px-4 py-3">
              <Avatar client={c} size={34} />
              <span className="flex-1 min-w-0">
                <span style={{ color: PAPER }} className="block text-sm font-medium truncate">{c.full_name || c.email}</span>
                <span style={{ color: label ? label[1] : TEXT_SOFT }} className="block text-sm">
                  {label ? label[0] : 'No plan'}
                  {c.membership_renews_at && label?.[0] === 'Paying' ? ` · renews ${new Date(c.membership_renews_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}
                </span>
              </span>
              {(isComped || canComp) && (
                <button
                  onClick={() => setComped(c, !isComped)}
                  disabled={busyId === c.id}
                  style={{ background: INK_3, color: PAPER_DIM }}
                  className="rounded-full px-3 py-1.5 text-sm font-medium whitespace-nowrap"
                >
                  {isComped ? 'Remove comp' : 'Comp'}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
