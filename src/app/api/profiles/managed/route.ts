import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireUserId, getUserTier, tierAtLeast } from '@/lib/connections';
import { checkRateLimit, getClientIP, applyRateLimitHeaders, maybeCleanup } from '@/lib/rateLimit';

const RL = { maxRequests: 30, windowMs: 60 * 1000 };

const VALID_PROFILE_TYPES = ['player', 'team', 'league'] as const;
type ProfileType = (typeof VALID_PROFILE_TYPES)[number];

interface PlayerRow {
  id: string;
  birth_date: string | null;
  first_name: string | null;
  last_name: string | null;
}

interface ManagedProfile {
  id: string;
  manager_user_id: string;
  profile_type: ProfileType;
  profile_id: string;
  relationship: string;
  created_at: string;
}

// POST /api/profiles/managed
// Body: { profileType: 'player'|'team'|'league', profileId: string, relationship?: 'parent'|'guardian'|'spouse'|'self' }
// Manager must be Verified+.
// For 'player' profileType: only allowed if the player is a youth (under 18).
export async function POST(request: NextRequest) {
  const ip = getClientIP(request);
  const result = await checkRateLimit(`managed:${ip}`, RL);
  maybeCleanup();

  const userId = await requireUserId();
  if (!userId) {
    const res = NextResponse.json({ error: 'Sign in.' }, { status: 401 });
    return applyRateLimitHeaders(res, result);
  }

  // Tier check: Roster (starter) tier minimum required to manage a profile.
  // Family+ (family_plus) also qualifies. Team/league profiles still require Pro+ (operator use case).
  const tier = await getUserTier(userId);
  let body: { profileType?: string; profileId?: string; relationship?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }
  // For player profiles, allow Roster+ (parent-managed use case).
  // For team/league profiles, require Pro+ (operator use case).
  const isPlayerManaged = body.profileType === 'player';
  const minTier = isPlayerManaged ? 'roster' : 'pro';
  if (!tierAtLeast(tier, minTier)) {
    return NextResponse.json(
      { error: `${minTier === 'roster' ? 'Roster' : 'Pro'} or higher membership required to manage this profile.`, currentTier: tier },
      { status: 403 }
    );
  }

  if (!body.profileType || !VALID_PROFILE_TYPES.includes(body.profileType as ProfileType)) {
    return NextResponse.json({ error: `profileType must be one of: ${VALID_PROFILE_TYPES.join(', ')}` }, { status: 400 });
  }
  if (!body.profileId || typeof body.profileId !== 'string') {
    return NextResponse.json({ error: 'profileId required.' }, { status: 400 });
  }
  const relationship = body.relationship || 'parent';
  if (!['parent', 'guardian', 'spouse', 'self'].includes(relationship)) {
    return NextResponse.json({ error: 'Invalid relationship.' }, { status: 400 });
  }

  // For player profiles, require the player to be under 18 (youth hockey).
  if (body.profileType === 'player') {
    const { data: player } = await supabaseAdmin
      .from('players')
      .select('id, birth_date, first_name, last_name')
      .eq('id', body.profileId)
      .maybeSingle();
    if (!player) {
      return NextResponse.json({ error: 'Player not found.' }, { status: 404 });
    }
    const p = player as PlayerRow;
    if (!p.birth_date) {
      return NextResponse.json(
        { error: 'This player has no birth date on file, so the parent-claim flow is not available. The player can claim their own profile once they turn 18.' },
        { status: 400 }
      );
    }
    const eighteenYearsAgo = new Date();
    eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18);
    if (new Date(p.birth_date) <= eighteenYearsAgo) {
      return NextResponse.json(
        { error: 'This player is 18 or older. They should claim their own profile, not be managed by a parent.' },
        { status: 400 }
      );
    }
  } else if (body.profileType === 'team') {
    const { data: team } = await supabaseAdmin
      .from('teams')
      .select('id')
      .eq('id', body.profileId)
      .maybeSingle();
    if (!team) return NextResponse.json({ error: 'Team not found.' }, { status: 404 });
  } else if (body.profileType === 'league') {
    const { data: league } = await supabaseAdmin
      .from('leagues')
      .select('id')
      .eq('id', body.profileId)
      .maybeSingle();
    if (!league) return NextResponse.json({ error: 'League not found.' }, { status: 404 });
  }

  const { data, error } = await supabaseAdmin
    .from('managed_profiles')
    .upsert(
      {
        manager_user_id: userId,
        profile_type: body.profileType,
        profile_id: body.profileId,
        relationship,
      },
      { onConflict: 'manager_user_id,profile_type,profile_id' }
    )
    .select('*')
    .single();

  if (error) {
    console.error('[managed_profiles POST] failed', error);
    return NextResponse.json({ error: 'Failed to add managed profile.' }, { status: 500 });
  }

  const res = NextResponse.json({ managedProfile: data as ManagedProfile });
  return applyRateLimitHeaders(res, result);
}

// GET /api/profiles/managed[?userId=OTHER]
// If `userId` query param is provided, returns THAT user's managed profiles (public read).
// Otherwise returns the caller's own managed profiles (requires sign-in).
export async function GET(request: NextRequest) {
  const ip = getClientIP(request);
  const result = await checkRateLimit(`managed:${ip}`, RL);
  maybeCleanup();

  const url = new URL(request.url);
  const targetUserId = url.searchParams.get('userId');

  let userId: string;
  if (targetUserId) {
    // Public read: don't require sign-in.
    userId = targetUserId;
  } else {
    const me = await requireUserId();
    if (!me) {
      const res = NextResponse.json({ error: 'Sign in.' }, { status: 401 });
      return applyRateLimitHeaders(res, result);
    }
    userId = me;
  }

  const { data: rows, error } = await supabaseAdmin
    .from('managed_profiles')
    .select('*')
    .eq('manager_user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[managed_profiles GET] failed', error);
    return NextResponse.json({ error: 'Failed to load.' }, { status: 500 });
  }

  // Hydrate.
  const playerIds = (rows || []).filter((r: any) => r.profile_type === 'player').map((r: any) => r.profile_id);
  const teamIds = (rows || []).filter((r: any) => r.profile_type === 'team').map((r: any) => r.profile_id);
  const leagueIds = (rows || []).filter((r: any) => r.profile_type === 'league').map((r: any) => r.profile_id);

  const playerMap: Record<string, any> = {};
  const teamMap: Record<string, any> = {};
  const leagueMap: Record<string, any> = {};
  if (playerIds.length > 0) {
    const { data } = await supabaseAdmin.from('players').select('id, first_name, last_name, slug, team_id, headshot_url').in('id', playerIds);
    for (const p of data || []) playerMap[p.id] = p;
  }
  if (teamIds.length > 0) {
    const { data } = await supabaseAdmin.from('teams').select('id, name, slug, logo_url').in('id', teamIds);
    for (const t of data || []) teamMap[t.id] = t;
  }
  if (leagueIds.length > 0) {
    const { data } = await supabaseAdmin.from('leagues').select('id, name, slug, logo_url').in('id', leagueIds);
    for (const l of data || []) leagueMap[l.id] = l;
  }

  const enriched = (rows || []).map((r: any) => {
    let profile: any = null;
    if (r.profile_type === 'player') profile = playerMap[r.profile_id] || null;
    else if (r.profile_type === 'team') profile = teamMap[r.profile_id] || null;
    else if (r.profile_type === 'league') profile = leagueMap[r.profile_id] || null;
    return { ...r, profile };
  });

  const res = NextResponse.json({ managedProfiles: enriched });
  return applyRateLimitHeaders(res, result);
}
