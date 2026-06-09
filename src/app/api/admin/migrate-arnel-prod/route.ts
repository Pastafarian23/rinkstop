/**
 * ONE-TIME migration route. Run ONCE after switching Clerk dev → prod to:
 * 1. Find Arnel's user on the prod instance (by email)
 * 2. Apply publicMetadata.role = "super_admin"
 * 3. Update the Supabase profiles row to point to the new prod user_id
 *
 * Gated by ADMIN_SECRET env var (one-time secret). After running:
 * - Verify the dashboard shows Founder view
 * - Delete this route + remove the env var
 *
 * Per pattern: src/lib/admin-auth.ts (Clerk publicMetadata first, then profiles.role)
 */
import { NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

const ARNELS_EMAIL = 'arnellarracas@gmail.com';
const OLD_DEV_USER_ID = 'user_3EszdoJpulxEuJ2RP4GoTgHRh4B';

export async function POST(request: Request) {
  // Gate by one-time secret
  const url = new URL(request.url);
  const provided = url.searchParams.get('secret') || request.headers.get('x-admin-secret');
  const expected = process.env.ADMIN_SECRET;
  if (!expected || provided !== expected) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    // 1. Find Arnel on the prod instance
    const userList = await (
      await clerkClient()
    ).users.getUserList({ emailAddress: [ARNELS_EMAIL], limit: 5 });
    const arnel = userList.data.find((u) =>
      u.emailAddresses.some((e) => e.emailAddress === ARNELS_EMAIL)
    );

    if (!arnel) {
      return NextResponse.json(
        {
          error: 'arnel_not_found_on_prod',
          hint: `Sign in at rinkstop.com first with email ${ARNELS_EMAIL} so a user exists on the prod instance, then re-run.`,
        },
        { status: 404 }
      );
    }

    const newProdUserId = arnel.id;
    const result: Record<string, unknown> = {
      oldDevUserId: OLD_DEV_USER_ID,
      newProdUserId,
      arnelEmail: arnel.emailAddresses[0]?.emailAddress,
    };

    // 2. Apply super_admin role
    await (
      await clerkClient()
    ).users.updateUserMetadata(newProdUserId, {
      publicMetadata: { role: 'super_admin' },
    });
    result.superAdminApplied = true;

    // 3. Migrate Supabase profile from old dev user_id → new prod user_id
    //    First check if a profile with the new id already exists
    const { data: existingForNew } = await supabaseAdmin
      .from('profiles')
      .select('user_id, display_name, tier, is_founding_member, role')
      .eq('user_id', newProdUserId)
      .maybeSingle();

    if (existingForNew) {
      result.profileAction = 'already_exists';
      result.profileData = existingForNew;
    } else {
      // Look for the old dev-id profile
      const { data: oldProfile } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('user_id', OLD_DEV_USER_ID)
        .maybeSingle();

      if (!oldProfile) {
        result.profileAction = 'no_old_profile_found';
      } else {
        // Re-insert with new user_id, preserving all the founder fields
        const { data: inserted, error: insertErr } = await supabaseAdmin
          .from('profiles')
          .insert({
            user_id: newProdUserId,
            display_name: oldProfile.display_name,
            avatar_url: oldProfile.avatar_url,
            bio: oldProfile.bio,
            location: oldProfile.location,
            tier: oldProfile.tier,
            tier_expires_at: oldProfile.tier_expires_at,
            is_founding_member: oldProfile.is_founding_member,
            subscription_status: oldProfile.subscription_status,
            role: 'super_admin',
            created_at: oldProfile.created_at, // preserve Feb 7 2019 founding date
          })
          .select()
          .single();

        if (insertErr) {
          return NextResponse.json(
            { error: 'insert_failed', details: insertErr.message },
            { status: 500 }
          );
        }
        result.profileAction = 'migrated';
        result.profileData = inserted;
      }
    }

    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json(
      { error: 'unexpected', details: (e as Error).message },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  return POST(request);
}
