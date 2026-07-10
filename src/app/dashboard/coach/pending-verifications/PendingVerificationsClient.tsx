'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Row = {
  id: string;
  team_id: string;
  jersey_number: number | null;
  position: string | null;
  role: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  player: { id: string; first_name: string; last_name: string; slug: string; user_id: string } | { id: string; first_name: string; last_name: string; slug: string; user_id: string }[] | null;
  team: { name: string; slug: string } | { name: string; slug: string }[] | null;
  season: { label: string } | { label: string }[] | null;
};

function pickOne<T>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null;
  if (Array.isArray(v)) return v[0] ?? null;
  return v;
}

export default function PendingVerificationsClient({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const verify = async (rowId: string) => {
    setBusyId(rowId);
    setError(null);
    try {
      const res = await fetch('/api/coach/verify-row', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ row_id: rowId }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? 'Failed to verify.');
        setBusyId(null);
        return;
      }
      router.refresh();
    } catch (e: any) {
      setError(e?.message ?? 'Network error.');
      setBusyId(null);
    }
  };

  return (
    <main className="min-h-screen bg-[#041E42] text-white">
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '2rem 1.25rem 4rem' }}>
        <nav style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.75rem' }}>
          <Link href="/dashboard" style={{ color: 'rgba(255,255,255,0.5)' }}>Dashboard</Link>
          <span style={{ margin: '0 0.4rem' }}>›</span>
          <Link href="/dashboard/coach" style={{ color: 'rgba(255,255,255,0.5)' }}>Coach</Link>
          <span style={{ margin: '0 0.4rem' }}>›</span>
          <span style={{ color: 'rgba(255,255,255,0.4)' }}>Pending verifications</span>
        </nav>

        <h1
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
            letterSpacing: '0.04em',
            marginBottom: '0.5rem',
          }}
        >
          PENDING VERIFICATIONS
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9375rem', marginBottom: '1.5rem' }}>
          Self-reported player team-affiliation rows on teams you coach. Verify to flip the row&apos;s status from self-reported to coach-verified.
        </p>

        {error && (
          <div style={{ padding: '0.75rem', background: 'rgba(200,16,46,0.18)', color: '#FF6B7A', borderRadius: 6, fontSize: '0.875rem', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        {rows.length === 0 ? (
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem' }}>
            No pending verifications. When a player adds a self-reported affiliation for one of your teams, it appears here.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {rows.map((row) => {
              const playerObj = pickOne(row.player);
              const teamObj = pickOne(row.team);
              const seasonObj = pickOne(row.season);
              const playerName = playerObj ? `${playerObj.first_name ?? ''} ${playerObj.last_name ?? ''}`.trim() || 'Player' : 'Player';
              const playerHref = playerObj?.slug ? `/directory/players/${playerObj.slug}` : null;
              const teamName = teamObj?.name ?? 'Unknown team';
              const detail: string[] = [];
              if (row.jersey_number != null) detail.push(`#${row.jersey_number}`);
              if (row.position) detail.push(row.position);
              if (row.role && row.role !== 'player') detail.push(row.role);
              if (row.start_date || row.end_date) detail.push(`${row.start_date ?? '?'} – ${row.end_date ?? 'present'}`);

              return (
                <div
                  key={row.id}
                  style={{
                    padding: '0.875rem 1rem',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <p style={{ fontWeight: 600, color: '#fff', margin: 0 }}>
                      {playerHref ? (
                        <Link href={playerHref} style={{ color: '#fff', textDecoration: 'none' }}>
                          {playerName}
                        </Link>
                      ) : (
                        playerName
                      )}
                      {' '}
                      <span style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 400 }}>· {teamName}</span>
                    </p>
                    <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.55)', margin: '0.125rem 0 0 0' }}>
                      {detail.join(' · ')}
                      {seasonObj?.label ? ` · ${seasonObj.label}` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => verify(row.id)}
                    disabled={busyId === row.id}
                    style={{
                      background: '#009650',
                      color: '#041E42',
                      border: 'none',
                      borderRadius: 6,
                      padding: '0.5rem 1rem',
                      fontWeight: 700,
                      fontSize: '0.8125rem',
                      cursor: busyId === row.id ? 'wait' : 'pointer',
                      opacity: busyId === row.id ? 0.7 : 1,
                      flexShrink: 0,
                    }}
                  >
                    {busyId === row.id ? 'Verifying…' : 'Verify'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}