/**
 * Official PWHL schedule, results and standings data.
 *
 * Source of truth: the public schedule page of the league, https://www.thepwhl.com/en/schedule,
 * which embeds the full game list as structured data (192 games for 2026-27: 12 preseason and
 * 180 regular-season). The page is fetched on the server and cached for 10 minutes. If the fetch
 * fails, or the result is not a plausible full schedule, the bundled snapshot (retrieved
 * 2026-11-28) is used, and the page says which one it is showing.
 *
 * Facts about the data (verified against the page, not assumed):
 *  - Times: date_played is UTC; the league publishes Eastern Time. RinkStop shows Eastern Time.
 *  - Finals expose goals and the text "Final" only. There is no overtime or shootout marker,
 *    so official standings points cannot be derived. Standings show GP, W, L, GF, GA and DIFF.
 *  - Games whose status is "TBA" have a placeholder time: show the date only.
 */
import snapshot from '@/data/pwhl-2026-27-schedule.json';
import { PWHL_FRANCHISES } from '@/lib/pwhl-franchises';

export type PwhlGame = {
  id: string;
  phase: 'preseason' | 'regular';
  utc: string;
  home: string;
  away: string;
  venue: string | null;
  status: string;
  hs: number | null;
  as: number | null;
};

export type PwhlSchedule = { games: PwhlGame[]; source: 'live' | 'snapshot'; retrieved: string };

export const PWHL_SCHEDULE_URL = 'https://www.thepwhl.com/en/schedule';
export const PWHL_REGULAR_GAMES = 180;
export const PWHL_GAMES_PER_TEAM = 30;
const ET = 'America/New_York';

function fold(s: string): string {
  return s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]/g, '');
}
const NAME_TO_SLUG = new Map<string, string>(PWHL_FRANCHISES.map((f) => [fold(f.name), f.slug]));

export function teamName(slug: string): string {
  return PWHL_FRANCHISES.find((f) => f.slug === slug)?.name ?? slug;
}

export function isFinal(g: PwhlGame): boolean {
  return g.status === 'Final' && typeof g.hs === 'number' && typeof g.as === 'number';
}
export function isTba(g: PwhlGame): boolean {
  return /^tba$/i.test(g.status.trim());
}

export function etDateKey(utc: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ET, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(utc));
}
export function formatEtDate(utc: string): string {
  return new Intl.DateTimeFormat('en-US', { timeZone: ET, weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(utc));
}
/** "3:00 p.m. ET", the league's own format. */
export function formatEtTime(utc: string): string {
  const s = new Intl.DateTimeFormat('en-US', { timeZone: ET, hour: 'numeric', minute: '2-digit', hour12: true })
    .format(new Date(utc))
    .replace(/\s/g, ' ');
  return s.replace(' AM', ' a.m.').replace(' PM', ' p.m.') + ' ET';
}

const TEXT_TIME = /^(\d{1,2}):(\d{2}) (a|p)\.m\. ET$/;

/**
 * The league's page carries two times per game: date_played (UTC) and the displayed status text
 * (for example "8:00 p.m. ET"). For 169 of 171 timed games they agree. For two (official ids 403 and
 * 520, checked 2026-11-28) they differ by one hour. The text is what the league shows the public, and
 * it is plausible in both cases (8 p.m. ET is 7 p.m. in Minnesota, 10 p.m. ET is 7 p.m. in Vancouver),
 * so the displayed text wins and the instant is recomputed from it. All other games are untouched.
 */
export function reconcileTime(g: PwhlGame): PwhlGame {
  const m = g.status.match(TEXT_TIME);
  if (!m || formatEtTime(g.utc) === g.status) return g;
  const key = etDateKey(g.utc);
  const [y, mo, d] = key.split('-').map(Number);
  const h = (Number(m[1]) % 12) + (m[3] === 'p' ? 12 : 0);
  const min = Number(m[2]);
  for (const off of [5, 4]) {
    const cand = new Date(Date.UTC(y, mo - 1, d, h + off, min)).toISOString();
    if (etDateKey(cand) === key && formatEtTime(cand) === g.status) return { ...g, utc: cand.replace('.000Z', 'Z') };
  }
  return g;
}

export function snapshotSchedule(): PwhlSchedule {
  const s = snapshot as unknown as { games: PwhlGame[]; retrieved: string };
  return { games: s.games.map(reconcileTime), source: 'snapshot', retrieved: s.retrieved };
}

function extractArray(s: string, from: number): string | null {
  const start = s.indexOf('[', from);
  if (start < 0) return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
    } else if (c === '"') inStr = true;
    else if (c === '[') depth++;
    else if (c === ']') {
      depth--;
      if (depth === 0) return s.slice(start, i + 1);
    }
  }
  return null;
}

/** Parse the game arrays embedded in the official schedule page HTML. */
export function parseOfficialSchedule(html: string): PwhlGame[] {
  const h = html.replace(/&quot;/g, '"');
  const out = new Map<string, PwhlGame>();
  const re = /"games":\[\{"title"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(h))) {
    const arr = extractArray(h, m.index);
    if (!arr) continue;
    let list: any[];
    try {
      list = JSON.parse(arr);
    } catch {
      continue;
    }
    const pre = h.slice(Math.max(0, m.index - 400), m.index);
    const sids = pre.match(/"season_id":"(\d+)"/g);
    const sid = sids ? (sids[sids.length - 1].match(/(\d+)/) as RegExpMatchArray)[1] : null;
    const phase = sid === '10' ? 'preseason' : sid === '11' ? 'regular' : null;
    if (!phase) continue;
    for (const x of list) {
      if (!x || typeof x !== 'object') continue;
      const id = String(x.game_id ?? x.uid ?? '');
      const home = NAME_TO_SLUG.get(fold(String(x.home_team?.home_team_name ?? '')));
      const away = NAME_TO_SLUG.get(fold(String(x.visiting_team?.visiting_team_name ?? '')));
      if (!id || !x.date_played || !home || !away) continue;
      const status = String(x.game_status ?? '');
      const hs = Number.parseInt(String(x.home_team?.home_goal_count ?? ''), 10);
      const as = Number.parseInt(String(x.visiting_team?.visiting_goal_count ?? ''), 10);
      const final = status === 'Final' && Number.isFinite(hs) && Number.isFinite(as);
      out.set(id, {
        id, phase, utc: String(x.date_played), home, away,
        venue: x.venue_name ? String(x.venue_name) : null,
        status, hs: final ? hs : null, as: final ? as : null,
      });
    }
  }
  return [...out.values()].map(reconcileTime).sort((a, b) => (a.utc < b.utc ? -1 : a.utc > b.utc ? 1 : a.id < b.id ? -1 : 1));
}

/** A complete 2026-27 schedule: 180 regular games, exactly 30 per franchise. */
export function isPlausibleSchedule(games: PwhlGame[]): boolean {
  const reg = games.filter((g) => g.phase === 'regular');
  if (reg.length !== PWHL_REGULAR_GAMES) return false;
  const per = new Map<string, number>();
  for (const g of reg) {
    if (g.home === g.away) return false;
    per.set(g.home, (per.get(g.home) ?? 0) + 1);
    per.set(g.away, (per.get(g.away) ?? 0) + 1);
  }
  return PWHL_FRANCHISES.every((f) => per.get(f.slug) === PWHL_GAMES_PER_TEAM);
}

export async function getPwhlSchedule(): Promise<PwhlSchedule> {
  try {
    const res = await fetch(PWHL_SCHEDULE_URL, {
      headers: { 'user-agent': 'RinkStop/1.0 (+https://rinkstop.com)' },
      signal: AbortSignal.timeout(6000),
      next: { revalidate: 600 },
    } as RequestInit);
    if (res.ok) {
      const games = parseOfficialSchedule(await res.text());
      if (isPlausibleSchedule(games)) return { games, source: 'live', retrieved: new Date().toISOString().slice(0, 10) };
    }
  } catch {
    // fall through to the bundled snapshot
  }
  return snapshotSchedule();
}

export function gamesForTeam(games: PwhlGame[], slug: string, phase?: 'preseason' | 'regular'): PwhlGame[] {
  return games.filter((g) => (g.home === slug || g.away === slug) && (!phase || g.phase === phase));
}

export type StandingRow = { slug: string; name: string; conference: 'Eastern' | 'Western'; gp: number; w: number; l: number; gf: number; ga: number; diff: number };

/** Regular-season record from finals only. No points: overtime detail is not published. */
export function computeStandings(games: PwhlGame[]): StandingRow[] {
  const rows = new Map<string, StandingRow>(
    PWHL_FRANCHISES.map((f) => [f.slug, { slug: f.slug, name: f.name, conference: f.conference, gp: 0, w: 0, l: 0, gf: 0, ga: 0, diff: 0 }]),
  );
  for (const g of games) {
    if (g.phase !== 'regular' || !isFinal(g)) continue;
    const h = rows.get(g.home);
    const a = rows.get(g.away);
    if (!h || !a) continue;
    h.gp++; a.gp++;
    h.gf += g.hs as number; h.ga += g.as as number;
    a.gf += g.as as number; a.ga += g.hs as number;
    if ((g.hs as number) > (g.as as number)) { h.w++; a.l++; } else { a.w++; h.l++; }
  }
  for (const r of rows.values()) r.diff = r.gf - r.ga;
  return [...rows.values()].sort((x, y) => y.w - x.w || y.diff - x.diff || (x.name < y.name ? -1 : 1));
}
