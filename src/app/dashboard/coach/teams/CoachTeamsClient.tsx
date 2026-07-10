'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type HistoryRow = {
  id: string;
  team_id: string;
  role: string;
  season_id: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  team:
    | {
        name: string;
        slug: string;
        league_id: string | null;
        leagues: { name: string } | { name: string }[] | null;
      }
    | { name: string; slug: string; league_id: string | null; leagues: { name: string } | { name: string }[] | null }[]
    | null;
  season: { label: string } | { label: string }[] | null;
};

function pickOne<T>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null;
  if (Array.isArray(v)) return v[0] ?? null;
  return v;
}
type Season = { id: string; label: string; start_date: string; end_date: string };
type Team = { id: string; name: string; slug: string; league_id: string | null; leagues: { name: string } | { name: string }[] | null };

const ROLES = [
  { value: 'head_coach',     label: 'Head coach' },
  { value: 'assistant_coach', label: 'Assistant coach' },
  { value: 'skills_coach',    label: 'Skills coach' },
  { value: 'goalie_coach',    label: 'Goalie coach' },
  { value: 'manager',         label: 'Manager' },
  { value: 'other',           label: 'Other' },
];

function leagueName(league: Team['leagues']): string | null {
  if (!league) return null;
  if (Array.isArray(league)) return league[0]?.name ?? null;
  return league.name ?? null;
}

export default function CoachTeamsClient({
  coachId,
  history,
  seasons,
  teams,
}: {
  coachId: string;
  history: HistoryRow[];
  seasons: Season[];
  teams: Team[];
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    team_id: '',
    role: 'head_coach',
    season_id: '',
    start_date: '',
    end_date: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.team_id) {
      setError('Pick a team.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/coach/team-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          team_id: form.team_id,
          role: form.role,
          season_id: form.season_id || undefined,
          start_date: form.start_date || undefined,
          end_date: form.end_date || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? 'Failed to save.');
        setSubmitting(false);
        return;
      }
      setAdding(false);
      setForm({ team_id: '', role: 'head_coach', season_id: '', start_date: '', end_date: '' });
      router.refresh();
    } catch (e: any) {
      setError(e?.message ?? 'Network error.');
      setSubmitting(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.5rem 0.75rem',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 6,
    color: '#fff',
    fontSize: '0.875rem',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.75rem',
    fontWeight: 700,
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: 4,
  };

  return (
    <main className="min-h-screen bg-[#041E42] text-white">
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '2rem 1.25rem 4rem' }}>
        <nav style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.75rem' }}>
          <Link href="/dashboard" style={{ color: 'rgba(255,255,255,0.5)' }}>Dashboard</Link>
          <span style={{ margin: '0 0.4rem' }}>›</span>
          <Link href="/dashboard/coach" style={{ color: 'rgba(255,255,255,0.5)' }}>Coach</Link>
          <span style={{ margin: '0 0.4rem' }}>›</span>
          <span style={{ color: 'rgba(255,255,255,0.4)' }}>Team history</span>
        </nav>

        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <h1
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
              letterSpacing: '0.04em',
            }}
          >
            TEAM HISTORY
          </h1>
          <button
            type="button"
            onClick={() => setAdding((v) => !v)}
            style={{
              padding: '0.5rem 1rem',
              background: adding ? 'rgba(255,255,255,0.04)' : '#C8102E',
              color: adding ? 'rgba(255,255,255,0.7)' : '#fff',
              border: adding ? '1px solid rgba(255,255,255,0.15)' : 'none',
              borderRadius: 6,
              fontSize: '0.8125rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {adding ? 'Cancel' : '+ Add team'}
          </button>
        </div>

        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9375rem', marginBottom: '1.5rem' }}>
          Teams you coach. You can only verify players on teams you&apos;re on.
        </p>

        {adding && (
          <form
            onSubmit={handleSubmit}
            style={{
              padding: '1rem 1.25rem',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 10,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              marginBottom: '1.5rem',
            }}
          >
            <div>
              <label style={labelStyle}>Team</label>
              <select value={form.team_id} onChange={(e) => setForm((f) => ({ ...f, team_id: e.target.value }))} style={inputStyle} required>
                <option value="">— Pick a team —</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                    {leagueName(t.leagues) ? ` · ${leagueName(t.leagues)}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={labelStyle}>Role</label>
                <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} style={inputStyle}>
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Season (optional)</label>
                <select value={form.season_id} onChange={(e) => setForm((f) => ({ ...f, season_id: e.target.value }))} style={inputStyle}>
                  <option value="">—</option>
                  {seasons.map((s) => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={labelStyle}>Start date</label>
                <input type="date" value={form.start_date} onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>End date (leave blank if current)</label>
                <input type="date" value={form.end_date} onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))} style={inputStyle} />
              </div>
            </div>
            {error && (
              <div style={{ padding: '0.75rem', background: 'rgba(200,16,46,0.18)', color: '#FF6B7A', borderRadius: 6, fontSize: '0.875rem' }}>
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={submitting}
              style={{
                background: '#C8102E',
                color: '#fff',
                padding: '0.625rem 1.25rem',
                border: 'none',
                borderRadius: 6,
                fontWeight: 700,
                fontSize: '0.875rem',
                cursor: submitting ? 'wait' : 'pointer',
                opacity: submitting ? 0.7 : 1,
                alignSelf: 'flex-start',
              }}
            >
              {submitting ? 'Saving…' : 'Save team'}
            </button>
          </form>
        )}

        {history.length === 0 ? (
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem' }}>
            No teams yet. Add the teams you coach to start verifying players.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {history.map((h) => {
              const teamObj = pickOne(h.team);
              const seasonObj = pickOne(h.season);
              const teamName = teamObj?.name ?? 'Unknown team';
              const ln = teamObj ? leagueName(teamObj.leagues) : null;
              return (
                <div
                  key={h.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem 1rem',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 8,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 600, color: '#fff', margin: 0 }}>
                      {teamObj?.slug ? (
                        <Link href={`/directory/teams/${teamObj.slug}`} style={{ color: '#fff', textDecoration: 'none' }}>
                          {teamName}
                        </Link>
                      ) : (
                        teamName
                      )}
                    </p>
                    <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.55)', margin: '0.125rem 0 0 0' }}>
                      {h.role.replace(/_/g, ' ')}
                      {ln ? ` · ${ln}` : ''}
                      {seasonObj?.label ? ` · ${seasonObj.label}` : ''}
                      {(h.start_date || h.end_date) && ` · ${h.start_date ?? '?'} – ${h.end_date ?? 'present'}`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}