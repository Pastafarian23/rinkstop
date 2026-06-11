#!/usr/bin/env node
/**
 * verify-and-fix-all.mjs
 *
 * Re-verifies ALL draft posts (not just flagged ones) against Highlightly.
 * For each draft:
 *   - Match against Highlightly
 *   - Compare title/body's claims about:
 *       * score (must be present in any direction)
 *       * OT/SO status (must be backed by Highlightly)
 *       * no specific goal scorers named
 *       * no specific save/shot counts
 *   - Fix the title (strip false "OT" if Highlightly says no OT)
 *   - Fix the body (strip false "OT", "overtime", "shootout" claims)
 *   - If the article is factually clean, mark as published
 *   - If the article has invented facts, roll back to archived
 */

import { readFileSync } from 'fs';
import { getMatchData, normalizeLeague } from './match-data.mjs';

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

async function highlightlyMatchData(teams, date, league) {
  // Delegate to the shared multi-source module. Returns the same shape
  // this script used before, so we don't need to update call sites.
  return getMatchData({ teams, date, league, apiKey: HIGHLIGHTLY_API_KEY });
}

/**
 * Verifies the article and returns:
 *   {
 *     ok: boolean,
 *     issues: [string],     // problems that warrant rollback
 *     fixable: [string],    // problems that can be auto-fixed (false OT)
 *     wasOT: boolean,       // what Highlightly says
 *     expected: string,     // expected score
 *   }
 */
function analyzeArticle(title, body, match) {
  const issues = [];
  const fixable = [];
  if (!match) {
    issues.push('no Highlightly data to verify against');
    return { ok: false, issues, fixable, wasOT: false, expected: '' };
  }

  const expected = match.score || '';
  // The multi-source match data normalizes these to wasOT/wasSO booleans.
  // Backward compat: derive from overTime if wasOT is missing.
  const wasOT = match.wasOT ?? (match.overTime && match.overTime !== '0 - 0' && match.overTime !== '0-0');
  const wasSO = match.wasSO ?? /shootout|so$|sho/i.test(match.description || '');

  // 1. Score check
  if (expected) {
    const [homeS, awayS] = expected.split(/\s*-\s*/);
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
  }

  // 2. OT/SO check — false OT/SO claims are fixable
  const text = title + '\n' + body;
  if (/\bovertime\b|\bin\s+OT\b|\bOT\s+(Thriller|Showdown|Decision)/i.test(text) && !wasOT) {
    fixable.push('false-OT-claim');
  }
  if (/shootout/i.test(text) && !wasSO) {
    fixable.push('false-shootout-claim');
  }
  if (/\bshootout\b/i.test(text) && wasSO) {
    // The article correctly says shootout
  }
  if (/\bovertime\b|\bin\s+OT\b/i.test(text) && wasOT) {
    // The article correctly says OT
  }

  // 3. Invented play-by-play (timestamps) — these are serious
  const scorerPattern = /\b(scored|netted|beat|defeated|deposited|buried|capped|struck|tipped|wristed|slapped|one-timed|ripped)\s+(at\s+)?\d{1,2}:\d{2}/i;
  if (scorerPattern.test(body)) {
    issues.push('article includes a specific goal-time stamp (likely invented play-by-play)');
  }
  // 4. Named goal scorers
  const namedScorer = /\b(scored by|scored the|netted by|tipped in by|buried by|capitalized on by)\s+[A-Z][a-z]+/;
  if (namedScorer.test(body)) {
    issues.push('article names a specific goal scorer');
  }
  // 5. Specific save/shot counts
  const saveCount = /\b\d{1,3}\s+(saves|shots|shots on goal)\b/i;
  if (saveCount.test(body)) {
    issues.push('article cites specific save/shot count');
  }

  return {
    ok: issues.length === 0,
    issues,
    fixable,
    wasOT,
    expected,
  };
}

function fixArticle(title, body, fixable) {
  let t = title;
  let b = body;
  if (fixable.includes('false-OT-claim')) {
    // Strip false "OT" / "Overtime" from title and body
    t = t.replace(/\s+in\s+OT\s+/gi, ' ');
    t = t.replace(/\s+OT\s+Thriller/gi, ' Thriller');
    t = t.replace(/\s+OT\s+Showdown/gi, ' Showdown');
    t = t.replace(/\s+OT\s+Decision/gi, ' Decision');
    t = t.replace(/\s+OT\s+/gi, ' ');
    t = t.replace(/\s+overtime\s+/gi, ' ');
    t = t.replace(/\bovertime\b/gi, 'extra time');
    t = t.replace(/\s+/g, ' ').trim();

    b = b.replace(/\s+in\s+OT\s+/gi, ' ');
    b = b.replace(/\s+OT\s+Thriller/gi, ' Thriller');
    b = b.replace(/\s+OT\s+Showdown/gi, ' Showdown');
    b = b.replace(/\s+OT\s+Decision/gi, ' Decision');
    b = b.replace(/\s+OT\s+/gi, ' ');
    b = b.replace(/\s+overtime\s+/gi, ' ');
    b = b.replace(/\bovertime\b/gi, 'extra time');
    b = b.replace(/double\s+overtime/gi, 'regulation');
    b = b.replace(/extra\s+time\s+thriller/gi, 'thriller');
    b = b.replace(/extra\s+time\s+showdown/gi, 'showdown');
    b = b.replace(/extra\s+time\s+period/gi, 'final period');
    b = b.replace(/\bovertime\b/gi, 'extra time');
    b = b.replace(/  +/g, ' ').replace(/\n  +/g, '\n');
  }
  if (fixable.includes('false-shootout-claim')) {
    t = t.replace(/\s+Shootout\s+/gi, ' ');
    t = t.replace(/\bshootout\b/gi, 'extra time');
    t = t.replace(/\s+/g, ' ').trim();

    b = b.replace(/\s+Shootout\s+/gi, ' ');
    b = b.replace(/\bshootout\b/gi, 'extra time');
    b = b.replace(/\bShootout\b/gi, 'Extra Time');
    b = b.replace(/\bbronze\s+medal\s+shootout\b/gi, 'bronze medal game');
    b = b.replace(/\bbronze\s+medal\s+game\s+extra\s+time\b/gi, 'bronze medal game');
    b = b.replace(/\bextra\s+time\s+extra\s+time\b/gi, 'extra time');
    b = b.replace(/  +/g, ' ').replace(/\n  +/g, '\n');
  }
  // Also remove any appended fact-check note from a prior run
  b = b.replace(/\n*\*Fact-check flagged.*\*\s*$/m, '').trim();

  // Update the H1 in body to match the new title
  b = b.replace(/^# .+$/m, `# ${t}`);

  return { title: t, body: b };
}

async function main() {
  console.log('Loading ALL draft posts with highlight_id...');
  const { data: drafts, error } = await sb
    .from('posts')
    .select('id, highlight_id, title, content, subtitle, created_at')
    .eq('status', 'draft')
    .not('highlight_id', 'is', null)
    .order('created_at', { ascending: true });
  if (error) { console.error(error); return; }
  console.log(`Found ${drafts.length} draft posts to verify`);

  const hlIds = [...new Set(drafts.map(d => d.highlight_id).filter(Boolean))];
  const { data: hls } = await sb
    .from('highlight_backups')
    .select('id, home_team_name, away_team_name, match_date, league_name, title')
    .in('id', hlIds);
  const hlMap = new Map((hls || []).map(h => [h.id, h]));

  let published = 0;
  let fixedAndPublished = 0;
  let unverifiable = 0;
  let rolledBack = 0;
  for (let i = 0; i < drafts.length; i++) {
    const d = drafts[i];
    const h = hlMap.get(d.highlight_id);
    if (!h) {
      console.log(`  [${i+1}/${drafts.length}] ${d.title} — no highlight, rolling back`);
      await sb.from('posts').update({ status: 'archived' }).eq('id', d.id);
      rolledBack++;
      continue;
    }
    const teams = [h.home_team_name, h.away_team_name].filter(Boolean);
    const date = (h.match_date || '').slice(0, 10);
    const league = normalizeLeague(h.league_name);
    const match = await highlightlyMatchData(teams, date, league);
    if (!match) {
      console.log(`  [${i+1}/${drafts.length}] ${d.title} — no Highlightly match, rolling back`);
      await sb.from('posts').update({ status: 'archived' }).eq('id', d.id);
      unverifiable++;
      continue;
    }
    const check = analyzeArticle(d.title, d.content, match);
    if (check.issues.length > 0) {
      // Real issues — roll back
      console.log(`  [${i+1}/${drafts.length}] ${d.title} — ${check.issues.join('; ')} — ROLLBACK`);
      await sb.from('posts').update({ status: 'archived' }).eq('id', d.id);
      rolledBack++;
    } else if (check.fixable.length > 0) {
      // Fixable (e.g., false OT claim) — fix and publish
      const fixed = fixArticle(d.title, d.content, check.fixable);
      const { error: updErr } = await sb.from('posts').update({
        title: fixed.title,
        content: fixed.body,
      }).eq('id', d.id);
      if (updErr) {
        console.error(`  ❌ fix failed for ${d.id}:`, updErr);
        continue;
      }
      // Now publish
      const { error: pubErr } = await sb.from('posts').update({
        status: 'published',
        published_at: new Date().toISOString(),
      }).eq('id', d.id);
      if (pubErr) {
        console.error(`  ❌ publish failed for ${d.id}:`, pubErr);
        continue;
      }
      fixedAndPublished++;
      console.log(`  [${i+1}/${drafts.length}] 🔧 ✓ FIXED+PUBLISHED: ${fixed.title}`);
    } else {
      // Already clean — publish
      const { error: pubErr } = await sb.from('posts').update({
        status: 'published',
        published_at: new Date().toISOString(),
      }).eq('id', d.id);
      if (pubErr) {
        console.error(`  ❌ publish failed for ${d.id}:`, pubErr);
        continue;
      }
      published++;
      console.log(`  [${i+1}/${drafts.length}] ✓ published: ${d.title}`);
    }
    await new Promise(r => setTimeout(r, 100));
  }

  console.log(`\n=== Summary ===`);
  console.log(`Verified clean, published: ${published}`);
  console.log(`Fixed false claims + published: ${fixedAndPublished}`);
  console.log(`Rolled back (invented facts): ${rolledBack}`);
  console.log(`Unverifiable (no Highlightly data, rolled back): ${unverifiable}`);
  console.log(`Total: ${drafts.length}`);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
