'use client';

/**
 * FamilySetupResume
 *
 * Phase 1a (Consumer-First Growth) — prep doc §3.5.
 * Approved by Arnel 2026-07-05 18:23 CDT.
 *
 * Renders a small banner at the top of /dashboard/family when the parent
 * has dismissed the Family Setup Wizard. Clicking "Resume setup" clears
 * profiles.family_setup_completed_at so the wizard reappears on /dashboard.
 *
 * Why a separate component: the resume action needs a fetch + state, but
 * /dashboard/family is a server component. This small client component
 * keeps the fetch logic out of the server render.
 */

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

export default function FamilySetupResume() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [hidden, setHidden] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function resume() {
    startTransition(async () => {
      setError(null);
      try {
        const res = await fetch('/api/family/setup-state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'resume' }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({ error: 'Unknown error' }));
          setError(body.error || `Resume failed (${res.status})`);
          return;
        }
        setHidden(true);
        router.refresh();
      } catch (e: any) {
        setError(e?.message || 'Resume failed');
      }
    });
  }

  if (hidden) return null;

  return (
    <div
      data-testid="family-setup-resume"
      style={{
        background: 'rgba(20,184,166,0.06)',
        border: '1px solid rgba(20,184,166,0.3)',
        borderRadius: 12,
        padding: '1rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ fontSize: '1.5rem' }} aria-hidden>🏒</div>
      <div style={{ flex: '1 1 280px', minWidth: 240 }}>
        <h3 style={{
          fontFamily: "'Bebas Neue', Impact, sans-serif",
          fontSize: '1rem', color: '#fff', letterSpacing: '0.05em',
          margin: 0, marginBottom: 2,
        }}>
          RESUME HOCKEY PASSPORT SETUP
        </h3>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', margin: 0, lineHeight: 1.45 }}>
          Finish the 6-step setup to unlock documents, achievements, and team invites.
        </p>
        {error ? (
          <p style={{ color: '#FF6B7A', fontSize: '0.75rem', margin: '0.5rem 0 0' }}>
            {error}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={resume}
        disabled={pending}
        data-testid="family-setup-resume-btn"
        style={{
          background: '#14B8A6',
          color: '#0a0a0a',
          border: 'none',
          padding: '0.55rem 1rem',
          borderRadius: 6,
          fontSize: '0.85rem',
          fontWeight: 700,
          cursor: pending ? 'wait' : 'pointer',
          opacity: pending ? 0.6 : 1,
        }}
      >
        {pending ? 'Loading\u2026' : 'Resume setup →'}
      </button>
    </div>
  );
}
