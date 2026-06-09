import { getAdminFromRequest } from '@/lib/admin-auth';
import { redirect } from 'next/navigation';
import RevenueDashboard from './RevenueDashboard';

export const dynamic = 'force-dynamic';

async function getInitialRevenue() {
  const auth = await getAdminFromRequest();
  if ('response' in auth) return { error: 'unauthorized' as const };
  // Re-call the route handler? No — just call the same logic directly.
  const r = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/admin/revenue`, {
    headers: { cookie: '' }, // We're already in admin context; the route uses supabaseAdmin + auth header check, but for SSR we re-call with service.
    cache: 'no-store',
  }).catch(() => null);
  if (!r || !r.ok) return { error: 'fetch_failed' as const, status: r?.status };
  return { data: await r.json() };
}

export default async function RevenuePage() {
  const auth = await getAdminFromRequest();
  if ('response' in auth) {
    // The middleware already gates /admin, so this is unlikely — but be defensive.
    redirect('/sign-in');
  }

  const initial = await getInitialRevenue();

  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-2">Revenue</h1>
      <p className="text-slate-400 mb-8">
        Stripe-backed snapshot of subscriptions, MRR, churn, and recent events.
      </p>

      <RevenueDashboard initial={initial} />
    </div>
  );
}
