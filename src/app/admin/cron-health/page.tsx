import { getAdminFromRequest } from '@/lib/admin-auth';
import { redirect } from 'next/navigation';
import CronHealthDashboard from './CronHealthDashboard';

export const dynamic = 'force-dynamic';

async function getInitial() {
  const auth = await getAdminFromRequest();
  if ('response' in auth) return { error: 'unauthorized' as const };
  const r = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/admin/cron-health`, {
    cache: 'no-store',
  }).catch(() => null);
  if (!r || !r.ok) return { error: 'fetch_failed' as const, status: r?.status };
  return { data: await r.json() };
}

export default async function CronHealthPage() {
  const auth = await getAdminFromRequest();
  if ('response' in auth) redirect('/sign-in');

  const initial = await getInitial();

  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-2">Cron Health</h1>
      <p className="text-slate-400 mb-8">
        OpenClaw cron job status, last run, and 24h failure rate. Updated every 5 min by
        <code className="text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded ml-1">scripts/collect-cron-health.js</code>
      </p>

      <CronHealthDashboard initial={initial} />
    </div>
  );
}
