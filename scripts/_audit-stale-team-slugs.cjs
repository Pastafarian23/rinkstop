#!/usr/bin/env node
/**
 * _audit-stale-team-slugs.cjs
 *
 * Audits team_workspaces for inactive slugs that have an active sibling
 * (same team, different slug). Emits a list of stale redirects to add
 * to next.config.js so users hitting the old slug land on the active
 * page instead of a 404.
 *
 * Detection strategies (in priority order):
 *   1. Slug prefix: inactive.slug starts with active.slug + '-'
 *      (e.g. 'jokerit-u20' → 'jokerit')
 *   2. Name prefix: inactive.name starts with active.name (e.g.
 *      'Jokerit Helsinki' → 'Jokerit' — first-word match)
 *   3. Same home_city + name overlap: inactive.name contains active.name
 *      AND both have same home_city (e.g. 'Moose Jaw Canucks' → 'Moose
 *      Jaw Warriors' via shared city)
 *
 * Skips rows already covered by the simpler regex-based filter
 * (historical/u20/women/men suffix) since those are handled by
 * earlier audits.
 *
 * Run: node scripts/_audit-stale-team-slugs.cjs [--write]
 *   --write: append the redirects to next.config.js (default: dry-run)
 *
 * Reads: team_workspaces table (paginated, 1000 rows per page).
 * Writes: /tmp/stale-team-slugs.json (always) + next.config.js (--write).
 */

require('fs').readFileSync(__dirname + '/../.env', 'utf8').split('\n').forEach(l => {
  const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
});
const { createClient } = require('@supabase/supabase-js');

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

async function fetchAllTeamWorkspaces() {
  const all = [];
  let from = 0;
  const PAGE = 1000;
  while (true) {
    const to = from + PAGE - 1;
    const { data, error } = await sb
      .from('team_workspaces')
      .select('slug, name, home_city, is_active')
      .range(from, to);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

function findRedirects(inactive, actives) {
  // Strategy 1: slug prefix (most reliable)
  for (const a of actives) {
    if (inactive.slug.startsWith(a.slug + '-') && inactive.slug !== a.slug) {
      return { to: a.slug, reason: 'slug-prefix' };
    }
  }
  // Strategy 2: inactive.name first-word === active.name
  const inactiveFirstWord = inactive.name.split(/\s+/)[0];
  for (const a of actives) {
    if (a.name === inactiveFirstWord && a.slug !== inactive.slug) {
      return { to: a.slug, reason: 'name-prefix' };
    }
  }
  // Strategy 3: same home_city + name substring overlap
  if (inactive.home_city) {
    for (const a of actives) {
      if (
        a.home_city &&
        a.home_city.toLowerCase() === inactive.home_city.toLowerCase() &&
        inactive.name.toLowerCase().includes(a.name.toLowerCase()) &&
        inactive.name !== a.name
      ) {
        return { to: a.slug, reason: 'same-city-name-contains' };
      }
    }
  }
  // Strategy 4 (2026-09-22): same home_city + same first-word + unique active sibling.
  // Catches cases like 'Moose Jaw Canucks' → 'Moose Jaw Warriors' where the
  // team names don't overlap but the first word + city match identifies them
  // as the same franchise (rename with no shared name substring).
  if (inactive.home_city) {
    const cityMatches = actives.filter(a =>
      a.home_city && a.home_city.toLowerCase() === inactive.home_city.toLowerCase() &&
      a.name !== inactive.name
    );
    // Filter to those with the same first word (e.g. 'Moose Jaw')
    const firstWordMatches = cityMatches.filter(a =>
      a.name.split(/\s+/)[0] === inactiveFirstWord
    );
    // If exactly 1 such match, use it (unambiguous rename)
    if (firstWordMatches.length === 1) {
      const a = firstWordMatches[0];
      return { to: a.slug, reason: 'same-city-same-first-word-rename' };
    }
  }
  return null;
}

async function main() {
  const args = process.argv.slice(2);
  const writeMode = args.includes('--write');

  console.log(`Fetching team_workspaces (paginated)...`);
  const all = await fetchAllTeamWorkspaces();
  const inactives = all.filter((t) => t.is_active === false);
  const actives = all.filter((t) => t.is_active === true);
  console.log(`Total: ${all.length}, Inactives: ${inactives.length}, Actives: ${actives.length}`);

  // Skip rows that are clearly historical/u20/women/men suffix — those
  // were already covered by the simpler regex audit.
  const skipRegex = /(\(historical\)|\bU20\b|\bWomen\b|\bMen\b)/i;
  const candidates = inactives.filter((i) => !skipRegex.test(i.name));
  console.log(`Candidates for city/slug matching: ${candidates.length}`);

  const redirects = [];
  const seen = new Set();
  for (const i of candidates) {
    const r = findRedirects(i, actives);
    if (!r) continue;
    const key = `${i.slug}|${r.to}`;
    if (seen.has(key)) continue;
    seen.add(key);
    redirects.push({
      from: i.slug,
      to: r.to,
      fromName: i.name,
      toName: actives.find((a) => a.slug === r.to)?.name,
      city: i.home_city,
      reason: r.reason,
    });
  }

  require('fs').writeFileSync(
    '/tmp/stale-team-slugs.json',
    JSON.stringify(redirects, null, 2),
  );
  console.log(`Total stale redirects: ${redirects.length}`);
  console.log(`Sample:`);
  for (const r of redirects.slice(0, 5)) {
    console.log(`  ${r.from} → ${r.to}  (${r.reason}, ${r.city || 'no-city'})`);
  }

  if (writeMode) {
    // Build the JS array literal
    const lines = ['      // 2026-09-22 audit fix (bug #8 + jokerit-helsinki): stale team redirects',
                   '      // generated by scripts/_audit-stale-team-slugs.cjs --write.',
                   '      '];
    for (const r of redirects) {
      lines.push(`      { source: '/directory/teams/${r.from}', destination: '/directory/teams/${r.to}', permanent: true },`);
    }
    const block = lines.join('\n') + '\n';

    const cfgPath = __dirname + '/../next.config.js';
    let cfg = require('fs').readFileSync(cfgPath, 'utf8');
    const marker = '// AdSense cleanliness';
    const idx = cfg.indexOf(marker);
    if (idx === -1) {
      console.error('Marker not found in next.config.js — aborting');
      process.exit(2);
    }
    cfg = cfg.slice(0, idx) + block + '\n' + cfg.slice(idx);
    require('fs').writeFileSync(cfgPath, cfg);
    console.log(`Wrote ${redirects.length} redirects to next.config.js`);
  } else {
    console.log('DRY RUN — pass --write to append to next.config.js');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
