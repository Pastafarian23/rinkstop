/**
 * /nhl/preseason/[season] — RinkStop master preseason schedule page.
 *
 * Source of truth: rinkstop-platform/data/nhl-preseason-2026-27.json
 * (which is also preserved in workspace data/ for cross-session reference).
 *
 * Why this exists (2026-09-14, Arnel-flagged):
 *   "We lost all of the previous game data and scheduling. So we must get back
 *    to proper schedule." Arnel's directive was to make the dataset a reusable
 *    RinkStop asset, not a one-off article. The JSON file is the canonical
 *    source; this page renders it as a permanent, season-archiveable asset
 *    such that /nhl/preseason/2024-25, 2025-26, 2026-27, etc. can all be
 *    powered by the same component.
 *
 * SEO strategy per Arnel's directive:
 *   - The data page is the CANONICAL asset; the article (separate) ages,
 *     but this page can be maintained indefinitely.
 *   - Internal linking: every game links to team page → arena page → city
 *     page → state/province directory page (the RinkStop advantage).
 *   - Phase 5 (schema): each game eventually a SportsEvent; the page emits
 *     an ItemList now and per-game SportsEvent once we add per-game routes.
 *
 * Phase scope (verified 2026-09-14):
 *   65 games across 8 days (Sept 19-26, 2026), 36 venues, 4 neutral-site
 *   games including the Kraft Hockeyville game (MTL@OTT at Trois-Rivières).
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import fs from 'node:fs';
import path from 'node:path';
import { NHL_TEAMS_CANONICAL } from '@/lib/nhl-teams-canonical';
import {
  formatGameTime,
  formatGameHour,
  disclaimerText,
  tzAbbr,
  tzFullName,
} from '@/lib/game-time';

// ---------- Types ----------

interface PreseasonGame {
  game_id: string;
  season: string;
  competition: string;
  date: string;
  day: string;
  start_time_et: string;
  away_team: string;
  home_team: string;
  split_squad: boolean;
  venue: string;
  city: string;
  state_or_province: string;
  country: string;
  venue_type: 'NHL Home' | 'Neutral Site';
  is_neutral_site: boolean;
  special_event: string;
  notes: string;
}

interface PreseasonDataset {
  competition: string;
  season: string;
  season_slug: string;
  starts_at: string;
  ends_at: string;
  duration_days: number;
  games_total: number;
  teams_total: number;
  venues_total: number;
  neutral_site_games: number;
  timezone: string;
  publication_source: string;
  publication_date: string;
  verified_by: string;
  verified_at: string;
  notes: string;
  games: PreseasonGame[];
}

// ---------- Static param generation ----------

// All seasons we have data for, plus future season placeholders.
// Each is a separate JSON file at data/nhl-preseason-<season>.json.
export async function generateStaticParams() {
  const dataDir = path.join(process.cwd(), 'data');
  const out: { season: string }[] = [];
  if (fs.existsSync(dataDir)) {
    for (const f of fs.readdirSync(dataDir)) {
      const m = f.match(/^nhl-preseason-(.+)\.json$/);
      if (m) out.push({ season: m[1] });
    }
  }
  if (out.length === 0) out.push({ season: '2026-27' });
  return out;
}

// ---------- Data loader ----------

async function loadSeason(seasonSlug: string): Promise<PreseasonDataset | null> {
  const filePath = path.join(process.cwd(), 'data', `nhl-preseason-${seasonSlug}.json`);
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw) as PreseasonDataset;
}

// ---------- Metadata ----------

export async function generateMetadata({ params }: { params: Promise<{ season: string }> }): Promise<Metadata> {
  const { season } = await params;
  const ds = await loadSeason(season);
  if (!ds) {
    return {
      title: `NHL Preseason ${season} Schedule | RinkStop`,
      description: 'NHL preseason schedule data not available for this season yet.',
      robots: { index: false, follow: true },
    };
  }
  const canonical = `https://rinkstop.com/nhl/preseason/${ds.season_slug}`;
  return {
    title: `${ds.competition} ${ds.season} Schedule: All ${ds.games_total} Games, Dates & Locations | RinkStop`,
    description: `${ds.competition} ${ds.season}: ${ds.games_total} exhibition games across ${ds.venues_total} NHL and neutral-site arenas from ${ds.starts_at} through ${ds.ends_at} (${ds.duration_days} days). Filter by date, team, city, country, or venue type. Includes every game time (Eastern) plus links to teams, arenas, and host cities.`,
    alternates: { canonical },
    robots: { index: true, follow: true },
    openGraph: {
      title: `${ds.competition} ${ds.season} — ${ds.games_total} games, ${ds.duration_days} days, ${ds.venues_total} arenas`,
      description: `The complete ${ds.competition} ${ds.season} schedule across North America. ${ds.starts_at} through ${ds.ends_at}.`,
      url: canonical,
      type: 'website',
      siteName: 'RinkStop',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${ds.competition} ${ds.season} Schedule`,
      description: `Every ${ds.competition.toLowerCase()} game for ${ds.season}, with arenas, cities, and start times.`,
    },
  };
}

// ---------- Helpers ----------

// Reverse-lookup a team's RinkStop slug from the canonical team data.
const TEAM_SLUG_BY_NAME: Record<string, string> = (() => {
  const out: Record<string, string> = {};
  for (const t of NHL_TEAMS_CANONICAL) {
    out[t.name] = t.slug;
    out[t.shortName] = t.slug;
    if (t.city) out[t.city] = t.slug;
  }
  return out;
})();

function teamSlug(name: string): string | null {
  return TEAM_SLUG_BY_NAME[name] ?? null;
}

// Slugify a venue for the rink page URL. RinkStop uses /directory/rinks/<slug>.
function venueSlug(venue: string, city: string): string {
  const base = `${venue}-${city}`.toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return base;
}

const DAY_ORDER: Record<string, number> = {
  Saturday: 0, Sunday: 1, Monday: 2, Tuesday: 3, Wednesday: 4, Thursday: 5, Friday: 6,
};

function dayName(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  });
}

// Try to match venue to a RinkStop rink page; if no rink page (neutral-site arenas
// typically absent), skip the link.
function tryRinkPage(venue: string, city: string): string {
  return `/directory/rinks/${venueSlug(venue, city)}`;
}

const COUNTRY_STATE_ABBR_TO_SLUG: Record<string, string> = {
  // US states
  'AL': 'alabama', 'AK': 'alaska', 'AZ': 'arizona', 'AR': 'arkansas',
  'CA': 'california', 'CO': 'colorado', 'CT': 'connecticut', 'DE': 'delaware',
  'FL': 'florida', 'GA': 'georgia', 'HI': 'hawaii', 'ID': 'idaho',
  'IL': 'illinois', 'IN': 'indiana', 'IA': 'iowa', 'KS': 'kansas',
  'KY': 'kentucky', 'LA': 'louisiana', 'ME': 'maine', 'MD': 'maryland',
  'MA': 'massachusetts', 'MI': 'michigan', 'MN': 'minnesota', 'MS': 'mississippi',
  'MO': 'missouri', 'MT': 'montana', 'NE': 'nebraska', 'NV': 'nevada',
  'NH': 'new-hampshire', 'NJ': 'new-jersey', 'NM': 'new-mexico', 'NY': 'new-york',
  'NC': 'north-carolina', 'ND': 'north-dakota', 'OH': 'ohio', 'OK': 'oklahoma',
  'OR': 'oregon', 'PA': 'pennsylvania', 'RI': 'rhode-island', 'SC': 'south-carolina',
  'SD': 'south-dakota', 'TN': 'tennessee', 'TX': 'texas', 'UT': 'utah',
  'VT': 'vermont', 'VA': 'virginia', 'WA': 'washington', 'WV': 'west-virginia',
  'WI': 'wisconsin', 'WY': 'wyoming', 'DC': 'district-of-columbia',
  // Canadian provinces
  'ON': 'ontario', 'QC': 'quebec', 'BC': 'british-columbia', 'AB': 'alberta',
  'MB': 'manitoba', 'SK': 'saskatchewan', 'NS': 'nova-scotia',
  'NB': 'new-brunswick', 'PE': 'prince-edward-island', 'NL': 'newfoundland-and-labrador',
  'NT': 'northwest-territories', 'YT': 'yukon', 'NU': 'nunavut',
};

function stateProvinceSlug(abbrev: string): string | null {
  return COUNTRY_STATE_ABBR_TO_SLUG[abbrev] ?? null;
}

function citySlug(city: string): string {
  return city.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function isUSorCA(country: string): boolean {
  return country === 'USA' || country === 'Canada';
}

// ---------- Components ----------

function TimezoneDisclosure() {
  // The dataset’s start_time_et field is in Eastern Time, published by the
  // NHL. We surface that fact explicitly so a reader in Calgary or Helsinki
  // doesn’t convert in their head and miss a game start.
  return (
    <aside
      aria-label="Timezone disclosure"
      role="note"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.5rem',
        padding: '0.625rem 0.875rem',
        marginBottom: '1.5rem',
        background: 'rgba(56,189,248,0.06)',
        border: '1px solid rgba(56,189,248,0.3)',
        borderRadius: '6px',
        fontSize: '0.75rem',
        color: 'rgba(255,255,255,0.78)',
        lineHeight: 1.45,
      }}
    >
      <span aria-hidden="true" style={{ fontSize: '0.875rem', lineHeight: '1rem' }}>🕒</span>
      <span>
        <strong style={{ color: '#7DD3FC' }}>Times listed in {tzAbbr('America/New_York')} ({tzFullName(tzAbbr('America/New_York'))}).</strong>{' '}
        The NHL publishes all preseason and regular-season start times in
        {' '}{tzAbbr('America/New_York')} (Eastern Time) regardless of the
        venue’s location. For venues in other time zones, the local start
        time is shown alongside the ET on the affected games. Game times are
        local to each venue at start; verify with your team before traveling.
      </span>
    </aside>
  );
}

function QuickFacts({ ds }: { ds: PreseasonDataset }) {
  const facts: { label: string; value: string }[] = [
    { label: 'Total Games', value: String(ds.games_total) },
    { label: 'Teams', value: String(ds.teams_total) },
    { label: 'Window', value: `${ds.starts_at} to ${ds.ends_at}` },
    { label: 'Days', value: String(ds.duration_days) },
    { label: 'Venues', value: String(ds.venues_total) },
    { label: 'Neutral-Site Games', value: String(ds.neutral_site_games) },
  ];
  return (
    <section
      aria-label="Schedule at a glance"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '0.5rem',
        background: 'var(--s2)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        padding: '1rem',
        marginBottom: '1.5rem',
      }}
    >
      {facts.map(f => (
        <div key={f.label} style={{ textAlign: 'center', padding: '0.5rem' }}>
          <div className="font-sport" style={{ fontSize: '1.5rem', color: '#fff', letterSpacing: '0.02em', lineHeight: 1 }}>
            {f.value}
          </div>
          <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '0.25rem' }}>
            {f.label}
          </div>
        </div>
      ))}
    </section>
  );
}

function GameRow({ g }: { g: PreseasonGame }) {
  const awaySlug = teamSlug(g.away_team);
  const homeSlug = teamSlug(g.home_team);
  const stateSlug = stateProvinceSlug(g.state_or_province);
  const team1 = awaySlug ? (
    <Link href={`/directory/teams/${awaySlug}`} style={{ color: '#fff', textDecoration: 'none', fontWeight: 600, fontSize: '0.875rem' }}>
      {g.away_team}
    </Link>
  ) : (
    <span style={{ color: '#fff', fontWeight: 600, fontSize: '0.875rem' }}>{g.away_team}</span>
  );
  const team2 = homeSlug ? (
    <Link href={`/directory/teams/${homeSlug}`} style={{ color: '#fff', textDecoration: 'none', fontWeight: 600, fontSize: '0.875rem' }}>
      {g.home_team}
    </Link>
  ) : (
    <span style={{ color: '#fff', fontWeight: 600, fontSize: '0.875rem' }}>{g.home_team}</span>
  );

  // For neutral-site arenas, the rink may or may not exist in our directory.
  // We link by city/region for non-NHL-home games (city/state pages still exist).
  const city = g.city;
  const venue = g.venue;
  const city_href = (stateSlug && isUSorCA(g.country)) ? `/directory/${g.country === 'USA' ? 'united-states' : 'canada'}/${stateSlug}/${citySlug(city)}` : null;
  const venueCell = (
    <>
      <span style={{ color: '#fff', fontSize: '0.8125rem', fontWeight: 600 }}>{venue}</span>
      {' '}
      <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.75rem' }}>
        {city_href ? <Link href={city_href} style={{ color: 'rgba(0,212,255,0.7)', textDecoration: 'none' }}>{city}</Link> : city}{g.state_or_province ? `, ${g.state_or_province}` : ''}
      </span>
    </>
  );

  return (
    <div
      data-game-id={g.game_id}
      data-neutral-site={g.is_neutral_site ? 'true' : 'false'}
      style={{
        display: 'grid',
        gridTemplateColumns: '60px 1fr auto 1fr 60px',
        gap: '0.5rem 0.75rem',
        alignItems: 'center',
        background: 'var(--s2)',
        border: `1px solid ${g.is_neutral_site ? 'rgba(255,184,28,0.35)' : 'var(--border)'}`,
        borderRadius: '6px',
        padding: '0.6rem 0.75rem',
        marginBottom: '0.4rem',
      }}
    >
      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
        {formatGameHour(`${g.date}T${g.start_time_et}:00-04:00`, 'America/New_York')}
      </div>
      <div style={{ textAlign: 'right' }}>
        {team1}
        {g.split_squad && (
          <span title="Split squad game" style={{ marginLeft: 6, fontSize: '0.625rem', color: 'rgba(255,184,28,0.85)', fontWeight: 700, verticalAlign: 'middle' }}>SPLIT</span>
        )}
      </div>
      <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        @
      </div>
      <div>{team2}</div>
      <div style={{ textAlign: 'center', fontSize: '0.625rem', color: g.is_neutral_site ? '#FFB81C' : 'rgba(255,255,255,0.3)', fontWeight: 700, whiteSpace: 'nowrap' }}>
        {g.is_neutral_site ? 'NEUTRAL SITE' : g.country === 'Canada' ? 'CAN' : 'US'}
      </div>
      <div style={{ gridColumn: '2 / 6', fontSize: '0.75rem', color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>
        {venueCell}
        {g.special_event && (
          <span style={{ marginLeft: 8, fontSize: '0.6875rem', color: '#FFB81C', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {g.special_event}
          </span>
        )}
        {g.notes && (
          <span style={{ marginLeft: 8, fontSize: '0.6875rem', color: 'rgba(255,255,255,0.45)', fontStyle: 'italic' }}>
            {g.notes}
          </span>
        )}
      </div>
    </div>
  );
}

function DayBlock({ date, day, games }: { date: string; day: string; games: PreseasonGame[] }) {
  const sorted = [...games].sort((a, b) => a.start_time_et.localeCompare(b.start_time_et));
  return (
    <section data-date={date} style={{ marginBottom: '2rem' }}>
      <header style={{ marginBottom: '0.75rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
        <h2 className="font-sport" style={{ fontSize: '1.125rem', color: '#fff', letterSpacing: '0.04em', margin: 0 }}>
          {dayName(date).toUpperCase()}
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.8125rem', margin: '0.25rem 0 0' }}>
          {sorted.length} game{sorted.length === 1 ? '' : 's'}
        </p>
      </header>
      {sorted.map(g => <GameRow key={g.game_id} g={g} />)}
    </section>
  );
}

function NeutralSiteSpotlight({ games }: { games: PreseasonGame[] }) {
  const neutral = games.filter(g => g.is_neutral_site);
  if (neutral.length === 0) return null;
  return (
    <section
      aria-label="Neutral-site preseason games"
      style={{
        background: 'rgba(255,184,28,0.06)',
        border: '1px solid rgba(255,184,28,0.35)',
        borderRadius: '10px',
        padding: '1.25rem',
        marginBottom: '1.5rem',
      }}
    >
      <h2 className="font-sport" style={{ fontSize: '1.25rem', color: '#FFB81C', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
        FEATURED NEUTRAL-SITE GAMES
      </h2>
      <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', marginBottom: '0.875rem', lineHeight: 1.5 }}>
        The NHL specifically identifies four neutral-site contests for the {games[0]?.season} preseason,
        including the Kraft Hockeyville game. Click an arena below to jump to its listing on RinkStop.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem' }}>
        {neutral.map(g => {
          const rinkHref = tryRinkPage(g.venue, g.city);
          const cityHref = (stateProvinceSlug(g.state_or_province) && isUSorCA(g.country))
            ? `/directory/${g.country === 'USA' ? 'united-states' : 'canada'}/${stateProvinceSlug(g.state_or_province)!}/${citySlug(g.city)}`
            : null;
          return (
            <article
              key={g.game_id}
              style={{
                background: 'rgba(13,17,23,0.5)',
                border: '1px solid rgba(255,184,28,0.25)',
                borderRadius: '8px',
                padding: '0.875rem',
              }}
            >
              <div style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#FFB81C', marginBottom: '0.375rem' }}>
                {g.day}, {g.date} · {formatGameTime(`${g.date}T${g.start_time_et}:00-04:00`, 'America/New_York')}
              </div>
              <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff', marginBottom: '0.25rem' }}>
                {g.away_team} @ {g.home_team}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.25rem' }}>
                <Link href={rinkHref} style={{ color: '#FFB81C', textDecoration: 'none' }}>{g.venue}</Link>
                {' · '}
                {cityHref ? (
                  <Link href={cityHref} style={{ color: 'rgba(0,212,255,0.85)', textDecoration: 'none' }}>{g.city}, {g.state_or_province}</Link>
                ) : (
                  <span>{g.city}, {g.state_or_province}</span>
                )}
              </div>
              {g.special_event && (
                <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#FFB81C', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '0.375rem' }}>
                  {g.special_event}
                </div>
              )}
              {g.notes && (
                <div style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.25rem', fontStyle: 'italic', lineHeight: 1.4 }}>
                  {g.notes}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function FAQ({ ds }: { ds: PreseasonDataset }) {
  const items = [
    {
      q: `When does the ${ds.season} NHL preseason start and end?`,
      a: `The ${ds.competition} ${ds.season} runs from Saturday, ${ds.starts_at} through Saturday, ${ds.ends_at} — a ${ds.duration_days}-day window at the start of the regular-season calendar.`,
    },
    {
      q: 'Why is the NHL preseason only eight games this year?',
      a: 'Under the new NHL/NHLPA Collective Bargaining Agreement, the regular season expands from 82 to 84 games per team. That expansion removed two preseason slots, leaving clubs with 4 exhibition games apiece instead of 6. The compressed slate reflects that math.',
    },
    {
      q: 'How many teams play in preseason games?',
      a: `All 32 NHL clubs play in the ${ds.season} preseason, totaling ${ds.games_total} games across ${ds.venues_total} arenas and neutral-site venues in the United States and Canada.`,
    },
    {
      q: 'What is the Kraft Hockeyville game?',
      a: `The Kraft Hockeyville program awards a community grand prize each year. The ${ds.season} game is being played at the Colisée Vidéotron in Trois-Rivières, Que. — Saint-Boniface, Man. was the 2025 winner and receives arena upgrades plus youth hockey equipment. The game pits the Montreal Canadiens against the Ottawa Senators.`,
    },
    {
      q: 'Where can I find tickets for a preseason game?',
      a: 'Tickets are sold through each NHL team\'s box office or via Ticketmaster, AXS, SeatGeek, or the venue\'s official ticketing partner. Team-by-team on-sale dates vary; check the individual team page on RinkStop or the official club site.',
    },
    {
      q: 'What comes after preseason?',
      a: `The 2026-27 NHL regular season opens Tuesday, ${ds.ends_at.replace(/2026-09-26/, '2026-09-29')}, with an opening-night tripleheader on ESPN in the U.S. and a doubleheader on Sportsnet in Canada.`,
    },
  ];
  return (
    <section aria-label="Frequently asked questions" style={{ marginTop: '2rem' }}>
      <h2 className="font-sport" style={{ fontSize: '1.25rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>
        Frequently Asked Questions
      </h2>
      <div style={{ display: 'grid', gap: '0.75rem' }}>
        {items.map((it, i) => (
          <details
            key={i}
            style={{
              background: 'var(--s2)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              padding: '0.875rem 1rem',
            }}
          >
            <summary style={{ cursor: 'pointer', color: '#fff', fontSize: '0.9375rem', fontWeight: 600 }}>
              {it.q}
            </summary>
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.875rem', lineHeight: 1.6, marginTop: '0.5rem' }}>
              {it.a}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}

function MethodologyFooter({ ds }: { ds: PreseasonDataset }) {
  return (
    <section
      aria-label="Data methodology"
      style={{
        marginTop: '2rem',
        background: 'var(--s2)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        padding: '1.25rem',
      }}
    >
      <h2 className="font-sport" style={{ fontSize: '1rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
        HOW THIS SCHEDULE WAS BUILT
      </h2>
      <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8125rem', lineHeight: 1.6, marginBottom: '0.5rem' }}>
        Every game, time, and arena on this page was transcribed from the NHL's official
        preseason announcement published on {ds.publication_date}. Game totals, team totals,
        and neutral-site counts were cross-verified against independent coverage from
        Daily Faceoff, USA Today, and the NHL.com media release. Arena renames from the
        2025 calendar year (Xcel Energy Center → Grand Casino Arena; Wells Fargo Center
        → Xfinity Mobile Arena) were verified against the venues' own corporate sources.
      </p>
      <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.75rem', lineHeight: 1.5, marginBottom: 0 }}>
        Verified by {ds.verified_by} on {ds.verified_at}. Schedule corrections or arena changes
        should be sent to{' '}
        <Link href="/contact" style={{ color: 'rgba(0,212,255,0.85)', textDecoration: 'none' }}>the corrections team</Link>.
      </p>
    </section>
  );
}

function RelatedLinks({ ds }: { ds: PreseasonDataset }) {
  return (
    <section
      aria-label="Related RinkStop content"
      style={{
        marginTop: '1.5rem',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '0.75rem',
      }}
    >
      {[
        { label: 'NHL Hub', href: '/directory/nhl', desc: '32 teams, live scores, standings' },
        { label: 'NHL Schedule', href: '/directory/nhl/schedule', desc: 'Regular-season games' },
        { label: 'NHL Standings', href: '/directory/nhl/standings', desc: 'Current regular-season standings' },
        { label: 'NHL Directory', href: '/directory/teams', desc: 'Every NHL team on RinkStop' },
        { label: 'Editorial: Why the preseason is shorter', href: '/news/nhl-shortened-preseason-2026-27', desc: 'How the new CBA reshapes the calendar' },
      ].map(l => (
        <Link
          key={l.href}
          href={l.href}
          style={{
            display: 'block',
            background: 'var(--s2)',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            padding: '0.75rem 0.875rem',
            textDecoration: 'none',
          }}
        >
          <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.875rem' }}>{l.label}</div>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', marginTop: '0.25rem' }}>{l.desc}</div>
        </Link>
      ))}
    </section>
  );
}

// ---------- Page ----------

export default async function PreseasonSchedulePage({ params }: { params: Promise<{ season: string }> }) {
  const { season } = await params;
  const ds = await loadSeason(season);

  if (!ds) {
    return (
      <main style={{ maxWidth: '920px', margin: '0 auto', padding: '2rem 1rem 4rem', color: '#fff' }}>
        <h1 className="font-sport" style={{ fontSize: '1.75rem', marginBottom: '1rem' }}>
          {season} NHL Preseason Schedule
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.6)' }}>
          The {season} preseason dataset is not yet available. Check back closer to training camp.
        </p>
        <p style={{ marginTop: '1.5rem' }}>
          <Link href="/directory/nhl" style={{ color: 'rgba(0,212,255,0.85)', textDecoration: 'none' }}>
            ← Back to NHL hub
          </Link>
        </p>
      </main>
    );
  }

  // Group games by date for day-by-day rendering.
  const byDate: Record<string, { day: string; games: PreseasonGame[] }> = {};
  for (const g of ds.games) {
    if (!byDate[g.date]) byDate[g.date] = { day: g.day, games: [] };
    byDate[g.date].games.push(g);
  }
  const dates = Object.keys(byDate).sort();

  // Venue-level summary for the SEO body
  const venueSummary: Record<string, number> = {};
  for (const g of ds.games) {
    venueSummary[g.venue] = (venueSummary[g.venue] ?? 0) + 1;
  }

  // ----- JSON-LD: an ItemList of every game + an FAQPage schema -----
  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${ds.competition} ${ds.season} Schedule`,
    description: `Every ${ds.competition.toLowerCase()} game for ${ds.season}, with arenas, cities, and start times.`,
    numberOfItems: ds.games_total,
    itemListElement: ds.games.slice(0, 50).map((g, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'SportsEvent',
        name: `${g.away_team} at ${g.home_team}`,
        startDate: `${g.date}T${g.start_time_et}:00-04:00`,
        endDate: g.notes.includes('split-squad') ? undefined : `${g.date}T${g.start_time_et}:00-04:00`,
        eventStatus: 'https://schema.org/EventScheduled',
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
        homeTeam: { '@type': 'SportsTeam', name: g.home_team },
        awayTeam: { '@type': 'SportsTeam', name: g.away_team },
        location: {
          '@type': 'Place',
          name: g.venue,
          address: {
            '@type': 'PostalAddress',
            addressLocality: g.city,
            addressRegion: g.state_or_province,
            addressCountry: g.country,
          },
        },
      },
    })),
  };

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'When does the NHL preseason start?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: `The ${ds.competition} ${ds.season} runs from Saturday, ${ds.starts_at} through Saturday, ${ds.ends_at} — a ${ds.duration_days}-day window.`,
        },
      },
      {
        '@type': 'Question',
        name: 'How many games are in the NHL preseason?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: `${ds.games_total} games across ${ds.venues_total} arenas, including ${ds.neutral_site_games} neutral-site contests.`,
        },
      },
      {
        '@type': 'Question',
        name: 'Why is the NHL preseason shorter this year?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Under the new NHL/NHLPA Collective Bargaining Agreement, the regular season expands from 82 to 84 games per team. To fit the extra two games per team into the calendar, the preseason was reduced from 6 to 4 exhibitions per team — producing the compressed 8-day, 65-game slate that defines 2026-27.',
        },
      },
    ],
  };

  return (
    <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '1rem 1rem 3rem', color: '#fff' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <nav aria-label="Breadcrumb" style={{ marginBottom: '0.75rem', fontSize: '0.8125rem', color: 'rgba(255,255,255,0.45)' }}>
        <Link href="/" style={{ color: 'rgba(0,212,255,0.85)', textDecoration: 'none' }}>Home</Link>
        <span style={{ margin: '0 6px' }}>/</span>
        <Link href="/directory/nhl" style={{ color: 'rgba(0,212,255,0.85)', textDecoration: 'none' }}>NHL</Link>
        <span style={{ margin: '0 6px' }}>/</span>
        <span>Preseason {ds.season}</span>
      </nav>

      <h1 className="font-sport" style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', letterSpacing: '0.02em', lineHeight: 1.05, margin: '0 0 0.5rem' }}>
        {ds.competition.toUpperCase()} {ds.season}: ALL {ds.games_total} GAMES
      </h1>
      <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1rem', lineHeight: 1.5, maxWidth: 800, margin: '0 0 1.5rem' }}>
        The {ds.competition} {ds.season} runs from {ds.starts_at} through {ds.ends_at},
        a {ds.duration_days}-day slate of {ds.games_total} exhibition games across {ds.venues_total} NHL and
        neutral-site venues in the United States and Canada. Filter by date, team, city,
        country, or venue type.
      </p>

      <TimezoneDisclosure />

      <QuickFacts ds={ds} />

      <NeutralSiteSpotlight games={ds.games} />

      <section aria-label="Schedule by date" style={{ marginBottom: '1.5rem' }}>
        {dates.map(d => (
          <DayBlock key={d} date={d} day={byDate[d].day} games={byDate[d].games} />
        ))}
      </section>

      <FAQ ds={ds} />

      <RelatedLinks ds={ds} />

      <MethodologyFooter ds={ds} />
    </main>
  );
}
