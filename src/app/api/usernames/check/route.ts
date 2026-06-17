import { NextRequest, NextResponse } from 'next/server';
import { validateUsername, USERNAME_ERROR_MESSAGES, isInvalid, type UsernameError } from '@/lib/username';
import { checkUsernameAvailability, isUnavailable } from '@/lib/username-server';
import { moderateUsername } from '@/lib/username-moderation';

/**
 * GET /api/usernames/check?slug=foo
 * Live availability check (no auth required).
 * Used by the UI for real-time feedback as the user types.
 *
 * Layer 2 (brand prefix) + Layer 3 (profanity) checks are
 * performed here so the UI can show a friendly message as the
 * user types — but the actual set still goes through the same
 * moderation in /api/usernames POST.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get('slug') ?? '';

  // First, validate format
  const validation = validateUsername(slug);
  if (isInvalid(validation)) {
    return NextResponse.json({
      available: false,
      reason: validation.error,
      message: USERNAME_ERROR_MESSAGES[validation.error],
    });
  }

  // Moderation (brand prefix + bad words)
  const mod = await moderateUsername(validation.normalized);
  if (!mod.ok) {
    if ('hard_block' in mod) {
      return NextResponse.json({
        available: false,
        reason: 'inappropriate',
        message:
          'This username contains language that isn’t allowed on RinkStop.',
      });
    }
    // soft_flags → pending review
    return NextResponse.json({
      available: false,
      reason: 'pending_review',
      message:
        'This username will need a quick review by our team before you can use it.',
    });
  }

  // Then check server-side availability
  const availability = await checkUsernameAvailability(validation.normalized);

  if (isUnavailable(availability)) {
    return NextResponse.json({
      available: false,
      reason: availability.reason,
      message: USERNAME_ERROR_MESSAGES[availability.reason as UsernameError],
      suggestions: availability.suggestions,
    });
  }

  return NextResponse.json({ available: true });
}
