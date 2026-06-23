// TEMPORARY admin route — used by Arnel to clear his own Clerk profile photo
// during a one-time cleanup. Will be DELETED after the call is made.
// Auth: requires the caller to be the same user (Arnel) via Clerk auth().

import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { createClerkClient } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';

export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  // Safety: only the actual user can trigger this for themselves.
  // The Arnel profile is at user_3Etd1E64kor4sHx1sbnkK3vcnpL.
  const ALLOWED_USER_ID = 'user_3Etd1E64kor4sHx1sbnkK3vcnpL';
  if (userId !== ALLOWED_USER_ID) {
    return NextResponse.json({ error: 'Not authorized for this operation' }, { status: 403 });
  }

  // Confirm the caller's display name matches (defense in depth).
  const user = await currentUser();
  if (!user || !user.firstName?.toLowerCase().includes('arnel')) {
    return NextResponse.json({ error: 'Identity check failed' }, { status: 403 });
  }

  // Call Clerk Backend API to remove the profile image.
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json({ error: 'Server misconfigured: CLERK_SECRET_KEY missing' }, { status: 500 });
  }

  const clerk = createClerkClient({ secretKey });
  try {
    const updated = await clerk.users.deleteUserProfileImage(userId);
    return NextResponse.json({
      ok: true,
      message: 'Profile photo removed from Clerk',
      userId: updated.id,
      newImageUrl: updated.imageUrl,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
