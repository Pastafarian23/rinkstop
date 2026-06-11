// scripts/load-secrets.mjs — ESM version for .mjs scripts
// Loads secrets from .env.local (or .env) into process.env.
// Run automatically on import (top-level await).
//
// Usage:
//   import './load-secrets.mjs';  // must be FIRST import in the script
//   const { createClient } = await import('@supabase/supabase-js');
//
// Why this exists:
//   Vercel injects env vars at build/runtime in the deployed app,
//   but local scripts (cron jobs, backfills) have no env context.
//   This helper is the single source of truth for script env loading.
//   Zero hardcoded keys in scripts. No Doppler required.

import fs from 'node:fs';
import path from 'node:path';

const REQUIRED_KEYS = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_SUPABASE_URL',
];

const ALL_KEYS = [
  ...REQUIRED_KEYS,
  'SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'HIGHLIGHTLY_API_KEY',
  'MATON_API_KEY',
  'STRIPE_SECRET_KEY',
  'CLERK_SECRET_KEY',
  'CLOUDCONVERT_API_KEY',
  'GOOGLE_MAPS_API_KEY',
  'API_SECRET',
  'ADMIN_SECRET',
  'VERCEL_TOKEN',
  'VERCEL_PROJECT_ID',
  'VERCEL_TEAM_ID',
  'RINKMAP_IMPORT_TOKEN',
  'IMAGE_PROXY_SECRET',
];

function parseDotenv(content) {
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    // Skip empty values so they don't overwrite populated ones
    if (value) env[key] = value;
  }
  return env;
}

function loadFromDotenv() {
  const candidates = ['.env.local', '.env', '.env.live'];
  const merged = {};
  for (const file of candidates) {
    const filepath = path.join(process.cwd(), file);
    if (fs.existsSync(filepath)) {
      Object.assign(merged, parseDotenv(fs.readFileSync(filepath, 'utf8')));
    }
  }
  return Object.keys(merged).length > 0 ? merged : null;
}

function applyEnv(env) {
  const missing = REQUIRED_KEYS.filter((k) => !env[k]);
  if (missing.length) {
    throw new Error(
      `load-secrets: Missing required env vars: ${missing.join(', ')}\n` +
        'Create .env.local with these keys (gitignored) or run: set -a && . ./.env && set +a'
    );
  }
  for (const key of ALL_KEYS) {
    if (env[key] && !process.env[key]) {
      process.env[key] = env[key];
    }
  }
}

export function loadSecrets() {
  // If already populated (Vercel runtime, pre-sourced .env), no-op
  if (process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return;
  }
  const dotenv = loadFromDotenv();
  if (dotenv) {
    applyEnv(dotenv);
    return;
  }
  throw new Error(
    'load-secrets: No secret source available.\n' +
      '  Option 1: Create scripts/.env.local (gitignored) with the required keys\n' +
      '  Option 2: Source the env file: set -a && . ./.env && set +a\n' +
      '  Option 3: Run from the project root where .env.local exists\n'
  );
}

loadSecrets();

export default loadSecrets;
