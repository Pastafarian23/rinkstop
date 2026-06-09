import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

interface CronSnapshot {
  id: string;
  name: string;
  lastRunAt: string | null;
  lastRunStatus: string | null;
  failedLast24h: number;
}

interface Snapshot {
  id: string;
  captured_at: string;
  crons: CronSnapshot[];
  total_crons: number;
  healthy_count: number;
  failed_last_24h: number;
  source: string;
}

/**
 * GET /api/admin/cron-health
 * Returns the most recent snapshot from cron_health_snapshots table.
 * Also returns the last 10 snapshots so we can show trends over time.
 */
export async function GET(_req: NextRequest) {
  const auth = await getAdminFromRequest();
  if ('response' in auth) return auth.response;

  const { data, error } = await supabaseAdmin
    .from('cron_health_snapshots')
    .select('*')
    .order('captured_at', { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ latest: null, history: [], message: 'no_snapshots_yet' });
  }

  return NextResponse.json({ latest: data[0] as Snapshot, history: data });
}
