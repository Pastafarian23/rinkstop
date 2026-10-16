import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';

const RAW_BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || '';
const BASE_URL = RAW_BASE_URL.includes('localhost') || RAW_BASE_URL.includes('127.0.0.1')
  ? 'https://rinkstop.com'
  : (RAW_BASE_URL || 'https://rinkstop.com');

// Fetch standings data server-side
async function getStandings(leagueSlug: string, season: string) {
  try {
    const res = await fetch(
      `${BASE_URL}/api/standings/${leagueSlug}/${season}`,
      { next: { revalidate: 300 } },
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// Fetch league for nav
async function getLeague(slugOrId: string) {
  try {
    const res = await fetch(`${BASE_URL}/api/leagues`, { cache: 'no-store' });
    if (!res.ok) return null;
    const leagues = await res.json();
    return (leagues as any[]).find((l: any) => l.id === slugOrId || l.slug === slugOrId) || null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; season: string }>;
}): Promise<Metadata> {
  const { id, season } = await params;
  const league = await getLeague(id);
  const title = league ? `${league.name} ${season} Standings` : `${season} Standings`;
  return {
    title: `${title} | RinkStop`,
    description: `Live ${season} standings for ${league?.name ?? 'this league'}, computed from game results on RinkStop.`,
    openGraph: {
      title: `${title} | RinkStop`,
      description: `Live ${season} standings for ${league?.name ?? 'this league'}.`,
    },
  };
}

function DiffCell({ gd }: { gd: number }) {
  const color = gd > 0 ? '#4ade80' : gd < 0 ? '#ff6b6b' : 'rgba(255,255,255,0.4)';
  const sign = gd > 0 ? '+' : '';
  return (
    <span style={{ color, fontWeight: 600 }}>
      {gd === 0 ? '0' : `${sign}${gd}`}
    </span>
  );
}

export default async function LeagueStandingsPage({
  params,
}: {
  params: Promise<{ id: string; season: string }>;
}) {
  const { id, season } = await params;
  const league = await getLeague(id);
  const standings = await getStandings(league?.slug ?? id, season);

  const th: React.CSSProperties = {
    padding: '0.5rem 0.75rem',
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    letterSpacing: '0.05em',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
  };

  const td: React.CSSProperties = {
    padding: '0.6rem 0.75rem',
    fontSize: '0.875rem',
    color: 'rgba(255,255,255,0.8)',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    textAlign: 'center',
  };

  const tdName: React.CSSProperties = {
    ...td,
    textAlign: 'left',
    minWidth: 180,
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0D1117', color: '#fff' }}>
      {/* Breadcrumb */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '1rem 1.5rem' }}>
        <nav style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>
          <Link href="/" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>Home</Link>
          {' / '}
          <Link href="/directory/leagues" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>Leagues</Link>
          {' / '}
          <Link href={`/directory/leagues/${league?.slug ?? id}`} style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>{league?.name ?? id}</Link>
          {' / '}
          <span style={{ color: 'rgba(255,255,255,0.7)' }}>{season} Standings</span>
        </nav>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 1.5rem 3rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>
              {league?.name ?? id} {season} Standings
            </h1>
            <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', margin: '0.25rem 0 0' }}>
              Standings calculated from results on RinkStop
              {standings?.generated_at ? ` · updated ${new Date(standings.generated_at).toLocaleTimeString()}` : ''}
            </p>
          </div>
          <Link
            href={`/directory/leagues/${league?.slug ?? id}`}
            style={{
              padding: '0.4rem 0.9rem',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 6,
              color: 'rgba(255,255,255,0.7)',
              textDecoration: 'none',
              fontSize: '0.8rem',
            }}
          >
            ← {league?.name ?? 'League'}
          </Link>
        </div>

        {!standings || standings.entries.length === 0 ? (
          <div style={{
            padding: '3rem',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 8,
            textAlign: 'center',
            color: 'rgba(255,255,255,0.4)',
          }}>
            No completed games found for {season}. Standings require at least one completed game.
          </div>
        ) : (
          <div style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 8,
            overflow: 'hidden',
          }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <th style={th}>#</th>
                    <th style={{ ...th, textAlign: 'left' }}>Team</th>
                    <th style={th}>GP</th>
                    <th style={th} title="Wins">W</th>
                    <th style={th} title="Losses">L</th>
                    <th style={th} title="Overtime Losses">OTL</th>
                    <th style={{ ...th, color: '#FFB81C', fontWeight: 700 }} title="Points">PTS</th>
                    <th style={th} title="Goals For">GF</th>
                    <th style={th} title="Goals Against">GA</th>
                    <th style={th} title="Goal Differential">GD</th>
                    <th style={th} title="Last 10 games">L10</th>
                    <th style={th} title="Current streak">STRK</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.entries.map((e: any) => (
                    <tr
                      key={e.team_id}
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                    >
                      <td style={td}>{e.rank}</td>
                      <td style={tdName}>
                        {e.team_logo && (
                          <img
                            src={e.team_logo}
                            alt=""
                            width={20}
                            height={20}
                            style={{ borderRadius: 3, flexShrink: 0 }}
                            onError={(img) => { img.currentTarget.style.display = 'none'; }}
                          />
                        )}
                        <Link
                          href={`/directory/teams/${e.team_slug}`}
                          style={{
                            color: 'rgba(255,255,255,0.85)',
                            textDecoration: 'none',
                            fontWeight: 500,
                            whiteSpace: 'nowrap' as const,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                          onMouseEnter={(e) => { (e.target as HTMLElement).style.color = '#fff'; }}
                          onMouseLeave={(e) => { (e.target as HTMLElement).style.color = 'rgba(255,255,255,0.85)'; }}
                        >
                          {e.team_name}
                        </Link>
                      </td>
                      <td style={td}>{e.gp}</td>
                      <td style={td}>{e.w}</td>
                      <td style={td}>{e.l}</td>
                      <td style={td}>{e.otl}</td>
                      <td style={{ ...td, color: '#FFB81C', fontWeight: 700 }}>{e.pts}</td>
                      <td style={td}>{e.gf}</td>
                      <td style={td}>{e.ga}</td>
                      <td style={td}><DiffCell gd={e.gd} /></td>
                      <td style={td}>{e.last10?.w}-{e.last10?.l}-{e.last10?.otl}</td>
                      <td style={{ ...td, fontWeight: 600, fontSize: '0.8rem' }}>{e.streak}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
