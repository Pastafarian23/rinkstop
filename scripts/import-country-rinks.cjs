#!/usr/bin/env node
/**
 * import-country-rinks.cjs
 *
 * Generic importer for Arnel-supplied country rink spreadsheets.
 * HEADER-AWARE: builds a column→field map from the actual header row, so it
 * tolerates column reordering, missing columns, and extra columns gracefully.
 *
 * Recognized header patterns (case-insensitive, accent-insensitive):
 *   Name       | "Name of Ice Rink" | "Name of Ice Rink / Arena" | "Name (English / Chinese)" | "Name" | "Rink"
 *   Address    | "Address" | "Street"
 *   City       | "City / Region" | "City / Zip" | "City / Province" | "City"
 *   Phone      | "Phone" | "Contact Number" | "Contact" | "Phone Number"
 *   Website    | "Website" | "Email / Website" | "Web" | "URL"
 *   TypeCap    | "Type / Cap" | "Type/Cap" | "Capacity" | "Cap"
 *   LeagueTeam | "League / Use" | "League" | "League – Team"
 *   Notes      | "Notes / Status" | "Notes" | "Notes (Home Team · Cap · Opened)" | "Description" | "Status"
 *   Source     | "Source" | "Sources" | "Provenance" | "References"
 *   YearOpened | "Year Opened" | "Opened" | "Year"
 *
 * Match strategy (conservative — avoids over-merging):
 *   1. Exact normalized name (lowercase, åäö→a, strip parens for fallback)
 *   2. Exact normalized full address
 *   3. Slug match
 * If any of these hit, the existing row is updated (only empty fields).
 * Otherwise, a new row is inserted.
 *
 * Capacity resolution (in priority order):
 *   1. From explicit capacity/TypeCap column — first number with commas stripped
 *   2. From notes field — "Cap N" or "Cap N,..." pattern
 *   3. From notes field — first standalone number >= 100 (fallback)
 *
 * League/home team resolution (in priority order):
 *   1. From explicit League/Use column — split on en-dash/em-dash/hyphen
 *   2. From notes field — "(TEAM)" parentheses or "· TEAM ·" separators
 *
 * Tags every row with `source: <xlsx filename> (<provenance>)`.
 *
 * Usage:
 *   COUNTRY=Germany SOURCE='Europe_Ice_Rinks_Germany_RinkStop.xlsx (Wikipedia + DEL/DEL2)' \
 *     node scripts/import-country-rinks.cjs /path/to/file.xlsx
 *
 * Required env (loaded via load-secrets.cjs):
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

require('./load-secrets.cjs');
const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');
const path = require('path');

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const COUNTRY = process.env.COUNTRY;
const SOURCE = process.env.SOURCE;
const XLSX_PATH = process.argv[2];
if (!COUNTRY || !SOURCE || !XLSX_PATH) {
  console.error('Usage: COUNTRY=<name> SOURCE="<provenance>" node import-country-rinks.cjs <xlsx path>');
  process.exit(1);
}

/** Parse "Helsinki (Vallila), Uusimaa" → { city: 'Helsinki (Vallila)', province: 'Uusimaa' }
 *  Note: German style is "Cologne, NRW" — same parser handles it. */
function splitCityRegion(raw) {
  if (!raw) return { city: null, province: null };
  const parts = raw.split(',').map(s => s.trim()).filter(Boolean);
  if (parts.length === 1) return { city: parts[0], province: null };
  return { city: parts[0], province: parts.slice(1).join(', ') };
}

/** Parse "13,349" → 13349. Also handles "Cap 13,349" or "Indoor / 1,800m²" — first comma-stripped number. */
function parseInt0(s) {
  if (s == null) return null;
  // Try a strict integer match first (handles "13,349", "13 349", "13349")
  const strictMatch = String(s).match(/\b(\d{1,3}(?:[,\s]\d{3})+|\d+)\b/);
  if (strictMatch) {
    const n = parseInt(strictMatch[1].replace(/[,\s]/g, ''), 10);
    if (Number.isFinite(n)) return n;
  }
  // Fallback: first number anywhere
  const m = String(s).match(/(\d+)/);
  if (m) {
    const n = parseInt(m[1], 10);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Parse capacity specifically from a Type/Cap field like "Indoor / 12,000m² ice" or "Indoor / standard".
 *  Returns null if no number found. */
function parseCapacity(s) {
  if (!s) return null;
  const m = String(s).match(/(\d{1,3}(?:[,\s]\d{3})+|\d+)/);
  if (!m) return null;
  const n = parseInt(m[1].replace(/[,\s]/g, ''), 10);
  return Number.isFinite(n) ? n : null;
}

/** Parse "Liiga – Jokerit (2025-26)" or "DEL – Kölner Haie" → { league, home_team }.
 *  Splits on en-dash, em-dash, hyphen-minus, or hyphen, but not the year-joined "2025-26". */
function splitLeagueTeam(raw) {
  if (!raw) return { league: null, home_team: null };
  const parts = raw.split(/\s*[\u2013\u2014\u2212]\s*|\s+-\s+/);
  if (parts.length === 1) return { league: parts[0].trim(), home_team: null };
  return { league: parts[0].trim(), home_team: parts.slice(1).join(' - ').trim() };
}

/** Try to extract capacity / league / home_team from a free-form notes string like
 *  "Cap 14,200 · Eisbären Berlin (DEL) · Opened 2008 · 11x DEL champions".
 *  Returns { cap, league, home_team, opened, rest } where `rest` is the notes string
 *  with the extracted bits removed (so we don't duplicate in the final notes). */
function extractFromNotes(notes) {
  if (!notes) return { cap: null, league: null, home_team: null, opened: null, rest: '' };
  const result = { cap: null, league: null, home_team: null, opened: null, rest: notes };

  // "Cap 14,200" or "Cap 18,500" — case-insensitive
  const capMatch = result.rest.match(/\b[Cc]ap(?:acity)?\s+(\d{1,3}(?:[,\s]\d{3})+|\d+)\b/);
  if (capMatch) {
    result.cap = parseInt(capMatch[1].replace(/[,\s]/g, ''), 10);
    result.rest = result.rest.replace(capMatch[0], '').replace(/\s+/g, ' ').trim();
  }

  // "Opened 2008" or "Opened May 18, 2006" — capture year
  const openedMatch = result.rest.match(/\b[Oo]pened\s+([A-Z][a-z]+\s+\d{1,2},?\s+)?(\d{4})\b/);
  if (openedMatch) {
    result.opened = parseInt(openedMatch[2], 10);
    result.rest = result.rest.replace(openedMatch[0], '').replace(/\s+/g, ' ').trim();
  } else {
    // Try "Opened 2008" only
    const openedSimple = result.rest.match(/\b[Oo]pened\s+(\d{4})\b/);
    if (openedSimple) {
      result.opened = parseInt(openedSimple[1], 10);
      result.rest = result.rest.replace(openedSimple[0], '').replace(/\s+/g, ' ').trim();
    }
  }

  // "· Eisbären Berlin (DEL) ·" or "(DEL)" — league in parens
  const leagueParenMatch = result.rest.match(/\(([A-Z]{2,6}(?:\s*[/|-]\s*[A-Z]{2,6})?)\)/);
  if (leagueParenMatch) {
    result.league = leagueParenMatch[1].trim();
    result.rest = result.rest.replace(leagueParenMatch[0], '').replace(/\s+/g, ' ').trim();
  }

  // Home team: text before "·" or "—" or before the league
  // "Eisbären Berlin (DEL)" → "Eisbären Berlin"
  // We look for "· SOMETHING ·" patterns first
  const dotParts = result.rest.split(/\s*[·•]\s*/).map(s => s.trim()).filter(Boolean);
  if (dotParts.length > 1) {
    // The first non-trivial part is likely the home team
    const first = dotParts[0];
    // Only treat as home team if it doesn't look like a generic descriptor
    if (first && !/^(home|away|league|season|year|built|opened|constructed|capacity|cap)$/i.test(first)
        && !/^\d/.test(first) && first.length > 3 && first.length < 60) {
      result.home_team = first;
    }
  }

  // Clean up: collapse multiple spaces and remove leftover bullet separators
  result.rest = result.rest.split(/\s*[·•]\s*/).map(s => s.trim()).filter(Boolean).join(' · ');
  // Remove leading/trailing separators
  result.rest = result.rest.replace(/^[·•\s]+|[·•\s]+$/g, '').trim();
  // Clean up "  " double spaces
  result.rest = result.rest.replace(/\s+/g, ' ').trim();

  return result;
}

/** Slugify a name. å→a, ä→a, ö→o, é→e, ß→ss, others stripped. */
function slugify(name) {
  return name
    .toLowerCase()
    .replace(/å/g, 'a').replace(/ä/g, 'a').replace(/ö/g, 'o')
    .replace(/é/g, 'e').replace(/ß/g, 'ss').replace(/ü/g, 'u')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

/** Normalize name for comparison: lowercase, åäö→a, strip parens content, collapse spaces. */
function normName(s) {
  if (!s) return '';
  return s.toLowerCase()
    .replace(/å/g, 'a').replace(/ä/g, 'a').replace(/ö/g, 'o')
    .replace(/é/g, 'e').replace(/ß/g, 'ss').replace(/ü/g, 'u')
    .replace(/\s*\([^)]*\)\s*/g, ' ') // strip parens content
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Normalize address for comparison: lowercase, trim, collapse spaces. */
function normAddr(s) {
  if (!s) return '';
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Strip parenthetical aliases. e.g. "Helsingin Jäähalli (Nordis)" → "Helsingin Jäähalli" */
function stripParens(s) {
  if (!s) return s;
  return s.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim();
}

// ============================================================
// HEADER DETECTION
// ============================================================

/** Build a header→canonical-field map. Returns a Map<columnIndex, fieldName>. */
function buildColumnMap(headerRow) {
  const m = new Map();
  for (let i = 0; i < headerRow.length; i++) {
    const h = String(headerRow[i] || '').trim();
    if (!h) continue;
    const lower = h.toLowerCase();
    // Use a "first match wins" priority for ambiguous headers like "Name"
    // (Name appears in "Name of Ice Rink", "Name (English / Chinese)", etc.)
    let field = null;
    if (/^#$/i.test(h) || /^no\.?$/i.test(h) || /^row$/i.test(h)) field = 'num';
    else if (/name.*rink|name.*arena|ice rink.*name|^name\s*\(/.test(lower)) field = 'name';
    else if (/^name$/.test(lower) || /\brink\b/.test(lower) || /\barena\b/.test(lower)) field = 'name';
    else if (/^address$|street|address\s/.test(lower)) field = 'address';
    else if (/^city|town|location/.test(lower)) field = 'city';
    else if (/phone|contact|tel/.test(lower)) field = 'phone';
    else if (/website|url|email\s*\/\s*website|^web$/.test(lower)) field = 'website';
    else if (/type\s*\/\s*cap|^capacity$|^\s*cap\s*$/.test(lower)) field = 'typeCap';
    else if (/league.*use|^league$|league.*team/.test(lower)) field = 'leagueTeam';
    else if (/^source|^sources|^provenance|^references/.test(lower)) field = 'source';
    else if (/year.*opened|^\s*opened\s*$|^\s*year\s*$/.test(lower)) field = 'yearOpened';
    else if (/notes?\s*\(.*cap.*opened.*\)|notes?\s*\/\s*status|^notes?$|^description$|^status$/.test(lower)) field = 'notes';
    if (field && !m.has(field)) m.set(field, i);
  }
  return m;
}

/** Find the header row index. The header row is the first row after the title
 *  that contains "#" plus a known field name. Returns -1 if not found. */
function findHeaderRowIndex(rows) {
  // Look at first 5 rows
  for (let i = 0; i < Math.min(5, rows.length); i++) {
    const row = rows[i];
    if (!Array.isArray(row)) continue;
    const hasHash = row.some(c => String(c || '').trim() === '#');
    const hasName = row.some(c => {
      const s = String(c || '').toLowerCase();
      return /name/.test(s) || /rink/.test(s) || /arena/.test(s);
    });
    const hasAddress = row.some(c => /address|city|street/.test(String(c || '').toLowerCase()));
    if (hasHash && (hasName || hasAddress)) return i;
  }
  return -1;
}

/** Read a cell by canonical field name. Returns null if column not mapped. */
function readCol(row, colMap, field) {
  const idx = colMap.get(field);
  if (idx === undefined || idx >= row.length) return null;
  const v = row[idx];
  if (v == null) return null;
  const s = String(v).trim();
  if (!s || s.toUpperCase() === 'N/A' || s === '-') return null;
  return s;
}

async function main() {
  console.log(`Importing ${COUNTRY} rinks from ${path.basename(XLSX_PATH)}`);
  console.log(`Source tag: ${SOURCE}`);
  const wb = XLSX.readFile(XLSX_PATH);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  // 1. Find the header row.
  const headerIdx = findHeaderRowIndex(rows);
  if (headerIdx === -1) {
    console.error('Could not find header row (no row with "#" + name/address)');
    process.exit(1);
  }
  console.log(`Header row at index ${headerIdx}: ${JSON.stringify(rows[headerIdx])}`);

  // 2. Build column map from header row.
  const colMap = buildColumnMap(rows[headerIdx]);
  console.log(`Column map: ${[...colMap.entries()].map(([k, v]) => `${k}=col${v}`).join(', ')}`);

  // 3. Data starts at headerIdx + 1.
  const dataRows = rows.slice(headerIdx + 1)
    .filter(r => Array.isArray(r) && r.length > 0 && r.some(c => c !== '' && c != null))
    // Skip section headers like "── BEIJING ──" — these are strings in col 0
    .filter(r => {
      const c0 = String(r[0] || '').trim();
      // Keep if col 0 is a number, OR if there's a real name in the name column
      if (typeof r[0] === 'number') return true;
      const name = readCol(r, colMap, 'name');
      return name !== null;
    });
  console.log(`Parsed ${dataRows.length} data rows from spreadsheet`);

  // Fetch all existing country rinks for matching.
  const { data: existing, error: exErr } = await sb
    .from('rinks')
    .select('id, name, slug, address, city, capacity, notes, source')
    .eq('country', COUNTRY);
  if (exErr) { console.error('Fetch existing failed:', exErr); process.exit(1); }
  console.log(`Existing ${COUNTRY} rinks in DB: ${existing.length}`);

  // Build index maps for matching. We only index addresses that are unique
  // AND look like real street addresses (contain a digit, suggesting a house
  // number — not just a city name like "Krefeld"). This avoids merging two
  // different rinks that share only a city-name address.
  const addrCounts = new Map();
  for (const r of existing) {
    const na = normAddr(r.address);
    if (na) addrCounts.set(na, (addrCounts.get(na) || 0) + 1);
  }
  const isStreetAddr = (a) => a && /\d/.test(a) && a.length > 8;
  const bySlug = new Map(existing.map(r => [r.slug, r]));
  const byNormName = new Map();
  const byNormAddr = new Map();
  for (const r of existing) {
    const nn = normName(r.name);
    if (nn && !byNormName.has(nn)) byNormName.set(nn, r);
    const na = normAddr(r.address);
    if (na && addrCounts.get(na) === 1 && isStreetAddr(na)) byNormAddr.set(na, r);
  }
  // Count how many addresses were disqualified
  const dupAddrCount = [...addrCounts.values()].filter(c => c > 1).length;

  let inserted = 0, updated = 0, skipped = 0, failed = 0;
  const failures = [];
  // Track names/addresses we've already matched, to avoid matching two spreadsheet
  // rows to the same existing row.
  const usedIds = new Set();

  for (const r of dataRows) {
    // 4. Read by field name, not position.
    let rawName = readCol(r, colMap, 'name');
    if (!rawName) { skipped++; continue; }
    // For bilingual names like "Capital Indoor Stadium / 首都体育馆", keep the full
    // bilingual form as the display name. The slug is built from the English part
    // only (the slugify function strips non-ASCII anyway).
    const slug = slugify(rawName);
    const address = readCol(r, colMap, 'address');
    const cityRegion = readCol(r, colMap, 'city');
    const { city, province } = splitCityRegion(cityRegion);

    // 5. Capacity resolution priority: explicit TypeCap col > Notes col > null
    let capacity = null;
    const typeCapStr = readCol(r, colMap, 'typeCap');
    if (typeCapStr) {
      capacity = parseCapacity(typeCapStr);
    }
    let notesStr = readCol(r, colMap, 'notes');
    let league = null, home_team = null, yearOpened = null;
    if (notesStr) {
      const extracted = extractFromNotes(notesStr);
      if (!capacity && extracted.cap) capacity = extracted.cap;
      if (extracted.league) league = extracted.league;
      if (extracted.home_team) home_team = extracted.home_team;
      if (extracted.opened) yearOpened = extracted.opened;
      notesStr = extracted.rest || null;
    }

    // 6. League/home team resolution: explicit LeagueTeam col overrides
    const leagueTeamStr = readCol(r, colMap, 'leagueTeam');
    if (leagueTeamStr) {
      const split = splitLeagueTeam(leagueTeamStr);
      if (split.league) league = split.league;
      if (split.home_team) home_team = split.home_team;
    }
    const yearOpenedStr = readCol(r, colMap, 'yearOpened');
    if (yearOpenedStr) {
      const y = parseInt(yearOpenedStr, 10);
      if (Number.isFinite(y)) yearOpened = y;
    }
    // Source per-row (if a Source column exists) overrides the file-level SOURCE
    const rowSource = readCol(r, colMap, 'source');
    const effectiveSource = rowSource ? `${SOURCE} | row: ${rowSource}` : SOURCE;

    // Build the final notes string
    const notesParts = [];
    if (league) notesParts.push(`League: ${league}`);
    if (home_team) notesParts.push(`Home team: ${home_team}`);
    if (yearOpened) notesParts.push(`Opened: ${yearOpened}`);
    if (notesStr) notesParts.push(notesStr);
    const notes = notesParts.length ? notesParts.join(' | ') : null;

    // Find existing. Match priority: slug > normalized name > normalized full address > strip-parens name.
    let match = null;
    if (bySlug.has(slug) && !usedIds.has(bySlug.get(slug).id)) {
      match = bySlug.get(slug);
    } else {
      const nn = normName(rawName);
      const candidate = byNormName.get(nn);
      if (candidate && !usedIds.has(candidate.id)) match = candidate;
    }
    if (!match) {
      const na = normAddr(address);
      const candidate = na ? byNormAddr.get(na) : null;
      if (candidate && !usedIds.has(candidate.id)) match = candidate;
    }
    if (!match) {
      // Last resort: strip parens from both spreadsheet name and existing names
      const baseIn = normName(stripParens(rawName));
      if (baseIn) {
        for (const ev of existing) {
          if (usedIds.has(ev.id)) continue;
          const baseEx = normName(stripParens(ev.name));
          if (baseEx && baseIn === baseEx) { match = ev; break; }
        }
      }
    }

    const baseFields = {
      name: rawName,
      slug,
      country: COUNTRY,
      address: address || null,
      city: city || null,
      province_state: province || null,
      capacity: capacity,
    };

    try {
      if (match) {
        usedIds.add(match.id);
        const patch = {};
        if (!match.address && address) patch.address = address;
        if (!match.city && city) patch.city = city;
        if (!match.province_state && province) patch.province_state = province;
        if (!match.capacity && capacity) patch.capacity = capacity;
        if (!match.notes && notes) patch.notes = notes;
        if (!match.source) patch.source = effectiveSource;
        if (!match.slug || match.slug !== slug) patch.slug = slug;
        if (Object.keys(patch).length === 0) {
          skipped++;
          continue;
        }
        const { error: upErr } = await sb.from('rinks').update(patch).eq('id', match.id);
        if (upErr) { failed++; failures.push({ name: rawName, error: upErr.message }); }
        else updated++;
      } else {
        const { error: insErr } = await sb.from('rinks').insert({
          ...baseFields,
          notes,
          source: effectiveSource,
        });
        if (insErr) { failed++; failures.push({ name: rawName, error: insErr.message }); }
        else inserted++;
      }
    } catch (e) {
      failed++; failures.push({ name: rawName, error: e.message });
    }
  }

  console.log(`\n=== ${COUNTRY} Import Result ===`);
  console.log(`Inserted: ${inserted}`);
  console.log(`Updated:  ${updated}`);
  console.log(`Skipped:  ${skipped} (no new data to add)`);
  console.log(`Failed:   ${failed}`);
  if (failures.length) {
    console.log(`\nFailures:`);
    failures.slice(0, 10).forEach(f => console.log(`  ${f.name}: ${f.error}`));
  }

  // Final tally
  const { count: finalCount } = await sb.from('rinks').select('id', { count: 'exact', head: true }).eq('country', COUNTRY);
  console.log(`${COUNTRY} rinks in DB: ${existing.length} -> ${finalCount}`);
}

main().catch(e => { console.error(e); process.exit(1); });
