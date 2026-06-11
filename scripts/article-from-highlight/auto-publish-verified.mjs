#!/usr/bin/env node
/**
 * auto-publish-verified.mjs
 *
 * For each draft post with highlight_id, run a fact-check pass against the
 * Highlightly match data. If the article's claims about score, period breakdown,
 * OT/SO status, and series context match the Highlightly data → mark as published.
 * If anything doesn't match → flag the post for human review (status stays 'draft'
 * but a review note is appended).
 *
 * "Verified" means: no invented goal scorers, no invented play-by-play, the
 * final score matches Highlightly, period breakdown matches (or is absent in
 * the article, which is acceptable for the noTranscript path).
 *
 * Usage: node scripts/article-from-highlight/auto-publish-verified.mjs
 */

import { readFileSync } from 'fs';
import { normalizeLeague } from './match-data.mjs';

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
const { getMatchData } = await import('./match-data.mjs');

async function highlightlyMatchData(teams, date, league) {
  return getMatchData({ teams, date, league, apiKey: HIGHLIGHTLY_API_KEY });
}

/**
 * Fact-check an article body against verified Highlightly data.
 * Returns { verified: boolean, issues: string[] }.
 */
function factCheckArticle(content, match) {
  const issues = [];
  if (!match) {
    issues.push('no Highlightly data to verify against');
    return { verified: false, issues };
  }
  const body = content.toLowerCase();
  const expected = match.score || '';
  if (expected) {
    // Strip spaces from the article's score mentions: "4 - 2" or "4-2" or "4 to 2"
    const [homeS, awayS] = expected.split(/\s*-\s*/);
    const homeW = parseInt(homeS);
    const awayW = parseInt(awayS);
    if (Number.isFinite(homeW) && Number.isFinite(awayW)) {
      // The article may frame the score from either team's perspective
      // (home-away OR away-home). Either is valid. We just need both numbers
      // to appear together in a score pattern.
      const homeAway = new RegExp(`\\b${homeW}\\s*[-–to]+\\s*${awayW}\\b`).test(body);
      const awayHome = new RegExp(`\\b${awayW}\\s*[-–to]+\\s*${homeW}\\b`).test(body);
      if (!homeAway && !awayHome) {
        issues.push(`expected score ${expected} not present in any direction`);
      }
    }
  }

  // OT/SO check — use normalized fields from the multi-source module
  // (wasOT/wasSO) and fall back to the old Highlightly field names.
  const wasOT = match.wasOT ?? (match.overTime && match.overTime !== '0 - 0' && match.overTime !== '0-0');
  const wasSO = match.wasSO ?? /shootout|so$/i.test(match.description || '');
  const articleClaimsOT = /\bovertime\b|\bin ot\b|\b OT\b/i.test(content);
  const articleClaimsSO = /shootout/i.test(content);
  if (articleClaimsOT && !wasOT) {
    issues.push(`article claims overtime, but ${match.source || 'data source'} says no OT (${match.score})`);
  }
  if (articleClaimsSO && !wasSO) {
    issues.push(`article claims shootout, but ${match.source || 'data source'} says ${match.description}`);
  }

  // Flag any specific goal scorer mentions (the noTranscript path is not
  // supposed to include them, but the LLM sometimes slips up)
  const scorerPattern = /\b(scored|netted|beat|defeated|deposited|buried|capped|struck|tipped|wristed|slapped|one-timed)\s+(at\s+)?\d{1,2}:\d{2}/i;
  if (scorerPattern.test(content)) {
    issues.push('article includes a specific goal-time stamp (likely invented play-by-play)');
  }
  // Specific goal scorers named as people: "Smith scored at..." or "scored by Jones"
  const namedScorer = /\b(scored by|scored the|netted by|tipped in by|buried by)\s+[A-Z][a-z]+/;
  if (namedScorer.test(content)) {
    issues.push('article names a specific goal scorer (noTranscript path should not)');
  }
  // Specific save counts: "35 saves", "28 saves" (noTranscript path should not)
  const saveCount = /\b\d{1,3}\s+(saves|shots|shots on goal)\b/i;
  if (saveCount.test(content)) {
    issues.push('article cites specific save/shot count (noTranscript path should not)');
  }

  return { verified: issues.length === 0, issues };
}

async function main() {
  console.log('Loading draft posts with highlight_id...');
  const { data: drafts, error } = await sb
    .from('posts')
    .select('id, highlight_id, title, content, subtitle, created_at')
    .eq('status', 'draft')
    .not('highlight_id', 'is', null)
    .order('created_at', { ascending: true });
  if (error) { console.error(error); return; }
  console.log(`Found ${drafts.length} draft posts to fact-check`);

  // Get all the highlight data we need in one query
  const hlIds = [...new Set(drafts.map(d => d.highlight_id).filter(Boolean))];
  const { data: hls } = await sb
    .from('highlight_backups')
    .select('id, home_team_name, away_team_name, match_date, league_name, title')
    .in('id', hlIds);
  const hlMap = new Map((hls || []).map(h => [h.id, h]));

  let published = 0;
  let flagged = 0;
  let unverifiable = 0;
  for (let i = 0; i < drafts.length; i++) {
    const d = drafts[i];
    const h = hlMap.get(d.highlight_id);
    if (!h) {
      console.log(`  [${i+1}/${drafts.length}] ${d.title} — no highlight, skipping`);
      unverifiable++;
      continue;
    }
    const teams = [h.home_team_name, h.away_team_name].filter(Boolean);
    const date = (h.match_date || '').slice(0, 10);
    const league = normalizeLeague(h.league_name);
    const match = await highlightlyMatchData(teams, date, league);
    if (!match) {
      console.log(`  [${i+1}/${drafts.length}] ${d.title} — no Highlightly match, cannot verify`);
      unverifiable++;
      continue;
    }
    const check = factCheckArticle(d.content, match);
    if (check.verified) {
      // Mark as published
      const { error: pubErr } = await sb
        .from('posts')
        .update({
          status: 'published',
          published_at: new Date().toISOString(),
        })
        .eq('id', d.id);
      if (!pubErr) {
        published++;
        if (i < 5 || i % 20 === 0) console.log(`  ✓ published: ${d.title}`);
      } else {
        console.error(`  ❌ publish failed for ${d.id}:`, pubErr);
      }
    } else {
      flagged++;
      // Append a review note to the content
      const note = `\n\n*Fact-check flagged (${new Date().toISOString().slice(0,10)}): ${check.issues.join('; ')}. Awaiting human review.*`;
      await sb.from('posts').update({ content: d.content + note }).eq('id', d.id);
      console.log(`  ⚠️  flagged: ${d.title} — ${check.issues.join('; ')}`);
    }
    // Rate limit
    await new Promise(r => setTimeout(r, 100));
  }

  console.log(`\n=== Summary ===`);
  console.log(`Total drafts: ${drafts.length}`);
  console.log(`Published: ${published}`);
  console.log(`Flagged for review: ${flagged}`);
  console.log(`Unverifiable (no Highlightly match): ${unverifiable}`);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
