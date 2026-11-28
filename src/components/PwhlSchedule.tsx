import {
  computeStandings, etDateKey, formatEtDate, formatEtTime, getPwhlSchedule, isFinal, isTba, teamName,
  PWHL_GAMES_PER_TEAM, PWHL_REGULAR_GAMES, type PwhlGame,
} from '@/lib/pwhl-schedule';

const box = { marginTop: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' } as const;
const h2 = { fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '0.75rem' } as const;
const muted = { color: 'rgba(255,255,255,0.65)', fontSize: '0.8125rem', lineHeight: 1.6 } as const;
const cell = { padding: '0.35rem 0.6rem', textAlign: 'right' as const, color: 'rgba(255,255,255,0.85)', fontSize: '0.875rem' };
const link = { color: '#FFB81C', textDecoration: 'none' } as const;

function Team({ slug }: { slug: string }) {
  return <a href={'/directory/teams/' + slug} style={link}>{teamName(slug)}</a>;
}

function when(g: PwhlGame): string {
  return formatEtDate(g.utc) + (isTba(g) ? ' · time TBA' : ' · ' + formatEtTime(g.utc));
}

function GameRow({ g }: { g: PwhlGame }) {
  return (
    <li style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem 1rem', padding: '0.4rem 0', borderBottom: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.85)', fontSize: '0.875rem' }}>
      <span style={{ minWidth: '12.5rem', color: 'rgba(255,255,255,0.6)' }}>{when(g)}</span>
      <span style={{ flex: 1, minWidth: '14rem' }}>
        <Team slug={g.away} /> at <Team slug={g.home} />
        {isFinal(g) ? <strong style={{ marginLeft: '0.6rem', color: '#fff' }}>{g.as}&ndash;{g.hs} Final</strong> : null}
      </span>
      {g.venue ? <span style={{ color: 'rgba(255,255,255,0.5)' }}>{g.venue}</span> : null}
    </li>
  );
}

export default async function PwhlSchedule() {
  const sched = await getPwhlSchedule();
  const regular = sched.games.filter((g) => g.phase === 'regular');
  const preseason = sched.games.filter((g) => g.phase === 'preseason');
  const played = regular.filter(isFinal).length;
  const standings = computeStandings(sched.games);
  const months = new Map<string, PwhlGame[]>();
  for (const g of regular) {
    const k = etDateKey(g.utc).slice(0, 7);
    months.set(k, [...(months.get(k) ?? []), g]);
  }
  const today = new Date().toISOString().slice(0, 10);
  const openKey = [...months.keys()].find((k) => (months.get(k) as PwhlGame[]).some((g) => etDateKey(g.utc) >= today)) ?? [...months.keys()][0];
  const monthLabel = (k: string) => new Date(k + '-15T12:00:00Z').toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  return (
    <>
      <section id="pwhl-standings" style={box}>
        <h2 style={h2}>2026&ndash;27 Standings</h2>
        <p style={{ ...muted, marginBottom: '1rem' }}>
          {played} of {PWHL_REGULAR_GAMES} regular-season games played. The regular season opens December 5, 2026 and runs through April 18, 2027; each team plays {PWHL_GAMES_PER_TEAM} games. Preseason games are not counted. The league does not publish overtime results in its schedule data, so this table shows record and goals, ordered by wins and then goal difference, not league points.
        </p>
        {(['Eastern', 'Western'] as const).map((conf) => (
          <div key={conf} style={{ marginBottom: '1rem', overflowX: 'auto' }}>
            <h3 style={{ color: '#fff', fontSize: '1rem', margin: '0 0 0.4rem' }}>{conf} Conference</h3>
            <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: '28rem' }}>
              <thead>
                <tr style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.75rem' }}>
                  <th style={{ ...cell, textAlign: 'left' }}>Team</th><th style={cell}>GP</th><th style={cell}>W</th><th style={cell}>L</th><th style={cell}>GF</th><th style={cell}>GA</th><th style={cell}>DIFF</th>
                </tr>
              </thead>
              <tbody>
                {standings.filter((r) => r.conference === conf).map((r) => (
                  <tr key={r.slug} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <td style={{ ...cell, textAlign: 'left' }}><Team slug={r.slug} /></td>
                    <td style={cell}>{r.gp}</td><td style={cell}>{r.w}</td><td style={cell}>{r.l}</td><td style={cell}>{r.gf}</td><td style={cell}>{r.ga}</td><td style={cell}>{r.diff > 0 ? '+' + r.diff : r.diff}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
        <p style={muted}>Season leaders appear once regular-season games have been played; the league data used here carries final scores only, not player statistics.</p>
      </section>

      <section id="pwhl-preseason" style={box}>
        <h2 style={h2}>2026 Preseason Results</h2>
        <p style={{ ...muted, marginBottom: '0.75rem' }}>Official preseason games, {preseason.length} in total, played November 22&ndash;30, 2026. They do not count in the standings.</p>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>{preseason.map((g) => <GameRow key={g.id} g={g} />)}</ul>
      </section>

      <section id="pwhl-schedule" style={box}>
        <h2 style={h2}>2026&ndash;27 Regular-Season Schedule</h2>
        <p style={{ ...muted, marginBottom: '0.75rem' }}>
          All {regular.length} games, times in Eastern Time (ET), as published by the league. Games marked TBA have no announced time.{' '}
          <a href="/api/pwhl/calendar" style={link}>Add the full schedule to your calendar</a>.
        </p>
        {[...months.entries()].map(([k, gs]) => (
          <details key={k} open={k === openKey} style={{ marginBottom: '0.5rem' }}>
            <summary style={{ cursor: 'pointer', color: '#fff', padding: '0.35rem 0' }}>{monthLabel(k)} ({gs.length} games)</summary>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>{gs.map((g) => <GameRow key={g.id} g={g} />)}</ul>
          </details>
        ))}
        <p style={{ ...muted, marginTop: '1rem' }}>
          Source: the league&apos;s official schedule at <a href="https://www.thepwhl.com/en/schedule" style={link}>thepwhl.com</a>
          {sched.source === 'live' ? ', read live and refreshed every ten minutes.' : ', bundled copy retrieved ' + sched.retrieved + ' (the live read was unavailable).'}
        </p>
      </section>
    </>
  );
}
