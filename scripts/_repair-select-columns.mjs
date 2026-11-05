#!/usr/bin/env node
/**
 * Repair broken column selects found by scripts/_audit-select-columns.mjs.
 *
 * Each entry maps a table to its column renames. A rename of
 * { old: new } means "replace the old column name with the new one".
 * A rename of { old: null } means "the column does not exist in any form —
 * remove it from the select".
 *
 * Every mapping below was verified against the LIVE database before being
 * written here. See memory/2026-11-05.md for the full list.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();

// table -> { oldColumn: newColumn|null }
const RENAMES = {
  profiles: {
    full_name: 'display_name',
    first_name: null,
    last_name: null,
    date_of_birth: null,
    account_type: null,
    country: null,
  },
  rinks: {
    state: 'province_state',
    description: null,
    website: 'website_url',
    league_id: null,
  },
  players: {
    logo_url: 'headshot_url',
    league_id: null,
    badge_tier: null,
    subscription_status: null,
  },
  leagues: {
    created_by: null,
    city: null,
    state: null,
  },
  fixtures: {
    game_date: 'scheduled_at',
    date: 'scheduled_at',
  },
  games: {
    date: 'scheduled_at',
    game_date: 'scheduled_at',
    home_team_id: 'home_team_rinkstop_id',
    away_team_id: 'away_team_rinkstop_id',
    home_team_score: 'home_score',
    away_team_score: 'away_score',
    venue_id: null,
    location: null,
    period: null,
    period_time_remaining: null,
    broadcast: null,
  },
  rink_events: {
    city: null,
    province_state: null,
    country: null,
  },
  team_news: { headline: 'title' },
  team_results: {
    opponent_name: null,
    result_date: null,
    score_for: null,
    score_against: null,
  },
  posts: { audit_status: null },
  post_review_edits: { reviewer_id: null, created_at: null, changes: null },
  messages: { sender_user_id: 'sender_id' },
  // Second pass — found after the first repair round, with the full schema
  // now visible via information_schema.
  rinks: { province: 'province_state' },
  teams: { league_name: null },
  rink_org_connections: {
    contact_name: 'org_contact_name',
    contact_email: 'org_contact_email',
    invite_code: null,
  },
  listings: { tier: null },
  games: { time: null },
  rink_contracts: { rink_id: null },
  player_stats: { last_name: null, first_name: null },
  webhook_events: { id: null, status: null },
  event_submissions: { slug: null },
};

const files = process.argv.slice(2);
let changedFiles = 0;
let changedSelects = 0;

for (const rel of files) {
  const path = join(ROOT, rel);
  let text;
  try {
    text = readFileSync(path, 'utf8');
  } catch {
    continue;
  }
  const original = text;

  // `.from('t')` and `.select('...')` are often on SEPARATE lines, and the
  // text is being rewritten as we go — so index-based lookups would drift.
  // Instead: split the source into segments, tracking the most recent table
  // as we walk forward, and rewrite each `.select(...)` in place.
  const SELECT_RE = /\.select\(\s*(['"])([^'"`$]*)\1/g;
  const FROM_RE = /\.from\(\s*['"]([a-z_][a-z0-9_]*)['"]\s*\)/g;

  // Collect every `.from(...)` position up front (positions are stable
  // because we build the output left-to-right without re-indexing).
  const froms = [];
  let fm;
  while ((fm = FROM_RE.exec(text)) !== null) {
    froms.push({ pos: fm.index, table: fm[1] });
  }

  let out = '';
  let cursor = 0;
  let fi = 0;
  let currentTable = null;

  while (true) {
    const m = SELECT_RE.exec(text);
    if (!m) break;

    // Advance to the most recent `.from(...)` that precedes this select.
    while (fi < froms.length && froms[fi].pos < m.index) {
      currentTable = froms[fi].table;
      fi++;
    }

    const table = currentTable;
    const map = table ? RENAMES[table] : null;
    const quote = m[1];
    const cols = m[2];

    if (!map) {
      // keep as-is
      out += text.slice(cursor, m.index + m[0].length);
      cursor = m.index + m[0].length;
      continue;
    }

    const parts = cols.split(',').map((c) => c.trim()).filter(Boolean);
    const kept = [];
    let touched = false;
    for (const part of parts) {
      const colon = part.indexOf(':');
      const alias = colon >= 0 ? part.slice(0, colon + 1) : '';
      const col = colon >= 0 ? part.slice(colon + 1) : part;
      if (Object.prototype.hasOwnProperty.call(map, col)) {
        const repl = map[col];
        touched = true;
        if (repl !== null) kept.push(`${alias}${repl}`);
      } else {
        kept.push(part);
      }
    }

    if (!touched) {
      out += text.slice(cursor, m.index + m[0].length);
      cursor = m.index + m[0].length;
      continue;
    }

    changedSelects++;
    out += text.slice(cursor, m.index);
    out += `.select(${quote}${kept.join(', ')}${quote}`;
    cursor = m.index + m[0].length;
  }
  out += text.slice(cursor);
  text = out;

  if (text !== original) {
    writeFileSync(path, text);
    changedFiles++;
    console.log(`  updated: ${rel}`);
  }
}

console.log(`\n${changedFiles} file(s) changed, ${changedSelects} select(s) rewritten.`);
