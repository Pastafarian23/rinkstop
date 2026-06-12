'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';

const OPTIONS = [
  { value: 'fan',      label: 'Fan',       hint: 'I follow hockey' },
  { value: 'player',   label: 'Player',    hint: 'I play the game' },
  { value: 'coach',    label: 'Coach',     hint: 'I run a team' },
  { value: 'scout',    label: 'Scout',     hint: 'I evaluate players' },
  { value: 'business', label: 'Business',  hint: 'Shop, sharpening, camps' },
  { value: 'team',     label: 'Team',      hint: 'Team manager' },
  { value: 'league',   label: 'League',    hint: 'Run a league' },
  { value: 'rink',     label: 'Rink',      hint: 'Rink or arena' },
] as const;

type AccountType = (typeof OPTIONS)[number]['value'];

export default function AccountTypePicker() {
  const { isSignedIn, isLoaded } = useUser();
  const [current, setCurrent] = useState<AccountType | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    fetch('/api/account-type')
      .then((r) => r.json())
      .then((d) => setCurrent(d.account_type || null))
      .catch(() => {});
  }, [isLoaded, isSignedIn]);

  async function pick(value: AccountType) {
    if (!isSignedIn) {
      window.location.href = `/sign-up?redirect_url=${encodeURIComponent('/pricing')}`;
      return;
    }
    setBusy(true);
    setSaved(false);
    try {
      const res = await fetch('/api/account-type', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_type: value }),
      });
      if (res.ok) {
        setCurrent(value);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch {
      // silent
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '0.5rem',
        maxWidth: 720,
        margin: '0 auto',
      }}
    >
      {OPTIONS.map((opt) => {
        const active = current === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => pick(opt.value)}
            disabled={busy}
            style={{
              padding: '0.75rem 0.875rem',
              background: active ? 'rgba(20,184,166,0.12)' : 'rgba(255,255,255,0.03)',
              border: active ? '2px solid #14B8A6' : '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
              color: '#fff',
              fontSize: '0.875rem',
              fontWeight: active ? 700 : 500,
              cursor: busy ? 'wait' : 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s',
            }}
          >
            <div>{opt.label}</div>
            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', fontWeight: 400, marginTop: 2 }}>
              {opt.hint}
            </div>
          </button>
        );
      })}
      {saved && (
        <div
          style={{
            gridColumn: '1 / -1',
            textAlign: 'center',
            color: '#14B8A6',
            fontSize: '0.875rem',
            marginTop: '0.5rem',
          }}
        >
          ✓ Saved. Your dashboard will personalize.
        </div>
      )}
    </div>
  );
}
