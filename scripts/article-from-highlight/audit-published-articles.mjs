#!/usr/bin/env node
/**
 * audit-published-articles.mjs
 *
 * Post-publish safety net. Re-verifies all PUBLISHED articles that came
 * from the YouTube highlight pipeline (status='published' AND
 * highlight_id IS NOT NULL) against the same multi-source match data
 * used by the verify-and-fix-all.mjs script.
 *
 * For each published article:
 *   - Look up the highlight in highlight_backups
 *   - Query Highlightly / NHL.com / HockeyTech / NCAA / KHL / IIHF for the match
 *   - If the source has a final score:
 *       - Check the article's body for that score
 *       - If the score doesn't appear in the article, OR the article claims
 *         a different score, OR the article claims OT/SO that the source
 *         didn't have, archive the article
 *   - If no source has a final score (game is "Not started" in the source):
 *       - The article cannot be verified. Archive per Arnel's 2026-06-12
 *         'only facts' rule.
 *
 * Run with --execute to actually archive; default is dry-run.
 *
 * Usage:
 *   node scripts/article-from-highlight/audit-published-articles.mjs
 *   node scripts/article-from-highlight/audit-published-articles.mjs --execute
 */

import { readFileSync, writeFileSync } from 'fs';
import { getMatchData, normalizeLeague, isFinalScore } from './match-data.mjs';

const env = {};
try {
  const envFile = readFileSync('.env', 'utf8');
  for (const line of envFile.split('\n')) {
    const idx = line.indexOf('=');
    if (idx < 0) continue;
    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1).replace(/['"]/g, '').trim();
    if (key) env[key] = val;
  }
} catch {}

const { createClient } = await import('@supabase/supabase-js');
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const HIGHLIGHTLY_API_KEY = env.HIGHLIGHTLY_API_KEY;

const execute = process.argv.includes('--execute');

function analyzeArticle(title, body, match) {
  const issues = [];
  if (!match) {
    issues.push('no source has a final score (game is unverified)');
    return { ok: false, issues, expected: '' };
  }
  if (!isFinalScore(match.score)) {
    issues.push(`source score is non-numeric status string: "${match.score}"`);
    return { ok: false, issues, expected: '' };
  }
  const expected = match.score;
  const [homeS, awayS] = expected.split(/\s*[-–—]\s*/);
  const homeW = parseInt(homeS);
  const awayW = parseInt(awayS);
  if (Number.isFinite(homeW) && Number.isFinite(awayW)) {
    const fullBody = (title + ' ' + body).toLowerCase();
    const homeAway = new RegExp(`\\b${homeW}\\s*[-–to]+\\s*${awayW}\\b`).test(fullBody);
    const awayHome = new RegExp(`\\b${awayW}\\s*[-–to]+\\s*${homeW}\\b`).test(fullBody);
    if (!homeAway && !awayHome) {
      issues.push(`expected score ${expected} not present in any direction`);
    }
  }
  const wasOT = match.wasOT ?? (match.overTime && match.overTime !== '0 - 0' && match.overTime !== '0-0');
  const wasSO = match.wasSO ?? /shootout|so$|sho/i.test(match.description || '');
  const articleClaimsOT = /\bovertime\b|\bin ot\b|\b OT\b/i.test(title + '\n' + body);
  const articleClaimsSO = /shootout/i.test(title + '\n' + body);
  if (articleClaimsOT && !wasOT) {
    issues.push(`article claims OT but source says ${expected} regulation`);
  }
  if (articleClaimsSO && !wasSO) {
    issues.push(`article claims shootout but source says ${expected}`);
  }
  return { ok: issues.length === 0, issues, expected };
}

/**
 * Backoff schedule for periodic re-checks.
 * rounds=0 → 7d, 1 → 14d, 2 → 30d, 3+ → 90d.
 * This makes high-quality articles get re-checked less often, saving compute.
 * Articles in 'manually_approved' always use 30d (slower, Arnel's choice).
 */
function nextCheckDelayMs(rounds, isManuallyApproved) {
  if (isManuallyApproved) return 30 * 24 * 60 * 60 * 1000;
  if (rounds >= 3) return 90 * 24 * 60 * 60 * 1000;
  if (rounds === 2) return 30 * 24 * 60 * 60 * 1000;
  if (rounds === 1) return 14 * 24 * 60 * 60 * 1000;
  return 7 * 24 * 60 * 60 * 1000;
}

async function main() {
  console.log(`Mode: ${execute ? 'EXECUTE (will archive)' : 'DRY RUN (no changes)'}`);
  console.log('Loading PUBLISHED articles with highlight_id that are DUE for re-check...');
  // State machine (2026-06-16): only re-check articles whose next_check_at has passed.
  // The index posts_published_due_for_check_idx makes this fast.
  const { data: posts, error } = await sb
    .from('posts')
    .select('id, highlight_id, title, content, published_at, created_at, verified_rounds')
    .eq('status', 'published')
    .not('highlight_id', 'is', null)
    .or('next_check_at.is.null,next_check_at.lte.' + new Date().toISOString())
    .order('published_at', { ascending: false });
  if (error) { console.error(error); return; }
  console.log(`Found ${posts.length} published articles due for re-check (out of all published)`);

  const hlIds = [...new Set(posts.map(p => p.highlight_id).filter(Boolean))];
  const { data: hls } = await sb
    .from('highlight_backups')
    .select('id, home_team_name, away_team_name, match_date, league_name, title')
    .in('id', hlIds);
  const hlMap = new Map((hls || []).map(h => [h.id, h]));

  let clean = 0;
  let wouldArchive = 0;
  let archived = 0;
  const archived_ids = [];
  const reasons = {};
  for (let i = 0; i < posts.length; i++) {
    const p = posts[i];
    const h = hlMap.get(p.highlight_id);
    if (!h) {
      console.log(`  [${i+1}/${posts.length}] ${p.title} — no highlight record`);
      reasons['no_highlight'] = (reasons['no_highlight'] || 0) + 1;
      wouldArchive++;
      if (execute) {
        // State machine: no highlight record → needs_review (was: archived)
        await sb.from('posts').update({
          status: 'needs_review',
          last_issue_summary: 'no highlight record found in highlight_backups',
          source_data_status: 'no_source',
        }).eq('id', p.id);
        archived++; archived_ids.push(p.id);
      }
      continue;
    }
    const teams = [h.home_team_name, h.away_team_name].filter(Boolean);
    const date = (h.match_date || '').slice(0, 10);
    const league = normalizeLeague(h.league_name);
    const match = await getMatchData({ teams, date, league, apiKey: HIGHLIGHTLY_API_KEY });
    const check = analyzeArticle(p.title, p.content || '', match);
    if (check.ok) {
      clean++;
      // State machine: clean → bump rounds, push next_check_at out per backoff
      if (execute) {
        const newRounds = (p.verified_rounds || 0) + 1;
        const nextCheck = new Date(Date.now() + nextCheckDelayMs(newRounds, false)).toISOString();
        await sb.from('posts').update({
          verified_at: new Date().toISOString(),
          verified_rounds: newRounds,
          next_check_at: nextCheck,
          source_data_status: 'has_source',
          last_issue_summary: null,
        }).eq('id', p.id);
      }
      continue;
    }
    console.log(`  [${i+1}/${posts.length}] ${p.title} — ${check.issues.join('; ')} ${execute ? '[NEEDS REWRITE]' : '[would archive]'}`);
    for (const r of check.issues) {
      const k = r.match(/^[^(]+/)?.[0]?.trim() || r;
      reasons[k] = (reasons[k] || 0) + 1;
    }
    wouldArchive++;
    if (execute) {
      // State machine: invented facts → needs_rewrite (was: archived).
      // The rewrite-architect cron (7am) picks up needs_rewrite and tries
      // again. After 3 failed rewrites, the article goes to archived.
      await sb.from('posts').update({
        status: 'needs_rewrite',
        last_issue_summary: check.issues.join('; '),
        source_data_status: 'has_source',
      }).eq('id', p.id);
      archived++; archived_ids.push(p.id);
    }
    await new Promise(r => setTimeout(r, 100));
  }

  console.log(`\n=== Audit Summary ===`);
  console.log(`Clean (passed all checks): ${clean}`);
  console.log(`Would mark for rewrite:    ${wouldArchive}`);
  console.log(`Actually marked:          ${archived}`);
  if (execute) console.log(`Marked IDs: ${archived_ids.length} (first 10: ${archived_ids.slice(0, 10).join(', ')})`);
  console.log(`\nIssue breakdown:`);
  for (const [k, v] of Object.entries(reasons).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${v}x ${k}`);
  }
}

// Write a JSON result file when the audit finishes (success OR crash).
// The detached cron wrapper reads this file to report status. Without this
// the wrapper has to spin up a watcher, which kept the parent shell alive
// past the cron exec timeout (300s) — fixed 2026-06-14.
const RESULT_FILE = process.env.FACT_AUDIT_RESULT_FILE;
const startTs = Date.now();

function writeResult(status, payload = {}) {
  if (!RESULT_FILE) return;
  try {
    const result = {
      ts: new Date().toISOString(),
      pid: process.pid,
      mode: process.argv.includes('--execute') ? '--execute' : 'dry-run',
      status,
      duration_ms: Date.now() - startTs,
      ...payload,
    };
    writeFileSync(RESULT_FILE, JSON.stringify(result, null, 2));
  } catch (e) {
    console.error('Failed to write result file:', e.message);
  }
}

process.on('SIGTERM', () => { writeResult('interrupted'); process.exit(143); });
process.on('SIGINT',  () => { writeResult('interrupted'); process.exit(130); });

main()
  .then((totals) => writeResult('ok', { totals }))
  .catch(e => {
    console.error('Fatal:', e);
    writeResult('error', { error: e.message });
    process.exit(1);
  });
