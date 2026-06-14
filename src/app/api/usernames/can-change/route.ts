import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { canChangeUsername } from '@/lib/username-server';

/**
 * GET /api/usernames/can-change
 * Check if the current user can change their username (cooldown).
 * Auth required.
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const result = await canChangeUsername(userId);

  return NextResponse.json({
    can_change: result.canChange,
    next_change_at: result.nextChangeAt?.toISOString(),
  });
}
