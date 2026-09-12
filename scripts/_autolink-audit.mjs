#!/usr/bin/env node
/**
 * AUTOLINK AUDIT (dry-run, no DB writes).
 *
 * Pulls sample published news articles + the active team/league/rink
 * entity list from the DB, runs the current autolinkContent() function
 * over each article body, and emits a JSON report of every link the
 * algorithm would emit. Used to QC the auto-linker before/after
 * threshold or stopword changes.
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

// ---- Replica of src/lib/autolink.ts (v2 quality pass) ----
// MUST be kept in sync with the source. This is a copy-paste of the
// production algorithm with the same STOPWORDS, LONG_FORM_LEAGUES,
// MIN_OCCURRENCES gates.
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const STOPWORDS = new Set([
  'sport', 'gap', 'aware', 'stars', 'wild', 'panthers', 'kings',
  'ducks', 'jets', 'sharks', 'kraken', 'bruins', 'sabres', 'flames',
  'oilers', 'predators', 'saints', 'vikings', 'warriors', 'wolves',
  'canada', 'usa', 'finland', 'sweden', 'russia', 'slovakia', 'latvia',
  'germany', 'denmark', 'norway', 'switzerland', 'czechia', 'austria',
  'japan', 'china', 'kazakhstan', 'france', 'italy', 'poland', 'uk',
  'york', 'vermont', 'hampshire', 'windsor', 'moncton',
  'championship', 'classic',
  'ncaa',
]);

const MIN_OCCURRENCES = 2;

const LONG_FORM_LEAGUES = new Map([
  ['American Hockey League', 'AHL'],
  ['Ontario Hockey League', 'OHL'],
  ['Western Hockey League', 'WHL'],
  ['Quebec Major Junior Hockey League', 'QMJHL'],
  ['United States Hockey League', 'USHL'],
  ['Kontinental Hockey League', 'KHL'],
  ['Professional Women\'s Hockey League', 'PWHL'],
  ['International Ice Hockey Federation', 'IIHF'],
  ['IIHF World Championship', 'IIHF Worlds'],
]);

function autolinkContent(text, teams, leagues, rinks) {
  const entities = [
    ...teams.map((t) => ({ ...t, type: 'team' })),
    ...leagues.map((l) => ({ ...l, type: 'league' })),
    ...rinks.map((r) => ({ ...r, type: 'rink' })),
  ];
  if (entities.length === 0) return text;
  const filteredEntities = entities.filter((e) => !STOPWORDS.has(e.name.toLowerCase()));
  const strippedHtml = text.replace(/<[^>]*>/g, ' ');
  const longFormFiltered = filteredEntities.filter((e) => {
    if (e.type !== 'league') return true;
    const short = LONG_FORM_LEAGUES.get(e.name);
    if (!short) return true;
    const shortRe = new RegExp(`\\b${escapeRegex(short)}\\b`, 'i');
    return !shortRe.test(strippedHtml);
  });
  const occurrences = new Map();
  for (const e of longFormFiltered) {
    const k = e.name + '|' + e.type + '|' + e.slug;
    if (occurrences.has(k)) continue;
    const re = new RegExp(`\\b${escapeRegex(e.name)}\\b`, 'gi');
    const matches = strippedHtml.match(re) || [];
    occurrences.set(k, matches.length);
  }
  const thresholdFiltered = longFormFiltered.filter((e) => {
    const k = e.name + '|' + e.type + '|' + e.slug;
    return (occurrences.get(k) || 0) >= MIN_OCCURRENCES;
  });
  if (thresholdFiltered.length === 0) return text;
  thresholdFiltered.sort((a, b) => b.name.length - a.name.length);
  const patterns = thresholdFiltered.map((e) => `\\b${escapeRegex(e.name)}\\b`);
  const combinedPattern = new RegExp(`(${patterns.join('|')})`, 'gi');
  const parts = text.split(/(<a\b[^>]*>[\s\S]*?<\/a>)/gi);
  return parts.map((part, i) => {
    if (i % 2 === 1) return part;
    return part.replace(combinedPattern, (match) => {
      const entity = thresholdFiltered.find(
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

// ---- Fetch sample articles (stratified: most-viewed + recent) ----
console.log('[autolink-audit] Fetching sample articles...');
const { data: topByViews } = await supabase
  .from('posts')
  .select('id, slug, title, content_html, content, view_count, published_at, disable_autolink')
  .eq('status', 'published')
  .not('published_at', 'is', null)
  .order('view_count', { ascending: false, nullsFirst: false })
  .limit(20);
const { data: recent } = await supabase
  .from('posts')
  .select('id, slug, title, content_html, content, view_count, published_at, disable_autolink')
  .eq('status', 'published')
  .not('published_at', 'is', null)
  .order('published_at', { ascending: false })
  .limit(20);
const all = [...(topByViews || []), ...(recent || [])];
const seen = new Set();
const samples = [];
for (const p of all) {
  if (seen.has(p.slug)) continue;
  seen.add(p.slug);
  samples.push(p);
  if (samples.length >= 30) break;
}
console.log(`[autolink-audit] Selected ${samples.length} unique sample articles.`);

// ---- Run autolink + collect findings ----
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
    });
  }
  // Word occurrence count for each link text
  const counts = {};
  for (const l of links) {
    const k = l.text;
    counts[k] = (counts[k] || 0) + 1;
  }
  report.push({
    slug: post.slug,
    title: post.title,
    view_count: post.view_count,
    disable_autolink: post.disable_autolink || false,
    body_chars: htmlContent.length,
    total_links_emitted: links.length,
    distinct_links: Object.keys(counts).length,
    links,
  });
}

// ---- Stats ----
let totalLinks = 0;
const distinctSlugs = new Set();
for (const a of report) {
  totalLinks += a.total_links_emitted;
  for (const l of a.links) distinctSlugs.add(l.text + '|' + l.type);
}

const summary = {
  generated_at: new Date().toISOString(),
  algorithm: 'v2-2026-09-12 (stopwords + min-2-occurrence + long-form-skip)',
  sample_size: report.length,
  total_links_emitted: totalLinks,
  distinct_entities_linked: distinctSlugs.size,
  articles: report,
};

const outFile = '/tmp/autolink-audit-report.json';
fs.writeFileSync(outFile, JSON.stringify(summary, null, 2));
console.log(`\n[autolink-audit] Report written to ${outFile}`);
console.log(`[autolink-audit] Sample articles: ${report.length}`);
console.log(`[autolink-audit] Total auto-links emitted: ${totalLinks}`);
console.log(`[autolink-audit] Distinct entities linked: ${distinctSlugs.size}`);

console.log('\n=== TOP DISTINCT ENTITIES LINKED ===');
const entityCounts = {};
for (const a of report) {
  for (const l of a.links) {
    const k = l.text + ' (' + l.type + ':' + l.slug + ')';
    entityCounts[k] = (entityCounts[k] || 0) + 1;
  }
}
Object.entries(entityCounts)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 30)
  .forEach(([k, v]) => console.log(`  ${v.toString().padStart(2)}  "${k}"`));

console.log('\n=== PER-ARTICLE SUMMARY ===');
for (const a of report) {
  console.log(`\n[${a.view_count || 0} views] ${a.title} (${a.body_chars} chars)`);
  console.log(`  links: ${a.total_links_emitted} (${a.distinct_links} distinct)`);
  if (a.total_links_emitted > 0) {
    const entityCounts2 = {};
    for (const l of a.links) {
      entityCounts2[l.text] = (entityCounts2[l.text] || 0) + 1;
    }
    const ents = Object.entries(entityCounts2).map(([k,v]) => v + 'x ' + k).join(', ');
    console.log(`  entities: ${ents}`);
  }
}