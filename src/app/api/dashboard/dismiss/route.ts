/**
 * POST /api/dashboard/dismiss
 *
 * Dismiss (hide) a workspace from the current user's dashboard nav.
 * Idempotent — re-dismissing with a different reason updates the row.
 *
 * Body: { workspaceId: string, reason?: DismissReason }
 *   reason: 'not_relevant' | 'too_complex' | 'temporary' | 'other'
 *
 * Auth: required (Clerk). 401 if unauthenticated.
 * Validation: 400 if workspaceId missing or reason invalid.
 *
 * Note: This API does NOT validate that the workspaceId exists in WORKSPACES.
 * That's intentional — the dismiss table uses text so future workspaces
 * don't require a migration, and a user trying to dismiss a typo'd id is
 * a no-op visually (the workspace won't appear anyway). Logging the
 * unknown id helps us spot bugs without blocking legitimate dismisses.
 *
 * Foundation PR (2026-07-22) — UI work (button + restore footer + settings
 * toggle) ships in a follow-up PR once the foundation is reviewed.
 */

import { NextRequest, NextResponse } from 'next/server';
import { dismissWorkspace, type DismissReason } from '@/lib/dashboard/dismissedWorkspaces';

const VALID_REASONS: DismissReason[] = ['not_relevant', 'too_complex', 'temporary', 'other'];

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const workspaceId = typeof body?.workspaceId === 'string' ? body.workspaceId.trim() : '';
  if (!workspaceId) {
    return NextResponse.json(
      { error: 'missing_workspace_id', message: 'workspaceId is required' },
      { status: 400 },
    );
  }

  let reason: DismissReason | null = null;
  if (body.reason !== undefined && body.reason !== null) {
    if (typeof body.reason !== 'string' || !VALID_REASONS.includes(body.reason as DismissReason)) {
      return NextResponse.json(
        {
          error: 'invalid_reason',
          message: `reason must be one of: ${VALID_REASONS.join(', ')}`,
        },
        { status: 400 },
      );
    }
    reason = body.reason as DismissReason;
  }

  try {
    await dismissWorkspace(workspaceId, reason);
    return NextResponse.json({ ok: true, workspaceId, reason });
  } catch (err: any) {
    if (err?.message === 'Not authenticated') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    console.error('[api/dashboard/dismiss] failed:', err);
    return NextResponse.json(
      { error: 'dismiss_failed', message: err?.message || 'unknown error' },
      { status: 500 },
    );
  }
}
