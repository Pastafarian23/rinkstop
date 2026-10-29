/**
 * scripts/_generate-rink-descriptions.mjs
 *
 * Generates specific, non-boilerplate meta descriptions for the rink pages
 * whose current description is the identical "serves as a home venue for
 * local hockey teams and as a programming h..." string.
 *
 * WHY (2026-10-29, GSC):
 *   Site-wide 2026-06-01..2026-10-28: 124,174 impressions -> 454 clicks
 *   (0.37% CTR). 47,439 impressions (38% of all) sit at position 4-10 with
 *   ZERO clicks across 4,379 queries.
 *
 *   Root-caused to the rink directory. Comparing pages at MATCHED positions
 *   (which removes the confound that better pages simply rank better):
 *
 *     position 4-10 band   boilerplate  495 pages  58,312 impr   0.63% CTR
 *                          hand-written 753 pages 100,816 impr   1.14% CTR
 *     CONTROL position >10 boilerplate  236 pages  23,827 impr   0.44% CTR
 *                          hand-written 214 pages  25,759 impr   0.54% CTR
 *
 *   Description type independently predicts CTR at matched positions, and it
 *   replicates in the control band. 738 rink pages carry the boilerplate.
 *
 * THE PATTERN TO COPY (the 985 hand-written pages already do this):
 *   "Brett Memorial Ice Arena in Wasilla, Alaska (Mat-Su Borough). Public
 *    skating, youth hockey, figure skating, and event space for the Mat-Su
 *    Valley community."
 *   "Official Dallas Stars community rink in Euless, Texas (Tarrant County).
 *    Youth and adult hockey leagues, learn-to-skate, and public sessions
 *    year-round."
 *   "Snow World Noida (DLF Mall of India). Snow theme park + ice skating
 *    rink. 15,000 sq ft. Sledging, toboggan, ice-skating, snow play."
 *
 *   -> lead with a SPECIFIC LOCAL DETAIL, not a category sentence.
 *
 * WHAT THIS SCRIPT DOES:
 *   1. Finds every active rink whose meta_description matches the boilerplate.
 *   2. Builds a specific description from the structured fields we actually
 *      have (notes 93% populated, city 100%, province 68%, address 87%,
 *      capacity 19%, league 13%, website 47%).
 *   3. DRY RUN by default: prints a report + samples. With --write it
 *      UPDATEs meta_description on those rows only.
 *
 * SAFETY:
 *   - Never touches a page that already has a hand-written description.
 *   - Only ever REPLACES the exact boilerplate string.
 *   - Writes only to `meta_description`.
 *   - Idempotent: a second run finds nothing to do.
 *
 * Usage:
 *   node scripts/_generate-rink-descriptions.mjs            # dry run
 *   node scripts/_generate-rink-descriptions.mjs --write    # apply
 *   node scripts/_generate-rink-descriptions.mjs --limit 50 # first N only
 */

import fs from 'node:fs';

const CREDS = '/root/.openclaw/credentials/supabase.json';
const creds = JSON.parse(fs.readFileSync(CREDS, 'utf8'));
const BASE = creds.url;
const KEY = creds.serviceRoleKey;
const H = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  'Content-Type': 'application/json',
};

const BOILERPLATE_RE =
  /serves as a home venue for local hockey teams and as a programming h/i;

const args = process.argv.slice(2);
const WRITE = args.includes('--write');
const LIMIT = args.includes('--limit') ? Number(args[args.indexOf('--limit') + 1]) : Infinity;

/** Strip a trailing ellipsis and trailing whitespace. */
function clean(s) {
  return String(s || '')
    .replace(/\s+/g, ' ')
    .replace(/\s*\.{2,}\s*$/, '')
    .trim();
}

/** "Wasilla, Alaska (Mat-Su Borough)" -> a compact location string. */
function locationOf(r) {
  const city = clean(r.city);
  const region = clean(r.province_state);
  const country = clean(r.country);
  // US: "City, ST" is what people search. Elsewhere: "City, Country".
  const isUS = /united states/i.test(country);
  if (city && region && isUS) return `${city}, ${region}`;
  if (city && region && !isUS && region !== country) return `${city}, ${region}`;
  if (city && country) return `${city}, ${country}`;
  return city || country || '';
}

/**
 * Pull the useful, human sentence out of `notes`.
 * Notes are editorial and often contain "League: USHL | Cap 3,461. Home: ..."
 * or "Premier Metro Detroit figure skating club. Year-round." — we want a
 * short, concrete clause, not the whole thing.
 */
function detailFromNotes(r) {
  const notes = clean(r.notes);
  if (!notes) return '';
  // Prefer a sentence that mentions something concrete about the venue.
  // Split on the pipe separator ONLY. (A regex of /\s*|\s*/ splits on every
  // whitespace character and shreds the note into single words — that bug
  // silently emptied every description.)
  const parts = notes.split(/\s*\|\s*/).filter(Boolean);
  for (const part of parts) {
    const p = clean(part);
    // Skip pure metadata fragments.
    if (/^(league|tenant|built|home|cap|capacity|surface|ice|opened|status|type)\b\s*:/i.test(p)) {
      continue;
    }
    // A real descriptive sentence: not just a name+city sentence.
    if (p.length >= 25 && p.length <= 220 && !/serves as a home venue/i.test(p)) {
      return p;
    }
  }
  // A "Home: X (League)" or "League: NHL | X managed." fragment names a
  // tenant — a real, searchable fact. Rewrite it into a sentence rather than
  // dropping it.
  const tenant = parts
    .map(clean)
    .find((p) => /^(home|tenant)\s*:\s*\S/i.test(p) && p.length >= 12 && p.length <= 220);
  if (tenant) {
    const who = tenant.replace(/^home\s*:\s*/i, '').replace(/[.;]+$/, '');
    return who;
  }
  // "League: NHL | Anaheim Ducks managed." — the second fragment names the
  // tenant even though the first is just a league label.
  const tenantPart = parts.map(clean).find((p) => /managed|home to|hosts?\b/i.test(p) && p.length >= 12 && p.length <= 220);
  if (tenantPart) return tenantPart;
  // Shorter fragments can still be specific — "Opened 2018 · 1 rink",
  // "KC suburb. Year-round.", "Moss IK · Opened 2008" all carry real facts.
  // Accept them if they contain a concrete token (a year, a number, a team
  // name, or a facility qualifier) rather than a bare category word.
  const CONCRETE =
    /\d|opened|built|rink|arena|pad|ice|skate|publi|year|since|known|city|county|club|team|assoc/i;
  const short = parts.map(clean).find((p) => p.length >= 8 && p.length <= 220 && CONCRETE.test(p));
  return short || '';
}

/** Capitalise the first letter, ensure it ends as a sentence. */
function sentence(s) {
  const t = clean(s);
  if (!t) return '';
  const withPeriod = /[.!?]$/.test(t) ? t : `${t}.`;
  return withPeriod.charAt(0).toUpperCase() + withPeriod.slice(1);
}

/**
 * Build the description. Shape follows the hand-written pages:
 *   "<Name> in <location>. <Specific detail>."
 */
function buildDescription(r) {
  const name = clean(r.name);
  const loc = locationOf(r);
  const detail = detailFromNotes(r);
  const capacity = r.capacity ? Number(r.capacity) : null;

  const bits = [];

  // 1. Name + location. Different shapes for US vs elsewhere, like the
  //    hand-written examples ("in Wasilla, Alaska (Mat-Su Borough)").
  if (loc) bits.push(`${name} in ${loc}.`);
  else bits.push(`${name}.`);

  // 2. The specific detail. Prefer the editorial note.
  if (detail) {
    // If the note already starts with the venue name, drop the duplicate.
    let d = detail;
    if (d.toLowerCase().startsWith(name.toLowerCase() + ' ')) {
      d = d.slice(name.length + 1);
    }
    d = sentence(d);
    if (d) bits.push(d);
  } else if (capacity) {
    // 3. Fall back to hard, verifiable facts.
    const size = r.ice_size === 'NHL' ? 'NHL-sized' : r.ice_size === 'Olympic' ? 'Olympic-sized' : null;
    const facts = [];
    if (size) facts.push(`${size} ice`);
    facts.push(`${capacity.toLocaleString('en-US')} capacity`);
    if (r.league) facts.push(`home of the ${clean(r.league)}`);
    bits.push(sentence(`Ice rink with ${facts.join(', ')}.`));
  } else if (r.ice_size) {
    const size = r.ice_size === 'NHL' ? 'NHL-sized' : r.ice_size === 'Olympic' ? 'Olympic-sized' : `${clean(r.ice_size)} ice`;
    bits.push(sentence(`${size} ice rink.`));
  } else if (r.league) {
    bits.push(sentence(`Ice rink and home of the ${clean(r.league)}.`));
  } else {
    // Fall back to the street address, which is a real, verifiable specific.
    bits.push(
      r.address
        ? sentence(`Ice rink at ${clean(r.address)}.`)
        : sentence(`Ice rink${r.website_url ? ' with its own website' : ''}.`),
    );
  }

  let out = bits.join(' ');
  // Google truncates around 155-160 chars; keep it tight but complete.
  if (out.length > 158) {
    out = out.slice(0, 155);
    // don't cut mid-word
    const cut = out.lastIndexOf(' ');
    if (cut > 100) out = out.slice(0, cut);
    out = out.replace(/[,;:]\s*$/, '') + '…';
  }
  return out;
}

// ── Fetch the boilerplate rows ──────────────────────────────────────────────
const listRes = await fetch(
  `${BASE}/rest/v1/rinks?select=id,name,slug,city,country,province_state,address,capacity,ice_size,league,notes,website_url,meta_description&is_active=eq.true&limit=3000`,
  { headers: H },
);
if (!listRes.ok) {
  console.error('[gen-desc] fetch failed', listRes.status, (await listRes.text()).slice(0, 200));
  process.exit(1);
}
const all = await listRes.json();
const targets = all.filter((r) => r.meta_description && BOILERPLATE_RE.test(r.meta_description));

console.log(`[gen-desc] active rinks scanned: ${all.length}`);
console.log(`[gen-desc] boilerplate descriptions found: ${targets.length}`);
console.log(`[gen-desc] hand-written (left alone): ${all.length - targets.length}`);

const toFix = targets.slice(0, LIMIT);
console.log(`[gen-desc] to process this run: ${toFix.length}${WRITE ? ' (WRITING)' : ' (dry run)'}\n`);

const samples = toFix.slice(0, 12);
console.log('── sample rewrites ──');
for (const r of samples) {
  console.log(`\n${r.slug}`);
  console.log(`  OLD: ${r.meta_description.slice(0, 140)}`);
  console.log(`  NEW: ${buildDescription(r)}`);
}

// Quality check: how many would still be generic?
//
// A description is "concrete" if it contains a verifiable specific: a number
// (capacity, seats, sq ft, year), a named tenant, a real facility type beyond
// the generic word "rink", or a place qualifier. Note that words like
// "twin-pad", "year-round", "pop-up" and "county" ARE specific — do not
// flag those. The earlier version of this check wrongly flagged
// "Twin-pad. Year-round." and "Traveling seasonal pop-up rinks statewide."
const built = toFix.map((r) => ({ r, d: buildDescription(r) }));
const stillThin = built.filter((x) => {
  const d = x.d;
  // Strip the name+location lead (every rink page has that, so it is not
  // information) and any bare "Ice rink." tail, then judge what is left.
  let rest = d.replace(/^[^.]+\.\s*/, '').replace(/\s*Ice rink\.?\s*$/i, '');
  rest = rest.trim();
  if (!rest) return true;
  const hasNumber = /\d/.test(rest);
  const hasNamedThing =
    /\b(cap\b|seat|courts?|sheets?|twin-pad|pop-up|year-round|county|seasonal|indoor|outdoor|mall|centre|center|club|academy|school|association|university|college|team|arena|suburb|region|scotland|england|wales|ireland|north|south|east|west|public|recreational|tra|hockey|figure|curling|managed|home to)\b/i.test(
      rest,
    );
  return !hasNumber && !hasNamedThing;
});
console.log(`\n── quality ──`);
console.log(`with a concrete detail: ${built.length - stillThin.length}/${built.length}`);
console.log(`still generic: ${stillThin.length}`);
if (stillThin.length) {
  console.log('examples still generic:');
  for (const x of stillThin.slice(0, 5)) console.log(`  ${x.r.slug} -> ${x.d}`);
}

if (!WRITE) {
  console.log('\n[gen-desc] DRY RUN. Re-run with --write to apply.');
  process.exit(0);
}

// ── Apply ───────────────────────────────────────────────────────────────────
let updated = 0;
const failures = [];
for (const { r, d } of built) {
  const res = await fetch(`${BASE}/rest/v1/rinks?id=eq.${r.id}`, {
    method: 'PATCH',
    headers: { ...H, Prefer: 'return=minimal' },
    body: JSON.stringify({ meta_description: d }),
  });
  if (res.ok) updated++;
  else failures.push({ slug: r.slug, status: res.status, body: (await res.text()).slice(0, 160) });
  if (updated % 50 === 0) console.log(`  ...${updated}/${built.length}`);
}
console.log(`\n[gen-desc] updated ${updated}/${built.length}`);
if (failures.length) {
  console.log(`[gen-desc] ${failures.length} failures:`);
  for (const f of failures.slice(0, 10)) console.log('  ', f.slug, f.status, f.body);
  process.exit(1);
}
