'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RoleChip } from './RoleChip';
import { createClient } from '@supabase/supabase-js';

export interface InviteRow {
  id: string;
  code: string;
  role: string;
  maxUses: number;
  timesUsed: number;
  expiresAt: string | null;
  revokedAt: string | null;
  label: string | null;
  createdAt: string;
}

export function InviteTable({
  teamId,
  invites,
  teamSlug,
}: {
  teamId: string;
  invites: InviteRow[];
  teamSlug: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [showGen, setShowGen] = useState(false);
  const [genRole, setGenRole] = useState('player');
  const [genMaxUses, setGenMaxUses] = useState(1);
  const [genExpiresDays, setGenExpiresDays] = useState(7);
  const [genLabel, setGenLabel] = useState('');

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const sb = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data, error } = await sb.rpc('generate_team_invite', {
        p_team_id: teamId,
        p_role: genRole,
        p_max_uses: genMaxUses,
        p_expires_days: genExpiresDays,
        p_label: genLabel || null,
      });
      if (error) {
        setError(error.message);
        return;
      }
      if (!data?.ok) {
        setError(data?.message || data?.error || 'Could not generate invite');
        return;
      }
      setShowGen(false);
      setGenLabel('');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      setBusy(false);
    }
  }

  async function handleRevoke(inviteId: string) {
    if (!confirm('Revoke this invite code? Anyone who hasn\'t used it yet will no longer be able to.')) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const sb = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data, error } = await sb.rpc('revoke_team_invite', { p_invite_id: inviteId });
      if (error) {
        setError(error.message);
        return;
      }
      if (!data?.ok) {
        setError(data?.error || 'Could not revoke invite');
        return;
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      setBusy(false);
    }
  }

  async function handleCopy(code: string) {
    const link = `${window.location.origin}/join/${code}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      // Fallback: select the text
      const ta = document.createElement('textarea');
      ta.value = link;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    }
  }

  const active = invites.filter((i) => !i.revokedAt);
  const revoked = invites.filter((i) => i.revokedAt);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {error && (
        <div
          style={{
            background: 'rgba(200,16,46,0.10)',
            border: '1px solid rgba(200,16,46,0.4)',
            color: '#FF6B7A',
            padding: '0.75rem 1rem',
            borderRadius: 8,
            fontSize: '0.85rem',
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          background: '#0f0f0f',
          border: '1px solid #1e1e1e',
          borderRadius: 12,
          padding: '1.25rem',
        }}
      >
        {!showGen ? (
          <button
            onClick={() => setShowGen(true)}
            disabled={busy}
            style={{
              padding: '0.6rem 1.25rem',
              background: '#C8102E',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              fontSize: '0.875rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            + Generate new invite code
          </button>
        ) : (
          <form
            onSubmit={handleGenerate}
            style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}
          >
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <label style={labelStyle}>
                Role
                <select
                  value={genRole}
                  onChange={(e) => setGenRole(e.target.value)}
                  style={inputStyle}
                  disabled={busy}
                >
                  <option value="player">Player</option>
                  <option value="goalie">Goalie</option>
                  <option value="alternate_player">Alternate Player</option>
                  <option value="assistant_coach">Assistant Coach</option>
                  <option value="goalie_coach">Goalie Coach</option>
                  <option value="skills_coach">Skills Coach</option>
                  <option value="manager">Manager</option>
                  <option value="team_staff">Team Staff</option>
                  <option value="treasurer">Treasurer</option>
                  <option value="parent_rep">Parent Rep</option>
                </select>
              </label>
              <label style={labelStyle}>
                Max uses
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={genMaxUses}
                  // BUG #10 FIX: `parseInt(x, 10) || 1` silently coerced 0 to 1
                  // (since 0 is falsy). Now check for NaN explicitly and clamp.
                  onChange={(e) => {
                    const n = parseInt(e.target.value, 10);
                    setGenMaxUses(Number.isNaN(n) ? 1 : Math.max(1, Math.min(100, n)));
                  }}
                  style={inputStyle}
                  disabled={busy}
                />
              </label>
              <label style={labelStyle}>
                Expires (days)
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={genExpiresDays}
                  onChange={(e) => {
                    const n = parseInt(e.target.value, 10);
                    setGenExpiresDays(Number.isNaN(n) ? 7 : Math.max(1, Math.min(365, n)));
                  }}
                  style={inputStyle}
                  disabled={busy}
                />
              </label>
            </div>
            <label style={labelStyle}>
              Label (optional)
              <input
                type="text"
                value={genLabel}
                onChange={(e) => setGenLabel(e.target.value)}
                placeholder="e.g. Saturday practice invite"
                style={inputStyle}
                disabled={busy}
                maxLength={100}
              />
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="submit"
                disabled={busy}
                style={{
                  padding: '0.6rem 1.25rem',
                  background: '#C8102E',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  cursor: busy ? 'not-allowed' : 'pointer',
                  opacity: busy ? 0.6 : 1,
                }}
              >
                {busy ? 'Generating…' : 'Generate code'}
              </button>
              <button
                type="button"
                onClick={() => setShowGen(false)}
                disabled={busy}
                style={{
                  padding: '0.6rem 1.25rem',
                  background: 'rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.8)',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {active.length === 0 && revoked.length === 0 ? (
        <div
          style={{
            background: '#0f0f0f',
            border: '1px solid #1e1e1e',
            borderRadius: 12,
            padding: '2rem 1.5rem',
            textAlign: 'center',
            color: 'rgba(255,255,255,0.5)',
          }}
        >
          <p style={{ margin: 0, fontSize: '0.9rem' }}>
            No invite codes yet. Generate one to add members to your team.
          </p>
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <InviteList
              title="Active invites"
              invites={active}
              onCopy={handleCopy}
              onRevoke={handleRevoke}
              copiedCode={copiedCode}
              busy={busy}
            />
          )}
          {revoked.length > 0 && (
            <InviteList
              title="Revoked / expired"
              invites={revoked}
              onCopy={handleCopy}
              onRevoke={handleRevoke}
              copiedCode={copiedCode}
              busy={busy}
              dim
            />
          )}
        </>
      )}
    </div>
  );
}

function InviteList({
  title,
  invites,
  onCopy,
  onRevoke,
  copiedCode,
  busy,
  dim,
}: {
  title: string;
  invites: InviteRow[];
  onCopy: (code: string) => void;
  onRevoke: (id: string) => void;
  copiedCode: string | null;
  busy: boolean;
  dim?: boolean;
}) {
  return (
    <div>
      <h3
        style={{
          fontSize: '0.75rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: 'rgba(255,255,255,0.5)',
          margin: '0 0 0.5rem',
        }}
      >
        {title} ({invites.length})
      </h3>
      <div
        style={{
          background: '#0f0f0f',
          border: '1px solid #1e1e1e',
          borderRadius: 12,
          overflow: 'hidden',
          opacity: dim ? 0.55 : 1,
        }}
      >
        {invites.map((inv, i) => {
          const isExpired = inv.expiresAt && new Date(inv.expiresAt) < new Date();
          const isExhausted = inv.timesUsed >= inv.maxUses;
          return (
            <div
              key={inv.id}
              style={{
                padding: '0.875rem 1rem',
                borderBottom: i < invites.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: "'JetBrains Mono', 'Courier New', monospace",
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    color: '#fff',
                    letterSpacing: '0.05em',
                  }}
                >
                  {inv.code}
                </div>
                {inv.label && (
                  <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>
                    {inv.label}
                  </div>
                )}
                <div
                  style={{
                    fontSize: '0.7rem',
                    color: 'rgba(255,255,255,0.4)',
                    marginTop: 4,
                    display: 'flex',
                    gap: '0.75rem',
                    flexWrap: 'wrap',
                  }}
                >
                  <span>
                    {inv.timesUsed} / {inv.maxUses} used
                  </span>
                  {inv.expiresAt && (
                    <span>
                      {isExpired ? '⏰ Expired' : `⏰ ${new Date(inv.expiresAt).toLocaleDateString()}`}
                    </span>
                  )}
                  {isExhausted && !isExpired && <span>✓ Filled</span>}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <RoleChip role={inv.role} size="xs" />
                <button
                  onClick={() => onCopy(inv.code)}
                  disabled={busy || dim}
                  style={smallBtnStyle('rgba(20,184,166,0.12)', '#14B8A6', 'rgba(20,184,166,0.4)')}
                >
                  {copiedCode === inv.code ? '✓ Copied!' : '🔗 Copy link'}
                </button>
                {!dim && (
                  <button
                    onClick={() => onRevoke(inv.id)}
                    disabled={busy}
                    style={smallBtnStyle('rgba(200,16,46,0.10)', '#F87171', 'rgba(200,16,46,0.4)')}
                  >
                    Revoke
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.25rem',
  fontSize: '0.75rem',
  fontWeight: 600,
  color: 'rgba(255,255,255,0.7)',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  flex: '1 1 140px',
  minWidth: 140,
};

const inputStyle: React.CSSProperties = {
  padding: '0.5rem 0.75rem',
  background: 'rgba(255,255,255,0.04)',
  color: '#fff',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 6,
  fontSize: '0.875rem',
  fontWeight: 500,
  textTransform: 'none',
  letterSpacing: 'normal',
  fontFamily: 'inherit',
};

function smallBtnStyle(bg: string, color: string, border: string): React.CSSProperties {
  return {
    padding: '0.35rem 0.75rem',
    background: bg,
    color,
    border: `1px solid ${border}`,
    borderRadius: 6,
    fontSize: '0.75rem',
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  };
}
