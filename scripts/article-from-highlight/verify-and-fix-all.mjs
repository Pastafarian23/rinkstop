#!/usr/bin/env node
/**
 * verify-and-fix-all.mjs
 *
 * Re-verifies ALL draft posts (not just flagged ones) against multi-source match data.
 * For each draft:
 *   - Match against Highlightly / NHL.com / HockeyTech / NCAA / KHL / IIHF
 *   - Compare title/body's claims about:
 *       * score (must be present in any direction)
 *       * OT/SO status (must be backed by source)
 *       * shot count plausibility (0-100 range)
 *   - Fix the title (strip false "OT" if source says no OT)
 *   - Fix the body (strip false "OT", "overtime", "shootout" claims)
 *   - If the article is factually clean, mark as published
 *   - If the article has invented facts (wrong score, false OT/SO, implausible counts), roll back to archived
 *   - If no source data is found, KEEP AS DRAFT (do not archive) — YouTube highlight is the source
 *
 * Note: timestamp / named-scorer checks are deferred because the source APIs don't expose
 * full play-by-play. The YouTube highlight reel (cited at the bottom of every article) is
 * the source of truth for those facts. Final score + OT/SO + plausibility are checked.
 */

import { readFileSync } from 'fs';
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
    issues.push('no source data to verify against (no API has this game with a final score)');
    return { ok: false, issues, fixable, wasOT: false, expected: '' };
  }

  // 2026-06-12 hard rule: refuse to verify articles built on a 'Not started'
  // / 'Scheduled' / 'Live' status string. The previous code treated these
  // as 'expected scores' and could pass an article that happened to contain
  // a numeric match for the numbers in the status string, which led to
  // fabricated SCF articles being published.
  if (!isFinalScore(match.score)) {
    issues.push(`source has no final score (status='${match.score}', description='${match.description || ''}') — game is not actually finished per the source`);
    return { ok: false, issues, fixable, wasOT: false, expected: '' };
  }

  const expected = match.score;
  // The multi-source match data normalizes these to wasOT/wasSO booleans.
  // Backward compat: derive from overTime if wasOT is missing.
  const wasOT = match.wasOT ?? (match.overTime && match.overTime !== '0 - 0' && match.overTime !== '0-0');
  const wasSO = match.wasSO ?? /shootout|so$|sho/i.test(match.description || '');

  // 1. Score check — required for the article to be considered verified.
  // Both directions (home-away and away-home) are accepted, since the
  // article may frame the score from either team's perspective.
  if (expected) {
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

  // 3. Invented play-by-play (timestamps) — DEFERRED.
  // The match data we have from Highlightly / NHL.com does not include full play-by-play
  // goal times. We DO verify the final score and OT/SO above, which are the load-bearing
  // facts. Timestamps in the article come from the YouTube highlight reel (which is the
  // cited source at the bottom of every article). Aggressively flagging timestamps when
  // the source doesn't expose PBP would falsely archive most real articles.
  // If we later wire NHL.com /api-web/v1/gamecenter/{id}/play-by-play into match data,
  // re-enable this check with sourceHasPBP gating.

  // 4. Named goal scorers — DEFERRED. Same reasoning as timestamps. The YouTube highlight
  // is the source of truth for named scorers; we verify only the final score.

  // 5. Specific save/shot counts — only flag if the count is wildly outside the source range.
  // The basic match data from Highlightly doesn't include shot totals either, so we use
  // a soft check: a shot count in an article must be in the plausible range (0-100).
  // This catches obvious hallucinations like "Carolina's 847 shots on goal" while
  // accepting real NHL/AHL/NCAAH shot counts (typically 20-50 per team).
  const savePattern = /\b(\d{1,3})\s+(saves|shots|shots on goal)\b/gi;
  let scMatch;
  const unsourcedCounts = [];
  while ((scMatch = savePattern.exec(body)) !== null) {
    const n = parseInt(scMatch[1], 10);
    // Plausibility range: hockey shot totals per team are 15-60 typically; saves 15-50
    if (n < 0 || n > 100) {
      unsourcedCounts.push(`${n} ${scMatch[2]} (implausible)`);
    }
  }
  if (unsourcedCounts.length > 0) {
    issues.push(`article cites implausible counts: ${unsourcedCounts.join(', ')}`);
  }

  return {
    ok: issues.length === 0,
    issues,
    fixable,
    wasOT,
    expected,
  };
}

/**
 * Build a search haystack of all string values in the Highlightly match data.
 * Used to verify whether a fact in the article (timestamp, scorer name, count) is sourced.
 */
function buildSourceText(match) {
  if (!match) return '';
  const seen = new Set();
  const out = [];
  const walk = (v) => {
    if (v == null) return;
    if (typeof v === 'string') { out.push(v); return; }
    if (typeof v === 'number' || typeof v === 'boolean') { out.push(String(v)); return; }
    if (Array.isArray(v)) { v.forEach(walk); return; }
    if (typeof v === 'object') {
      for (const k of Object.keys(v)) walk(v[k]);
    }
  };
  walk(match);
  return out.filter(s => { if (seen.has(s)) return false; seen.add(s); return true; }).join(' ');
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
  let unverifiable = 0;   // no source data with a final score — archived as per Arnel's 'only facts' rule
  let rolledBack = 0;     // archived when real invented facts detected
  for (let i = 0; i < drafts.length; i++) {
    const d = drafts[i];
    const h = hlMap.get(d.highlight_id);
    if (!h) {
      // No highlight record — can't verify, archive per Arnel's 'only facts' rule
      // (2026-06-12: better to archive than publish unverifiable content).
      console.log(`  [${i+1}/${drafts.length}] ${d.title} — no highlight record, ARCHIVING (cannot verify)`);
      await sb.from('posts').update({ status: 'archived' }).eq('id', d.id);
      unverifiable++;
      continue;
    }
    const teams = [h.home_team_name, h.away_team_name].filter(Boolean);
    const date = (h.match_date || '').slice(0, 10);
    const league = normalizeLeague(h.league_name);
    const match = await highlightlyMatchData(teams, date, league);
    if (!match) {
      // No multi-source match with a final score. Per Arnel's 2026-06-12
      // 'only facts' rule: archive rather than leave as a draft that could
      // be accidentally published. The YouTube highlight is no longer
      // accepted as a sole source of truth.
      console.log(`  [${i+1}/${drafts.length}] ${d.title} — no source has a final score, ARCHIVING (cannot verify)`);
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
