/**
 * POST /api/dashboard/restore
 *
 * Restore one or all dismissed workspaces for the current user.
 *
 * Body options:
 *   { workspaceId: string }                  — restore one workspace
 *   { all: true }                            — restore all dismissed workspaces
 *
 * Auth: required (Clerk). 401 if unauthenticated.
 * Validation: 400 if neither workspaceId nor all:true is provided.
 *
 * Response:
 *   { ok: true, workspaceId?: string, restoredCount?: number }
 *
 * Foundation PR (2026-07-22) — UI work (button + restore footer + settings
 * toggle) ships in a follow-up PR once the foundation is reviewed.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  restoreWorkspace,
  restoreAllWorkspaces,
} from '@/lib/dashboard/dismissedWorkspaces';

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const workspaceId = typeof body?.workspaceId === 'string' ? body.workspaceId.trim() : '';
  const restoreAll = body?.all === true;

  if (!workspaceId && !restoreAll) {
    return NextResponse.json(
      {
        error: 'missing_target',
        message: 'Provide either workspaceId or all: true',
      },
      { status: 400 },
    );
  }

  if (workspaceId && restoreAll) {
    return NextResponse.json(
      {
        error: 'conflicting_target',
        message: 'Provide either workspaceId or all: true, not both',
      },
      { status: 400 },
    );
  }

  try {
    if (restoreAll) {
      const count = await restoreAllWorkspaces();
      return NextResponse.json({ ok: true, restoredCount: count });
    }
    await restoreWorkspace(workspaceId);
    return NextResponse.json({ ok: true, workspaceId });
  } catch (err: any) {
    if (err?.message === 'Not authenticated') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    console.error('[api/dashboard/restore] failed:', err);
    return NextResponse.json(
      { error: 'restore_failed', message: err?.message || 'unknown error' },
      { status: 500 },
    );
  }
}
