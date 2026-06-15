#!/usr/bin/env node
/**
 * watch-usa-state-rinks.cjs
 *
 * Watches /root/.openclaw/media/inbound/ for new USA_*_Ice_Rinks_*.xlsx files
 * and auto-imports them with the matching state code.
 *
 * State name + code are inferred from the filename prefix (e.g. USA_Arizona → AZ).
 *
 * Usage:
 *   node scripts/watch-usa-state-rinks.cjs
 *
 * Behavior:
 *   - Polls every 2s
 *   - Imports any new USA_*_Ice_Rinks_*.xlsx that hasn't been seen before
 *   - Logs to stdout (and tee-able to a log file)
 *   - Idempotent: re-running won't re-import (uses .imported-state marker)
 */

require('./load-secrets.cjs');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const INBOUND = '/root/.openclaw/media/inbound';
const MARKER_DIR = '/tmp/usa-state-import-markers';

const STATE_MAP = {
  'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR',
  'california': 'CA', 'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE',
  'florida': 'FL', 'georgia': 'GA', 'hawaii': 'HI', 'idaho': 'ID',
  'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA', 'kansas': 'KS',
  'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
  'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS',
  'missouri': 'MO', 'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV',
  'new_hampshire': 'NH', 'new_jersey': 'NJ', 'new_mexico': 'NM', 'new_york': 'NY',
  'north_carolina': 'NC', 'north_dakota': 'ND', 'ohio': 'OH', 'oklahoma': 'OK',
  'oregon': 'OR', 'pennsylvania': 'PA', 'rhode_island': 'RI', 'south_carolina': 'SC',
  'south_dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT',
  'vermont': 'VT', 'virginia': 'VA', 'washington': 'WA', 'west_virginia': 'WV',
  'wisconsin': 'WI', 'wyoming': 'WY', 'district_of_columbia': 'DC',
};

function findNewFiles() {
  if (!fs.existsSync(MARKER_DIR)) fs.mkdirSync(MARKER_DIR, { recursive: true });
  return fs.readdirSync(INBOUND)
    .filter(f => f.startsWith('USA_') && f.includes('Ice_Rinks') && f.endsWith('.xlsx'))
    .filter(f => !fs.existsSync(path.join(MARKER_DIR, f + '.imported')));
}

function extractState(filename) {
  // USA_Arizona_Ice_Rinks_RinkStop---xyz.xlsx → "Arizona"
  const m = filename.match(/^USA_([A-Za-z_]+)_Ice_Rinks/);
  if (!m) return null;
  const raw = m[1];
  // Convert underscored back to spaces, then look up
  const normalized = raw.toLowerCase().replace(/[._-]+/g, '_');
  const code = STATE_MAP[normalized];
  const name = raw.split('_').map(w => w[0]?.toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  return { name, code, key: normalized };
}

function importFile(file) {
  const state = extractState(file);
  if (!state || !state.code) {
    console.log(`[${new Date().toISOString()}] ⚠️  Unknown state for ${file} — skipping`);
    return false;
  }
  const source = `${file} (arena-guide.com 2025)`;
  const filePath = path.join(INBOUND, file);
  console.log(`[${new Date().toISOString()}] 📥 ${file} → ${state.name} (${state.code})`);
  try {
    const env = {
      ...process.env,
      STATE: state.name,
      STATE_CODE: state.code,
      SOURCE: source,
    };
    const out = execSync(
      `node scripts/import-usa-state-rinks.cjs "${filePath}"`,
      { cwd: '/root/.openclaw/workspace/rinkstop-platform', env, stdio: 'pipe' }
    );
    const tail = out.toString().split('\n').slice(-12).join('\n');
    console.log(tail);
    fs.writeFileSync(path.join(MARKER_DIR, file + '.imported'), new Date().toISOString());
    return true;
  } catch (e) {
    console.log(`[${new Date().toISOString()}] ✗ Import failed: ${e.message.slice(0, 200)}`);
    return false;
  }
}

console.log(`[${new Date().toISOString()}] 👀 Watching ${INBOUND} for USA_*_Ice_Rinks_*.xlsx`);
console.log(`[${new Date().toISOString()}] Markers in ${MARKER_DIR}`);

// First pass: process any files already there but not yet imported
const initial = findNewFiles();
if (initial.length) {
  console.log(`[${new Date().toISOString()}] Found ${initial.length} unimported file(s) on startup`);
  for (const f of initial) importFile(f);
}

// Poll loop
setInterval(() => {
  const newFiles = findNewFiles();
  for (const f of newFiles) importFile(f);
}, 2000);
