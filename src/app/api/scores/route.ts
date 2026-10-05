/**
 * GET /api/scores — SMOKE TEST
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
  return new NextResponse(
    JSON.stringify({ ok: true, message: 'scores endpoint reachable', time: new Date().toISOString() }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
