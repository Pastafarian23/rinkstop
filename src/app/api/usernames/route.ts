import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { validateUsername, USERNAME_ERROR_MESSAGES, isInvalid } from '@/lib/username';
import { setUsername } from '@/lib/username-server';
import { applyModeration } from '@/lib/username-moderation';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

/**
 * POST /api/usernames
 * Set or change the current user's username.
 * Auth required.
 *
 * Flow (Arnel, 2026-06-17):
 *   1. Tier gate: custom username requires Verified Identity or higher
 *      (free users get an auto-handle from the Clerk webhook and can keep it,
 *      but cannot pick a new one). Added 2026-08-25 per Option A tier plan.
 *   2. Format validation
 *   3. Moderation: hard-block slurs, soft-queue brand-prefix + profanity
 *   4. Set username (handles availability, cooldown, audit log, hold)
 */
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  // 1. Tier gate — custom username requires Verified Identity or higher.
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('tier')
    .eq('user_id', userId)
    .maybeSingle();
  const tier = profile?.tier ?? 'free';
  if (tier === 'free') {
    return NextResponse.json(
      {
        ok: false,
        error: 'tier_required',
        message:
          'Custom usernames are available on Hockey Passport (Verified Identity) and above. ' +
          'Free accounts keep an auto-generated handle.',
        upgrade_url: '/pricing',
        required_tier: 'verified_identity',
      },
      { status: 402 }
    );
  }

  const body = await req.json();
  const input = body.username;

  if (typeof input !== 'string') {
    return NextResponse.json(
      { ok: false, error: 'invalid_input', message: 'username must be a string' },
      { status: 400 }
    );
  }

  // 2. Format validation
  const validation = validateUsername(input);
  if (isInvalid(validation)) {
    return NextResponse.json(
      {
        ok: false,
        error: validation.error,
        message: USERNAME_ERROR_MESSAGES[validation.error],
      },
      { status: 400 }
    );
  }

  // 3. Moderation (brand prefix + profanity)
  const mod = await applyModeration(userId, validation.normalized);
  if (!mod.ok) {
    if ('hard' in mod) {
      // Hard block: clear slur / hate speech. Polite message that doesn't
      // reveal what specifically was caught (so attackers can't probe
      // the wordlist by trying variations).
      return NextResponse.json(
        {
          ok: false,
          error: 'inappropriate',
          message:
            'This username contains language that isn’t allowed on RinkStop. ' +
            'Please choose a different username.',
        },
        { status: 400 }
      );
    }
    // Soft block: queued for review
    return NextResponse.json(
      {
        ok: false,
        error: 'pending_review',
        message:
          'Your username is being reviewed by our team. ' +
          'You’ll get a notification once it’s approved (usually within 24 hours).',
        review_id: (mod as { ok: false; pending: string }).pending,
      },
      { status: 202 }
    );
  }

  // 4. Set username (handles availability, cooldown, audit log, hold)
  const result = await setUsername(userId, validation.normalized);

  if (!result.ok) {
    return NextResponse.json(result, { status: 409 });
  }

  return NextResponse.json(result);
}
