'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

interface StandingsEntry {
  rank: number;
  team_id: string;
  team_name: string;
  team_slug: string;
  gp: number;
  w: number;
  l: number;
  otl: number;
  pts: number;
  gf: number;
  ga: number;
  gd: number;
  streak: string;
  last10: { w: number; l: number; otl: number };
}

interface StandingsResult {
  league_id: string;
  league_name: string;
  season: string;
  entries: StandingsEntry[];
}

interface Props {
  teamId: string;
  teamSlug: string;
  teamName: string;
  leagueSlug: string | null;
  season: string;
}

export default function TeamStandingsClient({
  teamId,
  teamSlug,
  teamName,
  leagueSlug,
  season,
}: Props) {
  const [data, setData] = useState<StandingsResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!leagueSlug) { setLoading(false); return; }
    fetch(`/api/standings/${leagueSlug}/${season}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [leagueSlug, season]);

  if (!leagueSlug) return null;
  if (loading) return null;

  const entry = data?.entries.find(e => e.team_id === teamId || e.team_slug === teamSlug);

  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 8,
      padding: '0.875rem 1rem',
      marginBottom: '1.5rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.625rem' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", Impact, sans-serif', fontSize: '1rem', letterSpacing: '0.04em', color: '#fff', margin: 0 }}>
          {season} STANDINGS
        </h2>
        <Link
          href={`/directory/leagues/${leagueSlug}/${season}/standings`}
          style={{ fontSize: '0.7rem', color: 'var(--red)', textDecoration: 'none', fontWeight: 600 }}
        >
          Full standings →
        </Link>
      </div>

      {!data || data.entries.length === 0 ? (
        <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
          No completed games yet this season.
        </p>
      ) : !entry ? (
        <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
          Not in standings yet.
        </p>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
          {/* Rank badge */}
          <div style={{
            background: entry.rank <= 3 ? 'rgba(200,16,46,0.15)' : 'rgba(255,255,255,0.06)',
            border: entry.rank <= 3 ? '1px solid rgba(200,16,46,0.4)' : '1px solid rgba(255,255,255,0.1)',
            borderRadius: 6,
            padding: '0.3rem 0.6rem',
            textAlign: 'center',
            minWidth: 44,
          }}>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: entry.rank <= 3 ? 'var(--red)' : '#fff', lineHeight: 1 }}>
              {entry.rank}
            </div>
            <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rank</div>
          </div>

          {/* Record */}
          <div>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'baseline', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#FFB81C' }}>{entry.pts} PTS</span>
              <span style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)' }}>
                {entry.w}W-{entry.l}L-{entry.otl}OTL
              </span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.125rem' }}>
              {entry.gp} GP · GF {entry.gf} / GA {entry.ga} · +{entry.gd >= 0 ? entry.gd : entry.gd} GD
            </div>
          </div>

          {/* Last 10 */}
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.125rem' }}>Last 10</div>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>
              {entry.last10.w}-{entry.last10.l}-{entry.last10.otl}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.125rem' }}>
              Streak: {entry.streak}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
