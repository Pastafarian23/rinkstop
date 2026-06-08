#!/usr/bin/env node
/**
 * promote-super-admin.js
 *
 * One-time script to promote a user to super_admin role.
 * Updates BOTH:
 *  1. Clerk publicMetadata.role = 'super_admin' (source of truth for app auth)
 *  2. profiles.role = 'super_admin' (Supabase, for display/listing)
 *
 * Usage:
 *   node scripts/promote-super-admin.js arnellarracas@gmail.com
 *
 * Note: User must have already signed in once via Clerk (so the user exists in Clerk).
 * The profiles row is auto-created by webhook OR by the first sign-in.
 *
 * Run from the rinkstop-platform directory.
 */

const { createClient } = require('@supabase/supabase-js');

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
const SUPABASE_URL = 'https://yszheonqyyskkjoxoexk.supabase.co';
const SB_KEY = '***REMOVED***';

const email = process.argv[2];
if (!email) {
  console.error('Usage: node scripts/promote-super-admin.js <email>');
  process.exit(1);
}

if (!CLERK_SECRET_KEY) {
  console.error('Error: CLERK_SECRET_KEY env var not set.');
  console.error('Get it from https://dashboard.clerk.com/ → API Keys');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SB_KEY);

async function findClerkUser(email) {
  const r = await fetch(`https://api.clerk.com/v1/users?email_address=${encodeURIComponent(email)}&limit=1`, {
    headers: { 'Authorization': `Bearer ${CLERK_SECRET_KEY}` },
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`Clerk API error: ${r.status} ${t}`);
  }
  const users = await r.json();
  if (!users || users.length === 0) {
    return null;
  }
  return users[0];
}

async function setClerkRole(clerkUserId, role) {
  const r = await fetch(`https://api.clerk.com/v1/users/${clerkUserId}/metadata`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      public_metadata: { role },
    }),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`Clerk metadata update failed: ${r.status} ${t}`);
  }
  return await r.json();
}

async function setSupabaseRole(clerkUserId, email, role) {
  // Upsert: if profile exists, update. If not, insert.
  const { data, error } = await supabase
    .from('profiles')
    .upsert({
      user_id: clerkUserId,
      role: role,
      display_name: email.split('@')[0],
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id',
    })
    .select();

  if (error) {
    throw new Error(`Supabase upsert failed: ${error.message}`);
  }
  return data;
}

async function main() {
  console.log(`Looking up Clerk user: ${email}`);
  const user = await findClerkUser(email);
  if (!user) {
    console.error(`\nNo Clerk user found with email ${email}.`);
    console.error(`The user must sign in to RinkStop at least once first.`);
    console.error(`\nSteps:`);
    console.error(`  1. Visit https://rinkstop.com/login`);
    console.error(`  2. Sign in with ${email}`);
    console.error(`  3. Re-run this script`);
    process.exit(1);
  }

  console.log(`Found Clerk user: ${user.id}`);
  console.log(`  Email: ${user.email_addresses?.[0]?.email_address}`);
  console.log(`  Created: ${new Date(user.created_at).toISOString()}`);

  console.log(`\nSetting Clerk publicMetadata.role = 'super_admin'...`);
  await setClerkRole(user.id, 'super_admin');
  console.log('  ✅ Clerk role set');

  console.log(`\nSetting Supabase profiles.role = 'super_admin'...`);
  await setSupabaseRole(user.id, email, 'super_admin');
  console.log('  ✅ Supabase role set');

  console.log(`\n✅ ${email} is now a super_admin.`);
  console.log(`They can access /admin immediately on next page load.`);
}

main().catch((err) => {
  console.error('FATAL:', err.message);
  process.exit(1);
});
