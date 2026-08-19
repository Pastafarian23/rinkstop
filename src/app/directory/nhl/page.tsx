import type { Metadata } from 'next';
import Link from 'next/link';
import { getLatestSeason, getStandingsForSeason, getTodaysNhlGames, NhlMatch, NhlStanding } from '@/lib/nhl-data';
import { teamsByDivision, teamsByConference, findCanonicalTeam, NHL_TEAMS_CANONICAL } from '@/lib/nhl-teams-canonical';

export const revalidate = 300; // 5 min for today's games; 1 hour for standings via sub-cache

export const metadata: Metadata = {
  title: 'NHL Hub | Roster, Scores, Standings, Schedule',
  description: 'The complete NHL hub on RinkStop — live scores, current standings for all 32 teams, today\'s games, schedule, and team directory.',
};

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function TodaysGame({ g }: { g: NhlMatch }) {
  const isFinished = g.status.startsWith('Finished');
  const isLive = g.status === 'In progress' || g.status === 'InProgress';
  return (
    <Link href={`/directory/nhl/games/${new Date(g.date).toISOString().slice(0, 10)}-${g.home_team_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-vs-${g.away_team_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`} style={{ textDecoration: 'none' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr 60px',
        gap: '0.5rem',
        alignItems: 'center',
        padding: '0.6rem 0.75rem',
        background: 'var(--s2)',
        border: '1px solid var(--border)',
        borderRadius: '6px',
        marginBottom: '0.4rem',
      }}>
        <div style={{ textAlign: 'right' }}>
          <span style={{ color: '#fff', fontSize: '0.8125rem', fontWeight: 600 }}>{g.away_team_name}</span>
        </div>
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', fontWeight: 600, minWidth: 50 }}>
          {isFinished ? `${g.away_score}–${g.home_score}` : isLive ? `${g.away_score ?? 0}–${g.home_score ?? 0}` : fmtTime(g.date)}
        </div>
        <div>
          <span style={{ color: '#fff', fontSize: '0.8125rem', fontWeight: 600 }}>{g.home_team_name}</span>
        </div>
        <div style={{ textAlign: 'right', fontSize: '0.7rem', fontWeight: 600, color: isFinished ? 'rgba(255,255,255,0.35)' : isLive ? '#00d4ff' : 'rgba(0,212,255,0.7)' }}>
          {isFinished ? 'Final' : isLive ? 'LIVE' : ''}
        </div>
      </div>
    </Link>
  );
}

function StandingPreview({ rows, label, color }: { rows: NhlStanding[]; label: string; color: string }) {
  if (rows.length === 0) return null;
  return (
    <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
      <div style={{ padding: '0.6rem 0.875rem', borderBottom: '1px solid var(--border)', background: color + '20' }}>
        <span style={{ color, fontSize: '0.625rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</span>
      </div>
      {rows.slice(0, 5).map(r => {
        const slug = findCanonicalTeam(r.team_name.toLowerCase().replace(/[^a-z0-9]+/g, '-'))?.slug;
        return (
          <Link key={r.id} href={slug ? `/directory/nhl/teams/${slug}` : '#'} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '24px 1fr 50px 50px',
              padding: '0.45rem 0.875rem',
              fontSize: '0.75rem',
              borderBottom: '1px solid rgba(255,255,255,0.04)',
              alignItems: 'center',
            }}>
              <span style={{ color: 'rgba(255,255,255,0.4)' }}>{r.rank}</span>
              <span style={{ color: '#fff', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.team_name.replace(' Hockey Club', '')}</span>
              <span style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>{r.wins}–{r.losses}–{r.overtime_losses}</span>
              <span style={{ textAlign: 'center', color: '#fff', fontWeight: 700 }}>{r.points}</span>
            </div>
          </Link>
        );
      })}
      <Link href="/directory/nhl/standings" style={{
        display: 'block',
        padding: '0.5rem 0.875rem',
        fontSize: '0.7rem',
        color: 'rgba(0,212,255,0.7)',
        textAlign: 'center',
        textDecoration: 'none',
      }}>
        Full Standings →
      </Link>
    </div>
  );
}

export default async function NHLHubPage() {
  // Fetch today's games + current season standings in parallel
  const [todaysGames, latestSeason, allStandings] = await Promise.all([
    getTodaysNhlGames(),
    getLatestSeason(),
    getLatestSeason().then((s): Promise<NhlStanding[]> => s ? getStandingsForSeason(s) : Promise.resolve([])),
  ]);

  // Group standings by division
  const atlantic = allStandings.filter(s => s.team_name.match(/Boston|Buffalo|Detroit|Florida|Montreal|Ottawa|Tampa|Toronto/i)).sort((a, b) => a.rank - b.rank);
  const metro = allStandings.filter(s => s.team_name.match(/Carolina|Columbus|New Jersey|Islanders|Rangers|Philadelphia|Pittsburgh|Washington/i)).sort((a, b) => a.rank - b.rank);
  const central = allStandings.filter(s => s.team_name.match(/Colorado|Dallas|Minnesota|Nashville|St\. Louis|Utah|Winnipeg|Chicago/i)).sort((a, b) => a.rank - b.rank);
  const pacific = allStandings.filter(s => s.team_name.match(/Anaheim|Calgary|Edmonton|Los Angeles|San Jose|Seattle|Vancouver|Vegas/i)).sort((a, b) => a.rank - b.rank);

  const today = new Date();
  const todayStr = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>
      <nav style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '1rem' }}>
        <Link href="/" style={{ color: 'rgba(255,255,255,0.5)' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/directory" style={{ color: 'rgba(255,255,255,0.5)' }}>Directory</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: 'rgba(255,255,255,0.7)' }}>NHL</span>
      </nav>

      <div style={{ marginBottom: '1.5rem' }}>
        <h1 className="font-sport" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1, margin: 0 }}>
          NHL HUB
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
          32 teams across North America. {latestSeason ? `Season ${latestSeason} · ` : ''}{NHL_TEAMS_CANONICAL.length} active franchises.
        </p>
      </div>

      {/* Quick nav */}
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
        {[
          { label: 'Standings', href: '/directory/nhl/standings' },
          { label: 'Schedule', href: '/directory/nhl/schedule' },
          { label: 'Playoffs', href: '/directory/nhl/playoffs' },
          { label: 'Eastern', href: '/directory/nhl/eastern' },
          { label: 'Western', href: '/directory/nhl/western' },
        ].map(n => (
          <Link key={n.href} href={n.href} style={{
            padding: '0.3rem 0.75rem',
            borderRadius: '4px',
            fontSize: '0.75rem',
            fontWeight: 600,
            textDecoration: 'none',
            color: 'rgba(255,255,255,0.55)',
            background: 'var(--s2)',
            border: '1px solid var(--border)',
          }}>
            {n.label}
          </Link>
        ))}
      </div>

      {/* Layout: today's games left, standings preview right */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Today's games */}
        <div>
          <h2 className="font-sport" style={{ fontSize: '1.1rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>
            {todayStr.toUpperCase()} · {todaysGames.length} GAMES
          </h2>
          {todaysGames.length === 0 ? (
            <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1.5rem', textAlign: 'center' }}>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem' }}>No games scheduled for today.</p>
              <Link href="/directory/nhl/schedule" style={{ color: 'rgba(0,212,255,0.7)', fontSize: '0.8125rem', textDecoration: 'none' }}>
                View full schedule →
              </Link>
            </div>
          ) : (
            todaysGames.map(g => <TodaysGame key={g.id} g={g} />)
          )}
        </div>

        {/* Standings preview */}
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <h2 className="font-sport" style={{ fontSize: '1.1rem', color: '#fff', letterSpacing: '0.04em' }}>
              TOP 5 BY DIVISION
            </h2>
            <Link href="/directory/nhl/standings" style={{ color: 'rgba(0,212,255,0.7)', fontSize: '0.75rem', textDecoration: 'none' }}>
              Full →
            </Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <StandingPreview rows={atlantic} label="ATLANTIC" color="#041E42" />
            <StandingPreview rows={metro} label="METROPOLITAN" color="#1E3A5F" />
            <StandingPreview rows={central} label="CENTRAL" color="#C8102E" />
            <StandingPreview rows={pacific} label="PACIFIC" color="#1E5B9C" />
          </div>
        </div>
      </div>


      {/* Conferences & divisions (using canonical data) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {(['Atlantic', 'Metropolitan', 'Central', 'Pacific'] as const).map(div => {
          const teams = teamsByDivision(div);
          const conf = teams[0]?.conference;
          const slugMap: Record<string, string> = { Atlantic: 'atlantic', Metropolitan: 'metropolitan', Central: 'central', Pacific: 'pacific' };
          const colors: Record<string, string> = { Atlantic: '#041E42', Metropolitan: '#1E3A5F', Central: '#C8102E', Pacific: '#1E5B9C' };
          return (
            <Link key={div} href={`/directory/nhl/${slugMap[div]}`} style={{ textDecoration: 'none' }}>
              <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: colors[div] }}>{div} · {conf}</span>
                </div>
                <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.125rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>{div} Division</h3>
                <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
                  {teams.map(t => t.city).join(' · ')}
                </p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Ticketmaster ad */}
    </main>
  );
}
