import type { Metadata } from 'next';
import Link from 'next/link';
import { getAllSeasons, getLatestSeason, getStandingsForSeason, NhlStanding } from '@/lib/nhl-data';
import { findCanonicalTeam } from '@/lib/nhl-teams-canonical';
import TicketmasterAd from '@/components/TicketmasterAd';

export const metadata: Metadata = {
  title: 'NHL Standings | Current Standings by Division',
  description: 'Current NHL standings for all 32 teams. Points, wins, losses, OT losses, goals for/against, and division rank. Updated after every game.',
};

export const revalidate = 3600; // 1 hour

function StandingTable({ title, rows }: { title: string; rows: NhlStanding[] }) {
  if (rows.length === 0) return null;
  return (
    <div style={{ marginBottom: '2rem' }}>
      <h2 className="font-sport" style={{ fontSize: '1.1rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>
        {title}
      </h2>
      <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '32px 1fr 50px 50px 50px 50px 50px 50px 50px',
          gap: '0.5rem',
          padding: '0.5rem 0.75rem',
          fontSize: '0.5625rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'rgba(255,255,255,0.4)',
          borderBottom: '1px solid var(--border)',
        }}>
          <div>#</div>
          <div>Team</div>
          <div style={{ textAlign: 'center' }}>GP</div>
          <div style={{ textAlign: 'center' }}>W</div>
          <div style={{ textAlign: 'center' }}>L</div>
          <div style={{ textAlign: 'center' }}>OTL</div>
          <div style={{ textAlign: 'center' }}>PTS</div>
          <div style={{ textAlign: 'center' }}>GF</div>
          <div style={{ textAlign: 'center' }}>GA</div>
        </div>
        {rows.map(r => {
          const slug = findCanonicalTeam(r.team_name.toLowerCase().replace(/[^a-z0-9]+/g, '-'))?.slug;
          return (
            <Link key={r.id} href={slug ? `/directory/nhl/teams/${slug}` : '#'} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '32px 1fr 50px 50px 50px 50px 50px 50px 50px',
                gap: '0.5rem',
                padding: '0.5rem 0.75rem',
                fontSize: '0.8125rem',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                alignItems: 'center',
              }}>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>{r.rank}</div>
                <div style={{ color: '#fff', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.team_logo && <img src={r.team_logo} alt={`${r.team_name} logo`} style={{ width: 20, height: 20, objectFit: 'contain', marginRight: '0.5rem', verticalAlign: 'middle' }} />}
                  {r.team_name}
                </div>
                <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.7)' }}>{r.played}</div>
                <div style={{ textAlign: 'center', color: '#34d399', fontWeight: 600 }}>{r.wins}</div>
                <div style={{ textAlign: 'center', color: '#f87171', fontWeight: 600 }}>{r.losses}</div>
                <div style={{ textAlign: 'center', color: '#fbbf24' }}>{r.overtime_losses}</div>
                <div style={{ textAlign: 'center', color: '#fff', fontWeight: 700 }}>{r.points}</div>
                <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.6)' }}>{r.goals_for}</div>
                <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.6)' }}>{r.goals_against}</div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default async function StandingsPage({ searchParams }: { searchParams: Promise<{ season?: string }> }) {
  const sp = await searchParams;
  const requestedSeason = sp.season;
  const allSeasons = await getAllSeasons();
  const latest = await getLatestSeason();
  const season = requestedSeason || latest || '2025';

  const standings = await getStandingsForSeason(season);

  // Group by division
  const divisions = {
    Atlantic: standings.filter(s => s.team_name.match(/Boston|Buffalo|Detroit|Florida|Montreal|Ottawa|Tampa|Toronto/i)).sort((a, b) => a.rank - b.rank),
    Metropolitan: standings.filter(s => s.team_name.match(/Carolina|Columbus|New Jersey|Islanders|Rangers|Philadelphia|Pittsburgh|Washington/i)).sort((a, b) => a.rank - b.rank),
    Central: standings.filter(s => s.team_name.match(/Colorado|Dallas|Minnesota|Nashville|St\. Louis|Utah|Winnipeg|Chicago/i)).sort((a, b) => a.rank - b.rank),
    Pacific: standings.filter(s => s.team_name.match(/Anaheim|Calgary|Edmonton|Los Angeles|San Jose|Seattle|Vancouver|Vegas/i)).sort((a, b) => a.rank - b.rank),
  };

  return (
    <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>
      <nav style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '1rem' }}>
        <Link href="/" style={{ color: 'rgba(255,255,255,0.5)' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/directory/nhl" style={{ color: 'rgba(255,255,255,0.5)' }}>NHL</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: 'rgba(255,255,255,0.7)' }}>Standings</span>
      </nav>

      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <h1 className="font-sport" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1, margin: 0 }}>
          NHL STANDINGS
        </h1>
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>Season</span>
          {allSeasons.map(s => (
            <Link key={s} href={`/directory/nhl/standings?season=${s}`} style={{
              padding: '0.3rem 0.75rem',
              borderRadius: '4px',
              fontSize: '0.75rem',
              fontWeight: 600,
              textDecoration: 'none',
              color: s === season ? '#fff' : 'rgba(255,255,255,0.5)',
              background: s === season ? 'var(--s2)' : 'transparent',
              border: '1px solid var(--border)',
            }}>
              {s}{s === latest && <span style={{ marginLeft: '0.3rem', color: '#34d399' }}>●</span>}
            </Link>
          ))}
        </div>
      </div>

      <TicketmasterAd size="468x60" style={{ marginBottom: '1.5rem' }} />

      {standings.length === 0 ? (
        <p style={{ color: 'rgba(255,255,255,0.5)' }}>No standings data available for {season}.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div>
            <h2 className="font-sport" style={{ fontSize: '1.25rem', color: '#041E42', background: 'rgba(255,255,255,0.06)', padding: '0.5rem 1rem', borderRadius: '6px', marginBottom: '1rem', letterSpacing: '0.04em' }}>
              EASTERN CONFERENCE
            </h2>
            <StandingTable title="Atlantic Division" rows={divisions.Atlantic} />
            <StandingTable title="Metropolitan Division" rows={divisions.Metropolitan} />
          </div>
          <div>
            <h2 className="font-sport" style={{ fontSize: '1.25rem', color: '#C8102E', background: 'rgba(255,255,255,0.06)', padding: '0.5rem 1rem', borderRadius: '6px', marginBottom: '1rem', letterSpacing: '0.04em' }}>
              WESTERN CONFERENCE
            </h2>
            <StandingTable title="Central Division" rows={divisions.Central} />
            <StandingTable title="Pacific Division" rows={divisions.Pacific} />
          </div>
        </div>
      )}
    </main>
  );
}
