'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import ShareButton from '@/components/ShareButton';
import { type SharePayload } from '@/lib/share';
import { formatGameTime, timezoneForGame, disclaimerText } from '@/lib/game-time';

const BASE_URL = 'https://rinkstop.com';

interface Game {
  id: string;
  date: string;
  status: string;
  home_team_id: string;
  away_team_id: string;
  home_score: number | null;
  away_score: number | null;
  scheduled_at: string;
  home_team: { name: string; logo_url: string | null; slug: string } | null;
  away_team: { name: string; logo_url: string | null; slug: string } | null;
  league: { id: string; name: string; slug: string; level?: string; country?: string } | null;
  venue_details: any;
  period_scores: any;
  linked_articles?: Array<{
    id: string;
    slug: string;
    title: string;
    subtitle?: string;
    category?: string;
    reading_time_minutes?: number;
    author_name?: string;
    published_at?: string;
    path: string;
  }>;
  linked_highlights?: Array<{
    id: number;
    title: string;
    video_url: string;
    embed_url?: string | null;
    source?: string;
    channel?: string | null;
    league_name?: string;
    image_url?: string | null;
    home_team_name?: string;
    away_team_name?: string;
  }>;
}

interface Boxscore {
  source: string;
  leagueName?: string;
  gameInfo?: any;
  teamStats?: any;
  goals?: any[];
  goalies?: any;
  playerStats?: any;
  periodScores?: { first?: number[]; second?: number[]; third?: number[]; overtime?: number[]; shootout?: number[] };
  scoreDiscrepancy?: { home: { db: number; hl: number }; away: { db: number; hl: number } };
}

const statusStyle: Record<string, { color: string; label: string }> = {
  scheduled: { color: 'rgba(255,255,255,0.4)', label: 'Scheduled' },
  in_progress: { color: '#00d4ff', label: 'In Progress' },
  completed: { color: '#34d399', label: 'Completed' },
  cancelled: { color: '#C8102E', label: 'Cancelled' },
  postponed: { color: '#fbbf24', label: 'Postponed' },
};

function formatDate(d: string, timezone: string) {
  return formatGameTime(d, timezone);
}

function periodLabel(period: number, periodDescriptor: any): string {
  if (!period) return '';
  if (period === 1) return '1st';
  if (period === 2) return '2nd';
  if (period === 3) return '3rd';
  if (period > 3) {
    const otNum = period - 3;
    if (periodDescriptor?.periodType === 'SO') return 'SO';
    return otNum === 1 ? 'OT' : `${otNum}OT`;
  }
  return String(period);
}

export default function GamePage() {
  const params = useParams();
  const gameId = params.id as string;

  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [boxscore, setBoxscore] = useState<Boxscore | null>(null);
  const [boxLoading, setBoxLoading] = useState(false);

  useEffect(() => {
    if (!gameId) return;
    // 2026-09-17: switched from /api/scores?limit=100 to /api/game/[id].
    // The old approach fetched all current/recent games ordered DESC by
    // scheduled_at and searched by ID — if the game was outside the first
    // 100 (e.g. a preseason game in September), the detail page showed
    // "Game Not Found" even though the row existed in fixtures.
    fetch(`/api/game/${gameId}`)
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then((g: any) => {
        if (g?.error) { setLoading(false); setError(g.error); return; }
        setGame(g);
        setLoading(false);
      })
      .catch(err => { setLoading(false); setError(err.message); });
  }, [gameId]);

  // Fetch rich boxscore (NHL.com for NHL games, Highlightly for others).
  // Per Arnel 2026-09-22 02:49 CDT: non-NHL games used to fall through to
  // 'detailed stats on the league's official site' which was a dead end.
  // The /api/game/[id]/boxscore endpoint now returns HL period scores for
  // non-NHL leagues (KHL/SHL/DEL/MHL/VHL/SPHL/Liiga).
  useEffect(() => {
    if (!gameId) return;
    setBoxLoading(true);
    fetch(`/api/game/${gameId}/boxscore`)
      .then(r => r.json())
      .then(d => {
        if (d?.source === 'nhl.com' || d?.source === 'highlightly') setBoxscore(d);
      })
      .catch(() => {})
      .finally(() => setBoxLoading(false));
  }, [gameId]);

  if (loading) {
    return (
      <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
        <div className="skeleton" style={{ width: '60px', height: '60px', borderRadius: '50%', margin: '0 auto 1rem' }} />
        <div className="skeleton" style={{ width: '200px', height: '24px', margin: '0 auto' }} />
      </div>
    );
  }

  if (error || !game) {
    return (
      <div style={{ maxWidth: '600px', marginLeft: 'auto', marginRight: 'auto', padding: '4rem 2rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2rem', color: '#fff', marginBottom: '1rem' }}>Game Not Found</h1>
        <p style={{ color: 'rgba(255,255,255,0.5)' }}>This game doesn&apos;t exist or has been removed.</p>
        <Link href="/directory/games" style={{ color: '#C8102E', display: 'inline-block', marginTop: '1rem' }}>
          ← Back to Scores
        </Link>
      </div>
    );
  }

  const s = statusStyle[game.status] || statusStyle.scheduled;
  const homeName = game.home_team?.name || 'Home';
  const awayName = game.away_team?.name || 'Away';
  const tz = timezoneForGame({ leagueSlug: game.league?.slug, countryCode: game.league?.country });
  const homeSlug = game.home_team?.slug;
  const awaySlug = game.away_team?.slug;

  // Determine winner for completed games
  const isCompleted = game.status === 'completed' && game.home_score !== null && game.away_score !== null;
  const homeWin = isCompleted && game.home_score! > game.away_score!;
  const awayWin = isCompleted && game.away_score! > game.home_score!;
  const isTie = isCompleted && game.home_score === game.away_score;

  return (
    <div style={{ maxWidth: '900px', marginLeft: 'auto', marginRight: 'auto', padding: '2rem 1rem' }}>
      <nav style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '1rem' }}>
        <Link href="/" style={{ color: 'rgba(255,255,255,0.4)' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/directory/games" style={{ color: 'rgba(255,255,255,0.4)' }}>Scores</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: 'rgba(255,255,255,0.6)' }}>{awayName} @ {homeName}</span>
      </nav>

      {/* Game Header */}
      <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '2rem', textAlign: 'center', marginBottom: '1.5rem' }}>
        <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)', marginBottom: '1.5rem' }}>
          {formatDate(game.scheduled_at || game.date, tz)}
          {game.scheduled_at && (
            <span style={{ display: 'block', fontSize: '0.6875rem', color: 'rgba(255,255,255,0.45)', marginTop: '0.375rem', fontStyle: 'italic' }}>
              {disclaimerText(tz, 'compact')}
            </span>
          )}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ textAlign: 'center' }}>
            {awaySlug ? (
              <Link href={`/directory/teams/${awaySlug}`} style={{ textDecoration: 'none' }}>
                {game.away_team?.logo_url && (
                  <img src={game.away_team.logo_url} alt={`${awayName} logo`} style={{ width: '64px', height: '64px', objectFit: 'contain', marginBottom: '0.5rem' }} />
                )}
                <p style={{ fontSize: '1.125rem', fontWeight: 700, color: awayWin ? '#34d399' : '#fff' }}>{awayName}</p>
              </Link>
            ) : (
              <p style={{ fontSize: '1.125rem', fontWeight: 700, color: awayWin ? '#34d399' : '#fff' }}>{awayName}</p>
            )}
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
              <span style={{ fontSize: '2.5rem', fontWeight: 800, color: awayWin ? '#34d399' : (game.away_score !== null ? '#fff' : '#555') }}>
                {game.away_score ?? '-'}
              </span>
              <span style={{ color: '#333', fontSize: '1.25rem' }}>@</span>
              <span style={{ fontSize: '2.5rem', fontWeight: 800, color: homeWin ? '#34d399' : (game.home_score !== null ? '#fff' : '#555') }}>
                {game.home_score ?? '-'}
              </span>
            </div>
            <span style={{
              display: 'inline-block',
              marginTop: '0.75rem',
              padding: '0.25rem 0.75rem',
              borderRadius: '99px',
              fontSize: '0.6875rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              color: s.color,
              border: `1px solid ${s.color}40`,
            }}>
              {s.label}{isCompleted && !isTie ? (homeWin ? ' · Home Win' : ' · Away Win') : ''}
            </span>
          </div>

          <div style={{ textAlign: 'center' }}>
            {homeSlug ? (
              <Link href={`/directory/teams/${homeSlug}`} style={{ textDecoration: 'none' }}>
                {game.home_team?.logo_url && (
                  <img src={game.home_team.logo_url} alt={`${homeName} logo`} style={{ width: '64px', height: '64px', objectFit: 'contain', marginBottom: '0.5rem' }} />
                )}
                <p style={{ fontSize: '1.125rem', fontWeight: 700, color: homeWin ? '#34d399' : '#fff' }}>{homeName}</p>
              </Link>
            ) : (
              <p style={{ fontSize: '1.125rem', fontWeight: 700, color: homeWin ? '#34d399' : '#fff' }}>{homeName}</p>
            )}
          </div>
        </div>

        {game.league?.name && (
          <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.5rem' }}>{game.league.name}</p>
        )}
        {boxscore?.gameInfo?.venue && (
          <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.55)', marginTop: '0.25rem' }}>@{boxscore.gameInfo.venue}</p>
        )}

        <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center' }}>
          <ShareButton
            payload={{
              title: `${awayName} at ${homeName} — RinkStop`,
              text: isCompleted ? `${awayName} at ${homeName} — Final ${game.away_score}-${game.home_score}.` : `${awayName} at ${homeName} on RinkStop.`,
              url: `${typeof window !== 'undefined' ? window.location.origin : 'https://rinkstop.com'}/directory/games/${game.id}`,
            } satisfies SharePayload}
            variant="brand"
          />
        </div>
      </div>

      {/* Period Scores — prefer game.period_scores (DB-stored from HL ingest),
          fall back to boxscore.periodScores (live HL fetch) when null.
          Per Arnel 2026-09-22 02:49 CDT: enhance scores pages to include
          actual information rather than 'see the league's site'. */}
      {(() => {
        const ps = (game.period_scores && game.period_scores.length > 0)
          ? game.period_scores.map((p: any) => ({ period: p.period, home: p.home, away: p.away }))
          : (boxscore?.periodScores ? [
              { period: 'P1', home: boxscore.periodScores.first?.[0], away: boxscore.periodScores.first?.[1] },
              { period: 'P2', home: boxscore.periodScores.second?.[0], away: boxscore.periodScores.second?.[1] },
              { period: 'P3', home: boxscore.periodScores.third?.[0], away: boxscore.periodScores.third?.[1] },
              { period: 'OT', home: boxscore.periodScores.overtime?.[0], away: boxscore.periodScores.overtime?.[1] },
              { period: 'SO', home: boxscore.periodScores.shootout?.[0], away: boxscore.periodScores.shootout?.[1] },
            ].filter((p) => p.home != null && p.away != null) : []);
        if (ps.length === 0) return null;
        return (
          <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>Period Scores</h3>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              {ps.map((p: any, i: number) => (
                <div key={i} style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.75rem 1rem', textAlign: 'center', minWidth: '70px' }}>
                  <p style={{ fontSize: '0.625rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.25rem' }}>{p.period || periodLabel(i + 1, boxscore?.gameInfo?.periodDescriptor)}</p>
                  <p style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>{p.home} - {p.away}</p>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Three Stars (NHL) */}
      {boxscore?.gameInfo?.threeStars && boxscore.gameInfo.threeStars.length > 0 && (
        <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>Three Stars</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem' }}>
            {boxscore.gameInfo.threeStars.map((s: any, i: number) => (
              <div key={i} style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.875rem', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem', color: i === 0 ? '#FFB81C' : (i === 1 ? '#C0C0C0' : '#CD7F32') }}>
                  {i === 0 ? '⭐' : i === 1 ? '★' : '☆'}
                </div>
                <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff' }}>{s.name}</p>
                <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>{s.teamAbbrev}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Goals (NHL) */}
      {boxscore?.goals && boxscore.goals.length > 0 && (
        <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>Goals</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {boxscore.goals.map((g: any, i: number) => (
              <div key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', paddingBottom: '0.75rem', borderBottom: i < boxscore.goals.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                <div style={{ minWidth: '60px', textAlign: 'center', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
                  <div>{periodLabel(g.period, g.periodDescriptor)}</div>
                  <div style={{ fontWeight: 700, color: '#fff' }}>{g.timeInPeriod}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff' }}>
                    {g.scorer.name} <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontWeight: 400 }}>({g.scorer.total})</span>
                  </p>
                  {(g.assist1 || g.assist2) && (
                    <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.55)' }}>
                      Assists: {[g.assist1, g.assist2].filter(Boolean).map((a: any) => `${a.name} (${a.total})`).join(', ')}
                    </p>
                  )}
                  {g.shotType && (
                    <p style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.35)', marginTop: '0.25rem' }}>{g.shotType}</p>
                  )}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap' }}>
                  {g.awayScore}-{g.homeScore}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Team Stats — Shots on Goal */}
      {boxscore?.teamStats && (
        <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>Shots on Goal</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '1rem', alignItems: 'center', textAlign: 'center' }}>
            <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff' }}>{boxscore.teamStats.away?.sog ?? '-'}</p>
            <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>SOG</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff' }}>{boxscore.teamStats.home?.sog ?? '-'}</p>
          </div>
        </div>
      )}

      {/* Goalie Decisions (NHL) */}
      {boxscore?.goalies && (boxscore.goalies.home || boxscore.goalies.away) && (
        <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>Goalies</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <p style={{ fontSize: '0.625rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Away</p>
              {boxscore.goalies.away ? (
                <div>
                  <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff' }}>{boxscore.goalies.away.name}</p>
                  <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                    {boxscore.goalies.away.saves}/{boxscore.goalies.away.shotsAgainst} · {boxscore.goalies.away.savePct} SV% · {boxscore.goalies.away.toi}
                  </p>
                </div>
              ) : <p style={{ color: 'rgba(255,255,255,0.4)' }}>—</p>}
            </div>
            <div>
              <p style={{ fontSize: '0.625rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Home</p>
              {boxscore.goalies.home ? (
                <div>
                  <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff' }}>{boxscore.goalies.home.name}</p>
                  <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                    {boxscore.goalies.home.saves}/{boxscore.goalies.home.shotsAgainst} · {boxscore.goalies.home.savePct} SV% · {boxscore.goalies.home.toi}
                  </p>
                </div>
              ) : <p style={{ color: 'rgba(255,255,255,0.4)' }}>—</p>}
            </div>
          </div>
        </div>
      )}

      {/* Top Skater Stats (NHL) — top 5 by points per team */}
      {boxscore?.playerStats && (boxscore.playerStats.home.forwards.length > 0 || boxscore.playerStats.away.forwards.length > 0) && (
        <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>Top Skaters</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            {[{
              label: 'Away', players: boxscore.playerStats.away.forwards.concat(boxscore.playerStats.away.defense).sort((a: any, b: any) => b.points - a.points).slice(0, 5),
            }, {
              label: 'Home', players: boxscore.playerStats.home.forwards.concat(boxscore.playerStats.home.defense).sort((a: any, b: any) => b.points - a.points).slice(0, 5),
            }].map((g: any) => (
              <div key={g.label}>
                <p style={{ fontSize: '0.625rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>{g.label}</p>
                {g.players.map((p: any, i: number) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.375rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '0.8125rem' }}>
                    <span style={{ color: '#fff' }}>{p.name}</span>
                    <span style={{ color: 'rgba(255,255,255,0.5)' }}>{p.goals}-{p.assists} · {p.plusMinus > 0 ? '+' : ''}{p.plusMinus}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Non-NHL fallback — show "stats on league.com" link */}
      {!boxscore && !boxLoading && (
        <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem', textAlign: 'center' }}>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem' }}>
            Detailed box score for {game.league?.name || 'this league'} is available on{' '}
            {game.league?.name?.toLowerCase().includes('nhl') ? 'NHL.com' :
             game.league?.name?.toLowerCase().includes('khl') ? 'en.khl.ru' :
             game.league?.name?.toLowerCase().includes('shl') ? 'shl.se' :
             game.league?.name?.toLowerCase().includes('del') ? 'del.org' :
             game.league?.name?.toLowerCase().includes('liiga') ? 'liiga.fi' :
             'the league\'s official site'}.
          </p>
        </div>
      )}

      {/* HL non-NHL games: show game state + venue (more useful than nothing)
          since HL doesn't expose goal events for KHL/SHL/DEL/etc. */}
      {boxscore?.source === 'highlightly' && boxscore?.gameInfo && (
        <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>Game Details</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.5rem 1.5rem', fontSize: '0.875rem' }}>
            <span style={{ color: 'rgba(255,255,255,0.5)' }}>Status</span>
            <span style={{ color: '#fff', fontWeight: 600 }}>{boxscore.gameInfo.gameState || '—'}</span>
            {boxscore.gameInfo.venue && (
              <>
                <span style={{ color: 'rgba(255,255,255,0.5)' }}>Venue</span>
                <span style={{ color: '#fff' }}>{boxscore.gameInfo.venue}{boxscore.gameInfo.venueLocation ? ` (${boxscore.gameInfo.venueLocation})` : ''}</span>
              </>
            )}
            {boxscore.leagueName && (
              <>
                <span style={{ color: 'rgba(255,255,255,0.5)' }}>Source</span>
                <span style={{ color: 'rgba(255,255,255,0.7)' }}>Highlightly match API · {boxscore.leagueName}</span>
              </>
            )}
            {boxscore.scoreDiscrepancy && (
              <>
                <span style={{ color: 'rgba(255,255,255,0.5)' }}>Score note</span>
                <span style={{ color: '#FFB81C' }}>
                  DB has {boxscore.scoreDiscrepancy.home.db}-{boxscore.scoreDiscrepancy.away.db};
                  HL has {boxscore.scoreDiscrepancy.home.hl}-{boxscore.scoreDiscrepancy.away.hl}.
                  Showing HL value.
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Companion articles (added 2026-09-21 per Arnel's cross-link directive) */}
      {game.linked_articles && game.linked_articles.length > 0 && (
        <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: '1rem' }}>
            Related Articles
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {game.linked_articles.map((a: any) => (
              <Link
                key={a.id}
                href={a.path}
                style={{
                  display: 'block',
                  padding: '1rem',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  color: 'inherit',
                }}
              >
                <div style={{ fontSize: '0.7rem', color: '#FFB81C', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem', fontWeight: 700 }}>
                  {a.category || 'Article'}
                  {a.reading_time_minutes ? ` · ${a.reading_time_minutes} min read` : ''}
                </div>
                <h3 style={{ fontSize: '1.05rem', color: '#fff', fontWeight: 700, lineHeight: 1.3, marginBottom: '0.4rem' }}>
                  {a.title}
                </h3>
                {a.subtitle && (
                  <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.5, margin: 0 }}>
                    {a.subtitle}
                  </p>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Companion highlight videos (added 2026-09-21 per Arnel's cross-link directive) */}
      {game.linked_highlights && game.linked_highlights.length > 0 && (
        <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: '1rem' }}>
            Game Highlights
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {game.linked_highlights.map((h: any) => (
              <Link
                key={h.id}
                href={`/highlights/${h.id}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  color: 'inherit',
                }}
              >
                <div style={{ flex: '0 0 auto', width: '40px', height: '40px', borderRadius: '50%', background: '#C8102E', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <polygon points="5,3 19,12 5,21" fill="#fff" />
                  </svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ fontSize: '0.9rem', color: '#fff', fontWeight: 600, lineHeight: 1.3, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {h.title}
                  </h3>
                  <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', margin: '0.2rem 0 0 0' }}>
                    {h.league_name || h.source} · {h.home_team_name} vs {h.away_team_name}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div style={{ textAlign: 'center' }}>
        <Link href="/directory/games" style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 600 }}>
          ← Back to All Scores
        </Link>
      </div>
    </div>
  );
}