'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { NhlStanding } from '@/lib/nhl-data';

type EnrichedRow = NhlStanding & { qualified?: boolean };

interface Props {
  season: string;
  seasonLabel: string;
  isLatest: boolean;
  allSeasons: string[];
  eastern: { Atlantic: EnrichedRow[]; Metropolitan: EnrichedRow[] };
  western: { Central: EnrichedRow[]; Pacific: EnrichedRow[] };
}

function DiffCell({ gf, ga }: { gf: number; ga: number }) {
  const d = gf - ga;
  const color = d > 0 ? '#4ade80' : d < 0 ? '#ff6b6b' : 'rgba(255,255,255,0.4)';
  const sign = d > 0 ? '+' : '';
  return (
    <span style={{ color, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
      {d === 0 ? '0' : `${sign}${d}`}
    </span>
  );
}

function QualifiedDot() {
  return (
    <span
      title="Clinched playoff position"
      style={{
        display: 'inline-block',
        width: 6, height: 6, borderRadius: '50%',
        background: '#4ade80',
        marginRight: 6,
        flexShrink: 0,
      }}
    />
  );
}

function StandingsTable({ rows }: { rows: EnrichedRow[] }) {
  if (rows.length === 0) {
    return (
      <div style={{
        padding: '1.5rem',
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '6px',
        textAlign: 'center',
        color: 'rgba(255,255,255,0.4)',
        fontSize: '0.85rem',
      }}>
        No standings data.
      </div>
    );
  }
  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: '6px',
      overflow: 'hidden',
    }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 480 }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <th style={th}>#</th>
              <th style={{ ...th, textAlign: 'left', minWidth: 170 }}>Team</th>
              <th style={th}>GP</th>
              <th style={th}>W</th>
              <th style={th}>L</th>
              <th style={th}>OTL</th>
              <th style={{ ...th, color: '#FFB81C' }}>PTS</th>
              <th style={th}>GF</th>
              <th style={th}>GA</th>
              <th style={th}>DIFF</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.team_id}
                style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
              >
                <td style={{ ...td, color: 'rgba(255,255,255,0.45)', fontWeight: 700, fontSize: '0.8rem' }}>
                  {row.rank}
                </td>
                <td style={{ ...td, textAlign: 'left', padding: '0.625rem 0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
                    {row.qualified && <QualifiedDot />}
                    {row.team_logo && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={row.team_logo}
                        alt=""
                        width={22}
                        height={22}
                        style={{ objectFit: 'contain', marginRight: 8, flexShrink: 0 }}
                        loading="lazy"
                      />
                    )}
                    <span style={{
                      color: '#fff',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {row.team_name}
                    </span>
                  </div>
                </td>
                <td style={td}>{row.played}</td>
                <td style={td}>{row.wins}</td>
                <td style={td}>{row.losses}</td>
                <td style={td}>{row.overtime_losses}</td>
                <td style={{ ...td, color: '#FFB81C', fontWeight: 800 }}>{row.points}</td>
                <td style={td}>{row.goals_for}</td>
                <td style={td}>{row.goals_against}</td>
                <td style={td}><DiffCell gf={row.goals_for} ga={row.goals_against} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const th: React.CSSProperties = {
  padding: '0.625rem 0.5rem',
  fontSize: '0.7rem',
  fontWeight: 700,
  color: 'rgba(255,255,255,0.5)',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  textAlign: 'center',
};
const td: React.CSSProperties = {
  padding: '0.625rem 0.5rem',
  fontSize: '0.85rem',
  color: '#fff',
  textAlign: 'center',
  fontVariantNumeric: 'tabular-nums',
};

function formatSeason(s: string): string {
  const yr = parseInt(s);
  if (isNaN(yr)) return s;
  return `${yr}-${String((yr + 1) % 100).padStart(2, '0')}`;
}

export default function NhlStandingsClient({
  season, seasonLabel, isLatest, allSeasons, eastern, western,
}: Props) {
  const router = useRouter();
  const [view, setView] = useState<'conference' | 'overall'>('conference');

  function onSeasonChange(newSeason: string) {
    if (newSeason !== season) router.push(`/standings/nhl/${newSeason}`);
  }

  // For overall view: sort all 32 by points, then wins, then goal diff
  const allRows: EnrichedRow[] = [...eastern.Atlantic, ...eastern.Metropolitan, ...western.Central, ...western.Pacific]
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.wins !== a.wins) return b.wins - a.wins;
      return (b.goals_for - b.goals_against) - (a.goals_for - a.goals_against);
    })
    .map((r, i) => ({ ...r, rank: i + 1 }));

  return (
    <main>
      {/* Hero */}
      <section style={{
        background: 'linear-gradient(140deg, #041E42 0%, #0A2E5C 55%, #0D1117 100%)',
        padding: 'clamp(1.75rem, 4vw, 2.5rem) 0',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div className="label">NHL · National Hockey League</div>
              <h1 className="font-sport" style={{
                fontSize: 'clamp(2rem, 7vw, 3.75rem)',
                color: '#fff',
                lineHeight: 0.95,
                margin: '0.5rem 0 0.5rem',
              }}>
                {seasonLabel} STANDINGS
              </h1>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '0.5rem' }}>
                <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.85rem' }}>
                  32 teams · 4 divisions · 2 conferences
                </span>
                {isLatest && (
                  <span style={{
                    background: '#4ade80',
                    color: '#000',
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    letterSpacing: '0.08em',
                    padding: '0.2rem 0.5rem',
                    borderRadius: '4px',
                    textTransform: 'uppercase',
                  }}>
                    Current
                  </span>
                )}
              </div>
            </div>

            {/* Season + view selectors */}
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <select
                value={season}
                onChange={(e) => onSeasonChange(e.target.value)}
                style={{
                  background: 'rgba(0,0,0,0.4)',
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '6px',
                  padding: '0.5rem 2rem 0.5rem 0.875rem',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  appearance: 'none',
                  backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'6\' viewBox=\'0 0 10 6\'%3E%3Cpath fill=\'%23ffffff\' d=\'M0 0l5 6 5-6z\'/%3E%3C/svg%3E")',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 0.625rem center',
                }}
              >
                {allSeasons.map((s) => (
                  <option key={s} value={s} style={{ background: '#0D1117' }}>
                    {formatSeason(s)} {s === allSeasons[0] ? '(current)' : ''}
                  </option>
                ))}
              </select>
              <div style={{ display: 'flex', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', overflow: 'hidden' }}>
                <button
                  onClick={() => setView('conference')}
                  style={{
                    padding: '0.5rem 0.875rem',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    background: view === 'conference' ? '#C8102E' : 'transparent',
                    color: '#fff',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Conference
                </button>
                <button
                  onClick={() => setView('overall')}
                  style={{
                    padding: '0.5rem 0.875rem',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    background: view === 'overall' ? '#C8102E' : 'transparent',
                    color: '#fff',
                    border: 'none',
                    cursor: 'pointer',
                    borderLeft: '1px solid rgba(255,255,255,0.15)',
                  }}
                >
                  Overall
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Standings */}
      <section className="section-py" style={{ background: '#0D1117' }}>
        <div className="container">
          {view === 'overall' ? (
            <StandingsTable rows={allRows} />
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 480px), 1fr))',
              gap: '1.5rem',
            }}>
              <div>
                <h2 className="font-sport" style={{
                  fontSize: '1.5rem',
                  color: '#fff',
                  letterSpacing: '0.05em',
                  marginBottom: '0.75rem',
                  paddingBottom: '0.5rem',
                  borderBottom: '2px solid #C8102E',
                  display: 'inline-block',
                }}>
                  EASTERN
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <h3 style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
                      Atlantic Division
                    </h3>
                    <StandingsTable rows={eastern.Atlantic} />
                  </div>
                  <div>
                    <h3 style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
                      Metropolitan Division
                    </h3>
                    <StandingsTable rows={eastern.Metropolitan} />
                  </div>
                </div>
              </div>

              <div>
                <h2 className="font-sport" style={{
                  fontSize: '1.5rem',
                  color: '#fff',
                  letterSpacing: '0.05em',
                  marginBottom: '0.75rem',
                  paddingBottom: '0.5rem',
                  borderBottom: '2px solid #041E42',
                  display: 'inline-block',
                }}>
                  WESTERN
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <h3 style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
                      Central Division
                    </h3>
                    <StandingsTable rows={western.Central} />
                  </div>
                  <div>
                    <h3 style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
                      Pacific Division
                    </h3>
                    <StandingsTable rows={western.Pacific} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Legend */}
      <section style={{ background: '#0D1117', padding: '0 0 2rem' }}>
        <div className="container">
          <div style={{
            display: 'flex',
            gap: '1.5rem',
            flexWrap: 'wrap',
            padding: '1rem 1.25rem',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '6px',
            fontSize: '0.75rem',
            color: 'rgba(255,255,255,0.5)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#4ade80' }} />
              Top 3 clinch playoff berth (per division)
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ color: '#FFB81C', fontWeight: 800 }}>PTS</span>
              2 pts W · 1 pt OTL · 0 pts L
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span>Source: nhl_standings · synced 2025-26 regular season</span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
