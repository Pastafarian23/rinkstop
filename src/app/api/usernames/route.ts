import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { validateUsername, USERNAME_ERROR_MESSAGES, isInvalid } from '@/lib/username';
import { setUsername } from '@/lib/username-server';

/**
 * POST /api/usernames
 * Set or change the current user's username.
 * Auth required.
 */
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const input = body.username;

  if (typeof input !== 'string') {
    return NextResponse.json(
      { ok: false, error: 'invalid_input', message: 'username must be a string' },
      { status: 400 }
    );
  }

  // 1. Format validation
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


  // 2. Set username (handles availability, cooldown, audit log, hold)
  const result = await setUsername(userId, validation.normalized);

  if (!result.ok) {
    return NextResponse.json(result, { status: 409 });
  }

  return NextResponse.json(result);
}
