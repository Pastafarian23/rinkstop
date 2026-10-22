// /api/cron/auto-publish
//
// 2026-10-21: RETIRED — this endpoint is no longer the auto-publish runner.
//
// Why it was retired:
//   1. The audit script (scripts/auto-publish-audit-validated.cjs) reads
//      its credentials from a local `.env` file in the repo root. `.env` is
//      gitignored, so it does not exist in a Vercel deployment. The script
//      could never authenticate on Vercel — it exited before doing any
//      work, and this route reported the failure as a generic "exited N".
//   2. `shouldPost` read `summary.total_published` / `total_flagged` /
//      `total_errors`, but the script writes `published` / `flagged` /
//      `errors`. Every lookup was undefined -> 0, so shouldPost was always
//      false. Even if the script had run, this route never posted anything.
//   3. maxDuration was 300s; the script needs ~600s for a full 272-article
//      audit pass, so it would have been killed mid-run.
//   4. It duplicated the OpenClaw agentTurn cron (662b0424-df2d-449d-a2c4-
//      66dcfba8509d), which runs on the host where `.env` DOES exist and
//      which has been the effective runner all along.
//
// The vercel.json entry for this path was removed in the same change.
// The route is kept in place (returning a clear, explicit status) so that
// any stale Vercel cron trigger or self-heal caller gets a truthful
// response instead of a silent no-op.
//
// Ownership: the OpenClaw cron 662b0424 runs
//   bash scripts/auto-publish-detached.sh
// which writes /tmp/auto-publish-result.json and reports to RinkStop Ops.

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    ok: false,
    retired: true,
    error:
      'This endpoint was retired on 2026-10-21. It could not run the audit ' +
      'script (no local .env in the Vercel deployment) and it duplicated the ' +
      'OpenClaw cron 662b0424-df2d-449d-a2c4-66dcfba8509d, which is the ' +
      'active auto-publish runner.',
    owner: 'openclaw-cron:662b0424-df2d-449d-a2c4-66dcfba8509d',
  });
}

export async function POST(request: NextRequest) {
  return GET(request);
}
