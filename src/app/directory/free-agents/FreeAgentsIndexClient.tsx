'use client';

import { useMemo, useState } from 'react';
import CategorySearchBar from '@/components/CategorySearchBar';

interface FreeAgentRow {
  user_id: string;
  display_name: string | null;
  username: string | null;
  free_agent_status: string;
  free_agent_position: string | null;
  free_agent_skill_level: string | null;
  free_agent_radius_km: number | null;
  free_agent_notes: string | null;
  free_agent_show_location: boolean | null;
  free_agent_updated_at: string | null;
  location: string | null;
}

const cardStyle: React.CSSProperties = {
  background: '#0f0f0f',
  border: '1px solid #1e1e1e',
  borderRadius: 12,
  padding: '1rem 1.25rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.4rem',
  color: '#e5e5e5',
};

const headlineStyle: React.CSSProperties = {
  fontFamily: "'Bebas Neue', Impact, sans-serif",
  fontSize: '1.4rem',
  color: '#fff',
  letterSpacing: '0.04em',
  margin: 0,
};

const helperText: React.CSSProperties = {
  color: 'rgba(255,255,255,0.55)',
  fontSize: '0.85rem',
  margin: 0,
  lineHeight: 1.4,
};

const inputStyle: React.CSSProperties = {
  padding: '0.5rem 0.7rem',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: 6,
  color: '#fff',
  fontSize: '0.9rem',
  fontFamily: 'inherit',
};

const STATUS_LABEL: Record<string, string> = {
  looking: 'Looking for a team',
  sub_needed_today: 'Need a sub today',
};

const STATUS_COLOR: Record<string, string> = {
  looking: 'rgba(20,184,166,0.9)',
  sub_needed_today: '#FFB81C',
};

const SKILL_LABEL: Record<string, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  expert: 'Expert',
};

function formatRelative(iso: string | null): string {
  if (!iso) return '';
  const ms = Date.now() - new Date(iso).getTime();
  const day = 24 * 60 * 60 * 1000;
  if (ms < day) return 'today';
  if (ms < 2 * day) return 'yesterday';
  return `${Math.floor(ms / day)}d ago`;
}

export default function FreeAgentsIndexClient({ rows }: { rows: FreeAgentRow[] }) {
  const [query, setQuery] = useState('');
  const [position, setPosition] = useState('');
  const [skill, setSkill] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (position && (r.free_agent_position ?? '').toLowerCase() !== position.toLowerCase()) return false;
      if (skill && (r.free_agent_skill_level ?? '') !== skill) return false;
      if (q) {
        const hay = [r.display_name, r.location, r.free_agent_notes, r.free_agent_position]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, query, position, skill]);

  const positions = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => r.free_agent_position && set.add(r.free_agent_position));
    return Array.from(set).sort();
  }, [rows]);

  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <header>
        <h1 style={headlineStyle}>Free Agents</h1>
        <p style={helperText}>
          Adult players looking for teams, sub opportunities, or pickup games. Capitals and team admins: reach out directly.
        </p>
      </header>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.6rem' }}>
        {/* Search — homepage aesthetic, scoped to free agents.
            Does NOT narrow the grid (use URL ?q= param for that). */}
        <CategorySearchBar category="player" page="/directory/free-agents" localOnly />
        <select value={position} onChange={(e) => setPosition(e.target.value)} style={inputStyle}>
          <option value="">All positions</option>
          {positions.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <select value={skill} onChange={(e) => setSkill(e.target.value)} style={inputStyle}>
          <option value="">All skill levels</option>
          {Object.entries(SKILL_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </section>

      {filtered.length === 0 ? (
        <div style={{ ...cardStyle, textAlign: 'center', padding: '2.5rem 1.5rem' }}>
          <p style={{ ...helperText, color: 'rgba(255,184,28,0.85)' }}>
            {rows.length === 0
              ? 'No free agents are visible right now. Be the first — set your status on /dashboard.'
              : 'No free agents match those filters.'}
          </p>
        </div>
      ) : (
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
          {filtered.map((row) => (
            <article key={row.user_id} style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                <h2 style={{ ...headlineStyle, fontSize: '1.05rem' }}>
                  {row.display_name || row.username || 'Anonymous player'}
                </h2>
                <span style={{ color: STATUS_COLOR[row.free_agent_status] || 'inherit', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  ● {STATUS_LABEL[row.free_agent_status] || row.free_agent_status}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', fontSize: '0.78rem', color: 'rgba(255,255,255,0.75)' }}>
                {row.free_agent_position && <span>📍 {row.free_agent_position}</span>}
                {row.free_agent_skill_level && <span>⭐ {SKILL_LABEL[row.free_agent_skill_level]}</span>}
                {row.free_agent_radius_km != null && <span>📏 {row.free_agent_radius_km} km</span>}
                {row.free_agent_show_location && row.location && <span>🌎 {row.location}</span>}
              </div>

              {row.free_agent_notes && (
                <p style={{ margin: '0.4rem 0 0', fontSize: '0.85rem', color: 'rgba(255,255,255,0.85)', lineHeight: 1.4 }}>
                  {row.free_agent_notes}
                </p>
              )}

              <p style={{ margin: '0.2rem 0 0', color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}>
                Updated {formatRelative(row.free_agent_updated_at)}
              </p>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
