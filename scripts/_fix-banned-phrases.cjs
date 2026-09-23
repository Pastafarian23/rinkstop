#!/usr/bin/env node
/**
 * _fix-banned-phrases.cjs — 2026-09-23
 *
 * One-shot fix for 4 published articles that contain banned AI-slop
 * phrases. The pre-publish quality gate shipped in commit 2568d1cd
 * (2026-09-22) blocks future occurrences, but these 4 leaked through
 * before the gate was live.
 *
 * Strategy (deterministic, no LLM call):
 *   - Find the offending sentence/paragraph
 *   - Remove the entire sentence containing the banned phrase
 *   - If removing leaves a stub paragraph, merge with adjacent paragraph
 *   - Re-score quality_score after fix
 *
 * Run: node scripts/_fix-banned-phrases.cjs [--write]
 * Default = dry-run (prints intended edits, doesn't persist).
 */
require('fs').readFileSync(__dirname + '/../.env.local', 'utf8').split('\n').forEach(l => {
  const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
});

const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Phrases the LLM was banned from using. Match at sentence boundary.
const BANNED = [
  'Because no transcript',
  'the safest read',
  'we cannot know',
  'without transcript support',
  'broader recap should stay',
  'the most reliable takeaway',
  'the period-by-period picture available',
  'safe to say',
  'it stands to reason',
  'one can only assume',
  'based on what is available',
  'in the absence of',
  'without a transcript',
  'reconstructing specific sequences',
  'winning goal is listed as',
  'winning goalie is listed as',
  'broad one confirmed by',
  'should stay focused on',
  'comfortable Flyers win',
  'without late drama',
  'in this league',
];

function stripBannedPhrases(body) {
  let out = body;
  let removed = [];
  for (const phrase of BANNED) {
    // Match the phrase and the surrounding sentence context. Sentences
    // end with . ! ? or newline. We strip from the start of the
    // sentence containing the phrase.
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Sentence-stripping regex: capture the sentence containing the phrase.
    // Look back to previous sentence-end or paragraph start, forward to next
    // sentence-end or paragraph end.
    const re = new RegExp(
      `(?:^|[.!?\\n]\\s+)([^.!?\\n]*${escaped}[^.!?\\n]*[.!?]?)`,
      'gi'
    );
    out = out.replace(re, (m) => {
      removed.push(phrase);
      return '';
    });
  }
  // Collapse runs of blank lines
  out = out.replace(/\n{3,}/g, '\n\n').trim();
  return { body: out, removed };
}

function reScore(content) {
  const body = content || '';
  const bodyLower = body.toLowerCase();
  let qScore = 100;
  const qIssues = [];
  for (const phrase of BANNED) {
    if (bodyLower.includes(phrase.toLowerCase())) { qIssues.push(`banned:${phrase}`); qScore -= 15; }
  }
  const wc = body.split(/\s+/).filter(Boolean).length;
  if (wc === 0) { qIssues.push('empty'); qScore -= 50; }
  else if (wc < 200) { qIssues.push(`short:${wc}`); qScore -= 20; }
  const h2 = (body.match(/^##\s+.+$/gm) || []).length;
  if (h2 === 0) { qIssues.push('no-h2'); qScore -= 10; }
  else if (h2 < 2) { qIssues.push(`few-h2:${h2}`); qScore -= 5; }
  if (!/\*\*Final Score:\*\*/i.test(body)) { qIssues.push('no-final-score'); qScore -= 20; }
  qScore = Math.max(0, Math.min(100, qScore));
  return { qScore, qIssues };
}

(async () => {
  const dryRun = !process.argv.includes('--write');
  console.log(dryRun ? '=== DRY RUN (pass --write to persist) ===' : '=== WRITING TO DB ===');

  // PostgREST .ilike doesn't work on text[] columns. Use a wider
  // filter: published + score < 80. Re-score + filter in-process.
  const { data: candidates, error } = await sb
    .from('posts')
    .select('id, slug, title, content, quality_score, quality_issues, status')
    .eq('status', 'published')
    .lt('quality_score', 80)
    .limit(500);
  if (error) { console.error('DB error:', error); process.exit(1); }
  // Filter in-process for actual banned-phrase offenders.
  const offenders = (candidates || []).filter(p =>
    (p.quality_issues || []).some(i => i.startsWith('banned:'))
  );
  if (error) { console.error('DB error:', error); process.exit(1); }
  console.log(`Found ${offenders.length} published articles with banned-phrase issues\n`);

  for (const post of offenders) {
    const before = reScore(post.content || '');
    const fix = stripBannedPhrases(post.content || '');
    const after = reScore(fix.body);
    console.log(`--- ${post.slug} (status=${post.status}) ---`);
    console.log(`  BEFORE: score=${before.qScore}, issues=${JSON.stringify(before.qIssues)}`);
    console.log(`  Stripped phrases: ${JSON.stringify(fix.removed)}`);
    console.log(`  AFTER:  score=${after.qScore}, issues=${JSON.stringify(after.qIssues)}`);
    console.log(`  body chars: ${(post.content || '').length} → ${fix.body.length}`);
    if (dryRun) continue;
    const { error: upErr } = await sb.from('posts').update({
      content: fix.body,
      quality_score: after.qScore,
      quality_issues: after.qIssues.length > 0 ? after.qIssues : null,
      regenerated_at: new Date().toISOString(),
      last_issue_summary: `Banned-phrase strip (${fix.removed.length} phrases) ${new Date().toISOString().slice(0,10)}`,
    }).eq('id', post.id);
    if (upErr) console.error(`  DB error: ${upErr.message}`);
    else console.log(`  ✓ updated`);
  }

  console.log(dryRun ? '\nRun with --write to persist.' : '\nDone.');
})().catch(e => { console.error('FATAL:', e.message, e.stack); process.exit(1); });
