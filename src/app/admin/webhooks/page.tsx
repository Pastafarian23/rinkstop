import { getAdminFromRequest } from '@/lib/admin-auth';
import { redirect } from 'next/navigation';
import WebhooksDashboard from './WebhooksDashboard';

export const dynamic = 'force-dynamic';

async function getInitial() {
  const auth = await getAdminFromRequest();
  if ('response' in auth) return { error: 'unauthorized' as const };
  const r = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/admin/stripe-webhook-events?limit=50`, {
    cache: 'no-store',
  }).catch(() => null);
  if (!r || !r.ok) return { error: 'fetch_failed' as const, status: r?.status };
  return { data: await r.json() };
}

export default async function WebhooksPage() {
  const auth = await getAdminFromRequest();
  if ('response' in auth) redirect('/login?error=admin_only');

  const initial = await getInitial();

  return (
    <div>
      <div className="page-header">
        <h1><span aria-hidden="true">💳</span> Stripe Webhooks</h1>
        <p>
          Every Stripe webhook event our system receives, with processing status.
          Use this when a customer reports &quot;I paid but my tier didn&apos;t upgrade&quot; —
          find their event, click it, see exactly what Stripe sent us.
        </p>
      </div>

      <WebhooksDashboard initial={initial} />
    </div>
  );
}
