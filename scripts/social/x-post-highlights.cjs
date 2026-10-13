#!/usr/bin/env node
/**
 * scripts/social/x-post-highlights.cjs
 *
 * Auto-post published highlight articles to X (Twitter).
 *
 * Per Arnel directive 2026-10-13 00:48 CDT:
 *   - Tweet copy: league tag in brackets + title + "Full recap and highlights ↓"
 *     + article URL + league hashtag + team hashtags + 1 generic
 *   - Image: post.og_image_url (YouTube thumbnail, ~480x360)
 *   - Stop sending to Telegram
 *
 * Selection: published posts with highlight_id IS NOT NULL AND
 *   x_posted = false AND created_at > now() - 7 days.
 * The 7-day window prevents the script from backfilling the timeline
 * when first turned on. Bump to 30d for a one-time catch-up if needed.
 *
 * Failure handling: writes x_post_error on failure so the audit pipeline
 * can surface stuck posts. Sets x_posted=true on success.
 *
 * Rate limit: 1 post per run by default, 60s throttle if --batch > 1.
 *
 * Idempotency: posts where x_posted=true are skipped on the next run.
 *
 * Run: node scripts/social/x-post-highlights.cjs [--batch=N] [--dry-run] [--since-days=N]
 * Cron: every 15m, after the auto-publish-audit-validator (cron 662b0424)
 */

const { execFileSync } = require('child_process');
const { readFileSync, writeFileSync, mkdtempSync, rmSync, existsSync } = require('fs');
const { tmpdir } = require('os');
const { join } = require('path');
const { createClient } = require('@supabase/supabase-js');

// ── Env from .env (script runs in repo root) ──────────────────────────────
try {
  const envFile = readFileSync('.env', 'utf8');
  for (const line of envFile.split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
} catch {}

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const RINKSTOP_BASE = 'https://rinkstop.com';
const X_HANDLE = 'rinkstopnews';

// ── League → hashtag map (option B: league-aware) ─────────────────────────
const LEAGUE_TAGS = {
  'nhl':                              '#NHL',
  'ahl':                              '#AHL',
  'khl':                              '#KHL',
  'echl':                             '#ECHL',
  'whl':                              '#WHL',
  'ohl':                              '#OHL',
  'qmjhl':                            '#QMJHL',
  'ushl':                             '#USHL',
  'ncaa':                             '#NCAAHockey',
  'chl':                              '#CHL',
  'shl':                              '#SHL',
  'shl-finland':                      '#Liiga',
  'liiga':                            '#Liiga',
  'del':                              '#DEL',
  'nl':                               '#NL',
  'national-league':                  '#NL',
  'extraliga':                        '#Extraliga',
  'czech-extraliga':                  '#Extraliga',
  'tipsport-extraliga':               '#TipsportExtraliga',
  'slovak-extraliga':                 '#TipsportExtraliga',
  'mestis':                           '#Mestis',
  'hockeyallsvenskan':                '#HA',
  'allsvenskan':                      '#HA',
  'iihf-world-championships':         '#IIHF',
  'iihf':                             '#IIHF',
  'iihf-world-championship-2026':     '#IIHF',
  'iihf-world-junior-championships':  '#WorldJuniors',
  'iihf-u18':                         '#IIHFU18',
  'olympics':                         '#Olympics',
  'champions-hockey-league':          '#CHL',
  'asia-league-ice-hockey':           '#ALIH',
  'aihl':                             '#AIHL',
  'nzihl':                            '#NZIHL',
  'eihl':                             '#EIHL',
  'nihl':                             '#NIHL',
  'lnhhb':                            '#LNHHB',
  'metal-ligaen':                     '#MetalLigaen',
  'fjordkraft-ligaen':                '#Fjordkraftligaen',
  'optibet-latvian-hockey-league':    '#Optibet',
  'ligue-magnus':                     '#LigueMagnus',
  'serie-a':                          '#SerieA',
  'icehl':                            '#ICEHL',
  'ebel':                             '#EBEL',
  'eredivisie':                       '#Eredivisie',
};

// League-specific *additional* tags (for tournaments like IIHF WC that have their own hashtag)
const LEAGUE_EXTRA_TAGS = {
  'iihf-world-championships':         ['#WorldChampionship'],
  'iihf-world-championship-2026':     ['#WorldChampionship'],
  'iihf-world-junior-championships':  ['#WorldJuniors'],
  'iihf-u18':                         ['#WorldJuniors'],
  'olympics':                         ['#WinterOlympics'],
  'champions-hockey-league':          ['#ChampionsHL'],
};

// ── Team → hashtag fallback (option C) ───────────────────────────────────
// For ~30% of teams the cleanest tag is a country (national teams).
// We detect "national team" by slug pattern OR by team_workspaces.name being
// a single country name. Otherwise we use the team name as a #tag.
const COUNTRY_NAME_TO_TAG = {
  'finland': '#Finland', 'sweden': '#Sweden', 'czechia': '#Czechia',
  'czech republic': '#Czechia', 'russia': '#Russia', 'canada': '#Canada',
  'united states': '#USA', 'usa': '#USA', 'slovakia': '#Slovakia',
  'switzerland': '#Switzerland', 'germany': '#Germany', 'denmark': '#Denmark',
  'norway': '#Norway', 'latvia': '#Latvia', 'austria': '#Austria',
  'france': '#France', 'italy': '#Italy', 'japan': '#Japan',
  'south korea': '#SouthKorea', 'korea': '#SouthKorea', 'china': '#China',
  'united kingdom': '#UK', 'great britain': '#GB', 'slovenia': '#Slovenia',
  'poland': '#Poland', 'hungary': '#Hungary', 'kazakhstan': '#Kazakhstan',
  'belarus': '#Belarus', 'ukraine': '#Ukraine', 'netherlands': '#Netherlands',
  'romania': '#Romania', 'spain': '#Spain', 'mexico': '#Mexico',
  'australia': '#Australia', 'new zealand': '#NewZealand',
  'estonia': '#Estonia', 'lithuania': '#Lithuania', 'croatia': '#Croatia',
  'serbia': '#Serbia', 'bulgaria': '#Bulgaria', 'turkey': '#Turkey',
  'israel': '#Israel', 'belgium': '#Belgium', 'iceland': '#Iceland',
};

const NATIONAL_TEAM_SLUG_HINTS = [
  'team-finland', 'team-sweden', 'team-czechia', 'team-russia',
  'team-canada', 'team-usa', 'team-united-states', 'team-germany',
  'team-switzerland', 'team-slovakia', 'team-denmark', 'team-norway',
  'team-latvia', 'team-austria', 'team-france', 'team-italy',
  'team-japan', 'team-korea', 'team-south-korea', 'team-china',
  'team-slovenia', 'team-poland', 'team-hungary', 'team-kazakhstan',
  'team-belarus', 'team-ukraine', 'team-estonia', 'team-lithuania',
  'team-croatia', 'team-romania', 'team-spain', 'team-mexico',
  'team-australia', 'team-new-zealand', 'team-iceland', 'team-bulgaria',
  'team-great-britain', 'team-united-kingdom', 'team-gb',
];

// Hand-curated top-league team tags (for the ~60 most-mentioned club teams)
const CLUB_TEAM_TAGS = {
  'nhl-toronto-maple-leafs':     '#Leafs',
  'nhl-montreal-canadiens':      '#Habs',
  'nhl-boston-bruins':           '#NHLBruins',
  'nhl-new-york-rangers':        '#NYR',
  'nhl-edmonton-oilers':         '#Oilers',
  'nhl-pittsburgh-penguins':     '#Pens',
  'nhl-chicago-blackhawks':      '#Blackhawks',
  'nhl-detroit-red-wings':       '#RedWings',
  'nhl-tampa-bay-lightning':     '#TBLightning',
  'nhl-florida-panthers':        '#FlaPanthers',
  'nhl-colorado-avalanche':      '#Avalanche',
  'nhl-vegas-golden-knights':    '#VegasBorn',
  'nhl-dallas-stars':            '#TexasHockey',
  'nhl-vancouver-canucks':       '#Canucks',
  'nhl-calgary-flames':          '#Flames',
  'nhl-winnipeg-jets':           '#NHLJets',
  'nhl-ottawa-senators':         '#Sens',
  'nhl-washington-capitals':     '#ALLCAPS',
  'nhl-carolina-hurricanes':     '#Canes',
  'nhl-new-jersey-devils':       '#NJDevils',
  'nhl-new-york-islanders':      '#Isles',
  'nhl-philadelphia-flyers':     '#Flyers',
  'nhl-st-louis-blues':          '#STLBlues',
  'nhl-nashville-predators':     '#Preds',
  'nhl-minnesota-wild':          '#mnwild',
  'nhl-seattle-kraken':          '#SeaKraken',
  'nhl-buffalo-sabres':          '#Sabres',
  'nhl-columbus-blue-jackets':   '#CBJ',
  'nhl-anaheim-ducks':           '#AnaheimDucks',
  'nhl-los-angeles-kings':       '#LAKings',
  'nhl-san-jose-sharks':         '#SJSharks',
  'nhl-utah-hockey-club':        '#UtahHockey',
  'nhl-arizona-coyotes':         '#Yotes',
  'ahl-belmont-bruins':          '#AHLBruins',
  'ahl-cleveland-monsters':      '#CleMonsters',
  'ahl-grand-rapid-griffins':    '#Griffins',
  'ahl-laval-rocket':            '#RocketLaval',
  'ahl-lehigh-valley-phantoms':  '#LVPhantoms',
  'ahl-manitoba-moose':          '#MBMoose',
  'ahl-rochester-americans':     '#Amerks',
  'ahl-syracuse-crunch':         '#SyrCrunch',
  'ahl-texas-stars':             '#TXStars',
  'ahl-toronto-marlies':         '#Marlies',
  'ahl-utica-comets':            '#Comets',
  'ahl-wilkes-barre-penguins':   '#WBSPenguins',
  'khl-cska-moscow':             '#CSKA',
  'khl-ska-st-petersburg':       '#SKA',
  'khl-dynamo-moscow':           '#DynamoMoscow',
  'khl-ak-bars-kazan':           '#AkBars',
  'khl-avanangard-omsk':         '#Avangard',
  'khl-metallurg-magnitogorsk':  '#MMG',
  'khl-salavat-yulaev-ufa':      '#SalavatYulaev',
  'khl-lokomotiv-yaroslavl':     '#LokoYaroslavl',
  'shl-frölunda':                '#Frölunda',
  'shl-färjestad':               '#Färjestad',
  'shl-djurgården':              '#DjurgårdenIF',
  'shl-hv71':                    '#HV71',
  'shl-linköping':               '#LinköpingHC',
  'shl-luleå':                   '#LuleåHF',
  'shl-rögle':                   '#RögleBK',
  'shl-skellefteå':              '#SkellefteåAIK',
  'shl-växjö':                   '#VäxjöLakers',
};

function cleanTeamTag(raw) {
  if (!raw) return null;
  const lower = raw.toLowerCase().trim();
  if (CLUB_TEAM_TAGS[lower]) return CLUB_TEAM_TAGS[lower];
  // Team slugs in this DB are sometimes prefixed with the league
  // (e.g. "nhl-boston-bruins") and sometimes bare (e.g. "boston-bruins").
  // Try the prefixed form, then strip the first segment and try again.
  if (lower.includes('-')) {
    const stripped = lower.split('-').slice(1).join('-');
    if (CLUB_TEAM_TAGS[stripped]) return CLUB_TEAM_TAGS[stripped];
    if (NATIONAL_TEAM_SLUG_HINTS.includes(stripped) || NATIONAL_TEAM_SLUG_HINTS.includes(lower)) {
      const slug = NATIONAL_TEAM_SLUG_HINTS.includes(stripped) ? stripped : lower;
      const country = slug.replace(/^team-/, '').replace(/-/g, ' ');
      return COUNTRY_NAME_TO_TAG[country] || null;
    }
  }
  if (NATIONAL_TEAM_SLUG_HINTS.includes(lower)) {
    const country = lower.replace(/^team-/, '').replace(/-/g, ' ');
    return COUNTRY_NAME_TO_TAG[country] || null;
  }
  // Fallback: humanize the slug
  const human = lower
    .split('-')
    .map(w => w.length <= 3 ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1))
    .join('');
  return `#${human}`;
}

function leagueTag(league) {
  if (!league) return null;
  const slug = (league.slug || '').toLowerCase();
  if (LEAGUE_TAGS[slug]) return LEAGUE_TAGS[slug];
  // Fallback: uppercase the slug and turn into a hashtag. Strips generic
  // suffixes like "-league", "-hockey", "-ice-hockey" first.
  let s = slug
    .replace(/-ice-hockey$/, '')
    .replace(/-hockey$/, '')
    .replace(/-league$/, '')
    .replace(/-championship$/, '')
    .replace(/-championships$/, '')
    .replace(/-world-championship-(\d{4})$/, '-world-championship');
  if (s !== slug) {
    // Try the shortened form too
    if (LEAGUE_TAGS[s]) return LEAGUE_TAGS[s];
  }
  // Last resort: humanize the slug (camelcase, e.g. "iihf-u18" -> "IIHFU18")
  const human = s
    .split('-')
    .filter(Boolean)
    .map(w => w.length <= 4 ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1))
    .join('');
  return `#${human}`;
}

function leagueExtraTags(league) {
  if (!league) return [];
  const slug = (league.slug || '').toLowerCase();
  return LEAGUE_EXTRA_TAGS[slug] || [];
}

function hashtagForTeam(team) {
  if (!team) return null;
  const slugLower = team.slug ? team.slug.toLowerCase() : null;
  if (slugLower && CLUB_TEAM_TAGS[slugLower]) return CLUB_TEAM_TAGS[slugLower];
  if (team.name) {
    const nameLower = team.name.toLowerCase().trim();
    if (COUNTRY_NAME_TO_TAG[nameLower]) return COUNTRY_NAME_TO_TAG[nameLower];
    if (slugLower && NATIONAL_TEAM_SLUG_HINTS.includes(slugLower)) {
      const country = slugLower.replace(/^team-/, '').replace(/-/g, ' ');
      return COUNTRY_NAME_TO_TAG[country] || `#${nameLower.replace(/\s+/g, '')}`;
    }
    // Country name in team.name (handles "Finland" as a name, slug "team-finland")
    if (!slugLower || !slugLower.includes('-')) {
      // For bare slugs, check if the name itself is a country
      if (COUNTRY_NAME_TO_TAG[nameLower]) return COUNTRY_NAME_TO_TAG[nameLower];
    }
  }
  if (slugLower) return cleanTeamTag(slugLower);
  if (team.name) return `#${team.name.replace(/\s+/g, '')}`;
  return null;
}

function dedupeTags(tags) {
  const seen = new Set();
  const out = [];
  for (const t of tags) {
    if (!t) continue;
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out;
}

// ── Build the tweet ──────────────────────────────────────────────────────
const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatGameDate(iso) {
  if (!iso) return null;
  const d = new Date(iso.length === 10 ? iso + 'T00:00:00Z' : iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${MONTH_ABBR[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

// Extract venue from title or subtitle.
//
// Patterns we handle (in priority order):
//   1. Title: "...at <Capitalized Words>"  e.g. "at Enterprise Center"
//   2. Subtitle: "...at <Capitalized Words>."  e.g. "at Xfinity Mobile Arena."
//   3. Subtitle: "...in <Capitalized City>."  e.g. "in Frankfurt."
//
// We reject matches that look like a team name or a phrase ending in
// "'s home venue" or "home ice" because those aren't real venues.
function extractVenue(title, subtitle, teamHomeName, teamAwayName) {
  const teamNamesLower = new Set(
    [teamHomeName, teamAwayName].filter(Boolean).map(n => n.toLowerCase())
  );

  const clean = (raw) => {
    if (!raw) return null;
    // Stop at the first sentence boundary. Patterns we cut on:
    //   ". " / "! " / "? " / "; "         — punctuation followed by space
    //   " — " / " - " / " – "             — em/en dash separators
    //   " The " / " A " / " An "          — next sentence starting with article
    //   " in " / " on " / " for " / " with " / " during " — trailing prepositional
    //                                       phrase that starts a continuation
    //                                       (e.g. "Canadian Tire Centre in a regulation decision")
    const stop = raw.search(/[.!?;]\s|\s[—–—-]\s|\sThe\s|\sA\s|\sAn\s|\sin\s|\son\s|\sfor\s|\swith\s|\sduring\s|\sthat\s|\swhich\s/);
    let venue = (stop > 0 ? raw.substring(0, stop) : raw).trim();
    venue = venue.replace(/^[Tt]he\s+/, '').replace(/'s$/, '').trim();
    if (venue.length > 35) venue = venue.substring(0, 34) + '…';
    return venue || null;
  };

  const isTeamName = (s) => {
    const low = s.toLowerCase();
    if (teamNamesLower.has(low)) return true;
    // "...home venue" / "...home ice" / "...home rink" = team-as-venue, not real
    if (/\bhome (venue|ice|rink|arena)\b/i.test(s)) return true;
    // Trailing possessives on team names: "Dynamo Moscow's", "Jukurit's"
    if (/'s\b|\u2019s\b/.test(s) && /\bhome\b/i.test(s)) return true;
    return false;
  };

  // "at <Capitalized Word>(s)" — allow Unicode letters (å, ä, ö) and apostrophes
  const AT = / at ([A-ZÀ-Ý][\w'\u2019\u00C0-\u00FF\-]*(?:\s[A-ZÀ-Ýa-zà-ÿ][\w'\u2019\u00C0-\u00FF\-]*|of|and|the){0,4})/;
  // "in <Capitalized Word>(s)" — fallback when no "at" pattern matches
  const IN = / in ([A-ZÀ-Ý][\w'\u2019\u00C0-\u00FF\-]*(?:\s[A-ZÀ-Ýa-zà-ÿ][\w'\u2019\u00C0-\u00FF\-]*|of|and|the){0,3})/;

  for (const src of [title, subtitle]) {
    if (!src) continue;
    const m = src.match(AT);
    if (m) {
      const candidate = clean(m[1]);
      if (candidate && !isTeamName(candidate)) return candidate;
    }
  }
  // Fall back to "in <City>" if "at <Venue>" didn't yield a real venue
  if (subtitle) {
    const m = subtitle.match(IN);
    if (m) {
      const candidate = clean(m[1]);
      if (candidate && !isTeamName(candidate)) return candidate;
    }
  }
  return null;
}

async function buildTweet(post, league, teamHome, teamAway) {
  const leagueBracket = league?.slug
    ? LEAGUE_TAGS[league.slug.toLowerCase()]
      ? `[${LEAGUE_TAGS[league.slug.toLowerCase()].replace('#', '')}]`
      : `[${league.slug.toUpperCase().replace(/-/g, ' ')}]`
    : '[Hockey]';
  const title = (post.title || '').trim();
  const url = `${RINKSTOP_BASE}/news/${post.slug}`;
  const dateStr = formatGameDate(post.game_date);
  const venue = extractVenue(post.title, post.subtitle, teamHome?.name, teamAway?.name);

  const detailParts = [];
  if (dateStr) detailParts.push(`🗓 ${dateStr}`);
  if (venue) detailParts.push(`🏟 ${venue}`);
  const detailLine = detailParts.length ? detailParts.join(' · ') + '\n' : '';

  const tags = [];
  if (league) {
    const lt = leagueTag(league);
    if (lt) tags.push(lt);
    tags.push(...leagueExtraTags(league));
  }
  if (teamHome) { const t = hashtagForTeam(teamHome); if (t) tags.push(t); }
  if (teamAway) { const t = hashtagForTeam(teamAway); if (t) tags.push(t); }
  // Always include a single generic
  if (!tags.some(t => t.toLowerCase() === '#hockey')) tags.push('#hockey');
  const tagLine = dedupeTags(tags).join(' ');

  // X premium allows 4000 chars; we use a compact 2-3 line format
  const tweet = `${leagueBracket} ${title}\n${detailLine}\nFull recap and highlights ↓\n${url}\n\n${tagLine}`;

  // Twitter free limit is 280 chars; premium is 4000. Our copy is ~150-200 chars
  // including tags. If it ever blows past 280, drop the tag line first, then the CTA.
  if (tweet.length <= 280) return tweet;
  const compact = `${leagueBracket} ${title}\n\n${url}\n\n${tagLine}`;
  if (compact.length <= 280) return compact;
  const minimal = `${leagueBracket} ${title}\n\n${url}`;
  if (minimal.length <= 280) return minimal;
  throw new Error(`tweet too long (${tweet.length} chars) for post ${post.id}: ${post.slug}`);
}

// ── Media upload via xurl ────────────────────────────────────────────────
async function uploadMedia(url, workDir) {
  if (!url) return null;
  // YouTube thumbnails are ~5-15KB JPGs, easy to fetch
  const ext = url.match(/\.(jpg|jpeg|png|webp)(\?|$)/i)?.[1] || 'jpg';
  const localPath = join(workDir, `media-${Date.now()}.${ext}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`media fetch ${res.status}: ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(localPath, buf);
  const out = execFileSync('xurl', ['media', 'upload', localPath], { encoding: 'utf8' });
  // xurl prints a JSON object followed by a plaintext "Media uploaded
  // successfully!" line. Extract just the JSON portion.
  const jsonStart = out.indexOf('{');
  const jsonEnd = out.lastIndexOf('}');
  if (jsonStart < 0 || jsonEnd < 0) throw new Error(`xurl media upload returned no JSON: ${out}`);
  const json = JSON.parse(out.slice(jsonStart, jsonEnd + 1));
  // X v2 media upload response: { data: { id, media_key, ... } }
  // xurl post response: { data: { id, text, ... } }
  const mediaId = json?.data?.id || json.id || json.media_id_string || json.media_id;
  if (!mediaId) throw new Error(`xurl media upload returned no id: ${out}`);
  return String(mediaId);
}

// ── Post tweet via xurl ──────────────────────────────────────────────────
function postTweet(text, mediaId) {
  const args = ['post', text];
  if (mediaId) args.push('--media-id', mediaId);
  const out = execFileSync('xurl', args, { encoding: 'utf8' });
  // Use the same JSON-extract approach: xurl output is usually pure JSON,
  // but be defensive in case a future version adds a trailing line.
  const jsonStart = out.indexOf('{');
  const jsonEnd = out.lastIndexOf('}');
  const json = jsonStart >= 0 && jsonEnd >= 0
    ? JSON.parse(out.slice(jsonStart, jsonEnd + 1))
    : JSON.parse(out);
  const id = json?.data?.id || json.id;
  if (!id) throw new Error(`xurl post returned no id: ${out}`);
  return String(id);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Main ─────────────────────────────────────────────────────────────────
async function main() {
  const argv = process.argv.slice(2);
  const dryRun = argv.includes('--dry-run');
  const batchArg = argv.find(a => a.startsWith('--batch='));
  const batch = batchArg ? parseInt(batchArg.split('=')[1], 10) : 1;
  const sinceArg = argv.find(a => a.startsWith('--since-days='));
  const sinceDays = sinceArg ? parseInt(sinceArg.split('=')[1], 10) : 7;
  if (batch < 1 || batch > 20) {
    console.error('batch must be 1..20');
    process.exit(2);
  }

  console.log(`[x-post] dry=${dryRun} batch=${batch} since=${sinceDays}d`);

  const sinceIso = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000).toISOString();
  const { data: posts, error } = await sb
    .from('posts')
    .select('id, slug, title, og_image_url, team_home_id, team_away_id, league_id, game_date, subtitle, created_at')
    .eq('status', 'published')
    .eq('x_posted', false)
    .not('highlight_id', 'is', null)
    .gt('created_at', sinceIso)
    .order('created_at', { ascending: true })
    .limit(batch);
  if (error) { console.error('[x-post] db error:', error); process.exit(1); }
  if (!posts || posts.length === 0) {
    console.log('[x-post] nothing to post');
    return;
  }
  console.log(`[x-post] ${posts.length} candidate post(s)`);

  // Pre-fetch league + teams in one go
  const leagueIds = [...new Set(posts.map(p => p.league_id).filter(Boolean))];
  const teamIds = [...new Set(posts.flatMap(p => [p.team_home_id, p.team_away_id]).filter(Boolean))];

  const leagueMap = {};
  if (leagueIds.length) {
    const { data: leagues } = await sb.from('leagues').select('id, slug, name').in('id', leagueIds);
    for (const l of leagues || []) leagueMap[l.id] = l;
  }
  const teamMap = {};
  if (teamIds.length) {
    const { data: teams } = await sb.from('team_workspaces').select('id, name, slug').in('id', teamIds);
    for (const t of teams || []) teamMap[t.id] = t;
  }

  const workDir = mkdtempSync(join(tmpdir(), 'xpost-'));
  let posted = 0, failed = 0;

  try {
    for (const post of posts) {
      const league = post.league_id ? leagueMap[post.league_id] : null;
      const teamHome = post.team_home_id ? teamMap[post.team_home_id] : null;
      const teamAway = post.team_away_id ? teamMap[post.team_away_id] : null;
      const tweet = await buildTweet(post, league, teamHome, teamAway);
      console.log(`[x-post] candidate ${post.slug}: ${tweet.length} chars`);

      if (dryRun) {
        console.log(`[x-post]   DRY: would post:\n--\n${tweet}\n--`);
        continue;
      }

      let mediaId = null;
      try {
        if (post.og_image_url) mediaId = await uploadMedia(post.og_image_url, workDir);
        const xPostId = postTweet(tweet, mediaId);
        const { error: updErr } = await sb
          .from('posts')
          .update({ x_posted: true, x_post_id: xPostId, x_posted_at: new Date().toISOString(), x_post_error: null })
          .eq('id', post.id);
        if (updErr) {
          // Posted to X but DB didn't update — log loud so we can recover
          console.error(`[x-post]   DB UPDATE FAILED after posting to X. x_post_id=${xPostId}, post=${post.id}, err=${updErr.message}`);
        } else {
          console.log(`[x-post]   OK x_post_id=${xPostId}`);
          posted++;
        }
      } catch (err) {
        const msg = err.message || String(err);
        console.error(`[x-post]   FAIL: ${msg}`);
        await sb.from('posts').update({ x_post_error: msg }).eq('id', post.id);
        failed++;
        // Stop on first error to avoid hammering the rate limit
        break;
      }
      if (posted > 0 && posted < posts.length) await sleep(60_000);
    }
  } finally {
    try { rmSync(workDir, { recursive: true, force: true }); } catch {}
  }

  console.log(`[x-post] done: posted=${posted} failed=${failed}`);
  if (failed > 0) process.exit(1);
}

main().catch(err => {
  console.error('[x-post] fatal:', err);
  process.exit(1);
});
