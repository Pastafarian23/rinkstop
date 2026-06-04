import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getNhlGameById, getNhlGamesByDate, slugify, NhlMatch } from '@/lib/nhl-data';
import { findCanonicalTeam } from '@/lib/nhl-teams-canonical';
import TicketmasterAd from '@/components/TicketmasterAd';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  // slug format: YYYY-MM-DD-home-slug-vs-away-slug
  const parsed = parseGameSlug(slug);
  if (!parsed) return { title: 'Game Not Found | RinkStop' };
  return {
    title: `${parsed.awayName} at ${parsed.homeName} | ${parsed.date} | RinkStop`,
    description: `${parsed.awayName} vs ${parsed.homeName} on ${parsed.date}. Box score, final score, and game details on RinkStop.`,
    openGraph: {
      title: `${parsed.awayName} vs ${parsed.homeName} | ${parsed.date}`,
      description: `NHL game — ${parsed.awayName} at ${parsed.homeName}.`,
      type: 'website',
    },
  };
}

interface ParsedSlug {
  date: string;
  homeName: string;
  awayName: string;
  homeSlug: string;
  awaySlug: string;
}

function parseGameSlug(slug: string): ParsedSlug | null {
  // Slug: 2026-06-10-carolina-hurricanes-vs-vegas-golden-knights
  const match = slug.match(/^(\d{4}-\d{2}-\d{2})-(.+)-vs-(.+)$/);
  if (!match) return null;
  const [, date, homeSlug, awaySlug] = match;
  const homeName = homeSlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const awayName = awaySlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  return { date, homeName, awayName, homeSlug, awaySlug };
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function fmtDateLong(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function statusInfo(s: string): { label: string; color: string; sub: string | null } {
  const map: Record<string, { label: string; color: string; sub: string | null }> = {
    'Finished': { label: 'FINAL', color: 'rgba(255,255,255,0.4)', sub: null },
    'Finished after over time': { label: 'FINAL/OT', color: 'rgba(255,255,255,0.4)', sub: 'Overtime' },
    'Finished after penalties': { label: 'FINAL/SO', color: 'rgba(255,255,255,0.4)', sub: 'Shootout' },
    'Scheduled': { label: 'SCHEDULED', color: 'rgba(0,212,255,0.8)', sub: null },
    'Not started': { label: 'SCHEDULED', color: 'rgba(0,212,255,0.8)', sub: null },
    'Cancelled': { label: 'CANCELLED', color: '#C8102E', sub: null },
    'Postponed': { label: 'POSTPONED', color: '#fbbf24', sub: null },
  };
  return map[s] || { label: s.toUpperCase(), color: 'rgba(255,255,255,0.4)', sub: null };
}

export default async function GamePage({ params }: Props) {
  const { slug } = await params;
  const parsed = parseGameSlug(slug);
  if (!parsed) notFound();

  // Find the actual game by date + both team names
  const games = await getNhlGamesByDate(parsed.date);
  const match = games.find(g =>
    slugify(g.home_team_name) === parsed.homeSlug &&
    slugify(g.away_team_name) === parsed.awaySlug
  );

  const homeCanonical = findCanonicalTeam(parsed.homeSlug);
  const awayCanonical = findCanonicalTeam(parsed.awaySlug);

  // If there are 2+ games for this matchup on the same day, allow it but log it
  if (games.filter(g => slugify(g.home_team_name) === parsed.homeSlug && slugify(g.away_team_name) === parsed.awaySlug).length > 1) {
    console.warn('[nhl-games] Multiple games found for slug', slug);
  }

  return (
    <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>
      <nav style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '1rem' }}>
        <Link href="/" style={{ color: 'rgba(255,255,255,0.5)' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/directory" style={{ color: 'rgba(255,255,255,0.5)' }}>Directory</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/directory/nhl" style={{ color: 'rgba(255,255,255,0.5)' }}>NHL</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: 'rgba(255,255,255,0.7)' }}>{parsed.awayName} at {parsed.homeName}</span>
      </nav>

      {!match ? (
        <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '10px', padding: '2rem', textAlign: 'center' }}>
          <h1 className="font-sport" style={{ fontSize: '1.5rem', color: '#fff', marginBottom: '0.5rem' }}>
            GAME NOT FOUND
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem' }}>
            No NHL game found for {parsed.awayName} at {parsed.homeName} on {fmtDateLong(parsed.date)}.
          </p>
          <Link href="/directory/nhl" style={{ color: 'rgba(0,212,255,0.8)', fontSize: '0.875rem', display: 'inline-block', marginTop: '1rem' }}>
            ← Back to NHL Hub
          </Link>
        </div>
      ) : (
        <>
          {(() => {
            const si = statusInfo(match.status);
            const isFinished = match.status.startsWith('Finished');
            const isHomeWinner = isFinished && (match.home_score ?? 0) > (match.away_score ?? 0);
            const isAwayWinner = isFinished && (match.away_score ?? 0) > (match.home_score ?? 0);
            return (
              <>
                {/* Status banner */}
                <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                  <span style={{
                    display: 'inline-block',
                    padding: '0.4rem 1rem',
                    background: si.color + '22',
                    border: `1px solid ${si.color}`,
                    borderRadius: '4px',
                    color: si.color,
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                  }}>
                    {si.label}
                  </span>
                  {si.sub && (
                    <span style={{ marginLeft: '0.5rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>
                      {si.sub}
                    </span>
                  )}
                </div>

                {/* Matchup */}
                <div style={{
                  background: 'var(--s2)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  padding: '2rem 1.5rem',
                  marginBottom: '1.5rem',
                }}>
                  <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                    {fmtDateLong(match.date)} · {fmtTime(match.date)}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '1.5rem', alignItems: 'center' }}>
                    {/* Away team */}
                    <Link href={`/directory/nhl/teams/${parsed.awaySlug}`} style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                      {match.away_team_logo && (
                        <img src={match.away_team_logo} alt={match.away_team_name} style={{ width: 80, height: 80, objectFit: 'contain', marginBottom: '0.75rem' }} />
                      )}
                      <div style={{ color: isAwayWinner ? '#34d399' : '#fff', fontSize: '1.125rem', fontWeight: 700 }}>{match.away_team_name}</div>
                      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', marginTop: '0.25rem' }}>Away</div>
                    </Link>

                    {/* Score */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      {isFinished ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{
                            color: isAwayWinner ? '#34d399' : 'rgba(255,255,255,0.4)',
                            fontSize: 'clamp(2.5rem, 6vw, 3.5rem)',
                            fontWeight: 800,
                            lineHeight: 1,
                          }}>{match.away_score ?? 0}</div>
                          <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: '1.5rem' }}>–</div>
                          <div style={{
                            color: isHomeWinner ? '#34d399' : 'rgba(255,255,255,0.4)',
                            fontSize: 'clamp(2.5rem, 6vw, 3.5rem)',
                            fontWeight: 800,
                            lineHeight: 1,
                          }}>{match.home_score ?? 0}</div>
                        </div>
                      ) : (
                        <div style={{ color: 'rgba(0,212,255,0.7)', fontSize: '0.875rem', fontWeight: 600 }}>{fmtTime(match.date)} ET</div>
                      )}
                    </div>

                    {/* Home team */}
                    <Link href={`/directory/nhl/teams/${parsed.homeSlug}`} style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                      {match.home_team_logo && (
                        <img src={match.home_team_logo} alt={match.home_team_name} style={{ width: 80, height: 80, objectFit: 'contain', marginBottom: '0.75rem' }} />
                      )}
                      <div style={{ color: isHomeWinner ? '#34d399' : '#fff', fontSize: '1.125rem', fontWeight: 700 }}>{match.home_team_name}</div>
                      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', marginTop: '0.25rem' }}>Home</div>
                    </Link>
                  </div>
                </div>

                <TicketmasterAd size="468x60" style={{ marginBottom: '1.5rem' }} />

                {/* Game details */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  {[
                    { label: 'Date', value: fmtDateLong(match.date) },
                    { label: 'Time', value: fmtTime(match.date) },
                    { label: 'League', value: 'NHL' },
                    ...(match.venue ? [{ label: 'Venue', value: match.venue }] : []),
                    ...(match.period != null ? [{ label: 'Period', value: String(match.period) }] : []),
                    ...(match.clock ? [{ label: 'Clock', value: match.clock }] : []),
                  ].map(s => (
                    <div key={s.label} style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.75rem 1rem' }}>
                      <div style={{ fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)' }}>{s.label}</div>
                      <div style={{ fontSize: '0.875rem', color: '#fff', marginTop: '0.25rem' }}>{s.value}</div>
                    </div>
                  ))}
                </div>

                {/* Links to team pages */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <Link href={`/directory/nhl/teams/${parsed.awaySlug}`} style={{
                    textDecoration: 'none',
                    background: 'var(--s2)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '1rem',
                    textAlign: 'center',
                  }}>
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.625rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>Away Team</div>
                    <div style={{ color: '#fff', fontSize: '1rem', fontWeight: 700, marginTop: '0.25rem' }}>{match.away_team_name} →</div>
                  </Link>
                  <Link href={`/directory/nhl/teams/${parsed.homeSlug}`} style={{
                    textDecoration: 'none',
                    background: 'var(--s2)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '1rem',
                    textAlign: 'center',
                  }}>
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.625rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>Home Team</div>
                    <div style={{ color: '#fff', fontSize: '1rem', fontWeight: 700, marginTop: '0.25rem' }}>{match.home_team_name} →</div>
                  </Link>
                </div>
              </>
            );
          })()}
        </>
      )}
    </main>
  );
}
