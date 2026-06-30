import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { requireUserId } from '@/lib/connections';
import { checkRateLimit, getClientIP, applyRateLimitHeaders, maybeCleanup } from '@/lib/rateLimit';

const RL = { maxRequests: 60, windowMs: 60 * 1000 };

// PATCH /api/profiles/me
// Updates the caller's profile. Only the user can edit their own profile.
// Allowed fields: bio, location.
export async function PATCH(request: NextRequest) {
  const ip = getClientIP(request);
  const result = await checkRateLimit(`me:${ip}`, RL);
  maybeCleanup();

  const userId = await resolveCanonicalUserId(
    await requireUserId(),
    (await currentUser())?.emailAddresses?.[0]?.emailAddress || ''
  );
  if (!userId) {
    const res = NextResponse.json({ error: 'Sign in.' }, { status: 401 });
    return applyRateLimitHeaders(res, result);
  }

  let body: { bio?: string; location?: string };
  try {
    body = await request.json();
  } catch {
    const res = NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
    return applyRateLimitHeaders(res, result);
  }

  const update: Record<string, any> = { updated_at: new Date().toISOString() };
  if (body.bio !== undefined) {
    if (typeof body.bio !== 'string' || body.bio.length > 500) {
      const res = NextResponse.json({ error: 'bio must be a string up to 500 chars.' }, { status: 400 });
      return applyRateLimitHeaders(res, result);
    }
    update.bio = body.bio.trim() || null;
  }
  if (body.location !== undefined) {
    if (typeof body.location !== 'string' || body.location.length > 120) {
      const res = NextResponse.json({ error: 'location must be a string up to 120 chars.' }, { status: 400 });
      return applyRateLimitHeaders(res, result);
    }
    update.location = body.location.trim() || null;
  }

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update(update)
    .eq('user_id', userId)
    .select('bio, location, updated_at')
    .maybeSingle();

  if (error) {
    console.error('[profiles PATCH] failed', error);
    const res = NextResponse.json({ error: 'Save failed.' }, { status: 500 });
    return applyRateLimitHeaders(res, result);
  }

  const res = NextResponse.json({ ok: true, profile: data });
  return applyRateLimitHeaders(res, result);
}

// GET /api/profiles/me
// Returns the caller's profile (including tier, managed profiles, connections, unread count).
// This is the "current user snapshot" used by the dashboard layout to render tier badges, nav, etc.
export async function GET(request: NextRequest) {
  const ip = getClientIP(request);
  const result = await checkRateLimit(`me:${ip}`, RL);
  maybeCleanup();

  const userId = await resolveCanonicalUserId(
    await requireUserId(),
    (await currentUser())?.emailAddresses?.[0]?.emailAddress || ''
  );
  if (!userId) {
    const res = NextResponse.json({ error: 'Sign in.' }, { status: 401 });
    return applyRateLimitHeaders(res, result);
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (!profile) {
    // Lazy-create: the Clerk webhook that bootstraps profile rows is currently
    // disabled (signature verification was using the wrong format and the
    // CLERK_WEBHOOK_SECRET was unset in Vercel env). Instead of waiting on
    // a webhook, we bootstrap a minimal profile row on first API call. Once
    // a row exists, all subsequent reads skip this path.
    let display_name: string | null = null;
    let avatar_url: string | null = null;
    let userEmail: string | null = null;
    try {
      const user = await currentUser();
      if (user) {
        display_name =
          [user.firstName, user.lastName].filter(Boolean).join(' ') || null;
        avatar_url = user.imageUrl || null;
        userEmail = user.emailAddresses?.[0]?.emailAddress || null;
      }
    } catch {
      // If Clerk lookup fails, fall through with nulls — better than failing the request.
    }

    // Tier/role/founding-member inheritance: if the Clerk user has an email
    // matching an existing profile row, inherit those fields so we don't
    // shadow a canonical paid row with a default free-tier shadow. Display-
    // name fallback is used when the Clerk user has no email (e.g. legacy
    // test accounts) and the existing row is super_admin — common-name
    // collisions are filtered out that way.
    let inheritedTier = 'free';
    let inheritedRole = 'user';
    let inheritedIsFoundingMember = false;
    let inheritedEmail: string | null = userEmail;
    if (userEmail) {
      const { data: byEmail } = await supabaseAdmin
        .from('profiles')
        .select('tier, role, is_founding_member')
        .eq('email', userEmail)
        .neq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (byEmail) {
        if (byEmail.tier && byEmail.tier !== 'free') inheritedTier = byEmail.tier;
        if (byEmail.role && byEmail.role !== 'user') inheritedRole = byEmail.role;
        if (byEmail.is_founding_member) inheritedIsFoundingMember = byEmail.is_founding_member;
        console.log(
          `[profiles GET] lazy-create for ${userId} matched existing profile by email=${userEmail}; inheriting tier=${inheritedTier} role=${inheritedRole}`,
        );
      }
    } else if (display_name) {
      const { data: byName } = await supabaseAdmin
        .from('profiles')
        .select('tier, role, is_founding_member')
        .eq('display_name', display_name)
        .eq('role', 'super_admin')
        .neq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (byName) {
        if (byName.tier && byName.tier !== 'free') inheritedTier = byName.tier;
        if (byName.role && byName.role !== 'user') inheritedRole = byName.role;
        if (byName.is_founding_member) inheritedIsFoundingMember = byName.is_founding_member;
        console.log(
          `[profiles GET] lazy-create for ${userId} (no email) matched super_admin by display_name=${display_name}; inheriting tier=${inheritedTier} role=${inheritedRole}`,
        );
      }
    }

    const { data: created, error: createErr } = await supabaseAdmin
      .from('profiles')
      .upsert(
        {
          user_id: userId,
          display_name,
          avatar_url,
          email: inheritedEmail,
          tier: inheritedTier,
          role: inheritedRole,
          is_founding_member: inheritedIsFoundingMember,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )
      .select('*')
      .maybeSingle();

    if (createErr) {
      console.error('[profiles GET] lazy create failed', createErr);
    } else if (created) {
      console.log(`[profiles GET] lazy-created profile for ${userId}`);
    }
  }

  // Re-read so we get the canonical row (with tier, subscription_status, etc.)
  // regardless of whether the upsert above ran.
  const { data: profileFinal } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (!profileFinal) {
    // Both fetch and create failed — return synthetic profile so UI doesn't break.
    return NextResponse.json({
      profile: {
        user_id: userId,
        display_name: null,
        avatar_url: null,
        bio: null,
        tier: 'free',
        tier_expires_at: null,
        subscription_status: null,
      },
      managedProfiles: [],
      pendingConnectionCount: 0,
      unreadMessageCount: 0,
    });
  }

  // Managed profiles.
  const { data: managed } = await supabaseAdmin
    .from('managed_profiles')
    .select('*')
    .eq('manager_user_id', userId);

  // Pending connection requests addressed to me.
  const { count: pendingConnCount } = await supabaseAdmin
    .from('connections')
    .select('id', { count: 'exact', head: true })
    .or(`user_low.eq.${userId},user_high.eq.${userId}`)
    .eq('status', 'pending')
    .neq('initiated_by', userId);

  // Unread messages: threads I participate in, messages not by me, not read.
  const { data: myConns } = await supabaseAdmin
    .from('connections')
    .select('id')
    .or(`user_low.eq.${userId},user_high.eq.${userId}`)
    .eq('status', 'accepted');
  let unreadMessageCount = 0;
  if (myConns && myConns.length > 0) {
    const connIds = myConns.map((c: any) => c.id);
    const { data: myThreads } = await supabaseAdmin
      .from('threads')
      .select('id')
      .in('connection_id', connIds);
    if (myThreads && myThreads.length > 0) {
      const threadIds = myThreads.map((t: any) => t.id);
      const { count } = await supabaseAdmin
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .in('thread_id', threadIds)
        .is('read_at', null)
        .neq('sender_id', userId);
      unreadMessageCount = count || 0;
    }
  }

  return NextResponse.json({
    profile: profileFinal,
    managedProfiles: managed || [],
    pendingConnectionCount: pendingConnCount || 0,
    unreadMessageCount,
  });
}
