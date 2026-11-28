import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: () => ({}) } }));

import { PWHL_FRANCHISES } from '@/lib/pwhl-franchises';
import {
  PWHL_GAMES_PER_TEAM, PWHL_REGULAR_GAMES, computeStandings, etDateKey, formatEtTime, getPwhlSchedule, gamesForTeam,
  isFinal, isPlausibleSchedule, isTba, parseOfficialSchedule, snapshotSchedule, type PwhlGame,
} from '@/lib/pwhl-schedule';
import { buildPwhlIcs } from '@/lib/pwhl-calendar';

const snap = snapshotSchedule().games;
const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

describe('bundled official snapshot (thepwhl.com/en/schedule, retrieved 2026-11-28)', () => {
  const reg = snap.filter((g) => g.phase === 'regular');
  const pre = snap.filter((g) => g.phase === 'preseason');
  it('has 192 games: 12 preseason and 180 regular season', () => {
    expect(snap.length).toBe(192);
    expect(pre.length).toBe(12);
    expect(reg.length).toBe(PWHL_REGULAR_GAMES);
  });
  it('has unique ids and no team playing itself', () => {
    expect(new Set(snap.map((g) => g.id)).size).toBe(192);
    for (const g of snap) expect(g.home).not.toBe(g.away);
  });
  it('gives every franchise exactly 30 regular-season games', () => {
    for (const f of PWHL_FRANCHISES) expect(gamesForTeam(snap, f.slug, 'regular').length).toBe(PWHL_GAMES_PER_TEAM);
  });
  it('is a complete plausible schedule', () => {
    expect(isPlausibleSchedule(snap)).toBe(true);
  });
  it('runs from December 5, 2026 to April 18, 2027 (Eastern dates)', () => {
    const keys = reg.map((g) => etDateKey(g.utc)).sort();
    expect(keys[0]).toBe('2026-12-05');
    expect(keys[keys.length - 1]).toBe('2027-04-18');
  });
  it('preseason games fall on November 22-30, 2026', () => {
    for (const g of pre) {
      const k = etDateKey(g.utc);
      expect(k >= '2026-11-22' && k <= '2026-11-30').toBe(true);
    }
  });
  it('Eastern Time rendering equals the official time text for every timed game that states ET', () => {
    const timed = reg.filter((g) => / ET$/.test(g.status));
    expect(timed.length).toBeGreaterThan(150);
    for (const g of timed) expect(formatEtTime(g.utc)).toBe(g.status);
  });
  it('follows the displayed official time text for the two games where the official UTC value disagrees by an hour', () => {
    const raw = (JSON.parse(read('src/data/pwhl-2026-27-schedule.json')).games as PwhlGame[]);
    const changed = raw.filter((g) => snap.find((s) => s.id === g.id)!.utc !== g.utc).map((g) => g.id).sort();
    expect(changed).toEqual(['403', '520']);
    expect(snap.find((g) => g.id === '403')!.utc).toBe('2027-01-01T01:00:00Z');
    expect(snap.find((g) => g.id === '520')!.utc).toBe('2027-04-02T02:00:00Z');
  });
  it('marks exactly the 7 official TBA games', () => {
    expect(reg.filter(isTba).length).toBe(7);
  });
  it('carries scores only for finals, and 10 preseason finals', () => {
    for (const g of snap) expect(isFinal(g)).toBe(g.hs !== null && g.as !== null);
    expect(pre.filter(isFinal).length).toBe(10);
    expect(reg.filter(isFinal).length).toBe(0);
  });
  it('contains the three games whose official ids are not numeric', () => {
    expect(snap.filter((g) => !/^\d+$/.test(g.id)).length).toBe(3);
  });
});

function officialHtml(games: PwhlGame[], opts: { encode?: boolean } = {}): string {
  const NAMES = new Map(PWHL_FRANCHISES.map((f) => [f.slug, f.name.toUpperCase()]));
  const block = (title: string, sid: string, gs: PwhlGame[]) => '{"title":"' + title + '","season_id":"' + sid + '","games":' + JSON.stringify(gs.map((g) => ({
    title: g.away + ' @ ' + g.home, game_id: /^\d+$/.test(g.id) ? g.id : undefined, uid: g.id, date_played: g.utc, game_status: g.status,
    venue_name: g.venue, home_team: { home_team_name: NAMES.get(g.home), home_goal_count: g.hs === null ? null : String(g.hs) },
    visiting_team: { visiting_team_name: NAMES.get(g.away), visiting_goal_count: g.as === null ? null : String(g.as) },
  }))) + '}';
  const body = '{"schedule":[' + block('2026-2027 Preseason', '10', games.filter((g) => g.phase === 'preseason')) + ',' + block('Dec-Feb Schedule', '11', games.filter((g) => g.phase === 'regular')) + ']}';
  return '<html><body><script>' + (opts.encode === false ? body : body.replace(/"/g, '&quot;')) + '</script></body></html>';
}

describe('parsing the official page', () => {
  it('round-trips the full schedule, including non-numeric ids and scores', () => {
    const parsed = parseOfficialSchedule(officialHtml(snap));
    expect(parsed.length).toBe(192);
    expect(isPlausibleSchedule(parsed)).toBe(true);
    expect(parsed.filter(isFinal).length).toBe(10);
    expect(parsed.filter((g) => !/^\d+$/.test(g.id)).length).toBe(3);
  });
  it('also works when the data is not HTML-entity encoded', () => {
    expect(parseOfficialSchedule(officialHtml(snap, { encode: false })).length).toBe(192);
  });
  it('rejects a partial schedule as implausible', () => {
    expect(isPlausibleSchedule(parseOfficialSchedule(officialHtml(snap.slice(0, 100))))).toBe(false);
  });
  it('returns nothing for unrelated HTML', () => {
    expect(parseOfficialSchedule('<html>nothing here</html>')).toEqual([]);
  });
});

describe('getPwhlSchedule: live read with snapshot fallback', () => {
  afterEach(() => { vi.unstubAllGlobals(); });
  it('uses the live page when it yields a complete schedule', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(officialHtml(snap), { status: 200 })));
    const s = await getPwhlSchedule();
    expect(s.source).toBe('live');
    expect(s.games.length).toBe(192);
  });
  it('falls back to the snapshot when the request fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network'); }));
    const s = await getPwhlSchedule();
    expect(s.source).toBe('snapshot');
    expect(s.games.length).toBe(192);
  });
  it('falls back to the snapshot when the page is not a complete schedule', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(officialHtml(snap.slice(0, 50)), { status: 200 })));
    expect((await getPwhlSchedule()).source).toBe('snapshot');
  });
  it('falls back to the snapshot on an HTTP error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('x', { status: 503 })));
    expect((await getPwhlSchedule()).source).toBe('snapshot');
  });
});

describe('computeStandings', () => {
  const g = (id: string, home: string, away: string, hs: number, as: number): PwhlGame => ({ id, phase: 'regular', utc: '2026-12-05T20:00:00Z', home, away, venue: null, status: 'Final', hs, as });
  it('lists all 12 teams at zero before any regular-season game is final', () => {
    const rows = computeStandings(snap);
    expect(rows.length).toBe(12);
    for (const r of rows) expect([r.gp, r.w, r.l, r.gf, r.ga, r.diff]).toEqual([0, 0, 0, 0, 0, 0]);
  });
  it('counts only regular-season finals (preseason scores never count)', () => {
    const rows = computeStandings(snap.filter((x) => x.phase === 'preseason'));
    expect(rows.every((r) => r.gp === 0)).toBe(true);
  });
  it('computes record and goals and orders by wins then goal difference', () => {
    const rows = computeStandings([g('1', 'boston-fleet', 'new-york-sirens', 4, 1), g('2', 'toronto-sceptres', 'boston-fleet', 2, 3)]);
    const bos = rows.find((r) => r.slug === 'boston-fleet')!;
    expect([bos.gp, bos.w, bos.l, bos.gf, bos.ga, bos.diff]).toEqual([2, 2, 0, 7, 3, 4]);
    expect(rows[0].slug).toBe('boston-fleet');
    const nys = rows.find((r) => r.slug === 'new-york-sirens')!;
    expect([nys.w, nys.l, nys.diff]).toEqual([0, 1, -3]);
  });
  it('ignores games that are not final', () => {
    const scheduled: PwhlGame = { ...g('3', 'boston-fleet', 'new-york-sirens', 0, 0), status: '7:00 p.m. ET', hs: null, as: null };
    expect(computeStandings([scheduled]).every((r) => r.gp === 0)).toBe(true);
  });
});

describe('calendar feed', () => {
  const ics = buildPwhlIcs(snap, { name: 'PWHL 2026-27', now: new Date('2026-11-28T00:00:00Z') });
  it('is a well-formed iCalendar with CRLF line endings', () => {
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(ics).not.toMatch(/[^\r]\n/);
  });
  it('has one event per game with unique ids', () => {
    expect((ics.match(/BEGIN:VEVENT/g) || []).length).toBe(192);
    const uids = ics.match(/UID:[^\r]+/g) || [];
    expect(new Set(uids).size).toBe(192);
  });
  it('puts TBA games on their Eastern date as all-day events, never at an invented time', () => {
    expect((ics.match(/DTSTART;VALUE=DATE:\d{8}/g) || []).length).toBe(7);
  });
  it('timed games use UTC timestamps', () => {
    expect(ics).toContain('DTSTART:20261205T200000Z');
  });
  it('keeps every physical line within 75 octets', () => {
    for (const line of ics.split('\r\n')) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
  });
  it('escapes commas and semicolons in text', () => {
    const one = buildPwhlIcs([{ ...snap[0], venue: 'Arena, City; Place' }], { name: 'x' });
    expect(one).toContain('LOCATION:Arena\\, City\\; Place');
  });
});

describe('calendar endpoint', () => {
  afterEach(() => { vi.unstubAllGlobals(); });
  async function get(qs = '') {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    const { GET } = await import('@/app/api/pwhl/calendar/route');
    const { NextRequest } = await import('next/server');
    return GET(new NextRequest('http://localhost/api/pwhl/calendar' + qs));
  }
  it('serves the whole league as text/calendar', async () => {
    const res = await get();
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toMatch(/text\/calendar/);
    expect(((await res.text()).match(/BEGIN:VEVENT/g) || []).length).toBe(192);
  });
  it('serves one franchise (its preseason and 30 regular-season games)', async () => {
    const res = await get('?team=toronto-sceptres');
    const n = ((await res.text()).match(/BEGIN:VEVENT/g) || []).length;
    expect(n).toBe(gamesForTeam(snap, 'toronto-sceptres').length);
    expect(n).toBeGreaterThanOrEqual(30);
  });
  it('rejects an unknown team and does not accept an alias slug', async () => {
    expect((await get('?team=pwhl-detroit')).status).toBe(404);
    expect((await get('?team=nope')).status).toBe(404);
  });
});

describe('wiring', () => {
  it('the landing page renders the schedule section', () => {
    expect(read('src/app/directory/pwhl/page.tsx')).toContain('<PwhlSchedule />');
  });
  it('the team page renders the PWHL team section for the canonical slug', () => {
    expect(read('src/app/directory/teams/[slug]/page.tsx')).toContain('<PwhlTeamSection slug={team.slug} />');
  });
  it('the team section only appears for the 12 franchises', () => {
    expect(read('src/components/PwhlTeamSection.tsx')).toContain('if (!f) return null;');
  });
  it('the Toronto roster is labelled as a training-camp roster', () => {
    const roster = JSON.parse(read('src/data/pwhl-roster-toronto-camp-2026.json'));
    expect(roster.players.length).toBe(29);
    expect(roster.label).toMatch(/training camp roster/i);
    expect(roster.note).toMatch(/not the final or current/i);
    const c = (g: string) => roster.players.filter((p: any) => p.group === g).length;
    expect([c('Forwards'), c('Defenders'), c('Goaltenders')]).toEqual([15, 10, 4]);
  });
});
