'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

export default function JoinForm({
  initialCode,
  initialInviteState,
}: {
  initialCode: string;
  initialInviteState: 'active' | 'revoked' | 'expired' | 'exhausted' | 'not_found';
}) {
  const router = useRouter();
  const [code, setCode] = useState(initialCode);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ teamName: string; teamSlug: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!code.trim()) {
      setError('Please enter an invite code.');
      return;
    }
    setBusy(true);
    try {
      const sb = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data, error } = await sb.rpc('claim_team_invite', {
        p_code: code.trim().toUpperCase(),
      });
      if (error) {
        setError(error.message);
        return;
      }
      if (!data?.ok) {
        const errCode = data?.error as string | undefined;
        const errMsg = (data?.message as string | undefined) || errCode || 'Could not join team';
        setError(errMsg);
        return;
      }
      setSuccess({ teamName: data.team_name, teamSlug: data.team_slug });
      // Auto-redirect after 2s
      setTimeout(() => router.push(`/dashboard/team/${data.team_slug}`), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      setBusy(false);
    }
  }

  if (success) {
    return (
      <div
        style={{
          background: 'rgba(20,184,166,0.12)',
          border: '1px solid rgba(20,184,166,0.4)',
          color: '#14B8A6',
          padding: '1rem',
          borderRadius: 8,
          fontSize: '0.9rem',
        }}
      >
        <div style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>🎉 You&rsquo;re in!</div>
        <div>
          Welcome to <strong>{success.teamName}</strong>. Redirecting to your team hub…
        </div>
      </div>
    );
  }

  if (initialInviteState !== 'active' && initialInviteState !== 'not_found') {
    const stateLabel = {
      revoked: 'revoked',
      expired: 'expired',
      exhausted: 'fully used',
    }[initialInviteState as 'revoked' | 'expired' | 'exhausted'] || 'no longer valid';

    return (
      <div
        style={{
          background: 'rgba(200,16,46,0.10)',
          border: '1px solid rgba(200,16,46,0.4)',
          color: '#FF6B7A',
          padding: '1rem',
          borderRadius: 8,
          fontSize: '0.9rem',
        }}
      >
        <div style={{ fontSize: '1rem', marginBottom: '0.25rem', fontWeight: 700 }}>
          This invite is {stateLabel}
        </div>
        <div style={{ fontSize: '0.8rem', color: 'rgba(255,107,122,0.8)' }}>
          Ask your coach or team manager to send you a new code.
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'stretch' }}
    >
      <input
        type="text"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="CEBU-9D17-CD"
        required
        maxLength={20}
        style={{
          padding: '0.75rem 1rem',
          background: 'rgba(255,255,255,0.06)',
          color: '#fff',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 8,
          fontSize: '1.1rem',
          fontFamily: "'JetBrains Mono', 'Courier New', monospace",
          fontWeight: 600,
          textAlign: 'center',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}
        autoFocus
        autoComplete="off"
        spellCheck={false}
      />

      {error && (
        <div
          style={{
            background: 'rgba(200,16,46,0.10)',
            border: '1px solid rgba(200,16,46,0.4)',
            color: '#FF6B7A',
            padding: '0.625rem 0.875rem',
            borderRadius: 6,
            fontSize: '0.85rem',
            textAlign: 'left',
          }}
        >
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={busy || !code.trim()}
        style={{
          padding: '0.75rem 1.5rem',
          background: '#C8102E',
          color: '#fff',
          border: 'none',
          borderRadius: 6,
          fontSize: '0.95rem',
          fontWeight: 700,
          cursor: busy || !code.trim() ? 'not-allowed' : 'pointer',
          opacity: busy || !code.trim() ? 0.6 : 1,
        }}
      >
        {busy ? 'Joining…' : 'Join team'}
      </button>

      <Link
        href="/dashboard"
        style={{
          color: 'rgba(255,255,255,0.5)',
          fontSize: '0.8rem',
          textDecoration: 'none',
          textAlign: 'center',
          marginTop: '0.25rem',
        }}
      >
        ← Back to dashboard
      </Link>
    </form>
  );
}
