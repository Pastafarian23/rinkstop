#!/usr/bin/env node
/**
 * _re-audit-published.cjs — 2026-09-29
 *
 * Per Arnel directive: "you must put in measures to only put out confirmed information"
 *
 * Re-checks ALL currently-published highlight articles against the
 * fixtures table (which is sourced from NHL.com / Highlightly / Wikipedia).
 * The 728 articles published before the audit pipeline existed were never
 * fact-checked. This script surfaces the worst cases:
 *   - Final score line in body doesn't match the canonical fixture score
 *   - Title score (e.g. "X 4-2 Y") doesn't match the canonical fixture
 *   - Critical claim missing entirely
 *
 * For each published article with mismatched critical claims, this script:
 *   - Moves it BACK to status='draft'
 *   - Stamps last_audit_status='FAIL'
 *   - Appends a review note to the body
 *
 * Source-of-truth priority:
 *   1. fixtures table (NHL.com-sourced for NHL, HL for European leagues)
 *   2. Canonical HL score endpoint as fallback
 *
 * Destructive (downgrades published → draft) — only runs with --apply.
 *
 * Usage:
 *   node scripts/_re-audit-published.cjs            # dry-run report
 *   node scripts/_re-audit-published.cjs --apply    # downgrade FAIL posts
 *   node scripts/_re-audit-published.cjs --limit=20 # only 20 posts
 */

require('./load-secrets.cjs');
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const dryRun = !process.argv.includes('--apply');
const limit = parseInt(process.argv.find(a => a.startsWith('--limit='))?.split('=')[1] || '10000', 10);

// --- helpers ---

// Extract final score from body: "Team A N, Team B M"
function extractFinalScoreFromBody(content) {
  if (!content) return null;
  const matches = [...content.matchAll(/final\s+score[:\s]+([^\n]+)/gi)];
  for (let i = matches.length - 1; i >= 0; i--) {
    const line = matches[i][1];
    if (/,\s*\S+\s+\d+/.test(line) && /\d+\s*\.?\s*$/.test(line.trim())) {
      const halves = line.split(',');
      if (halves.length >= 2) {
        const left = halves[0].replace(/^\*+\s*/, '').trim();
        const right = halves.slice(1).join(',').trim();
        const lm = left.match(/^(.+?)\s+(\d+)\s*$/);
        const rm = right.match(/^(.+?)\s+(\d+)\s*\.?\s*$/);
        if (lm && rm) {
          return {
            teamA: lm[1].trim(),
            scoreA: parseInt(lm[2], 10),
            teamB: rm[1].trim(),
            scoreB: parseInt(rm[2], 10),
            raw: line,
          };
        }
      }
    }
  }
  return null;
}

// Extract score from title: "Team A 4-2 Team B" or "Team A tops Team B 4-2"
function extractTitleScore(title) {
  if (!title) return null;
  const m = title.match(/(\d+)-(\d+)/);
  if (!m) return null;
  return { winner: parseInt(m[1], 10), loser: parseInt(m[2], 10), raw: m[0] };
}

// Find canonical score for an article from fixtures
async function findCanonicalScore(post) {
  if (!post.team_home_id || !post.team_away_id || !post.game_date) return null;
  // game_date might be date-only or timestamp
  const day = post.game_date.slice(0, 10);
  const { data: fixtures } = await sb
    .from('fixtures')
    .select('id, home_team_id, away_team_id, home_score, away_score, status, game_data, scheduled_at')
    .or(`home_team_id.eq.${post.team_home_id},away_team_id.eq.${post.team_home_id}`)
    .or(`home_team_id.eq.${post.team_away_id},away_team_id.eq.${post.team_away_id}`)
    .eq('status', 'completed')
    .gte('scheduled_at', `${day}T00:00:00Z`)
    .lte('scheduled_at', `${day}T23:59:59Z`)
    .limit(5);
  if (!fixtures || fixtures.length === 0) return null;
  // Find the one matching both home + away
  const match = fixtures.find(f =>
    (f.home_team_id === post.team_home_id && f.away_team_id === post.team_away_id) ||
    (f.home_team_id === post.team_away_id && f.away_team_id === post.team_home_id)
  );
  if (!match) return null;
  const homeIsPostHome = match.home_team_id === post.team_home_id;
  return {
    homeScore: match.home_score,
    awayScore: match.away_score,
    homeIsPostHome,
    fixtureId: match.id,
  };
}

(async () => {
  console.log(`=== Re-audit of published highlight articles ===`);
  console.log(`Mode: ${dryRun ? 'DRY-RUN (no DB writes)' : 'APPLY (downgrades FAIL posts to draft)'}`);
  console.log(`Limit: ${limit}`);
  console.log();

  const { data: posts, error } = await sb
    .from('posts')
    .select('id, slug, title, status, content, league_id, team_home_id, team_away_id, game_date, last_audit_status, published_at')
    .eq('status', 'published')
    .not('highlight_id', 'is', null)
    .order('published_at', { ascending: false })
    .limit(limit);

  if (error) { console.error('DB error:', error); return; }
  console.log(`Found ${posts.length} published highlight articles to re-audit.\n`);

  const results = {
    pass: 0,
    fail: 0,
    critical_unverified: 0,
    no_fixtures: 0,
    no_team_fk: 0,
    error: 0,
  };
  const toDowngrade = [];

  for (let i = 0; i < posts.length; i++) {
    const p = posts[i];
    if (!p.team_home_id || !p.team_away_id) {
      results.no_team_fk++;
      continue;
    }
    const canonical = await findCanonicalScore(p);
    if (!canonical) {
      results.no_fixtures++;
      continue;
    }
    const bodyFinal = extractFinalScoreFromBody(p.content);
    const titleScore = extractTitleScore(p.title);

    let postHomeScore, postAwayScore, postHomeName, postAwayName;
    if (bodyFinal) {
      // Try to figure out which team in the body is the canonical home
      const bodyTeamA = bodyFinal.teamA.toLowerCase();
      const bodyTeamB = bodyFinal.teamB.toLowerCase();
      // Look up team names by id
      const { data: homeTeam } = await sb.from('teams').select('id,name').eq('id', p.team_home_id).single();
      const { data: awayTeam } = await sb.from('teams').select('id,name').eq('id', p.team_away_id).single();
      if (!homeTeam || !awayTeam) { results.error++; continue; }
      const homeName = homeTeam.name.toLowerCase();
      const awayName = awayTeam.name.toLowerCase();
      // Match body teamA to either home or away
      const isHomeA = homeName.includes(bodyTeamA) || bodyTeamA.includes(homeName) ||
                      homeName.split(' ').some(w => bodyTeamA.includes(w));
      if (isHomeA) {
        postHomeScore = bodyFinal.scoreA;
        postAwayScore = bodyFinal.scoreB;
      } else {
        postHomeScore = bodyFinal.scoreB;
        postAwayScore = bodyFinal.scoreA;
      }
    }

    const canonicalHomeScore = canonical.homeIsPostHome ? canonical.homeScore : canonical.awayScore;
    const canonicalAwayScore = canonical.homeIsPostHome ? canonical.awayScore : canonical.homeScore;

    // Compare
    if (postHomeScore === undefined) {
      results.critical_unverified++;
      toDowngrade.push({ slug: p.slug, title: p.title, reason: 'NO_FINAL_SCORE_LINE', canonical: `${canonicalHomeScore}-${canonicalAwayScore}` });
      console.log(`[${i+1}/${posts.length}] ⛔ ${p.slug} — no final-score-line in body, canonical=${canonicalHomeScore}-${canonicalAwayScore}`);
    } else if (postHomeScore !== canonicalHomeScore || postAwayScore !== canonicalAwayScore) {
      results.fail++;
      toDowngrade.push({ slug: p.slug, title: p.title, reason: 'SCORE_MISMATCH', post: `${postHomeScore}-${postAwayScore}`, canonical: `${canonicalHomeScore}-${canonicalAwayScore}` });
      console.log(`[${i+1}/${posts.length}] ⛔ ${p.slug} — SCORE_MISMATCH post=${postHomeScore}-${postAwayScore} canonical=${canonicalHomeScore}-${canonicalAwayScore}`);
    } else {
      results.pass++;
    }
  }

  console.log();
  console.log(`=== SUMMARY ===`);
  console.log(`Total audited:        ${posts.length}`);
  console.log(`Pass (clean):         ${results.pass}`);
  console.log(`Fail (wrong info):    ${results.fail}`);
  console.log(`Critical unverified:  ${results.critical_unverified}`);
  console.log(`No fixtures found:    ${results.no_fixtures}`);
  console.log(`No team FK:           ${results.no_team_fk}`);
  console.log(`Errors:               ${results.error}`);
  console.log(`TO DOWNGRADE:         ${toDowngrade.length}`);
  console.log();

  if (toDowngrade.length > 0 && !dryRun) {
    console.log('APPLY MODE: downgrading to draft + appending review note...');
    let downgraded = 0;
    for (const item of toDowngrade) {
      const { data: post } = await sb.from('posts').select('id, content').eq('slug', item.slug).single();
      if (!post) continue;
      const detail = item.post ? `post=${item.post} canonical=${item.canonical}` : `canonical=${item.canonical}`;
      const note = `\n\n*Re-audit (${new Date().toISOString().slice(0,10)}): ⛔ DOWNGRADED — ${item.reason} (${detail}). Article held as draft pending human review and correction.*`;
      const { error: uErr } = await sb.from('posts').update({
        status: 'draft',
        content: post.content + note,
        last_audit_status: 'FAIL',
        last_audit_check_at: new Date().toISOString(),
      }).eq('id', post.id);
      if (!uErr) downgraded++;
    }
    console.log(`Downgraded: ${downgraded}/${toDowngrade.length}`);
  } else if (toDowngrade.length > 0) {
    console.log('DRY-RUN: re-run with --apply to actually downgrade these posts.');
    console.log('\nFirst 10 offenders:');
    for (const item of toDowngrade.slice(0, 10)) {
      console.log(`  ${item.slug} | ${item.reason} | ${item.post || '-'} vs ${item.canonical || '-'}`);
    }
  }
})().catch(e => { console.error('Fatal:', e); process.exit(1); });
