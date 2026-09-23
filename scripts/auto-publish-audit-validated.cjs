#!/usr/bin/env node
/**
 * auto-publish-audit-validated.mjs
 *
 * Reads draft posts with highlight_id, runs the audit pipeline against
 * canonical boxscore sources (NHL.com, HockeyTech, IIHF).
 * If the audit PASSES → mark as published.
 * If the audit FAILS → flag for human review (status stays 'draft').
 *
 * This is the ENFORCED pre-publish gate. Articles cannot reach status='published'
 * unless verified against canonical boxscore data.
 *
 * Run: node scripts/auto-publish-audit-validated.mjs [--dry-run] [--limit=N]
 *
 * Wireup cron (every 30 minutes during business hours):
 *   schedule: every 30m at :00 and :30
 *   announcement: post summary to RinkStop Ops
 */

require('fs').readFileSync('.env', 'utf8').split('\n').forEach(l => {
  const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
});
const { createClient } = require('@supabase/supabase-js');
const { spawnSync } = require('child_process');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const AUDIT_SCRIPT = 'scripts/_audit-pipeline.cjs';

// --- Audit pipeline call ---
function runAuditForArticle(slug) {
  const result = spawnSync('node', [AUDIT_SCRIPT, '--limit=1', `--slug=${slug}`, '--json'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    timeout: 60000,
  });
  if (result.status !== 0) return null;
  try {
    const data = JSON.parse(result.stdout);
    return data.reports?.[0] || null;
  } catch (e) {
    return null;
  }
}

// --- Extract YouTube ID ---
function extractYouTubeId(url) {
  if (!url) return null;
  const m = url.match(/\/vi\/([^/]+)\//);
  return m ? m[1] : null;
}

// --- Main ---
(async () => {
  const dryRun = process.argv.includes('--dry-run');
  const limitArg = process.argv.find(a => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : null;

  console.log(`Loading draft posts with highlight_id${limit ? ` (limit=${limit})` : ''}…`);
  let query = sb
    .from('posts')
    .select('id, slug, title, content, league_id, team_home_id, team_away_id, game_date, og_image_url, highlight_id, status')
    .eq('status', 'draft')
    .not('highlight_id', 'is', null);
  if (limit) query = query.limit(limit);
  const { data: drafts, error } = await query;
  if (error) { console.error('DB error:', error); return; }
  console.log(`Found ${drafts.length} draft posts to fact-check`);

  let published = 0;
  let flagged = 0;
  let unverifiable = 0;
  let errors = 0;

  for (let i = 0; i < drafts.length; i++) {
    const d = drafts[i];
    const ytId = extractYouTubeId(d.og_image_url);
    const progress = `[${i + 1}/${drafts.length}]`;
    if (!d.slug || !d.game_date) {
      console.log(`${progress} ${d.title} — missing slug or date, skipping`);
      unverifiable++;
      continue;
    }
    console.log(`${progress} Auditing ${d.slug}…`);
    const report = runAuditForArticle(d.slug);
    if (!report) {
      console.log(`${progress} ${d.title} — audit script failed`);
      errors++;
      continue;
    }
    const hasFail = report.results?.some(r => r.status === 'FAIL');
    const claimCount = (report.results || []).length;
    const passCount = (report.results || []).filter(r => r.status === 'PASS').length;
    const cannotVerifyCount = (report.results || []).filter(r => r.status === 'CANNOT_VERIFY').length;

    if (hasFail) {
      console.log(`${progress} ${d.title} — FAIL detected, keeping as draft`);
      flagged++;
      // Append review note
      const note = `\n\n*Pre-publish audit (${new Date().toISOString().slice(0,10)}): ${claimCount} claims, ${passCount} pass, ${flagged} fail. Check audit-result.json for details.*`;
      if (!dryRun) {
        await sb.from('posts').update({ content: d.content + note, status: 'draft' }).eq('id', d.id);
      }
    } else if (claimCount === 0 || claimCount === cannotVerifyCount) {
      // All claims could not be verified (no source available) — keep as draft for manual review
      console.log(`${progress} ${d.title} — unverifiable (no canonical source), keeping as draft`);
      unverifiable++;
    } else {
      // Audit passes. 2026-09-22: also run the quality rubric (same
      // as src/lib/article-quality.ts, inlined here for portability).
      // If quality_score < 60, hold for review instead of publishing —
      // prevents future AI slop from shipping.
      const banned = [
        'Because no transcript', 'the safest read', 'we cannot know',
        'without transcript support', 'broader recap should stay',
        'the most reliable takeaway', 'winning goal is listed as',
        'winning goalie is listed as', 'comfortable Flyers win',
        'without late drama',
      ];
      const content = d.content || '';
      const bodyLower = content.toLowerCase();
      let qScore = 100;
      const qIssues = [];
      for (const phrase of banned) {
        if (bodyLower.includes(phrase.toLowerCase())) { qIssues.push(`banned:${phrase}`); qScore -= 15; }
      }
      const wc = content.split(/\s+/).filter(Boolean).length;
      if (wc === 0) { qIssues.push('empty'); qScore -= 50; }
      else if (wc < 200) { qIssues.push(`short:${wc}`); qScore -= 20; }
      const h2 = (content.match(/^##\s+.+$/gm) || []).length;
      if (h2 === 0) { qIssues.push('no-h2'); qScore -= 10; }
      else if (h2 < 2) { qIssues.push(`few-h2:${h2}`); qScore -= 5; }
      if (!/\*\*Final Score:\*\*/i.test(content)) { qIssues.push('no-final-score'); qScore -= 20; }
      qScore = Math.max(0, Math.min(100, qScore));
      if (qScore < 60) {
        console.log(`${progress} ${d.title} — ⛔ quality_score=${qScore} (slop), holding for review`);
        flagged++;
        continue; // skip publish
      }
      console.log(`${progress} ${d.title} — ✓ verified (q=${qScore}), publishing`);
      published++;
      if (!dryRun) {
        const { error: pubErr } = await sb
          .from('posts')
          .update({
            status: 'published',
            published_at: new Date().toISOString(),
            source_data_status: 'has_source',
            last_issue_summary: `Audit verified ${passCount}/${claimCount} claims at ${new Date().toISOString()}`,
            quality_score: qScore,
            quality_issues: qIssues.length > 0 ? qIssues : null,
            regenerated_at: new Date().toISOString(),
          })
          .eq('id', d.id);
        if (pubErr) {
          console.error(`${progress} ${d.title} — publish failed:`, pubErr.message);
          errors++;
        }
      }
    }
    // Rate limit
    await new Promise(r => setTimeout(r, 100));
  }

  const total = drafts.length;
  const result = { timestamp: new Date().toISOString(), total, published, flagged, unverifiable, errors };
  // Only emit a notice when something actually happened.
  // Quiet cycles = 0 drafts, 0 errors. Save noise.
  if (total > 0 || published > 0 || flagged > 0 || errors > 0) {
    console.log(`\n=== SUMMARY ===`);
    console.log(`Found ${total} draft(s) | Published: ${published} | Flagged: ${flagged} | Unverifiable: ${unverifiable} | Errors: ${errors}`);
    if (dryRun) console.log('(DRY RUN — nothing written to DB)');
  }
  // Always write the JSON result file so the cron wrapper can detect "did anything happen"
  try {
    const fs = require('fs');
    fs.writeFileSync(process.env.PUBLISH_RESULT_FILE || '/tmp/auto-publish-result.json', JSON.stringify(result, null, 2));
  } catch (e) { /* non-fatal */ }
})().catch(e => { console.error('FATAL:', e.message, e.stack); process.exit(1); });
