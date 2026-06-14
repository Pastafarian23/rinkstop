import { NextRequest, NextResponse } from 'next/server';
import { validateUsername, USERNAME_ERROR_MESSAGES, isInvalid, type UsernameError } from '@/lib/username';
import { checkUsernameAvailability, isUnavailable } from '@/lib/username-server';

/**
 * GET /api/usernames/check?slug=foo
 * Live availability check (no auth required).
 * Used by the UI for real-time feedback as the user types.
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
