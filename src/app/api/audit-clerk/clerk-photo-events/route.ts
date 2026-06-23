// TEMPORARY audit route — one-time use. Lists Clerk's image-related events
// for the Arnel user, and tries to fetch Clerk's image-resource list.
// DELETED after the call.

import { NextRequest, NextResponse } from 'next/server';
import { createClerkClient } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';

const TARGET_USER_ID = 'user_3Etd1E64kor4sHx1sbnkK3vcnpL';

export async function GET(_request: NextRequest) {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json({ error: 'CLERK_SECRET_KEY not set in Vercel env' }, { status: 500 });
  }

  const clerk = createClerkClient({ secretKey });
  const out: any = {
    targetUserId: TARGET_USER_ID,
    checks: {},
  };

  // 1. Read the current user
  try {
    const user = await clerk.users.getUser(TARGET_USER_ID);
    out.checks.currentUser = {
      id: user.id,
      imageUrl: user.imageUrl,
      hasImage: user.hasImage,
      firstName: user.firstName,
      lastName: user.lastName,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  } catch (e: any) {
    out.checks.currentUser = { error: e.message };
  }

  // 2. List all events for the user (Clerk logs)
  // The SDK exposes clerkClient.events (or the Backend API directly)
  // Try the events endpoint via the SDK
  try {
    // The events list is a Backend API endpoint, not always wrapped in SDK.
    // Use the raw fetch fallback.
    const events = await fetch(
      `https://api.clerk.com/v1/users/${TARGET_USER_ID}/sessions?limit=10`,
      { headers: { Authorization: `Bearer ${secretKey}` } }
    );
    out.checks.sessionsStatus = events.status;
    const sessionsBody = await events.text();
    try {
      out.checks.sessions = JSON.parse(sessionsBody).slice?.(0, 3) ?? JSON.parse(sessionsBody);
    } catch {
      out.checks.sessionsRaw = sessionsBody.slice(0, 500);
    }
  } catch (e: any) {
    out.checks.sessionsError = e.message;
  }

  // 3. Try to list image resources via Backend API directly
  // Clerk's Backend API: GET /v1/users/{user_id}/profile_image doesn't return history,
  // but the user object may have image-related metadata
  try {
    // Try fetching the full user with imageUrl + a profile_image endpoint
    const profileImageResp = await fetch(
      `https://api.clerk.com/v1/users/${TARGET_USER_ID}/profile_image`,
      { headers: { Authorization: `Bearer ${secretKey}` } }
    );
    out.checks.profileImageStatus = profileImageResp.status;
    const body = await profileImageResp.text();
    try {
      out.checks.profileImage = JSON.parse(body);
    } catch {
      out.checks.profileImageRaw = body.slice(0, 500);
    }
  } catch (e: any) {
    out.checks.profileImageError = e.message;
  }

  // 4. Try the events endpoint via raw API
  try {
    const eventsResp = await fetch(
      `https://api.clerk.com/v1/events?user_id=${TARGET_USER_ID}&limit=20`,
      { headers: { Authorization: `Bearer ${secretKey}` } }
    );
    out.checks.eventsStatus = eventsResp.status;
    const eventsBody = await eventsResp.text();
    try {
      const parsed = JSON.parse(eventsBody);
      out.checks.events = parsed;
      // Filter to image-related events
      if (Array.isArray(parsed)) {
        out.checks.imageEvents = parsed
          .filter((e: any) => e.type?.toLowerCase?.().includes('image') || e.type?.toLowerCase?.().includes('profile'))
          .slice(0, 20);
      }
    } catch {
      out.checks.eventsRaw = eventsBody.slice(0, 1000);
    }
  } catch (e: any) {
    out.checks.eventsError = e.message;
  }

  return NextResponse.json(out);
}
