'use client';

import { useEffect, useMemo, useState } from 'react';

interface PlayerCard {
  id: string;
  first_name: string | null;
  last_name: string | null;
  slug: string;
  birth_date?: string | null;
}

interface Props {
  players: PlayerCard[];
}

interface SeasonRow {
  season: string;
  season_type: string;
  games_played: number | null;
  goals: number | null;
  assists: number | null;
  points: number | null;
  penalty_minutes: number | null;
  plus_minus: number | null;
  wins: number | null;
  losses: number | null;
  overtime_losses: number | null;
  saves: number | null;
  save_percentage: number | null;
  goals_against_average: number | null;
  shutouts: number | null;
}

interface Milestone {
  title: string;
  description: string | null;
  achieved_at: string | null;
}

interface Counts {
  achievements: number;
  documents: number;
  memberships: number;
}

function StatName({ label }: { label: string }) {
  return (
    <span
      style={{
        color: 'rgba(255,255,255,0.45)', fontSize: '0.7rem', textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}
    >
      {label}
    </span>
  );
}

function BarCell({
  label,
  value,
  max,
  unit,
  accent,
}: {
  label: string;
  value: number | null;
  max: number;
  unit: string;
  accent: string;
}) {
  if (value === null || value === undefined) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <StatName label={label} />
        <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.85rem' }}>—</div>
      </div>
    );
  }
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <StatName label={label} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div
          style={{
            flex: 1, height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${pct}%`, height: '100%', background: accent, borderRadius: 3,
            }}
          />
        </div>
        <span style={{ color: '#fff', fontSize: '0.8rem', fontWeight: 600, minWidth: 32, textAlign: 'right' }}>
          {value}{unit !== 'count' ? ` ${unit}` : ''}
        </span>
      </div>
    </div>
  );
}

function RinkStopHistory({ counts }: { counts: Counts }) {
  return (
    <section
      data-testid="family-analytics-history"
      style={{
        background: '#0a0a0a',
        border: '1px solid #141414',
        borderRadius: 10,
        padding: '1rem 1.1rem',
        marginBottom: '1rem',
      }}
    >
      <div
        style={{
          color: 'rgba(255,255,255,0.45)',
          fontSize: '0.7rem',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: '0.65rem',
        }}
      >
        RinkStop history
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem' }}>
        {[
          { label: 'Achievements', value: counts.achievements, href: '#achievements' },
          { label: 'Documents', value: counts.documents, href: '#documents' },
          { label: 'Teams', value: counts.memberships, href: null },
        ].map((c) => (
          <div key={c.label} style={{ minWidth: 72 }}>
            <StatName label={c.label} />
            <div
              style={{
                color: '#fff',
                fontSize: '1.6rem',
                fontWeight: 700,
                fontFamily: "'Bebas Neue', Impact, sans-serif",
              }}
            >
              {c.value}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.7rem' }}>
              {c.value === 0
                ? c.href
                  ? `add your first →`
                  : `none yet`
                : c.href
                ? `view →`
                : `on rosters`}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function PlayerAnalyticsClient({ players }: Props) {
  const [selectedId, setSelectedId] = useState<string>(players[0]?.id || '');
  const [stats, setStats] = useState<SeasonRow[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState<string>('');

  const selectedPlayer = useMemo(
    () => players.find((p) => p.id === selectedId),
    [players, selectedId]
  );

  useEffect(() => {
    if (!selectedId || !selectedPlayer) return;
    const p = selectedPlayer;
    setPlayerName(
      `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Selected player'
    );
    setLoading(true);
    setError(null);
    setStats([]);
    setMilestones([]);
    setCounts(null);
    fetch(`/api/player/${selectedId}/stats/season-trends`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((d) => {
        if (!d.ok) throw new Error(d.error || 'Failed to load stats');
        setStats(d.career_stats || []);
        setMilestones(d.milestones || []);
        setCounts(d.counts || { achievements: 0, documents: 0, memberships: 0 });
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => setLoading(false));
  }, [selectedId, selectedPlayer]);

  const maxPerStat = useMemo(() => {
    const maxG = Math.max(...stats.map((s) => s.goals ?? 0), 1);
    const maxA = Math.max(...stats.map((s) => s.assists ?? 0), 1);
    const maxPts = Math.max(...stats.map((s) => s.points ?? 0), 1);
    const maxPims = Math.max(...stats.map((s) => s.penalty_minutes ?? 0), 1);
    const maxWins = Math.max(...stats.map((s) => s.wins ?? 0), 1);
    return { maxG, maxA, maxPts, maxPims, maxWins };
  }, [stats]);

  return (
    <section
      data-testid="family-analytics"
      style={{ background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: 12, padding: '1.5rem' }}
    >
      <h2
        style={{
          fontFamily: "'Bebas Neue', Impact, sans-serif",
          fontSize: '1.15rem', color: '#fff', letterSpacing: '0.05em',
          margin: '0 0 0.5rem',
        }}
      >
        ADVANCED PLAYER ANALYTICS
      </h2>
      <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem', margin: '0 0 1rem', lineHeight: 1.5 }}>
        Season trends and milestone timeline for {playerName || 'linked players'}.
      </p>

      {players.length === 0 ? (
        <div
          data-testid="family-analytics-empty"
          style={{
            padding: '1rem', background: '#0a0a0a',
            border: '1px dashed rgba(255,255,255,0.15)', borderRadius: 10,
            color: 'rgba(255,255,255,0.55)', fontSize: '0.85rem', textAlign: 'center',
          }}
        >
          Link a player with highlightly career stats to view analytics.
        </div>
      ) : (
        <>
          {/* Player picker */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: '1rem' }}>
            {players.map((p) => {
              const name = `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'player';
              const active = p.id === selectedId;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedId(p.id)}
                  data-testid={`analytics-player-${p.id}`}
                  style={{
                    padding: '0.4rem 0.9rem',
                    background: active ? 'rgba(20,184,166,0.15)' : 'transparent',
                    border: `1px solid ${active ? 'rgba(20,184,166,0.4)' : 'rgba(255,255,255,0.15)'}`,
                    color: active ? '#14B8A6' : 'rgba(255,255,255,0.65)',
                    borderRadius: 6,
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {name}
                </button>
              );
            })}
          </div>

          {error ? (
            <div
              role="alert"
              style={{
                padding: '0.6rem 0.85rem',
                background: 'rgba(200,16,46,0.12)',
                border: '1px solid rgba(200,16,46,0.4)',
                borderRadius: 8,
                color: '#FF6B7A',
                fontSize: '0.85rem',
              }}
            >
              {error}
            </div>
          ) : loading ? (
            <div style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '2rem 0' }}>Loading analytics…</div>
          ) : stats.length === 0 ? (
            counts ? (
              <RinkStopHistory counts={counts} />
            ) : null
          ) : (
            <>
              {/* RinkStop history (1c-5) — shown alongside highlightly stats */}
              {counts ? <RinkStopHistory counts={counts} /> : null}
              {/* Season card */}
              <div
                data-testid="family-analytics-season-card"
                style={{
                  background: '#0a0a0a',
                  border: '1px solid #141414',
                  borderRadius: 10,
                  padding: '1rem 1.1rem',
                  marginBottom: '1rem',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '1.25rem',
                }}
              >
                {[
                  { label: 'Goals', value: stats.reduce((s, r) => s + (r.goals ?? 0), 0) },
                  { label: 'Assists', value: stats.reduce((s, r) => s + (r.assists ?? 0), 0) },
                  { label: 'Points', value: stats.reduce((s, r) => s + (r.points ?? 0), 0) },
                  { label: 'PIMs', value: stats.reduce((s, r) => s + (r.penalty_minutes ?? 0), 0) },
                ].map((agg) => (
                  <div key={agg.label} style={{ minWidth: 72 }}>
                    <StatName label={agg.label} />
                    <div
                      style={{
                        color: '#fff', fontSize: '1.6rem', fontWeight: 700,
                        fontFamily: "'Bebas Neue', Impact, sans-serif",
                      }}
                    >
                      {agg.value}
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.7rem' }}>
                      {stats.length} season{stats.length === 1 ? '' : 's'}
                    </div>
                  </div>
                ))}
              </div>

              {/* Per-season bar cards */}
              <div
                data-testid="family-analytics-seasons"
                style={{
                  display: 'flex', flexDirection: 'column', gap: '0.75rem',
                }}
              >
                {stats.map((s) => (
                  <div
                    key={`${s.season}-${s.season_type}`}
                    style={{
                      background: '#0a0a0a', border: '1px solid #141414', borderRadius: 8,
                      padding: '0.75rem 1rem',
                    }}
                  >
                    <div
                      style={{
                        color: '#fff', fontSize: '0.85rem', fontWeight: 700,
                        marginBottom: '0.5rem',
                      }}
                    >
                      {s.season} <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem', fontWeight: 400 }}>{s.season_type}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                      <BarCell label="Goals" value={s.goals ?? null} max={maxPerStat.maxG} unit="" accent="#14B8A6" />
                      <BarCell label="Assists" value={s.assists ?? null} max={maxPerStat.maxA} unit="" accent="#FFB81C" />
                      <BarCell label="Points" value={s.points ?? null} max={maxPerStat.maxPts} unit="" accent="#fff" />
                      <BarCell label="PIMs" value={s.penalty_minutes ?? null} max={maxPerStat.maxPims} unit="" accent="#FF6B7A" />
                    </div>
                  </div>
                ))}
              </div>

              {/* Milestones */}
              {milestones.length > 0 ? (
                <section
                  data-testid="family-analytics-milestones"
                  style={{
                    marginTop: '1rem',
                    background: '#0a0a0a', border: '1px solid #141414', borderRadius: 10,
                    padding: '1rem',
                  }}
                >
                  <h3
                    style={{
                      fontFamily: "'Bebas Neue', Impact, sans-serif",
                      fontSize: '0.95rem', color: '#fff', letterSpacing: '0.05em',
                      margin: '0 0 0.75rem',
                    }}
                  >
                    CAREER MILESTONES
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {milestones.map((m) => (
                      <div
                        key={`${m.title}-${m.achieved_at}-${m.description}`}
                        style={{
                          display: 'flex', alignItems: 'baseline', gap: 10,
                          padding: '0.55rem 0.75rem',
                          background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: 6,
                        }}
                      >
                        <span
                          style={{
                            color: '#FFB81C', fontSize: '0.7rem', textTransform: 'uppercase',
                            letterSpacing: '0.05em', minWidth: 58,
                          }}
                        >
                          {m.achieved_at ? new Date(m.achieved_at).getFullYear() : '—'}
                        </span>
                        <div>
                          <div style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 600 }}>{m.title}</div>
                          {m.description ? (
                            <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.8rem', marginTop: 2 }}>
                              {m.description}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}
            </>
          )}
        </>
      )}
    </section>
  );
}
