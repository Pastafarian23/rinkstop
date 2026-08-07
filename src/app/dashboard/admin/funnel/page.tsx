import { Metadata } from 'next';
import { auth } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { computeFunnel, BUSINESS_FUNNEL, PERSONAL_FUNNEL, eventLabel } from '@/lib/funnel';

export const metadata: Metadata = {
  title: 'Funnel Analytics — RinkStop',
  description: 'Claim-to-paid funnel analytics dashboard.',
};

export const dynamic = 'force-dynamic';

function daysAgoISO(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

export default async function FunnelPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const session = await auth();
  const userId = session.userId
    ? await resolveCanonicalUserId(session.userId, '')
    : null;

  if (!userId) {
    return <div className="p-6">Not authorized.</div>;
  }

  const params = await searchParams;
  const rangeDays = typeof params.range === 'string' ? Number(params.range) : 7;
  const since = daysAgoISO(rangeDays);

  const { data: events, error } = await supabaseAdmin
    .from('analytics_events')
    .select('name, user_id, props, ts')
    .gte('ts', since)
    .order('ts', { ascending: false })
    .limit(5000);

  if (error) {
    return <div className="p-6 text-red-400">Failed to load analytics: {error.message}</div>;
  }

  const rows = (events ?? []).map((e: any) => ({
    name: e.name,
    user_id: e.user_id,
  }));

  const personalFunnel = computeFunnel(rows, PERSONAL_FUNNEL.label, PERSONAL_FUNNEL.steps);
  const businessFunnel = computeFunnel(rows, BUSINESS_FUNNEL.label, BUSINESS_FUNNEL.steps);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-bold text-white">Funnel Analytics</h1>
      <p className="text-gray-400">Last {rangeDays} days</p>

      <FunnelCard funnel={personalFunnel} />
      <FunnelCard funnel={businessFunnel} />
    </div>
  );
}

function FunnelCard({ funnel }: { funnel: ReturnType<typeof computeFunnel> }) {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-6">
      <h2 className="text-lg font-semibold text-white mb-4">{funnel.label}</h2>
      <div className="space-y-2">
        {funnel.steps.map((step, i) => (
          <div key={step.event} className="flex items-center gap-4">
            <div className="w-8 text-right text-sm text-gray-500">{i + 1}</div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-white">{eventLabel(step.event)}</span>
                <span className="text-sm text-gray-400">{step.unique_users} users</span>
              </div>
              <div className="mt-1 h-2 rounded bg-gray-800 overflow-hidden">
                <div
                  className="h-full rounded bg-sky-500"
                  style={{ width: `${step.pct_of_top}%` }}
                />
              </div>
              <div className="mt-1 text-xs text-gray-500">
                {step.pct_of_prev !== null ? `${step.pct_of_prev}% of previous` : '100% of top'}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
