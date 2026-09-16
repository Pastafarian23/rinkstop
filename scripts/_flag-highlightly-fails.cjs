// Mark Highlightly-verified FAIL articles as draft (for human review per Arnel's directive).
// These 6 articles have fabricated scores confirmed against Highlightly boxscore source.

require('fs').readFileSync('/root/.openclaw/workspace/rinkstop-platform/.env', 'utf8').split('\n').forEach(l => {
  const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
});
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const REASON_TEMPLATE = (slug, boxscore, articleSays) =>
  `\n\n---\n[2026-09-16 AUDIT FAIL] Highlightly boxscore mismatch (audit source: ${slug}).\nActual: ${boxscore}\nArticle says: ${articleSays}\nAction: human review required — do NOT auto-publish. Compare against YouTube video + HockeyTech boxscore if available.\n`;

const SLUGS = [
  {slug: 'adler-mannheim-eisb-ren-berlin-5-1-2026-04-26-2467475', boxscore: 'Eisbären Berlin 5 - Adler Mannheim 1 (2026-04-26, DEL)', articleSays: 'Adler Mannheim 5-1 Eisbären Berlin — WRONG (Eisbären won)'},
  {slug: 'avangard-omsk-lokomotiv-yaroslavl-4-0-2026-05-02-2468964', boxscore: 'Lokomotiv Yaroslavl 4 - Avangard Omsk 0 (2026-05-02, KHL)', articleSays: 'Avangard Omsk 4-0 Lokomotiv — WRONG (Lokomotiv won)'},
  {slug: 'eisb-ren-berlin-adler-mannheim-3-7-2026-04-24-2467474', boxscore: 'Adler Mannheim 7 - Eisbären Berlin 3 (2026-04-24, DEL)', articleSays: 'Adler 7-3 Eisbären — title correct, body fabrication'},
  {slug: 'eisb-ren-berlin-adler-mannheim-1-4-2026-05-03-2469255-5d433a', boxscore: 'Adler Mannheim 4 - Eisbären Berlin 1 (2026-05-03, DEL)', articleSays: 'Adler 4-1 Eisbären — title correct, body fabrication'},
  {slug: 'ska-1946-krasnaya-armiya-2-5-2026-04-06-2963267', boxscore: 'Krasnaya Armiya 5 - SKA-1946 2 (2026-04-06, MHL)', articleSays: 'Krasnaya Armiya 5-2 SKA-1946 — title correct, body fabrication'},
  {slug: 'lokomotiv-yaroslavl-avangard-omsk-2-4-2026-04-28-2466545-7b90ca', boxscore: 'Avangard Omsk 4 - Lokomotiv Yaroslavl 2 (2026-04-28, KHL)', articleSays: 'Avangard Omsk 4-2 Lokomotiv — title correct, slug direction inconsistent'},
];

(async () => {
  let flagged = 0;
  for (const info of SLUGS) {
    const { data: posts, error: selErr } = await sb.from('posts').select('id, content, status').eq('slug', info.slug);
    if (selErr) { console.log(`ERR select ${info.slug}: ${selErr.message}`); continue; }
    const post = posts?.[0];
    if (!post) { console.log(`NOT FOUND: ${info.slug}`); continue; }

    const auditNote = REASON_TEMPLATE(info.slug, info.boxscore, info.articleSays);
    const newContent = (post.content || '') + auditNote;

    const { error: upErr } = await sb.from('posts').update({
      status: 'draft',  // Per Arnel directive: flag for human review, do NOT auto-fix
      content: newContent,
    }).eq('id', post.id);

    if (upErr) { console.log(`ERR update ${info.slug}: ${upErr.message}`); continue; }
    flagged++;
    console.log(`✓ FLAGGED: ${info.slug} (status: ${post.status} → draft)`);
  }
  console.log(`\nFlagged ${flagged}/${SLUGS.length} articles for human review`);
})().catch(e => console.error('FATAL:', e.message));
