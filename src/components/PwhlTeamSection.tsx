import rosterData from '@/data/pwhl-roster-toronto-camp-2026.json';
import { PWHL_FRANCHISES } from '@/lib/pwhl-franchises';
import {
  computeStandings, formatEtDate, formatEtTime, getPwhlSchedule, gamesForTeam, isFinal, isTba, teamName, type PwhlGame,
} from '@/lib/pwhl-schedule';

const box = { maxWidth: '1280px', margin: '0 auto 1.5rem', padding: '0 1.5rem' } as const;
const card = { background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: 10, padding: '1.25rem 1.5rem' } as const;
const h2 = { fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', letterSpacing: '0.04em', color: '#fff', margin: '0 0 0.75rem' } as const;
const muted = { color: 'rgba(255,255,255,0.65)', fontSize: '0.8125rem', lineHeight: 1.6 } as const;
const link = { color: '#FFB81C', textDecoration: 'none' } as const;

function opp(g: PwhlGame, slug: string): string {
  return g.home === slug ? 'vs ' + teamName(g.away) : 'at ' + teamName(g.home);
}
function line(g: PwhlGame, slug: string): string {
  const base = formatEtDate(g.utc) + (isTba(g) ? ' (time TBA)' : ' ' + formatEtTime(g.utc)) + ' · ' + opp(g, slug);
  if (!isFinal(g)) return base;
  const mine = g.home === slug ? g.hs : g.as;
  const theirs = g.home === slug ? g.as : g.hs;
  return base + ' · ' + ((mine as number) > (theirs as number) ? 'W ' : 'L ') + mine + '\u2013' + theirs;
}

/** Official 2026-27 schedule, results and standing for one of the 12 franchises (canonical slug only). */
export default async function PwhlTeamSection({ slug }: { slug: string }) {
  const f = PWHL_FRANCHISES.find((x) => x.slug === slug);
  if (!f) return null;
  const sched = await getPwhlSchedule();
  const pre = gamesForTeam(sched.games, slug, 'preseason');
  const reg = gamesForTeam(sched.games, slug, 'regular');
  const upcoming = reg.filter((g) => !isFinal(g));
  const standing = computeStandings(sched.games).find((r) => r.slug === slug);
  const roster = slug === rosterData.team ? rosterData : null;
  return (
    <section aria-label={f.name + ' 2026-27 schedule and results'} style={box}>
      <div style={card}>
        <h2 style={h2}>{f.name} &mdash; 2026&ndash;27 Schedule &amp; Results</h2>
        <p style={{ ...muted, marginBottom: '0.75rem' }}>
          {f.conference} Conference. Regular season: {reg.length} games, December 5, 2026 to April 18, 2027. Times in Eastern Time (ET).{' '}
          {standing ? 'Record: ' + standing.w + '-' + standing.l + ' in ' + standing.gp + ' games played.' : null}{' '}
          <a href={'https://www.thepwhl.com/en/teams/' + slug} style={link}>Official team page</a> &middot;{' '}
          <a href={'/api/pwhl/calendar?team=' + slug} style={link}>Add to calendar</a> &middot;{' '}
          <a href="/directory/pwhl#pwhl-standings" style={link}>League standings</a>
        </p>
        <h3 style={{ color: '#fff', fontSize: '1rem', margin: '0.75rem 0 0.35rem' }}>Preseason results</h3>
        <ul style={{ margin: 0, paddingLeft: '1.1rem', color: 'rgba(255,255,255,0.85)', fontSize: '0.875rem', lineHeight: 1.8 }}>
          {pre.map((g) => <li key={g.id}>{line(g, slug)}</li>)}
        </ul>
        <h3 style={{ color: '#fff', fontSize: '1rem', margin: '1rem 0 0.35rem' }}>Upcoming regular-season games</h3>
        <ul style={{ margin: 0, paddingLeft: '1.1rem', color: 'rgba(255,255,255,0.85)', fontSize: '0.875rem', lineHeight: 1.8 }}>
          {upcoming.slice(0, 5).map((g) => <li key={g.id}>{line(g, slug)}</li>)}
        </ul>
        <details style={{ marginTop: '0.6rem' }}>
          <summary style={{ cursor: 'pointer', color: '#fff' }}>Full {reg.length}-game regular-season schedule</summary>
          <ol style={{ margin: '0.4rem 0 0', paddingLeft: '1.5rem', color: 'rgba(255,255,255,0.85)', fontSize: '0.875rem', lineHeight: 1.8 }}>
            {reg.map((g) => <li key={g.id}>{line(g, slug)}</li>)}
          </ol>
        </details>
        {roster ? (
          <div style={{ marginTop: '1rem' }}>
            <h3 style={{ color: '#fff', fontSize: '1rem', margin: '0 0 0.35rem' }}>{roster.label}</h3>
            <p style={muted}>{roster.note} Source: <a href={roster.source} style={link}>thepwhl.com</a>. Each team carries 24 active roster spots.</p>
            {['Forwards', 'Defenders', 'Goaltenders'].map((grp) => (
              <p key={grp} style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.875rem', margin: '0.4rem 0' }}>
                <strong>{grp} ({roster.players.filter((p) => p.group === grp).length}):</strong>{' '}
                {roster.players.filter((p) => p.group === grp).map((p) => p.name).join(', ')}
              </p>
            ))}
          </div>
        ) : null}
        <p style={{ ...muted, marginTop: '0.75rem' }}>
          Schedule and scores: the league&apos;s official schedule at <a href="https://www.thepwhl.com/en/schedule" style={link}>thepwhl.com</a>
          {sched.source === 'live' ? ', read live.' : ', bundled copy retrieved ' + sched.retrieved + '.'}
        </p>
      </div>
    </section>
  );
}
