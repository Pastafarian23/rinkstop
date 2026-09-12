#!/usr/bin/env node
/**
 * AUTOLINK AUDIT (dry-run, no DB writes).
 *
 * Pulls 20 sample published news articles + the active team/league/rink
 * entity list from the DB, runs the existing autolinkContent() function over
 * each article body, and emits a JSON report of every link the current
 * algorithm would emit. Used to QC the auto-linker before any threshold or
 * stopword changes are committed.
 *
 * NO WRITES. Read-only. Safe to re-run.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

// ---- Load .env (Next.js convention) ----
const envFile = fs.readFileSync(
  path.join(process.cwd(), '.env.local'),
  'utf8',
);
for (const line of envFile.split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

// ---- Replica of src/lib/autolink.ts (kept in sync manually) ----
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function autolinkContent(text, teams, leagues, rinks) {
  const entities = [
    ...teams.map((t) => ({ ...t, type: 'team' })),
    ...leagues.map((l) => ({ ...l, type: 'league' })),
    ...rinks.map((r) => ({ ...r, type: 'rink' })),
  ];
  if (entities.length === 0) return text;
  entities.sort((a, b) => b.name.length - a.name.length);
  const patterns = entities.map((e) => `\\b${escapeRegex(e.name)}\\b`);
  const combinedPattern = new RegExp(`(${patterns.join('|')})`, 'gi');
  const parts = text.split(/(<a\b[^>]*>[\s\S]*?<\/a>)/gi);
  return parts.map((part, i) => {
    if (i % 2 === 1) return part;
    return part.replace(combinedPattern, (match) => {
      const entity = entities.find(
        (e) => e.name.localeCompare(match, undefined, { sensitivity: 'base' }) === 0,
      );
      if (!entity) return match;
      return `<a href="/directory/${entity.type}s/${entity.slug}" style="color: var(--red); text-decoration: underline; text-underline-offset: 2px;">${match}</a>`;
    });
  }).join('');
}

// ---- Fetch entities ----
console.log('[autolink-audit] Fetching entity lists...');
const [teamsRes, leaguesRes, rinksRes] = await Promise.all([
  supabase.from('teams').select('name, slug').eq('is_active', true).not('slug', 'is', null),
  supabase.from('leagues').select('name, slug').eq('is_active', true).not('slug', 'is', null),
  supabase.from('rinks').select('name, slug').eq('is_active', true).not('slug', 'is', null),
]);
const teams = (teamsRes.data || []).map((r) => ({ name: r.name, slug: r.slug }));
const leagues = (leaguesRes.data || []).map((r) => ({ name: r.name, slug: r.slug }));
const rinks = (rinksRes.data || []).map((r) => ({ name: r.name, slug: r.slug }));
console.log(`[autolink-audit] teams=${teams.length} leagues=${leagues.length} rinks=${rinks.length} total=${teams.length + leagues.length + rinks.length}`);

// ---- Fetch 20 published articles (stratified: most-viewed + recent) ----
console.log('[autolink-audit] Fetching 20 sample articles...');
const { data: topByViews } = await supabase
  .from('posts')
  .select('id, slug, title, content_html, content, view_count, published_at, disable_autolink')
  .eq('status', 'published')
  .not('published_at', 'is', null)
  .order('view_count', { ascending: false, nullsFirst: false })
  .limit(10);
const { data: recent } = await supabase
  .from('posts')
  .select('id, slug, title, content_html, content, view_count, published_at, disable_autolink')
  .eq('status', 'published')
  .not('published_at', 'is', null)
  .order('published_at', { ascending: false })
  .limit(10);
const all = [...(topByViews || []), ...(recent || [])];
const seen = new Set();
const samples = [];
for (const p of all) {
  if (seen.has(p.slug)) continue;
  seen.add(p.slug);
  samples.push(p);
  if (samples.length >= 20) break;
}
console.log(`[autolink-audit] Selected ${samples.length} unique sample articles.`);

// ---- Run autolink + collect findings ----
const stopwords = new Set([
  // common prose words that happen to match team names
  'gap', 'sport', 'sport', 'kings', 'panthers', 'wild', 'stars', 'flames',
  'oilers', 'kings', 'ducks', 'jets', 'sharks', 'kraken', 'bruins', 'sabres',
  'saints', 'vikings', 'warriors', 'wolves', 'wolves', 'predators',
  // national-team names that are common in prose
  'canada', 'usa', 'finland', 'sweden', 'russia', 'slovakia', 'latvia',
  'germany', 'denmark', 'norway', 'switzerland', 'czech', 'austria',
  'japan', 'china', 'kazakhstan', 'france', 'italy', 'poland',
  // league acronyms (already in leagues table but often appear as prose)
  'ahl', 'ehl', 'shl', 'chl', 'whl', 'ohl', 'qmjhl', 'ushl', 'nahl', 'echl',
  'khl', 'del', 'nl', 'ncaa', 'mhl', 'vhl',
]);

const report = [];
for (const post of samples) {
  const htmlContent =
    post.content_html && post.content_html.trim().length > 0
      ? post.content_html
      : `<p>${(post.content || '').replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br/>')}</p>`;
  const linked = autolinkContent(htmlContent, teams, leagues, rinks);
  const re = /<a href="\/directory\/(teams|leagues|rinks)\/([^"]+)"[^>]*>([^<]+)<\/a>/g;
  const links = [];
  let m;
  while ((m = re.exec(linked)) !== null) {
    links.push({
      text: m[3],
      type: m[1],
      slug: m[2],
      isStopword: stopwords.has(m[3].toLowerCase()),
      isShortCommonWord: m[3].length <= 4,
    });
  }
  // Word occurrence count for each link text
  const counts = {};
  for (const l of links) {
    const k = l.text + '|' + l.type + '|' + l.slug;
    counts[k] = (counts[k] || 0) + 1;
  }
  // Count occurrences in original (non-linked) text per link text
  const originalCounts = {};
  for (const l of links) {
    const k = l.text;
    if (originalCounts[k] !== undefined) continue;
    const wordRe = new RegExp(`\\b${escapeRegex(l.text)}\\b`, 'gi');
    const strippedHtml = htmlContent.replace(/<[^>]*>/g, ' ');
    const matches = strippedHtml.match(wordRe) || [];
    originalCounts[k] = matches.length;
  }
  report.push({
    slug: post.slug,
    title: post.title,
    view_count: post.view_count,
    disable_autolink: post.disable_autolink || false,
    body_chars: htmlContent.length,
    total_links_emitted: links.length,
    distinct_links: Object.keys(counts).length,
    one_time_mentions: Object.entries(counts).filter(([k, v]) => v === 1).map(([k]) => k.split('|')[0]),
    links: links.map((l) => ({
      text: l.text,
      type: l.type,
      slug: l.slug,
      occurrences_in_body: originalCounts[l.text],
      isStopword: l.isStopword,
      isShortCommonWord: l.isShortCommonWord,
    })),
  });
}

// ---- Stats ----
let totalLinks = 0;
let totalStopwordLinks = 0;
let totalOneTimeLinks = 0;
const suspiciousByEntity = {};
for (const a of report) {
  for (const l of a.links) {
    totalLinks++;
    if (l.isStopword) totalStopwordLinks++;
    if (l.occurrences_in_body === 1) totalOneTimeLinks++;
    if (l.isStopword || l.occurrences_in_body === 1) {
      const key = `${l.text}|${l.type}|${l.slug}`;
      suspiciousByEntity[key] = (suspiciousByEntity[key] || 0) + 1;
    }
  }
}

const summary = {
  generated_at: new Date().toISOString(),
  sample_size: report.length,
  total_links_emitted: totalLinks,
  links_to_stopwords: totalStopwordLinks,
  links_to_one_time_mentions: totalOneTimeLinks,
  suspicious_entities: Object.entries(suspiciousByEntity)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => {
      const [text, type, slug] = k.split('|');
      return { text, type, slug, articles_with_finding: v };
    }),
  articles: report,
};

const outFile = '/tmp/autolink-audit-report.json';
fs.writeFileSync(outFile, JSON.stringify(summary, null, 2));
console.log(`\n[autolink-audit] Report written to ${outFile}`);
console.log(`[autolink-audit] Sample articles: ${report.length}`);
console.log(`[autolink-audit] Total auto-links emitted: ${totalLinks}`);
console.log(`[autolink-audit] Links to stopwords: ${totalStopwordLinks}`);
console.log(`[autolink-audit] Links to 1-time mentions: ${totalOneTimeLinks}`);
console.log(`[autolink-audit] Suspicious entities: ${Object.keys(suspiciousByEntity).length}`);

// Print a compact table for the chat
console.log('\n=== TOP SUSPICIOUS ENTITIES (linked but stopword OR 1-time mention) ===');
Object.entries(suspiciousByEntity)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 30)
  .forEach(([k, v]) => {
    const [text, type, slug] = k.split('|');
    console.log(`  ${v.toString().padStart(2)}  "${text}" -> /directory/${type}s/${slug}`);
  });

console.log('\n=== PER-ARTICLE SUMMARY ===');
for (const a of report) {
  console.log(`\n[${a.view_count || 0} views] ${a.title} (${a.body_chars} chars)`);
  console.log(`  links: ${a.total_links_emitted} (${a.distinct_links} distinct) | 1-time: ${a.one_time_mentions.length}`);
  if (a.one_time_mentions.length > 0 && a.one_time_mentions.length <= 10) {
    console.log(`  1-time mentions: ${a.one_time_mentions.join(', ')}`);
  } else if (a.one_time_mentions.length > 10) {
    console.log(`  1-time mentions (first 10): ${a.one_time_mentions.slice(0, 10).join(', ')}, ...`);
  }
}