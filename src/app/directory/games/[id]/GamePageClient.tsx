'use client';

// 2026-10-14 (Arnel 13:38 directive): presentational client component.
// All data-driven modules (team form, H2H, next games, same-day,
// recap, JSON-LD) are server-rendered and passed in via `modules`.
// The page's data is also passed via `game`.
//
// This client component handles ONLY interactive parts:
//   - ShareButton (already a client component)
//   - Countdown timer for upcoming games (uses Date.now())
//   - Add-to-calendar (data: URL, computed inline)
//   - The 404 / loading shells (rendered when the page is missing
//     or the game is not in the database)
//
// No more useState/useEffect for the data-driven modules.

import Link from 'next/link';
import ShareButton from '@/components/ShareButton';
import { formatGameTime, timezoneForGame, disclaimerText } from '@/lib/game-time';
import type { TeamForm, H2HRow, NextGame, SameDayGame } from '@/lib/game-modules';

const BASE_URL = 'https://rinkstop.com';

interface FixtureLite {
  id: string;
  scheduled_at: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'postponed';
  home_score: number | null;
  away_score: number | null;
  home_team: { name: string; slug: string } | null;
  away_team: { name: string; slug: string } | null;
  league: { name: string; slug: string; country: string | null } | null;
}

interface Modules {
  homeForm: TeamForm | null;
  awayForm: TeamForm | null;
  h2h: H2HRow[];
  homeNext: NextGame | null;
  awayNext: NextGame | null;
  sameDay: SameDayGame[];
  recap: string | null;
  homeRenderName: string;
  awayRenderName: string;
  indexable: boolean;
  isCompletedWithScore: boolean;
  isUpcomingWithinWeek: boolean;
}

interface Props {
  id: string;
  game: FixtureLite | null;
  modules: Modules | null;
}

const statusStyle: Record<string, { color: string; label: string }> = {
  scheduled: { color: 'rgba(255,255,255,0.4)', label: 'Scheduled' },
  in_progress: { color: '#00d4ff', label: 'In Progress' },
  completed: { color: '#34d399', label: 'Completed' },
  cancelled: { color: '#C8102E', label: 'Cancelled' },
  postponed: { color: '#fbbf24', label: 'Postponed' },
};

function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function GamePage({ id, game, modules }: Props) {
  // 404 / not-found shell
  if (!game) {
    return (
      <div style={{ maxWidth: '600px', margin: '4rem auto', textAlign: 'center', padding: '0 1rem' }}>
        <h1 style={{ fontSize: '2rem', color: '#fff', marginBottom: '1rem' }}>Game Not Found</h1>
        <p style={{ color: 'rgba(255,255,255,0.5)' }}>This game doesn&apos;t exist or has been removed.</p>
        <Link href="/directory/games" style={{ color: '#C8102E', display: 'inline-block', marginTop: '1rem' }}>
          ← Back to Scores
        </Link>
      </div>
    );
  }

  // At this point modules is guaranteed non-null (we only get here
  // after the server fetched them).  Cast for type safety.
  const m = modules!;
  const tz = timezoneForGame({ leagueSlug: m ? undefined : undefined, countryCode: game.league?.country });
  // (The page passes homeRenderName/awayRenderName which is what
  // we use in display; tz is still needed for the countdown-only
  // date display which only fires for scheduled games.)

  const s = statusStyle[game.status] || statusStyle.scheduled;
  const homeName = game.home_team?.name || 'Home';
  const awayName = game.away_team?.name || 'Away';
  const homeSlug = game.home_team?.slug;
  const awaySlug = game.away_team?.slug;

  const isCompleted = game.status === 'completed' && game.home_score !== null && game.away_score !== null;
  const homeWin = isCompleted && game.home_score! > game.away_score!;
  const awayWin = isCompleted && game.away_score! > game.home_score!;
  const isTie = isCompleted && game.home_score === game.away_score;

  return (
    <div style={{ maxWidth: '900px', marginLeft: 'auto', marginRight: 'auto', padding: '2rem 1rem' }}>
      {/* Game header — score, status, teams, share */}
      <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '2rem', textAlign: 'center', marginBottom: '1.5rem' }}>
        <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)', marginBottom: '1.5rem' }}>
          {formatGameTime(game.scheduled_at, tz)}
          {disclaimerText(tz, 'compact') && (
            <span style={{ display: 'block', fontSize: '0.6875rem', color: 'rgba(255,255,255,0.45)', marginTop: '0.375rem', fontStyle: 'italic' }}>
              {disclaimerText(tz, 'compact')}
            </span>
          )}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ textAlign: 'center' }}>
            {awaySlug ? (
              <Link href={`/directory/teams/${awaySlug}`} style={{ textDecoration: 'none' }}>
                <p style={{ fontSize: '1.125rem', fontWeight: 700, color: awayWin ? '#34d399' : '#fff', margin: 0 }}>{m.awayRenderName}</p>
              </Link>
            ) : (
              <p style={{ fontSize: '1.125rem', fontWeight: 700, color: awayWin ? '#34d399' : '#fff', margin: 0 }}>{m.awayRenderName}</p>
            )}
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
              <span style={{ fontSize: '2.5rem', fontWeight: 800, color: awayWin ? '#34d399' : (game.away_score === null ? '#555' : '#fff') }}>{game.away_score ?? '–'}</span>
              <span style={{ color: '#333', fontSize: '1.25rem' }}>@</span>
              <span style={{ fontSize: '2.5rem', fontWeight: 800, color: homeWin ? '#34d399' : (game.home_score === null ? '#555' : '#fff') }}>{game.home_score ?? '–'}</span>
            </div>
            <span style={{ display: 'inline-block', marginTop: '0.75rem', padding: '0.25rem 0.75rem', borderRadius: '99px', fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', color: s.color, border: `1px solid ${s.color}40` }}>
              {s.label}{isCompleted && !isTie ? (homeWin ? ' · Home Win' : ' · Away Win') : ''}
            </span>
          </div>
          <div style={{ textAlign: 'center' }}>
            {homeSlug ? (
              <Link href={`/directory/teams/${homeSlug}`} style={{ textDecoration: 'none' }}>
                <p style={{ fontSize: '1.125rem', fontWeight: 700, color: homeWin ? '#34d399' : '#fff', margin: 0 }}>{m.homeRenderName}</p>
              </Link>
            ) : (
              <p style={{ fontSize: '1.125rem', fontWeight: 700, color: homeWin ? '#34d399' : '#fff', margin: 0 }}>{m.homeRenderName}</p>
            )}
          </div>
        </div>

        {game.league?.name && (
          <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.5rem' }}>{game.league.name}</p>
        )}

        <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center' }}>
          <ShareButton
            payload={{
              title: `${m.awayRenderName} at ${m.homeRenderName} — RinkStop`,
              text: isCompleted
                ? `${m.awayRenderName} at ${m.homeRenderName} — Final ${game.away_score}-${game.home_score}.`
                : `${m.awayRenderName} at ${m.homeRenderName} on RinkStop.`,
              url: `${BASE_URL}/directory/games/${game.id}`,
            }}
            variant="brand"
          />
        </div>
      </div>

      {/* Auto recap (server-rendered text, but rendered here for layout) */}
      {m.recap && (
        <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '1rem' }}>
          <p style={{ color: '#fff', fontSize: '0.9375rem', margin: 0 }}>{m.recap}</p>
        </div>
      )}

      {/* Upcoming-game modules: countdown + add to calendar (uses Date.now() — must be client) */}
      {game.status === 'scheduled' && (() => {
        const dt = new Date(game.scheduled_at);
        const startUtc = dt.toISOString().replace(/[-:]|\.\d{3}/g, '');
        const endDt = new Date(dt.getTime() + 2.5 * 3600 * 1000);
        const endUtc = endDt.toISOString().replace(/[-:]|\.\d{3}/g, '');
        const ics = [
          'BEGIN:VCALENDAR',
          'VERSION:2.0',
          'PRODID:-//RinkStop//Game//EN',
          'BEGIN:VEVENT',
          `UID:rs-${game.id}@rinkstop.com`,
          `DTSTAMP:${startUtc}`,
          `DTSTART:${startUtc}`,
          `DTEND:${endUtc}`,
          `SUMMARY:${m.awayRenderName} at ${m.homeRenderName}`,
          `DESCRIPTION:${game.league?.name || 'Hockey'} game on RinkStop — ${BASE_URL}/directory/games/${game.id}`,
          'END:VEVENT',
          'END:VCALENDAR',
        ].join('\r\n');
        const icsHref = `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
        const ms = dt.getTime() - Date.now();
        const days = Math.max(0, Math.floor(ms / 86400000));
        const hours = Math.max(0, Math.floor((ms % 86400000) / 3600000));
        const mins = Math.max(0, Math.floor((ms % 3600000) / 60000));
        return (
          <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, margin: 0 }}>Puck drop in</p>
              <p style={{ fontSize: '1.5rem', color: '#fff', fontWeight: 800, margin: '0.25rem 0 0' }}>
                {days > 0 ? `${days}d ${hours}h` : hours > 0 ? `${hours}h ${mins}m` : `${mins}m`}
              </p>
            </div>
            <a
              href={icsHref}
              download={`rinkstop-${game.id}.ics`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1rem', background: '#C8102E', color: '#fff', borderRadius: '8px', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 700 }}
            >
              Add to calendar
            </a>
          </div>
        );
      })()}

      {/* Team form: W-L-OTL record + last 5 results per team */}
      {(m.homeForm || m.awayForm) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
          {([
            { label: m.awayRenderName, data: m.awayForm, slug: awaySlug },
            { label: m.homeRenderName, data: m.homeForm, slug: homeSlug },
          ] as const).map((side) => {
            if (!side.data) return null;
            const { record, last5 } = side.data;
            return (
              <div key={side.label} style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1rem 1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <h3 style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, margin: 0 }}>{side.label}</h3>
                  <div style={{ fontSize: '0.8125rem', color: '#fff', fontWeight: 700 }}>
                    <span style={{ color: '#34d399' }}>{record.w}W</span>
                    <span style={{ color: 'rgba(255,255,255,0.4)' }}> – </span>
                    <span style={{ color: '#f87171' }}>{record.l}L</span>
                    {record.otl > 0 && (
                      <>
                        <span style={{ color: 'rgba(255,255,255,0.4)' }}> – </span>
                        <span style={{ color: '#FFB81C' }}>{record.otl}OTL</span>
                      </>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {last5.map((r) => (
                    <Link
                      key={r.id}
                      href={`/directory/games/${r.id}`}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.4rem 0.5rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px', textDecoration: 'none', color: 'inherit', fontSize: '0.8125rem' }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{
                          display: 'inline-block', width: '1.5rem', height: '1.5rem', lineHeight: '1.5rem',
                          textAlign: 'center', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700,
                          background: r.result === 'W' ? 'rgba(52,211,153,0.2)' : r.result === 'L' ? 'rgba(248,113,113,0.2)' : 'rgba(255,184,28,0.2)',
                          color: r.result === 'W' ? '#34d399' : r.result === 'L' ? '#f87171' : '#FFB81C',
                        }}>{r.result}</span>
                        <span style={{ color: 'rgba(255,255,255,0.7)' }}>{r.opponent}</span>
                      </span>
                      <span style={{ color: '#fff', fontWeight: 600 }}>{r.score}</span>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Head-to-head this season */}
      {m.h2h.length > 0 && (
        <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: '0.75rem' }}>Head-to-head this season</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {m.h2h.map((row) => (
              <Link key={row.id} href={`/directory/games/${row.id}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px', textDecoration: 'none', color: 'inherit', fontSize: '0.875rem' }}>
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>{formatDateShort(row.date)}</span>
                <span style={{ color: '#fff' }}>{row.away_team_name} @ {row.home_team_name}</span>
                <span style={{ color: '#fff', fontWeight: 700 }}>{row.away_score}–{row.home_score}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Each team's next game */}
      {(m.homeNext || m.awayNext) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
          {([
            { label: `${m.awayRenderName} next`, g: m.awayNext },
            { label: `${m.homeRenderName} next`, g: m.homeNext },
          ] as const).map((side) => {
            if (!side.g) return null;
            const ng = side.g;
            return (
              <Link
                key={ng.id}
                href={`/directory/games/${ng.id}`}
                style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1rem 1.25rem', textDecoration: 'none', color: 'inherit' }}
              >
                <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, margin: '0 0 0.5rem' }}>{side.label}</p>
                <p style={{ color: '#fff', fontSize: '0.9375rem', fontWeight: 700, margin: 0 }}>
                  {ng.away_team_name} @ {ng.home_team_name}
                </p>
                <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.8125rem', margin: '0.25rem 0 0' }}>
                  {formatGameTime(ng.scheduled_at, tz)}
                </p>
                {ng.league_name && (
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', margin: '0.25rem 0 0' }}>{ng.league_name}</p>
                )}
              </Link>
            );
          })}
        </div>
      )}

      {/* Same-day other games in this league */}
      {m.sameDay.length > 0 && game.league?.name && (
        <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: '0.75rem' }}>Other {game.league.name} games on this day</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {m.sameDay.map((sg) => (
              <Link key={sg.id} href={`/directory/games/${sg.id}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px', textDecoration: 'none', color: 'inherit', fontSize: '0.875rem' }}>
                <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.75rem' }}>{formatGameTime(sg.scheduled_at, tz)}</span>
                <span style={{ color: '#fff' }}>{sg.away_team_name} @ {sg.home_team_name}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* (No follow button on game pages — follow a team on the
          team page instead.) */}
    </div>
  );
}
