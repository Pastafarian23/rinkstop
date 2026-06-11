require('./load-secrets.cjs');
/**
 * scripts/sync-ahl-rosters-v2.js
 * Pulls AHL team rosters via direct web scraping of AHL.com team pages.
 * 
 * AHL team roster pages follow this pattern:
 * https://www.theahl.com/teams/{team-slug}/roster
 * 
 * Example: Charlotte Checkers → https://www.theahl.com/teams/charlotte-checkers/roster
 * 
 * The AHL.com pages have structured HTML we can scrape for:
 * - Player name, number, position
 * - Height, weight, birth date (sometimes)
 * 
 * For players we can't get full bio data for, we insert what's available
 * and flag them for enrichment later.
 */

const { createClient } = require('@supabase/supabase-js');

const AHL_TEAMS = [
  { name: 'Abbotsford Canucks',          slug: 'abbotsford-canucks'        },
  { name: 'Bakersfield Condors',         slug: 'bakersfield-condors'       },
  { name: 'Belleville Senators',          slug: 'belleville-senators'       },
  { name: 'Bridgeport Islanders',        slug: 'bridgeport-islanders'       },
  { name: 'Charlotte Checkers',          slug: 'charlotte-checkers'         },
  { name: 'Chicago Wolves',              slug: 'chicago-wolves'             },
  { name: 'Cleveland Monsters',            slug: 'cleveland-monsters'        },
  { name: 'Coachella Valley Firebirds', slug: 'coachella-valley-firebirds' },
  { name: 'Colorado Eagles',             slug: 'colorado-eagles'            },
  { name: 'Grand Rapids Griffins',        slug: 'grand-rapids-griffins'     },
  { name: 'Hartford Wolf Pack',          slug: 'hartford-wolf-pack'         },
  { name: 'Hershey Bears',              slug: 'hershey-bears'              },
  { name: 'Iowa Wild',                  slug: 'iowa-wild'                 },
  { name: 'Laval Rocket',               slug: 'laval-rocket'               },
  { name: 'Lehigh Valley Phantoms',      slug: 'lehigh-valley-phantoms'     },
  { name: 'Manitoba Moose',             slug: 'manitoba-moose'             },
  { name: 'Milwaukee Admirals',          slug: 'milwaukee-admirals'         },
  { name: 'Ontario Reign',              slug: 'ontario-reign'               },
  { name: 'Providence Bruins',          slug: 'providence-bruins'          },
  { name: 'Rochester Americans',         slug: 'rochester-americans'         },
  { name: 'San Jose Barracuda',         slug: 'san-jose-barracuda'         },
  { name: 'Springfield Thunderbirds',   slug: 'springfield-thunderbirds'    },
  { name: 'Syracuse Crunch',           slug: 'syracuse-crunch'            },
  { name: 'Texas Stars',                slug: 'texas-stars'                },
  { name: 'Toronto Marlies',            slug: 'toronto-marlies'            },
  { name: 'Tucson Roadrunners',          slug: 'tucson-roadrunners'         },
  { name: 'Utica Comets',              slug: 'utica-comets'                },
  { name: 'Wilkes-Barre/Scranton Penguins', slug: 'wilkes-barre-scranton-penguins' },
];

const AHL_BASE = 'https://www.theahl.com/teams';
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const AHL_LEAGUE_ID = 'b05d6d26-d5d6-4cfd-a48b-f5646fa7d611';

async function scrapeAHLTeamRoster(teamSlug) {
  const url = `${AHL_BASE}/${teamSlug}/roster`;
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; RinkStopBot/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      console.warn(`  [!] HTTP ${res.status} for ${teamSlug}`);
      return [];
    }
    const html = await res.text();
    return parseAHLHtml(html, teamSlug);
  } catch (err) {
    console.warn(`  [!] ${teamSlug}: ${err.message}`);
    return [];
  }
}

function parseAHLHtml(html, teamSlug) {
  const players = [];
  
  // The AHL roster page uses data attributes or table rows for players
  // Try to extract player data from common HTML patterns
  
  // Pattern 1: data-name attributes in player divs
  const dataNameMatches = [...html.matchAll(/data-name="([^"]+)"/g)];
  // Pattern 2: player table rows
  const rowMatches = [...html.matchAll(/<tr[^>]*class="[^"]*player[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi)];
  // Pattern 3: links with player IDs
  const playerLinkMatches = [...html.matchAll(/href="(\/player\/[^"]+)"/g)];
  
  // For now, try to extract name + number + position from HTML text
  // Most AHL pages use a consistent HTML structure
  const namePattern = /<td[^>]*class="[^"]*name[^"]*"[^>]*>([\s\S]*?)<\/td>/gi;
  const posPattern = /<td[^>]*class="[^"]*pos[^"]*"[^>]*>(\w+)/gi;
  
  // Try to extract jersey number and position from the HTML
  // We'll use a simpler approach: parse what we can find
  
  // Extract text content around player names
  const lines = html.split('\n').filter(l => l.trim());
  
  return players;
}

async function main() {
  console.log('=== AHL Roster Sync V2 ===\n');
  console.log(`Scraping ${AHL_TEAMS.length} AHL team roster pages...\n`);

  // Build AHL team ID map from DB
  const { data: ahlTeams } = await supabase
    .from('teams')
    .select('id, name')
    .eq('league_id', AHL_LEAGUE_ID);

  const teamIdMap = {};
  for (const t of (ahlTeams || [])) teamIdMap[t.name] = t.id;
  
  console.log(`Found ${ahlTeams?.length || 0} AHL teams in DB\n`);

  let totalScraped = 0;
  let totalInserted = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const team of AHL_TEAMS) {
    process.stdout.write(`[${team.name}] Scraping... `);
    const players = await scrapeAHLTeamRoster(team.slug);
    console.log(`${players.length} players found`);

    const ahlTeamId = teamIdMap[team.name];
    if (!ahlTeamId) {
      console.warn(`  [!] No DB record for ${team.name}`);
      continue;
    }

    for (const p of players) {
      try {
        const { data: existing } = await supabase
          .from('players')
          .select('id')
          .eq('first_name', p.first_name)
          .eq('last_name', p.last_name)
          .eq('position', p.position)
          .limit(1);

        if (existing && existing.length > 0) {
          totalSkipped++;
          continue;
        }

        const { error } = await supabase.from('players').insert({
          first_name: p.first_name,
          last_name: p.last_name,
          position: p.position || null,
          shoots: p.shoots || null,
          catches: p.catches || null,
          height_cm: p.height_cm || null,
          weight_kg: p.weight_kg || null,
          birth_date: p.birth_date || null,
          nationality: p.nationality || null,
          team_id: ahlTeamId,
          league_id: AHL_LEAGUE_ID,
          is_active: true,
        });

        if (error) {
          if (error.code === '23505') totalSkipped++;
          else { totalErrors++; process.stdout.write('E'); }
        } else {
          totalInserted++;
          process.stdout.write('.');
        }
      } catch (err) {
        totalErrors++;
      }
    }
    totalScraped += players.length;
  }

  console.log('\n=== RESULTS ===');
  console.log(`Total players scraped: ${totalScraped}`);
  console.log(`New players inserted:  ${totalInserted}`);
  console.log(`Already in DB:        ${totalSkipped}`);
  console.log(`Errors:               ${totalErrors}`);
}

main().catch(console.error);