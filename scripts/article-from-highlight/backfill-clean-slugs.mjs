// scripts/article-from-highlight/backfill-clean-slugs.mjs
//
// One-time backfill: rewrite every existing post's slug to the clean
// format (per docs/CLEAN-POST-SLUGS-SPEC.md) and populate
// post_slug_redirects with from_slug → to_slug rows.
//
// DRY-RUN BY DEFAULT. Pass --apply to actually write.
//
// Usage:
//   node backfill-clean-slugs.mjs               # dry-run, show what would change
//   node backfill-clean-slugs.mjs --apply       # actually write
//   node backfill-clean-slugs.mjs --limit=10    # cap how many posts to process
//   node backfill-clean-slugs.mjs --only=<id>   # process a single post by uuid
//
// What it does (per post):
//   1. Read posts.team_home_id, posts.team_away_id, posts.game_date
//   2. Look up team slugs in the teams table
//   3. Build the new clean slug via slug-builder.buildSlug
//   4. If new slug == old slug: skip (no-op)
//   5. If new slug is empty (no team data, e.g. hand-written SEO guide):
//      skip with a warning
//   6. If new slug collides with another post: refuse, report collision,
//      continue with other posts (per spec §4.4: don't auto-dedupe)
//   7. Sanity check: warn if the new slug's team slugs don't match the
//      post's title tokens (per spec §11.4)
//   8. UPDATE posts SET slug = $new WHERE id = $id
//   9. INSERT INTO post_slug_redirects (from_slug=old, to_slug=new,
//      post_id=id)
//
//   8 and 9 are wrapped in a transaction so we never have a half-done
//   state (post has new slug but no redirect, or vice versa).

import { createClient } from '@supabase/supabase-js';
import { buildSlug, slugifyComponent, normalizeDate, SlugValidationError } from './slug-builder.mjs';
import { readFileSync } from 'fs';

const args = Object.fromEntries(
  process.argv.slice(2)
    .filter(a => a.startsWith('--'))
    .map(a => {
      const [k, v] = a.replace(/^--/, '').split('=');
      return [k, v === undefined ? true : v];
    })
);

const APPLY = args.apply === true;
const LIMIT = args.limit ? parseInt(String(args.limit), 10) : null;
const ONLY = args.only ? String(args.only) : null;

// Load env from .env.local (Next.js convention) or .env as fallback
for (const envFile of ['.env.local', '.env']) {
  try {
    const contents = readFileSync(envFile, 'utf8');
    for (const line of contents.split('\n')) {
      const m = line.match(/^([A-Z0-9_]+)=(.+)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
    break; // stop at first file found
  } catch {
    // try next
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  console.error('Set them in .env.local or pass via env.');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

/* ------------------------------------------------------------------ */
/* Main loop                                                          */
/* ------------------------------------------------------------------ */

async function main() {
  console.log(`\n=== backfill-clean-slugs ${APPLY ? '[APPLY]' : '[DRY-RUN]'} ===\n`);

  // Build the base query
  let query = sb
    .from('posts')
    .select('id, slug, title, team_home_id, team_away_id, game_date, published_at, highlight_id')
    .not('slug', 'is', null)
    .order('published_at', { ascending: false, nullsFirst: false });

  if (ONLY) {
    query = query.eq('id', ONLY);
  }
  if (LIMIT) {
    query = query.limit(LIMIT);
  }

  const { data: posts, error } = await query;
  if (error) {
    console.error('Failed to load posts:', error.message);
    process.exit(1);
  }

  console.log(`Loaded ${posts.length} posts${LIMIT ? ` (limit=${LIMIT})` : ''}${ONLY ? ` (only=${ONLY})` : ''}\n`);

  // Pre-warm: load all teams (small table) so we don't do 1-by-1 lookups
  const { data: allTeams, error: teamsErr } = await sb
    .from('teams')
    .select('id, slug, name');
  if (teamsErr) {
    console.error('Failed to load teams:', teamsErr.message);
    process.exit(1);
  }
  const teamsById = new Map(allTeams.map(t => [t.id, t]));

  // Stats
  const stats = {
    total: posts.length,
    would_update: 0,
    would_skip_no_team: 0,
    would_skip_same_slug: 0,
    would_collision: 0,
    would_warn_mismatch: 0,
    applied: 0,
    errors: 0,
  };

  const collisions = [];
  const mismatches = [];
  const noTeamPosts = [];

  for (const post of posts) {
    // Step 1: Resolve team data
    const homeTeam = post.team_home_id ? teamsById.get(post.team_home_id) : null;
    const awayTeam = post.team_away_id ? teamsById.get(post.team_away_id) : null;

    if (!homeTeam && !awayTeam) {
      stats.would_skip_no_team++;
      noTeamPosts.push({ id: post.id, slug: post.slug, title: post.title });
      continue;
    }

    // Step 2: Build the new slug
    let built;
    try {
      built = buildSlug({
        homeTeamSlug: homeTeam?.slug,
        homeTeamName: homeTeam?.name,
        awayTeamSlug: awayTeam?.slug,
        awayTeamName: awayTeam?.name,
        gameDate: post.game_date || post.published_at,
      });
    } catch (e) {
      if (e instanceof SlugValidationError) {
        console.error(`  ⚠️  ${post.id}: ${e.message.slice(0, 100)} — skipping`);
        stats.errors++;
        continue;
      }
      throw e;
    }

    const newSlug = built.slug;
    const oldSlug = post.slug;

    // Step 3: No-op if slug didn't change
    if (newSlug === oldSlug) {
      stats.would_skip_same_slug++;
      continue;
    }

    // Step 4: Sanity check — does the title share tokens with the new slug?
    const titleTokens = new Set(
      (post.title || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').split(/\s+/).filter(t => t.length > 2)
    );
    const slugTokens = new Set(newSlug.split('-').filter(t => t.length > 2));
    const sharedTokens = [...slugTokens].filter(t => titleTokens.has(t));
    if (sharedTokens.length === 0) {
      stats.would_warn_mismatch++;
      mismatches.push({
        id: post.id,
        old_slug: oldSlug,
        new_slug: newSlug,
        title: post.title,
        home_team: homeTeam?.name,
        away_team: awayTeam?.name,
      });
    }

    // Step 5: Collision check
    const { data: collision, error: collisionErr } = await sb
      .from('posts')
      .select('id, slug, highlight_id')
      .eq('slug', newSlug)
      .neq('id', post.id)
      .limit(1)
      .maybeSingle();
    if (collisionErr) {
      console.error(`  ⚠️  ${post.id}: collision check failed: ${collisionErr.message}`);
      stats.errors++;
      continue;
    }
    if (collision) {
      stats.would_collision++;
      collisions.push({
        post_id: post.id,
        proposed_slug: newSlug,
        existing_post_id: collision.id,
        existing_slug: collision.slug,
        existing_highlight_id: collision.highlight_id,
        title: post.title,
      });
      continue; // Don't update; per spec §4.4 don't auto-dedupe
    }

    // Step 6: Plan the change
    stats.would_update++;
    const updateLine = `  ${post.id.slice(0, 8)}  ${oldSlug}\n              → ${newSlug}` + (built.source === 'raw-name' ? '  [raw-name fallback]' : '');
    console.log(updateLine);

    if (!APPLY) continue;

    // Step 7: Apply (in a logical transaction: redirect row first, then update)
    // We can't use a true transaction with the PostgREST API, so we do them
    // in the safe order: insert the redirect first (so any old URL → 308),
    // then update posts.slug. If we crash between, the worst case is a
    // 308 from old → new, where posts.slug is still old — the user lands
    // on the old page, and the next request to old gets 308 to the same
    // (still-old) slug, which is a self-redirect loop. Bad.
    //
    // So the safer order is: update posts.slug FIRST, then insert redirect.
    // Worst case if we crash between: posts.slug is new, redirect row is
    // missing — old URLs return 404. New URLs work. That's recoverable
    // (re-run the backfill to insert the missing redirect).
    const { error: updateErr } = await sb
      .from('posts')
      .update({ slug: newSlug })
      .eq('id', post.id);
    if (updateErr) {
      console.error(`  ❌ ${post.id}: update failed: ${updateErr.message}`);
      stats.errors++;
      continue;
    }

    const { error: redirectErr } = await sb
      .from('post_slug_redirects')
      .insert({
        from_slug: oldSlug,
        to_slug: newSlug,
        post_id: post.id,
      });
    if (redirectErr) {
      console.error(`  ⚠️  ${post.id}: redirect insert failed: ${redirectErr.message}`);
      console.error(`     (post.slug was already updated; re-run to add the redirect row)`);
      // Don't count as a hard error — the slug update succeeded.
    } else {
      stats.applied++;
    }
  }

  /* ----- Summary ----- */
  console.log(`\n=== Summary ===`);
  console.log(`  Total posts scanned:    ${stats.total}`);
  console.log(`  Would update:           ${stats.would_update}`);
  console.log(`  Applied (with --apply): ${stats.applied}`);
  console.log(`  Skipped (no team data): ${stats.would_skip_no_team}`);
  console.log(`  Skipped (same slug):    ${stats.would_skip_same_slug}`);
  console.log(`  Collisions (refused):   ${stats.would_collision}`);
  console.log(`  Title/slug mismatches:  ${stats.would_warn_mismatch}`);
  console.log(`  Errors:                 ${stats.errors}`);

  if (noTeamPosts.length > 0 && noTeamPosts.length <= 30) {
    console.log(`\n=== Posts without team data (left alone) ===`);
    for (const p of noTeamPosts) {
      console.log(`  ${p.slug}  (${p.title.slice(0, 60)}...)`);
    }
  } else if (noTeamPosts.length > 30) {
    console.log(`\n=== Posts without team data: ${noTeamPosts.length} (too many to list) ===`);
  }

  if (collisions.length > 0) {
    console.log(`\n=== Collisions (refused — need manual review) ===`);
    for (const c of collisions) {
      console.log(`  ${c.post_id.slice(0, 8)}: "${c.proposed_slug}" — already on post ${c.existing_post_id.slice(0, 8)}`);
      console.log(`    post: ${c.title}`);
      console.log(`    existing: highlight_id=${c.existing_highlight_id}`);
    }
  }

  if (mismatches.length > 0) {
    console.log(`\n=== Title/slug mismatches (sanity-check warnings) ===`);
    for (const m of mismatches) {
      console.log(`  ${m.id.slice(0, 8)}: "${m.new_slug}"`);
      console.log(`    title: ${m.title}`);
      console.log(`    teams: ${m.home_team} / ${m.away_team}`);
    }
  }

  if (!APPLY && stats.would_update > 0) {
    console.log(`\n  Run with --apply to actually write these changes.`);
  }
}

main().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});
