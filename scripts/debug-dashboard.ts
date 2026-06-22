#!/usr/bin/env tsx
// Debug script to find what's breaking the dashboard page.
// Runs the same queries the dashboard does, in the same order, and reports
// any thrown error with the message + first stack frame.
//
// Usage: npx tsx scripts/debug-dashboard.ts <userId>

import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require_ = createRequire(import.meta.url);
const envFile = readFileSync('.env', 'utf8');
for (const line of envFile.split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
}

// Use require after env is set so src/lib/supabase.ts can read process.env.
const { supabaseAdmin } = require_('../src/lib/supabase.ts') as any;
// Defer all imports until after env is loaded.
const { ACCOUNT_TYPES, isAccountType } = require_('../src/components/dashboard/dashboardTypes.ts') as any;
const { loadDashboardTypeData } = require_('../src/components/dashboard/dashboardTypeData.ts') as any;
const { loadInboxSummary } = require_('../src/components/dashboard/dashboardInboxData.ts') as any;

const userId = process.argv[2];
if (!userId) {
  console.error('Usage: npx tsx scripts/debug-dashboard.ts <clerk_user_id>');
  process.exit(1);
}

async function step(name: string, fn: () => Promise<any>) {
  try {
    const result = await fn();
    console.log(`✅ ${name}`);
    return result;
  } catch (err: any) {
    console.error(`❌ ${name}: ${err?.name || 'Error'}: ${err?.message}`);
    if (err?.stack) {
      console.error('  Stack:', err.stack.split('\n').slice(0, 4).join('\n          '));
    }
    return null;
  }
}

async function main() {
  console.log(`\n🔍 Debugging dashboard for userId: ${userId}\n`);

  await step('profiles.role lookup', () =>
    supabaseAdmin.from('profiles').select('role').eq('user_id', userId).maybeSingle(),
  );

  await step('profiles.full lookup', () =>
    supabaseAdmin
      .from('profiles')
      .select('bio, location, tier, is_founding_member, created_at, role, display_name, username')
      .eq('user_id', userId)
      .maybeSingle(),
  );

  await step('profile_account_types', () =>
    supabaseAdmin
      .from('profile_account_types')
      .select('account_type, is_primary')
      .eq('user_id', userId),
  );

  await step('loadDashboardTypeData', () => loadDashboardTypeData(userId));
  await step('loadInboxSummary', () => loadInboxSummary(userId));

  await step('team_members + team_workspaces', () =>
    supabaseAdmin
      .from('team_members')
      .select('role, team_workspaces:team_id ( id, slug, name, short_name, country_code, age_label, age_min, age_max, parent_org, is_active )')
      .eq('user_id', userId)
      .is('left_at', null)
      .order('joined_at', { ascending: false })
      .limit(10),
  );

  console.log('\n✅ Done.\n');
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});