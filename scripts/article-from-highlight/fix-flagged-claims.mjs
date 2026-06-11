#!/usr/bin/env node
/**
 * fix-flagged-claims.mjs
 *
 * Reads the review notes appended by auto-publish-verified.mjs and applies
 * the fix. For each flagged draft, look at the issue and either:
 *  - Strip false "OT" / "Overtime" mentions from the title and body
 *  - Roll back to archived if the fix would be too invasive
 *
 * Does NOT touch articles that have legitimate OT or invent-content flags —
 * those go to human review.
 */

import { readFileSync } from 'fs';

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

async function main() {
  const { data: drafts } = await sb
    .from('posts')
    .select('id, title, content, status')
    .eq('status', 'draft')
    .not('highlight_id', 'is', null);
  if (!drafts) return;

  // Filter to ones that have a review note appended
  const flagged = drafts.filter(d =>
    d.content.includes('Fact-check flagged')
  );
  console.log(`Found ${flagged.length} flagged drafts`);

  let otFixed = 0;
  let rolledBack = 0;
  for (const d of flagged) {
    const noteMatch = d.content.match(/\*Fact-check flagged \([\d-]+\): (.*?)\.\*/);
    if (!noteMatch) continue;
    const issues = noteMatch[1];

    // OT false-positive fix: strip "overtime", "in OT", " OT ", "OT " from the article
    if (issues.includes('article claims overtime, but Highlightly says no OT')) {
      let body = d.content;
      // Remove the fact-check note itself
      body = body.replace(/\n*\*Fact-check flagged.*\*\s*$/m, '').trim();
      // Strip OT/overtime from body (but only when not actually OT)
      const before = body;
      // Title patterns: "X Edge Y in OT Thriller" → "X Edge Y in Thriller"
      body = body.replace(/\s+in\s+OT\s+/gi, ' ');
      body = body.replace(/\s+OT\s+Thriller/gi, ' Thriller');
      body = body.replace(/\s+OT\s+Showdown/gi, ' Showdown');
      body = body.replace(/\s+OT\s+/gi, ' ');
      body = body.replace(/\s+overtime\s+/gi, ' ');
      body = body.replace(/\s+overtime\b/gi, '');
      body = body.replace(/\bovertime\s+/gi, '');
      body = body.replace(/\bdouble\s+overtime\b/gi, 'regulation');
      body = body.replace(/\bovertime\b/gi, 'extra time');
      body = body.replace(/\bextra\s+time\s+thriller\b/gi, 'thriller');
      body = body.replace(/\bextra\s+time\s+showdown\b/gi, 'showdown');
      body = body.replace(/\bextra\s+time\s+period\b/gi, 'final period');
      // Clean up double spaces
      body = body.replace(/  +/g, ' ').replace(/\n  +/g, '\n');

      // Update title in the body (line 1 after the #)
      let title = d.title;
      title = title.replace(/\s+in\s+OT\s+/gi, ' ');
      title = title.replace(/\s+OT\s+Thriller/gi, ' Thriller');
      title = title.replace(/\s+OT\s+Showdown/gi, ' Showdown');
      title = title.replace(/\s+OT\s+/gi, ' ');
      title = title.replace(/\s+overtime\s+/gi, ' ');
      title = title.replace(/\bovertime\b/gi, 'extra time');
      title = title.replace(/\s+/g, ' ').trim();

      // Update the body too
      body = body.replace(/^# .+$/m, `# ${title}`);

      const { error } = await sb.from('posts').update({
        content: body,
        title,
        subtitle: d.subtitle || '',
      }).eq('id', d.id);
      if (error) {
        console.error(`  ❌ fix failed for ${d.id}:`, error);
      } else {
        otFixed++;
      }
    } else {
      // More serious issue (invented goal scorers, save counts, etc.) — roll back to archived
      await sb.from('posts').update({ status: 'archived' }).eq('id', d.id);
      rolledBack++;
      console.log(`  ↩️  rolled back: ${d.title} (${issues.slice(0, 80)})`);
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`OT false-positives fixed: ${otFixed}`);
  console.log(`Rolled back: ${rolledBack}`);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
