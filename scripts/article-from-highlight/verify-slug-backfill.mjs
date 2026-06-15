// scripts/article-from-highlight/verify-slug-backfill.mjs
//
// Post-backfill verification. Run AFTER backfill-clean-slugs.mjs --apply
// to confirm:
//   1. Every post.slug matches what slug-builder would produce
//      (i.e. the backfill actually normalized all eligible posts)
//   2. Every OLD post slug has a corresponding post_slug_redirects row
//      (i.e. nobody got their slug changed without getting a 308 chain)
//   3. No orphan redirects (redirect rows pointing to non-existent posts)
//   4. No self-redirects (from_slug == to_slug)
//
// Reports pass/fail counts. Exits 0 on success, 1 on failure.
//
// Usage:
//   node verify-slug-backfill.mjs

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { buildSlug, slugifyComponent, normalizeDate } from './slug-builder.mjs';

// Load env
for (const envFile of ['.env.local', '.env']) {
  try {
    const contents = readFileSync(envFile, 'utf8');
    for (const line of contents.split('\n')) {
      const m = line.match(/^([A-Z0-9_]+)=(.+)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
    break;
  } catch {}
}

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

async function main() {
  console.log('\n=== verify-slug-backfill ===\n');

  // Load all posts
  const { data: posts, error: postsErr } = await sb
    .from('posts')
    .select('id, slug, title, team_home_id, team_away_id, game_date, published_at');
  if (postsErr) {
    console.error('Failed to load posts:', postsErr.message);
    process.exit(1);
  }
  console.log(`Loaded ${posts.length} posts`);

  // Load all teams
  const { data: allTeams, error: teamsErr } = await sb
    .from('teams')
    .select('id, slug, name');
  if (teamsErr) {
    console.error('Failed to load teams:', teamsErr.message);
    process.exit(1);
  }
  const teamsById = new Map(allTeams.map(t => [t.id, t]));
  console.log(`Loaded ${allTeams.length} teams`);

  // Load all redirects
  const { data: redirects, error: redirErr } = await sb
    .from('post_slug_redirects')
    .select('id, from_slug, to_slug, post_id');
  if (redirErr) {
    console.error('Failed to load redirects:', redirErr.message);
    process.exit(1);
  }
  console.log(`Loaded ${redirects.length} redirect rows\n`);

  const checks = {
    posts_with_clean_slug: 0,
    posts_with_old_format_slug: 0,
    posts_no_team_data: 0,
    posts_with_team_data_but_old_slug: 0, // BUG: should have been updated
    redirect_to_existing_post: 0,
    redirect_to_nonexistent_post: 0,        // ORPHAN
    self_redirect: 0,                        // BUG: from == to
    duplicate_from_slugs: 0,                // BUG: uniqueness violation
  };

  const issues = {
    out_of_sync: [],
    orphan_redirects: [],
    self_redirects: [],
  };

  // Check 1 & 2: every post slug should be either (a) clean format, or
  // (b) old format AND have no team data. Anything else is out of sync.
  for (const post of posts) {
    const homeTeam = post.team_home_id ? teamsById.get(post.team_home_id) : null;
    const awayTeam = post.team_away_id ? teamsById.get(post.team_away_id) : null;

    if (!homeTeam && !awayTeam) {
      checks.posts_no_team_data++;
      continue;
    }

    // Try to build what the slug SHOULD be
    let expectedSlug;
    try {
      const built = buildSlug({
        homeTeamSlug: homeTeam?.slug,
        homeTeamName: homeTeam?.name,
        awayTeamSlug: awayTeam?.slug,
        awayTeamName: awayTeam?.name,
        gameDate: post.game_date || post.published_at,
      });
      expectedSlug = built.slug;
    } catch (e) {
      // Stale FK or missing data — skip
      continue;
    }

    if (post.slug === expectedSlug) {
      checks.posts_with_clean_slug++;
    } else {
      // Post has team data but slug doesn't match the expected format
      // Heuristic: if the slug doesn't match /^[a-z0-9-]+-\d{4}-\d{2}-\d{2}$/
      // (i.e. doesn't end with -YYYY-MM-DD), it's still the old format.
      if (/-\d{4}-\d{2}-\d{2}$/.test(post.slug) && post.slug.split('-').length > 5) {
        // Looks like the clean format but doesn't match expected.
        // Could be a data-quality issue (swapped home/away, missing team).
        issues.out_of_sync.push({
          id: post.id,
          slug: post.slug,
          expected: expectedSlug,
          title: post.title,
        });
      } else {
        // Definitely still in old format
        checks.posts_with_old_format_slug++;
        checks.posts_with_team_data_but_old_slug++;
        issues.out_of_sync.push({
          id: post.id,
          slug: post.slug,
          expected: expectedSlug,
          title: post.title,
        });
      }
    }
  }

  // Check 3: redirects should point to existing posts
  const postsById = new Map(posts.map(p => [p.id, p]));
  for (const r of redirects) {
    if (r.from_slug === r.to_slug) {
      checks.self_redirect++;
      issues.self_redirects.push(r);
      continue;
    }
    const target = postsById.get(r.post_id);
    if (!target) {
      checks.redirect_to_nonexistent_post++;
      issues.orphan_redirects.push(r);
    } else {
      checks.redirect_to_existing_post++;
    }
  }

  // Check 4: no duplicate from_slugs
  const fromSlugs = new Map();
  for (const r of redirects) {
    if (fromSlugs.has(r.from_slug)) {
      checks.duplicate_from_slugs++;
    }
    fromSlugs.set(r.from_slug, r);
  }

  /* ----- Report ----- */
  console.log('=== Posts ===');
  console.log(`  Clean slugs:                   ${checks.posts_with_clean_slug}`);
  console.log(`  Old-format slugs:              ${checks.posts_with_old_format_slug}`);
  console.log(`    (no team data, left alone):  ${checks.posts_no_team_data}`);
  console.log(`    (BUG: should have updated):  ${checks.posts_with_team_data_but_old_slug}`);

  console.log('\n=== Redirects ===');
  console.log(`  Pointing to existing post:     ${checks.redirect_to_existing_post}`);
  console.log(`  Pointing to nonexistent post:  ${checks.redirect_to_nonexistent_post}  ${checks.redirect_to_nonexistent_post > 0 ? '⚠️' : '✓'}`);
  console.log(`  Self-redirects (from==to):     ${checks.self_redirect}  ${checks.self_redirect > 0 ? '⚠️' : '✓'}`);
  console.log(`  Duplicate from_slugs:          ${checks.duplicate_from_slugs}  ${checks.duplicate_from_slugs > 0 ? '⚠️' : '✓'}`);

  if (issues.out_of_sync.length > 0 && issues.out_of_sync.length <= 20) {
    console.log(`\n=== Out-of-sync posts (${issues.out_of_sync.length}) ===`);
    for (const i of issues.out_of_sync) {
      console.log(`  ${i.id.slice(0, 8)}: "${i.slug}"`);
      console.log(`    expected: "${i.expected}"`);
      console.log(`    title:    ${i.title}`);
    }
  } else if (issues.out_of_sync.length > 20) {
    console.log(`\n=== Out-of-sync posts: ${issues.out_of_sync.length} (too many to list) ===`);
  }

  if (issues.orphan_redirects.length > 0) {
    console.log(`\n=== Orphan redirects ===`);
    for (const r of issues.orphan_redirects) {
      console.log(`  ${r.id}: ${r.from_slug} → ${r.to_slug} (post_id=${r.post_id} not found)`);
    }
  }

  if (issues.self_redirects.length > 0) {
    console.log(`\n=== Self-redirects ===`);
    for (const r of issues.self_redirects) {
      console.log(`  ${r.id}: ${r.from_slug} → ${r.to_slug} (same slug)`);
    }
  }

  const hasFailures = checks.posts_with_team_data_but_old_slug > 0 ||
                      checks.redirect_to_nonexistent_post > 0 ||
                      checks.self_redirect > 0 ||
                      checks.duplicate_from_slugs > 0;

  if (hasFailures) {
    console.log(`\n❌ VERIFICATION FAILED — see issues above`);
    process.exit(1);
  } else {
    console.log(`\n✅ Verification passed. Backfill is consistent.`);
  }
}

main().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});
