import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { findCanonicalTeam, NHL_TEAMS_CANONICAL } from '@/lib/nhl-teams-canonical';
import {
  findNhlTeamByName,
  getCurrentStandingForTeam,
  getTeamRecentGames,
  getTeamUpcomingGames,
  getTeamPlayers,
  buildGameSlug,
  NhlMatch,
  NhlPlayer,
  NhlStanding,
} from '@/lib/nhl-data';
import TeamLogo from '@/components/TeamLogo';
import TicketmasterAd from '@/components/TicketmasterAd';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return NHL_TEAMS_CANONICAL.map(t => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const team = findCanonicalTeam(slug);
  if (!team) return { title: 'Team Not Found' };
  return {
    title: `${team.name} | Roster, Schedule, Standings`,
    description: `${team.name} — ${team.city}, ${team.state}. ${team.division} Division, ${team.conference} Conference. Current record, schedule, scores, and roster on RinkStop.`,
    openGraph: {
      title: `${team.name}`,
      description: `${team.name} hockey team page — record, schedule, scores, and roster.`,
      type: 'website',
    },
    alternates: {
      canonical: `https://rinkstop.com/directory/nhl/teams/${team.slug}`,
    },
  };
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function fmtPct(n: number): string {
  return (n * 100).toFixed(1) + '%';
}

function statusLabel(s: string): { label: string; color: string } {
  const map: Record<string, { label: string; color: string }> = {
    'Finished': { label: 'Final', color: 'rgba(255,255,255,0.4)' },
    'Finished after over time': { label: 'F/OT', color: 'rgba(255,255,255,0.4)' },
    'Finished after penalties': { label: 'F/SO', color: 'rgba(255,255,255,0.4)' },
    'Scheduled': { label: 'Scheduled', color: 'rgba(0,212,255,0.7)' },
    'Not started': { label: 'Not Started', color: 'rgba(0,212,255,0.7)' },
    'Cancelled': { label: 'Cancelled', color: '#C8102E' },
    'Postponed': { label: 'Postponed', color: '#fbbf24' },
  };
  return map[s] || { label: s, color: 'rgba(255,255,255,0.4)' };
}

function TeamMatchRow({ match, teamId }: { match: NhlMatch; teamId: string }) {
  const isHome = match.home_team_id === teamId;
  const oppName = isHome ? match.away_team_name : match.home_team_name;
  const oppId = isHome ? match.away_team_id : match.home_team_id;
  const teamScore = isHome ? match.home_score : match.away_score;
  const oppScore = isHome ? match.away_score : match.home_score;
  const result =
    match.status.startsWith('Finished') && teamScore != null && oppScore != null
      ? teamScore > oppScore ? 'W' : teamScore < oppScore ? 'L' : 'T'
      : null;
  const resultColor = result === 'W' ? '#34d399' : result === 'L' ? '#f87171' : result === 'T' ? 'rgba(255,255,255,0.4)' : 'rgba(0,212,255,0.7)';
  const sl = statusLabel(match.status);

  return (
    <Link href={`/directory/nhl/games/${buildGameSlug(match)}`} style={{ textDecoration: 'none' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '40px 1fr auto auto',
        gap: '0.75rem',
        alignItems: 'center',
        padding: '0.75rem 0.875rem',
        background: 'var(--s2)',
        border: '1px solid var(--border)',
        borderRadius: '6px',
        marginBottom: '0.5rem',
      }}>
        <div style={{ textAlign: 'center', color: resultColor, fontWeight: 700, fontSize: '0.875rem' }}>
          {result || sl.label}
        </div>
        <div>
          <div style={{ color: '#fff', fontSize: '0.875rem', fontWeight: 600 }}>
            {isHome ? 'vs' : '@'} {oppName}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', marginTop: '0.15rem' }}>
            {fmtDate(match.date)} · {fmtTime(match.date)}
          </div>
        </div>
        <div style={{
          color: match.status.startsWith('Finished') ? 'rgba(255,255,255,0.6)' : 'rgba(0,212,255,0.7)',
          fontSize: '0.75rem',
          fontWeight: 600,
        }}>
          {match.status.startsWith('Finished') ? `${teamScore ?? 0}–${oppScore ?? 0}` : fmtTime(match.date)}
        </div>
        <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.7rem' }}>›</div>
      </div>
    </Link>
  );
}

function PlayerRow({ p }: { p: NhlPlayer }) {
  return (
    <Link href={`/directory/players/nhl-${p.id}`} style={{ textDecoration: 'none' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.6rem 0.875rem',
        background: 'var(--s2)',
        border: '1px solid var(--border)',
        borderRadius: '6px',
        marginBottom: '0.4rem',
      }}>
        {p.jersey_number ? (
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'rgba(0,212,255,0.1)',
            border: '1px solid rgba(0,212,255,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'rgba(0,212,255,0.9)',
            fontSize: '0.75rem', fontWeight: 800, flexShrink: 0,
          }}>#{p.jersey_number}</div>
        ) : (
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: '#fff', fontSize: '0.8125rem', fontWeight: 600 }}>{p.full_name}</div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}>
            {p.position || '—'}
            {p.height ? ` · ${Math.floor(p.height/12)}'${p.height%12}"` : ''}
            {p.weight ? ` · ${p.weight}lb` : ''}
            {p.birth_place ? ` · ${p.birth_place}` : p.nationality ? ` · ${p.nationality}` : ''}
          </div>
        </div>
        {p.birth_date && (
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.65rem', textAlign: 'right' }}>
            {(() => {
              const age = Math.floor((Date.now() - new Date(p.birth_date).getTime()) / (365.25 * 86400 * 1000));
              return <div>{age} yrs</div>;
            })()}
          </div>
        )}
      </div>
    </Link>
  );
}

export default async function TeamPage({ params }: Props) {
  const { slug } = await params;
  const team = findCanonicalTeam(slug);
  if (!team) notFound();

  // Look up team in nhl_teams table to get highlightly_id + logo
  const dbTeam = await findNhlTeamByName(team.name);
  const teamId = dbTeam?.id;

  // Fetch all data in parallel
  const [standing, recentGames, upcomingGames, players] = await Promise.all([
    teamId ? getCurrentStandingForTeam(teamId, team.name) : Promise.resolve(null),
    teamId ? getTeamRecentGames(teamId, 8) : Promise.resolve([]),
    teamId ? getTeamUpcomingGames(teamId, 5) : Promise.resolve([]),
    teamId ? getTeamPlayers(teamId, team.name, 20) : Promise.resolve([]),
  ]);

  const winPct = standing && standing.played > 0 ? standing.wins / standing.played : 0;
  const goalDiff = standing ? standing.goals_for - standing.goals_against : 0;
  const logoUrl = dbTeam?.logo;

  return (
    <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>
      {/* Breadcrumb */}
      <nav style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '1rem' }}>
        <Link href="/" style={{ color: 'rgba(255,255,255,0.5)' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/directory" style={{ color: 'rgba(255,255,255,0.5)' }}>Directory</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/directory/nhl" style={{ color: 'rgba(255,255,255,0.5)' }}>NHL</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: 'rgba(255,255,255,0.7)' }}>{team.name}</span>
      </nav>

      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, ${team.primaryColor}30 0%, ${team.secondaryColor}20 100%)`,
        border: '1px solid var(--border)',
        borderRadius: '10px',
        padding: '1.5rem',
        marginBottom: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1.5rem',
      }}>
        {logoUrl ? (
          <img src={logoUrl} alt={team.name} style={{ width: 80, height: 80, objectFit: 'contain' }} />
        ) : (
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
        )}
        <div style={{ flex: 1 }}>
          <h1 className="font-sport" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1, margin: 0 }}>
            {team.name}
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
            {team.city}, {team.state} · {team.division} Division · {team.conference} Conference
          </p>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem', marginTop: '0.35rem' }}>
            {team.arena} · Founded {team.founded}
          </p>
        </div>
        {standing && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.625rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
              Season {standing.season}
            </div>
            <div style={{ color: '#fff', fontSize: '2rem', fontWeight: 700, lineHeight: 1, marginTop: '0.25rem' }}>
              {standing.wins}–{standing.losses}–{standing.overtime_losses}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
              {standing.points} PTS · Rank {standing.rank}
            </div>
          </div>
        )}
      </div>

      <TicketmasterAd size="468x60" style={{ marginBottom: '1.5rem' }} />

      {/* Stats row */}
      {standing && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'GP', value: standing.played },
            { label: 'W', value: standing.wins, color: '#34d399' },
            { label: 'L', value: standing.losses, color: '#f87171' },
            { label: 'OTL', value: standing.overtime_losses, color: '#fbbf24' },
            { label: 'PTS', value: standing.points },
            { label: 'GF', value: standing.goals_for },
            { label: 'GA', value: standing.goals_against },
            { label: 'DIFF', value: (goalDiff > 0 ? '+' : '') + goalDiff, color: goalDiff > 0 ? '#34d399' : goalDiff < 0 ? '#f87171' : undefined },
            { label: 'PCT', value: fmtPct(winPct) },
          ].map(s => (
            <div key={s.label} style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.6rem 0.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)' }}>{s.label}</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: s.color || '#fff', marginTop: '0.15rem' }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Schedule + Roster layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '1.5rem' }}>
        {/* Recent + Upcoming games */}
        <div>
          <h2 className="font-sport" style={{ fontSize: '1.1rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>
            RECENT GAMES
          </h2>
          {recentGames.length === 0 ? (
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.875rem' }}>No recent games found.</p>
          ) : (
            recentGames.map(m => teamId && <TeamMatchRow key={m.id} match={m} teamId={teamId} />)
          )}

          <h2 className="font-sport" style={{ fontSize: '1.1rem', color: '#fff', letterSpacing: '0.04em', marginTop: '1.5rem', marginBottom: '0.75rem' }}>
            UPCOMING GAMES
          </h2>
          {upcomingGames.length === 0 ? (
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.875rem' }}>No upcoming games scheduled.</p>
          ) : (
            upcomingGames.map(m => teamId && <TeamMatchRow key={m.id} match={m} teamId={teamId} />)
          )}
        </div>

        {/* Roster */}
        <div>
          <h2 className="font-sport" style={{ fontSize: '1.1rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>
            ROSTER ({players.length})
          </h2>
          {players.length === 0 ? (
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.875rem' }}>Roster data not yet available.</p>
          ) : (
            players.map(p => <PlayerRow key={p.id} p={p} />)
          )}

          <div style={{ marginTop: '1.5rem' }}>
            <TicketmasterAd size="300x250" />
          </div>
        </div>
      </div>
    </main>
  );
}
