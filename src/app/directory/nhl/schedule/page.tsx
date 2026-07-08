import type { Metadata } from 'next';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import { NhlMatch, buildGameSlug, slugify } from '@/lib/nhl-data';
import TicketmasterAd from '@/components/TicketmasterAd';

export const metadata: Metadata = {
  title: 'NHL Schedule | Games by Date',
  description: 'NHL schedule and scores. Every game by date, with live scores, final scores, and box score links.',
};

export const revalidate = 300; // 5 min

interface DayGroup {
  dateKey: string;       // YYYY-MM-DD
  dateObj: Date;
  games: NhlMatch[];
}

async function getGamesForDateRange(fromIso: string, toIso: string): Promise<NhlMatch[]> {
  let all: NhlMatch[] = [];
  let from = 0;
  const batch = 1000;
  while (true) {
    const { data, error } = await supabaseAdmin
      .from('nhl_matches')
      .select('*')
      .gte('date', fromIso)
      .lt('date', toIso)
      .order('date', { ascending: true })
      .range(from, from + batch - 1);
    if (error) {
      console.error('[nhl-schedule] error:', error.message);
      return all;
    }
    if (!data || data.length === 0) break;
    all = all.concat(data as NhlMatch[]);
    if (data.length < batch) break;
    from += batch;
  }
  return all;
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function fmtDateLong(d: Date): string {
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function GameRow({ game }: { game: NhlMatch }) {
  const isFinished = game.status.startsWith('Finished');
  const isHomeWinner = isFinished && (game.home_score ?? 0) > (game.away_score ?? 0);
  const isAwayWinner = isFinished && (game.away_score ?? 0) > (game.home_score ?? 0);
  const isLive = game.status === 'In progress' || game.status === 'InProgress';
  const sl = isFinished
    ? { label: 'Final', color: 'rgba(255,255,255,0.35)' }
    : isLive
    ? { label: 'LIVE', color: '#00d4ff' }
    : { label: fmtTime(game.date), color: 'rgba(0,212,255,0.7)' };

  return (
    <Link href={`/directory/nhl/games/${buildGameSlug(game)}`} style={{ textDecoration: 'none' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 100px 1fr 60px',
        gap: '0.5rem',
        alignItems: 'center',
        padding: '0.6rem 0.75rem',
        background: 'var(--s2)',
        border: '1px solid var(--border)',
        borderRadius: '6px',
        marginBottom: '0.4rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'flex-end' }}>
          {game.away_team_logo && <img src={game.away_team_logo} alt={`${game.away_team_name} logo`} style={{ width: 24, height: 24, objectFit: 'contain' }} />}
          <span style={{ color: isAwayWinner ? '#34d399' : '#fff', fontSize: '0.8125rem', fontWeight: isAwayWinner ? 700 : 500 }}>
            {game.away_team_name}
          </span>
        </div>
        <div style={{ textAlign: 'center' }}>
          {isFinished ? (
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', fontWeight: 600 }}>
              {game.away_score}–{game.home_score}
            </span>
          ) : isLive ? (
            <span style={{ color: '#00d4ff', fontSize: '0.75rem', fontWeight: 700 }}>
              {game.away_score ?? 0}–{game.home_score ?? 0} <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem' }}>{game.clock ? `· ${game.clock}` : ''}</span>
            </span>
          ) : (
            <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem' }}>vs</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {game.home_team_logo && <img src={game.home_team_logo} alt={`${game.home_team_name} logo`} style={{ width: 24, height: 24, objectFit: 'contain' }} />}
          <span style={{ color: isHomeWinner ? '#34d399' : '#fff', fontSize: '0.8125rem', fontWeight: isHomeWinner ? 700 : 500 }}>
            {game.home_team_name}
          </span>
        </div>
        <div style={{ color: sl.color, fontSize: '0.7rem', textAlign: 'right', fontWeight: 600 }}>
          {sl.label}
        </div>
      </div>
    </Link>
  );
}

export default async function SchedulePage({ searchParams }: { searchParams: Promise<{ date?: string; range?: string }> }) {
  const sp = await searchParams;
  // Default to today
  const requestedDate = sp.date || new Date().toISOString().slice(0, 10);
  const range = sp.range || '3days'; // 3days, week, yesterday/today/tomorrow

  let fromDate: Date;
  let toDate: Date;
  if (range === 'week') {
    fromDate = new Date(requestedDate);
    toDate = new Date(requestedDate);
    toDate.setDate(toDate.getDate() + 7);
  } else if (range === 'yesterday') {
    fromDate = new Date(requestedDate);
    fromDate.setDate(fromDate.getDate() - 1);
    toDate = new Date(requestedDate);
  } else if (range === 'tomorrow') {
    fromDate = new Date(requestedDate);
    toDate = new Date(requestedDate);
    toDate.setDate(toDate.getDate() + 1);
  } else {
    // 3days default
    fromDate = new Date(requestedDate);
    fromDate.setDate(fromDate.getDate() - 1);
    toDate = new Date(requestedDate);
    toDate.setDate(toDate.getDate() + 2);
  }

  const games = await getGamesForDateRange(fromDate.toISOString(), toDate.toISOString());

  // Group by date
  const groups: DayGroup[] = [];
  for (const g of games) {
    const d = new Date(g.date);
    const key = d.toISOString().slice(0, 10);
    let grp = groups.find(x => x.dateKey === key);
    if (!grp) {
      grp = { dateKey: key, dateObj: d, games: [] };
      groups.push(grp);
    }
    grp.games.push(g);
  }

  const totalGames = games.length;
  const liveCount = games.filter(g => g.status === 'In progress' || g.status === 'InProgress').length;
  const finishedCount = games.filter(g => g.status.startsWith('Finished')).length;
  const scheduledCount = games.filter(g => g.status === 'Scheduled' || g.status === 'Not started').length;

  // Date nav
  const prevDate = new Date(fromDate); prevDate.setDate(prevDate.getDate() - (range === 'week' ? 7 : 1));
  const nextDate = new Date(toDate); nextDate.setDate(nextDate.getDate() - 1);

  return (
    <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>
      <nav style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '1rem' }}>
        <Link href="/" style={{ color: 'rgba(255,255,255,0.5)' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/directory/nhl" style={{ color: 'rgba(255,255,255,0.5)' }}>NHL</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: 'rgba(255,255,255,0.7)' }}>Schedule</span>
      </nav>

      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
        <h1 className="font-sport" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1, margin: 0 }}>
          NHL SCHEDULE
        </h1>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <Link href={`/directory/nhl/schedule?date=${prevDate.toISOString().slice(0,10)}&range=${range}`} style={{
            padding: '0.3rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem',
            textDecoration: 'none', color: 'rgba(255,255,255,0.5)',
            background: 'var(--s2)', border: '1px solid var(--border)',
          }}>← Previous</Link>
          <Link href={`/directory/nhl/schedule?date=${new Date().toISOString().slice(0,10)}&range=${range}`} style={{
            padding: '0.3rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600,
            textDecoration: 'none', color: '#fff', background: 'var(--s2)', border: '1px solid var(--border)',
          }}>Today</Link>
          <Link href={`/directory/nhl/schedule?date=${nextDate.toISOString().slice(0,10)}&range=${range}`} style={{
            padding: '0.3rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem',
            textDecoration: 'none', color: 'rgba(255,255,255,0.5)',
            background: 'var(--s2)', border: '1px solid var(--border)',
          }}>Next →</Link>
          <span style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 0.4rem' }} />
          {[
            { value: 'yesterday', label: 'Yesterday' },
            { value: '3days', label: '3 Days' },
            { value: 'week', label: 'Week' },
            { value: 'tomorrow', label: 'Tomorrow' },
          ].map(r => (
            <Link key={r.value} href={`/directory/nhl/schedule?date=${requestedDate}&range=${r.value}`} style={{
              padding: '0.3rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600,
              textDecoration: 'none',
              color: r.value === range ? '#fff' : 'rgba(255,255,255,0.5)',
              background: r.value === range ? 'var(--s2)' : 'transparent',
              border: '1px solid var(--border)',
            }}>{r.label}</Link>
          ))}
        </div>
      </div>

      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
        {fmtDateLong(fromDate)} – {fmtDateLong(new Date(toDate.getTime() - 86400000))} · {totalGames} games ({liveCount} live, {finishedCount} final, {scheduledCount} upcoming)
      </p>

      <TicketmasterAd size="468x60" style={{ marginBottom: '1.5rem' }} />

      {groups.length === 0 ? (
        <p style={{ color: 'rgba(255,255,255,0.4)' }}>No games scheduled in this date range.</p>
      ) : (
        groups.map(grp => (
          <div key={grp.dateKey} style={{ marginBottom: '1.5rem' }}>
            <h2 className="font-sport" style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.08em', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
              {fmtDateLong(grp.dateObj)}
            </h2>
            {grp.games.map(g => <GameRow key={g.id} game={g} />)}
          </div>
        ))
      )}
    </main>
  );
}
