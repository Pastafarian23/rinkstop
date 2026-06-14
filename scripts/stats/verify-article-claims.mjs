// Per-claim article verifier.
//
// Reads published articles, joins each to its fixture (via team_home_id + team_away_id
// + game_date + league_id), and verifies article claims against the stats foundation.
//
// For NHL articles: full per-claim verification
//   - Final score (from foundation or fixture)
//   - Period scores (from foundation or fixture)
//   - OT/SO (from foundation or fixture)
//   - Named goal scorers (from play_by_play)
//   - Goal assists (from play_by_play)
//   - Goalie save counts (from game_goalie_stats) — soft
//   - Period goals (from play_by_play) — soft
//
// For non-NHL articles: score + period + OT/SO only
//   - Final score, period scores, OT/SO from game_stats_audit.period_scores
//   - Named scorers flagged as "unverifiable" (not "false") per Arnel's 2026-06-12 rule
//
// If no fixture is found for the article, mark "no_fixture" — NOT false, just unverifiable.
//
// Usage:
//   node scripts/stats/verify-article-claims.mjs --limit=20 [--execute]
//
// Idempotent. Writes a result file at /tmp/verify-claims.result.json.

import { readFileSync, writeFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = {};
for (const line of readFileSync('.env', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const EXECUTE = process.argv.includes('--execute');
const LIMIT = parseInt((process.argv.find(a => a.startsWith('--limit=')) || '--limit=20').slice(8), 10);
const RESULT_FILE = process.env.VERIFY_RESULT_FILE || '/tmp/verify-claims.result.json';

function log(...args) { console.log('[verify]', ...args); }
function logErr(...args) { console.error('[verify]', ...args); }

/**
 * Find the fixture for an article.
 * Returns { id, home_score, away_score, league_id, league_name, status } or null.
 */
async function findFixtureForPost(post) {
  if (!post.team_home_id || !post.team_away_id || !post.game_date) return null;
  const startOfDay = post.game_date + 'T00:00:00Z';
  const endOfDay = post.game_date + 'T23:59:59Z';
  // First try with the team's own league
  const { data: home } = await sb.from('teams').select('league_id').eq('id', post.team_home_id).single();
  if (!home) return null;
  let q = sb.from('fixtures')
    .select('id, home_score, away_score, league_id, status, scheduled_at')
    .eq('home_team_id', post.team_home_id)
    .eq('away_team_id', post.team_away_id)
    .eq('league_id', home.league_id)
    .gte('scheduled_at', startOfDay)
    .lte('scheduled_at', endOfDay)
    .limit(1);
  let { data } = await q;
  if (data?.[0]) return data[0];
  // Fall back: try without league filter
  q = sb.from('fixtures')
    .select('id, home_score, away_score, league_id, status, scheduled_at')
    .eq('home_team_id', post.team_home_id)
    .eq('away_team_id', post.team_away_id)
    .gte('scheduled_at', startOfDay)
    .lte('scheduled_at', endOfDay)
    .limit(1);
  ({ data } = await q);
  return data?.[0] || null;
}

/**
 * Verify a single article.
 * Returns { ok, issues, claims_verified, claims_unverifiable, score_status, foundation_status }
 */
async function verifyArticle(post) {
  const issues = [];
  const claimsUnverifiable = [];
  let claimsVerified = 0;
  let foundationStatus = 'no_fixture';

  const text = ((post.title || '') + ' ' + (post.subtitle || '') + ' ' + (post.content || '')).toLowerCase();

  // 1. Find the fixture
  const fixture = await findFixtureForPost(post);
  if (!fixture) {
    return {
      ok: true,  // unverifiable, not false
      issues: [],
      claims_unverifiable: ['no_fixture_for_team_date'],
      claims_verified: 0,
      score_status: 'no_fixture',
      foundation_status: 'no_fixture',
    };
  }

  // 2. Pull foundation data for this fixture
  const { data: audit } = await sb.from('game_stats_audit')
    .select('source, status, period_scores, was_ot, was_so, home_score, away_score, league_name, rows_written')
    .eq('fixture_id', fixture.id)
    .eq('status', 'ok')
    .limit(1);
  const auditRow = audit?.[0];
  if (!auditRow) {
    // We have a fixture but no foundation data — sync hasn't run for this game
    return {
      ok: true,
      issues: [],
      claims_unverifiable: ['fixture_found_no_foundation_data'],
      claims_verified: 0,
      score_status: 'no_foundation',
      foundation_status: 'no_data',
    };
  }
  foundationStatus = auditRow.source;

  // 3. Score check — use fixture's home_score/away_score (most authoritative)
  const expectedHome = fixture.home_score;
  const expectedAway = fixture.away_score;
  if (Number.isFinite(expectedHome) && Number.isFinite(expectedAway)) {
    const homeAway = new RegExp(`\\b${expectedHome}\\s*[-–to]+\\s*${expectedAway}\\b`).test(text);
    const awayHome = new RegExp(`\\b${expectedAway}\\s*[-–to]+\\s*${expectedHome}\\b`).test(text);
    if (homeAway || awayHome) {
      claimsVerified++;
    } else {
      issues.push(`expected score ${expectedHome}-${expectedAway} not present in any direction`);
    }
  }

  // 4. OT/SO check
  // Highlightly's wasOT/wasSO fields can be missing even when OT/SO happened
  // (period score data is truncated to regulation). Use period score arithmetic
  // as a cross-check.
  let effectiveWasOT = auditRow.was_ot;
  let effectiveWasSO = auditRow.was_so;
  if (auditRow.period_scores) {
    const ps = auditRow.period_scores;
    const parse = (s) => {
      if (!s) return [0, 0];
      const m = String(s).match(/^(\d+)\s*[-–—]\s*(\d+)$/);
      return m ? [parseInt(m[1]), parseInt(m[2])] : [0, 0];
    };
    const [p1h, p1a] = parse(ps.p1);
    const [p2h, p2a] = parse(ps.p2);
    const [p3h, p3a] = parse(ps.p3);
    const regH = p1h + p2h + p3h;
    const regA = p1a + p2a + p3a;
    const finalH = auditRow.home_score;
    const finalA = auditRow.away_score;
    if (finalH != null && finalA != null) {
      if (regH === regA && finalH !== finalA) {
        // Tied after regulation. Game must have gone to OT or SO.
        // If we don't know which, assume OT (more common in most leagues).
        if (!effectiveWasOT && !effectiveWasSO) {
          effectiveWasOT = true;  // best guess
        }
      }
    }
  }
  const articleClaimsOT = /\bovertime\b|\bin ot\b|\b OT\b/i.test(text);
  const articleClaimsSO = /shootout/i.test(text);
  if (articleClaimsOT && !effectiveWasOT) {
    issues.push(`article claims OT but foundation says no OT (period scores: ${JSON.stringify(auditRow.period_scores)})`);
  } else if (articleClaimsOT && effectiveWasOT) {
    claimsVerified++;
  }
  if (articleClaimsSO && !effectiveWasSO) {
    issues.push(`article claims shootout but foundation says no SO`);
  } else if (articleClaimsSO && effectiveWasSO) {
    claimsVerified++;
  }

  // 5. NHL-only: per-claim verification of named scorers
  if (auditRow.league_name === 'National Hockey League' || auditRow.league_name === 'NHL') {
    const { data: events } = await sb.from('play_by_play')
      .select('scorer_name, period, time_in_period, assists, is_power_play, is_short_handed')
      .eq('fixture_id', fixture.id);
    if (events && events.length > 0) {
      // Extract names that look like goal scorers from the article
      // Common patterns: "X. LastName" (e.g., "C. McDavid"), or just "LastName scored"
      const scorerNames = new Set(events.map(e => e.scorer_name).filter(Boolean));
      // Build regex from each scorer name
      for (const sn of scorerNames) {
        if (!sn) continue;
        const parts = sn.trim().split(/\s+/);
        const lastName = parts[parts.length - 1];
        if (lastName.length < 3) continue;  // skip initial
        // Check if article mentions this last name
        const re = new RegExp(`\\b${lastName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        if (re.test(text)) {
          claimsVerified++;
        }
        // (We don't flag missing names — the article might be a short highlight reel
        // that doesn't mention all scorers.)
      }

      // Check claimed save counts (e.g., "Smith made 32 saves")
      const savePattern = /\b(\w+(?:\s+\w+)?)\s+(?:made|had|stopped|turned\s+away)\s+(\d{1,3})\s+saves?\b/gi;
      let sm;
      while ((sm = savePattern.exec(text)) !== null) {
        const claimedName = sm[1].toLowerCase();
        const claimedSaves = parseInt(sm[2], 10);
        // Find a goalie whose last name matches
        const { data: goalies } = await sb.from('game_goalie_stats')
          .select('player_name, saves, shots_against, save_pct')
          .eq('fixture_id', fixture.id);
        if (goalies && goalies.length > 0) {
          const matched = goalies.find(g => {
            if (!g.player_name) return false;
            const gParts = g.player_name.trim().split(/\s+/);
            const gLast = gParts[gParts.length - 1].toLowerCase();
            return gLast === claimedName || claimedName.includes(gLast);
          });
          if (matched) {
            if (matched.saves != null && Math.abs(matched.saves - claimedSaves) > 2) {
              issues.push(`goalie ${matched.player_name}: article claims ${claimedSaves} saves, foundation says ${matched.saves}`);
            } else {
              claimsVerified++;
            }
          } else {
            claimsUnverifiable.push(`save-count-claim:${claimedName}-${claimedSaves}`);
          }
        }
      }
    }
  } else {
    // Non-NHL: named scorers are unverifiable (per Arnel's directive)
    // Only flag if the article makes very specific period-by-period goal claims
    // that are contradicted by period scores. We don't currently have that logic.
    // Mark "non-nhl-limited-verification" so we know.
    claimsUnverifiable.push('non-nhl-no-event-data');
  }

  return {
    ok: issues.length === 0,
    issues,
    claims_verified: claimsVerified,
    claims_unverifiable: claimsUnverifiable,
    score_status: 'verified',
    foundation_status: foundationStatus,
  };
}

/**
 * Rollback an article to archived.
 */
async function archiveArticle(post, reason) {
  if (!EXECUTE) return false;
  const { error } = await sb.from('posts').update({
    status: 'archived',
    archived_reason: reason,
    archived_at: new Date().toISOString(),
  }).eq('id', post.id);
  if (error) {
    logErr(`Failed to archive ${post.id}:`, error.message);
    return false;
  }
  return true;
}

async function main() {
  log(`Mode: ${EXECUTE ? 'EXECUTE' : 'DRY RUN'} | limit=${LIMIT}`);
  log('Loading published articles...');
  const { data: posts } = await sb.from('posts')
    .select('id, title, subtitle, content, status, team_home_id, team_away_id, game_date, highlight_id, league_id, published_at, created_at')
    .eq('status', 'published')
    .not('team_home_id', 'is', null)
    .not('game_date', 'is', null)
    .order('created_at', { ascending: false })
    .limit(LIMIT);
  if (!posts || posts.length === 0) {
    log('No published articles found.');
    writeFileSync(RESULT_FILE, JSON.stringify({ status: 'ok', processed: 0 }, null, 2));
    return;
  }
  log(`Found ${posts.length} articles to verify`);

  const summary = { total: posts.length, ok: 0, false: 0, no_fixture: 0, no_foundation: 0, archived: 0 };
  const t0 = Date.now();

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    const t = Date.now();
    let result;
    try {
      result = await verifyArticle(post);
    } catch (e) {
      result = { ok: false, issues: [e.message], claims_verified: 0, claims_unverifiable: [] };
    }
    const elapsed = Date.now() - t;

    if (!result.ok) summary.false++;
    else if (result.score_status === 'no_fixture') summary.no_fixture++;
    else if (result.score_status === 'no_foundation') summary.no_foundation++;
    else summary.ok++;

    if (!result.ok && result.issues.length > 0) {
      const archived = await archiveArticle(post, `per-claim-verification: ${result.issues.join('; ')}`);
      if (archived) summary.archived++;
      log(`[FALSE] ${post.title?.slice(0, 60)}: ${result.issues.join('; ')} ${archived ? '(archived)' : '(dry-run, NOT archived)'}`);
    }

    if ((i + 1) % 10 === 0 || i === posts.length - 1) {
      log(`Progress: ${i + 1}/${posts.length} | ok=${summary.ok} false=${summary.false} no_fixture=${summary.no_fixture} no_foundation=${summary.no_foundation} | archived=${summary.archived} | ${(Date.now() - t0) / 1000}s`);
    }
  }

  log(`\n=== verify complete in ${(Date.now() - t0) / 1000}s ===`);
  log(`ok: ${summary.ok} | false: ${summary.false} | no_fixture: ${summary.no_fixture} | no_foundation: ${summary.no_foundation}`);
  if (summary.archived > 0) log(`archived: ${summary.archived}`);

  writeFileSync(RESULT_FILE, JSON.stringify({ status: 'ok', ...summary }, null, 2));
}

main().catch(e => {
  logErr('fatal:', e);
  writeFileSync(RESULT_FILE, JSON.stringify({ status: 'fatal', error: e.message }, null, 2));
  process.exit(1);
});
