'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';

// DB enum values. Display labels are friendlier.
const OPTIONS = [
  { value: 'fan',           label: 'Fan',           hint: 'I follow hockey' },
  { value: 'player',        label: 'Player',        hint: 'I play the game' },
  { value: 'parent',        label: 'Parent',        hint: "I manage my kid's profile" },
  { value: 'coach',         label: 'Coach',         hint: 'I run a team' },
  { value: 'scout',         label: 'Scout',         hint: 'I evaluate players' },
  { value: 'referee',       label: 'Referee',       hint: 'I officiate games' },
  { value: 'team_admin',    label: 'Team Admin',    hint: 'I manage a team' },
  { value: 'league_admin',  label: 'League Admin',  hint: 'I run a league' },
  { value: 'rink_operator', label: 'Rink Operator', hint: 'I run a rink or arena' },
  { value: 'business',      label: 'Business',      hint: 'Pro shop, sharpening, camps' },
] as const;

type AccountType = (typeof OPTIONS)[number]['value'];

export default function AccountTypePicker() {
  const { isSignedIn, isLoaded } = useUser();
  const [selected, setSelected] = useState<Set<AccountType>>(new Set());
  const [primary, setPrimary] = useState<AccountType | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    fetch('/api/account-type')
      .then((r) => r.json())
      .then((d) => {
        const types: AccountType[] = Array.isArray(d.types) ? d.types : [];
        setSelected(new Set(types));
        setPrimary(d.primary || types[0] || null);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [isLoaded, isSignedIn]);

  function toggle(value: AccountType) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(value)) {
        next.delete(value);
        // If the removed type was primary, demote to the first remaining, or null
        if (primary === value) {
          const first = next.values().next().value as AccountType | undefined;
          setPrimary(first ?? null);
        }
      } else {
        next.add(value);
        if (!primary) setPrimary(value);
      }
      return next;
    });
    setSaved(false);
  }

  function setPrimaryFor(value: AccountType) {
    if (!selected.has(value)) return;
    setPrimary(value);
    setSaved(false);
  }

  async function save() {
    if (!isSignedIn) {
      window.location.href = `/sign-up?redirect_url=${encodeURIComponent('/pricing')}`;
      return;
    }
    if (selected.size === 0) return;
    setBusy(true);
    setSaved(false);
    try {
      const res = await fetch('/api/account-type', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ types: Array.from(selected), primary }),
      });
      if (res.ok) {
        const d = await res.json();
        setSelected(new Set(d.types));
        setPrimary(d.primary);
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    } catch {
      // silent
    } finally {
      setBusy(false);
    }
  }

  if (!isLoaded || !isSignedIn) {
    return null;
  }

  const dirty =
    loaded &&
    (selected.size === 0 ||
      (primary !== null && !selected.has(primary as AccountType)));

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', margin: '0 0 1rem', textAlign: 'center' }}>
        Pick every role that applies. Most people in hockey hold more than one.
        Choose which one is the <strong style={{ color: '#FFB81C' }}>primary</strong> — that&rsquo;s what shows next to your name.
      </p>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '0.5rem',
        }}
      >
        {OPTIONS.map((opt) => {
          const active = selected.has(opt.value);
          const isPrimary = primary === opt.value && active;
          return (
            <div
              key={opt.value}
              style={{
                position: 'relative',
                padding: '0.75rem 0.875rem',
                background: active ? 'rgba(20,184,166,0.12)' : 'rgba(255,255,255,0.03)',
                border: active ? (isPrimary ? '2px solid #FFB81C' : '2px solid #14B8A6') : '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                color: '#fff',
                fontSize: '0.875rem',
                transition: 'all 0.15s',
              }}
            >
              <button
                type="button"
                onClick={() => toggle(opt.value)}
                disabled={busy}
                aria-pressed={active}
                style={{
                  all: 'unset',
                  cursor: busy ? 'wait' : 'pointer',
                  display: 'block',
                  width: '100%',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                  <span style={{ fontWeight: active ? 700 : 500 }}>{opt.label}</span>
                  <span
                    aria-hidden="true"
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 4,
                      border: active ? '2px solid #14B8A6' : '1.5px solid rgba(255,255,255,0.3)',
                      background: active ? '#14B8A6' : 'transparent',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                      color: '#0a0a0a',
                      fontWeight: 800,
                      flexShrink: 0,
                    }}
                  >
                    {active ? '✓' : ''}
                  </span>
                </div>
                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', fontWeight: 400, marginTop: 2 }}>
                  {opt.hint}
                </div>
              </button>
              {active && (
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    marginTop: 6,
                    fontSize: '0.65rem',
                    color: isPrimary ? '#FFB81C' : 'rgba(255,255,255,0.5)',
                    cursor: 'pointer',
                    fontWeight: isPrimary ? 700 : 400,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}
                >
                  <input
                    type="radio"
                    name="primary-account-type"
                    checked={isPrimary}
                    onChange={() => setPrimaryFor(opt.value)}
                    style={{ margin: 0, accentColor: '#FFB81C' }}
                  />
                  Primary
                </label>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: '1.25rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={save}
          disabled={busy || selected.size === 0 || !primary}
          style={{
            padding: '0.625rem 1.5rem',
            background: selected.size === 0 || !primary ? 'rgba(255,255,255,0.1)' : '#14B8A6',
            color: selected.size === 0 || !primary ? 'rgba(255,255,255,0.4)' : '#0a0a0a',
            border: 'none',
            borderRadius: 6,
            fontSize: '0.875rem',
            fontWeight: 700,
            cursor: selected.size === 0 || !primary ? 'not-allowed' : 'pointer',
            letterSpacing: '0.03em',
          }}
        >
          {busy ? 'Saving…' : 'Save'}
        </button>
        {saved && (
          <span style={{ color: '#14B8A6', fontSize: '0.875rem', fontWeight: 600 }}>
            ✓ Saved. Your dashboard will personalize.
          </span>
        )}
        {dirty && !saved && (
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>
            Pick a primary to enable save.
          </span>
        )}
      </div>
    </div>
  );
}
