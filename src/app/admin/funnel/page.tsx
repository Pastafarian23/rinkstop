/**
 * src/app/admin/funnel/page.tsx
 *
 * Admin funnel dashboard. Renders the conversion funnels for both tracks.
 * Server component: auth-gated, fetches initial data, passes to client
 * component for interactivity.
 *
 * Access: Clerk session + admin role. Reuses getAdminFromRequest pattern
 * (matches other /api/admin routes).
 */
import { requireAdmin } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';
import {
  computeFunnel,
  BUSINESS_FUNNEL,
  PERSONAL_FUNNEL,
  type FunnelEventRow,
} from '@/lib/funnel';
import { FunnelView } from './FunnelView';

export const dynamic = 'force-dynamic';

const VALID_DAYS = new Set([7, 30, 90]);
const EARLIEST_EVENT = '2026-06-16T00:00:00Z';
const DEFAULT_DAYS = 30;

interface PageProps {
  searchParams: Promise<{ days?: string }>;
}

export default async function FunnelPage({ searchParams }: PageProps) {
  // Auth: throws/redirects on failure
  await requireAdmin();

  const params = await searchParams;
  const daysParam = parseInt(params.days ?? String(DEFAULT_DAYS), 10);
  const days = VALID_DAYS.has(daysParam) ? daysParam : DEFAULT_DAYS;

  const now = new Date();
  const windowStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const earliest = new Date(EARLIEST_EVENT);
  const since = windowStart < earliest ? earliest : windowStart;
  const sinceIso = since.toISOString();

  // Fetch events for both funnels in a single query
  const allEvents = [
    ...BUSINESS_FUNNEL.steps,
    ...PERSONAL_FUNNEL.steps,
  ];

  let rows: FunnelEventRow[] = [];
  let degraded = false;
  let note: string | undefined;

  try {
    const { data, error } = await supabaseAdmin
      .from('analytics_events')
      .select('name, user_id')
      .in('name', Array.from(allEvents))
      .gte('ts', sinceIso);

    if (error) {
      console.error('[admin/funnel page] supabase error:', error.message);
      degraded = true;
      note = 'analytics_events query failed; showing empty funnels.';
    } else {
      rows = (data ?? []) as FunnelEventRow[];
    }
  } catch (e: any) {
    console.error('[admin/funnel page] unexpected error:', e?.message ?? e);
    degraded = true;
    note = 'analytics_events may not exist yet.';
  }

  const initialData = {
    window_days: days,
    since: sinceIso,
    generated_at: now.toISOString(),
    degraded,
    note,
    tracks: {
      business: computeFunnel(rows, BUSINESS_FUNNEL.label, BUSINESS_FUNNEL.steps),
      personal: computeFunnel(rows, PERSONAL_FUNNEL.label, PERSONAL_FUNNEL.steps),
    },
  };

  return (
    <div style={{
      maxWidth: 960, margin: '0 auto', padding: '1.5rem',
      display: 'flex', flexDirection: 'column', gap: '1.25rem',
    }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ fontSize: '1.75rem' }}>📊</div>
        <div style={{ flex: 1, minWidth: 240 }}>
          <h1 style={{
            fontFamily: "'Bebas Neue', Impact, sans-serif",
            fontSize: '1.5rem', color: '#fff', letterSpacing: '0.05em',
            margin: '0 0 0.25rem',
          }}>
            CONVERSION FUNNELS
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', margin: 0 }}>
            Where users drop off in the two RinkStop purchase paths.
          </p>
        </div>
        <a href="/admin" style={{ color: '#14B8A6', fontSize: '0.85rem' }}>← Admin</a>
      </header>

      <FunnelView initialData={initialData} />
    </div>
  );
}