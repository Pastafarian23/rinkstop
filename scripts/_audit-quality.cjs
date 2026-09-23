#!/usr/bin/env node
/**
 * _audit-quality.cjs
 *
 * Run the article quality scoring against ALL published posts in DB.
 * Persists quality_score + quality_issues to posts. Outputs band
 * summary + top offenders.
 *
 * Run: node scripts/_audit-quality.cjs
 *
 * Per Arnel 2026-09-22 21:37 CDT: must rerun all articles for QC.
 * This script is the local-runnable version of the same logic in
 * /api/admin/articles/quality-check — used during development to
 * bulk-score without waiting for the Vercel route. The production
 * route uses the same shared checkArticleQuality() helper.
 */
require('fs').readFileSync(__dirname + '/../.env.local', 'utf8').split('\n').forEach(l => {
  const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
});

// Inline copy of the scoring rubric (kept in sync with src/lib/article-quality.ts)
const BANNED_PHRASES = [
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

function checkArticleQuality(input) {
  const title = (input.title || '').trim();
  const body = (input.body || '').trim();
  const issues = [];
  let score = 100;

  const wordCount = body ? body.split(/\s+/).filter(Boolean).length : 0;
  if (wordCount === 0) { issues.push({ type: 'low-word-count', detail: 'empty', penalty: 50 }); score -= 50; }
  else if (wordCount < 200) { issues.push({ type: 'low-word-count', detail: `${wordCount}`, penalty: 20 }); score -= 20; }
  else if (wordCount > 1000) { issues.push({ type: 'low-word-count', detail: `${wordCount}`, penalty: 10 }); score -= 10; }

  if (body) {
    const bodyLower = body.toLowerCase();
    for (const phrase of BANNED_PHRASES) {
      if (bodyLower.includes(phrase.toLowerCase())) {
        issues.push({ type: 'banned-phrase', pattern: phrase, penalty: 15 });
        score -= 15;
      }
    }
  }

  const h2Count = body ? (body.match(/^##\s+.+$/gm) || []).length : 0;
  if (h2Count === 0 && body) { issues.push({ type: 'missing-h2', penalty: 10 }); score -= 10; }
  else if (h2Count < 2 && body) { issues.push({ type: 'missing-h2', detail: `only ${h2Count}`, penalty: 5 }); score -= 5; }

  if (title) {
    const hasCap = /\b[A-Z][a-z]{2,}/.test(title);
    const isGen = /^(game recap|recap|highlights?|story)$/i.test(title);
    if (!hasCap || isGen) { issues.push({ type: 'title-missing-team', penalty: 10 }); score -= 10; }
  }

  const hasFinalScore = body ? /\*\*Final Score:\*\*/i.test(body) || /^\*?Final Score:/im.test(body) : false;
  if (body && !hasFinalScore) { issues.push({ type: 'no-final-score', penalty: 20 }); score -= 20; }

  score = Math.max(0, Math.min(100, score));
  const band = score >= 80 ? 'good' : score >= 60 ? 'slop-light' : 'slop-heavy';
  return { score, band, issues, wordCount, h2Count };
}

const { createClient } = require('@supabase/supabase-js');
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

async function main() {
  console.log('Fetching all published articles...');
  const PAGE = 200;
  const all = [];
  let from = 0;
  while (true) {
    const { data, error } = await sb
      .from('posts')
      .select('id, slug, title, content, subtitle, seo_description, status, published_at')
      .eq('status', 'published')
      .order('published_at', { ascending: false, nullsFirst: false })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  console.log(`Total published: ${all.length}`);

  const summary = { good: 0, slopLight: 0, slopHeavy: 0, total: 0, averageScore: 0 };
  const offenders = [];
  let written = 0;
  let i = 0;
  for (const post of all) {
    const result = checkArticleQuality({
      title: post.title,
      subtitle: post.subtitle,
      metaDescription: post.seo_description,
      body: post.content,
    });
    summary.total++;
    summary.averageScore += result.score;
    if (result.band === 'good') summary.good++;
    else if (result.band === 'slop-light') summary.slopLight++;
    else summary.slopHeavy++;
    if (result.band !== 'good') {
      offenders.push({
        slug: post.slug,
        title: post.title,
        score: result.score,
        band: result.band,
        issues: result.issues.map(i => i.type === 'banned-phrase' ? `banned:${i.pattern}` : `${i.type}${i.detail ? ':' + i.detail : ''}`).slice(0, 5),
      });
    }
    // Persist
    const { error } = await sb.from('posts').update({
      quality_score: result.score,
      quality_issues: result.issues.map(i => i.type === 'banned-phrase' ? `banned:${i.pattern}` : `${i.type}${i.detail ? `:${i.detail}` : ''}`),
      regenerated_at: new Date().toISOString(),
    }).eq('id', post.id);
    if (!error) written++;
    i++;
    if (i % 100 === 0) console.log(`  processed ${i}/${all.length}, written ${written}`);
  }
  if (summary.total > 0) summary.averageScore = Math.round(summary.averageScore / summary.total);

  // Sort offenders: slop-heavy first
  offenders.sort((a, b) => {
    if (a.band !== b.band) return a.band === 'slop-heavy' ? -1 : 1;
    return a.score - b.score;
  });

  console.log('\n=== AUDIT SUMMARY ===');
  console.log(JSON.stringify(summary, null, 2));
  console.log(`\nPersisted quality_score on ${written}/${all.length} posts.`);
  console.log(`\nTop 30 offenders:`);
  for (const o of offenders.slice(0, 30)) {
    console.log(`  ${o.score.toString().padStart(3)} [${o.band}] ${o.slug}`);
    console.log(`      title: ${(o.title || '').slice(0, 60)}`);
    if (o.issues.length) console.log(`      issues: ${o.issues.join(' | ')}`);
  }

  require('fs').writeFileSync('/tmp/article-quality-audit.json', JSON.stringify({
    summary, offenders, generated_at: new Date().toISOString(),
  }, null, 2));
  console.log('\nFull report saved to /tmp/article-quality-audit.json');
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
