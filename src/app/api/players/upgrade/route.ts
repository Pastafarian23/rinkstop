import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { checkRateLimit, applyRateLimitHeaders } from '@/lib/rateLimit';

// Lazy Stripe init so build doesn't fail when env vars are missing at build time
function getStripe() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Stripe = require('stripe');
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-04-22.dahlia',
  });
}

const PRICE_IDS: Record<string, string> = {
  verified: process.env.STRIPE_PRICE_VERIFIED!,
  elite: process.env.STRIPE_PRICE_ELITE!,
};

// Per-user rate limit: 5 checkout creations per hour.
const USER_RL = { maxRequests: 5, windowMs: 60 * 60 * 1000 };

export async function POST(req: NextRequest) {
  // 1) Auth required (closes H1 — anyone on internet could create sessions)
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }

  // 2) Per-user rate limit
  const rl = await checkRateLimit(`player_upgrade:${userId}`, USER_RL);
  if (!rl.allowed) {
    const res = NextResponse.json(
      { error: 'Too many checkout attempts. Try again later.' },
      { status: 429 }
    );
    res.headers.set('Retry-After', String(rl.retryAfter || 3600));
    return applyRateLimitHeaders(res, rl);
  }

  try {
    const { playerId, tier, successUrl, cancelUrl } = await req.json();

    if (!playerId || !tier || !PRICE_IDS[tier]) {
      return NextResponse.json({ error: 'Invalid tier or playerId' }, { status: 400 });
    }

    // 3) Verify the caller owns the player record. The players table has a
    //    user_id column linking to Clerk's userId. Admins bypass this check.
    //    (Closes spoofing: a signed-in user could otherwise pay to upgrade
    //    any playerId, and the metadata would credit the wrong player.)
    const isAdmin = await isAdminUser(userId);
    if (!isAdmin) {
      const { data: player, error: playerErr } = await supabaseAdmin
        .from('players')
        .select('id, user_id')
        .eq('id', playerId)
        .maybeSingle();
      if (playerErr) {
        console.error('[Stripe player checkout] player lookup failed', playerErr);
        return NextResponse.json({ error: 'Player lookup failed' }, { status: 500 });
      }
      if (!player) {
        return NextResponse.json({ error: 'Player not found' }, { status: 404 });
      }
      if (player.user_id !== userId) {
        console.warn(
          `[Stripe player checkout] userId ${userId} tried to upgrade player ${playerId} owned by ${player.user_id}`
        );
        return NextResponse.json({ error: 'Not authorized to upgrade this player' }, { status: 403 });
      }
    }

    // 4) Pull email from Clerk — never trust the body (closes H3).
    const user = await currentUser();
    const customerEmail = user?.emailAddresses?.[0]?.emailAddress;

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://rinkstop.com';

    const sessionParams: Record<string, unknown> = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: PRICE_IDS[tier],
          quantity: 1,
        },
      ],
      success_url: `${successUrl || `${baseUrl}/directory/players/${playerId}`}?upgrade=success&tier=${tier}`,
      cancel_url: cancelUrl || `${baseUrl}/directory/players/${playerId}?upgrade=cancelled`,
      metadata: {
        playerId,
        tier,
        type: `player_${tier}`,
        callerUserId: userId,
      },
      subscription_data: {
        metadata: {
          playerId,
          tier,
          type: `player_${tier}`,
          callerUserId: userId,
        },
      },
    };

    if (customerEmail) {
      sessionParams.customer_email = customerEmail;
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create(
      sessionParams,
      { idempotencyKey: `player_${userId}_${playerId}_${tier}` }
    );

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Stripe checkout]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Check Clerk publicMetadata for admin role, with profiles.role as fallback.
// Mirrors the same logic as requireAdmin() in /lib/admin-auth.ts but returns
// a boolean instead of redirecting. The admin_users table doesn't actually
// exist in this schema (legacy from before Clerk + profiles.role) so we don't
// query it.
async function isAdminUser(clerkUserId: string): Promise<boolean> {
  const user = await currentUser();
  if (!user) return false;
  const metaRole = (user.publicMetadata?.role as string) || '';
  if (metaRole === 'super_admin' || metaRole === 'admin') return true;

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('user_id', clerkUserId)
    .maybeSingle();
  const dbRole = (profile?.role as string) || '';
  return dbRole === 'super_admin' || dbRole === 'admin';
}
