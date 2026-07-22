/**
 * /admin/stamps/disputes
 *
 * WS3.5 PR3 — RinkStop staff dispute queue (cross-target).
 *
 * Lists ALL disputed stamps across all targets (rinks/venues/events)
 * with a target-type filter. Staff can adjudicate any row. Calls the
 * same POST /api/passport/stamp/[stampId]/adjudicate endpoint that the
 * PR2 operator queue uses — the endpoint is staff-or-operator agnostic
 * and the service layer enforces isStaff.
 *
 * Auth: requireAdmin() (Clerk role='admin' or OWNER_EMAILS bypass).
 * Gate: STAMPS_ADMIN_ENABLED must be true.
 *
 * Display:
 *   - Header: title + count badge
 *   - Filter chips: All / Rinks / Venues / Events
 *   - One card per disputed stamp, newest first:
 *     - Target badge (rink/venue/event) + target name + city
 *     - Stamper name + role + stamped_at
 *     - Dispute reason quote
 *     - Reason textarea (optional)
 *     - Uphold (red) / Overturn (teal) buttons
 *   - Empty state: "No disputed stamps system-wide."
 *
 * Pagination: 100/page. If we ever see >100 active disputes system-wide
 * we'd want infinite scroll, but v1 is bounded.
 */

import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/admin-auth';
import { isStampsAdminEnabled, stampService } from '@/lib/passport';
import { StaffDisputeActions } from './staff-dispute-actions';

export const dynamic = 'force-dynamic';

export default async function AdminDisputesPage({
  searchParams,
}: {
  searchParams: Promise<{ targetType?: string; offset?: string }>;
}) {
  const admin = await requireAdmin();

  const sp = await searchParams;
  const filterType =
    sp.targetType === 'rink' ||
    sp.targetType === 'venue' ||
    sp.targetType === 'event'
      ? sp.targetType
      : undefined;
  const offset = Math.max(parseInt(sp.offset ?? '0', 10) || 0, 0);
  const limit = 100;

  if (!isStampsAdminEnabled()) {
    return (
      <main style={{ padding: '24px 16px', fontFamily: '-apple-system, system-ui, sans-serif' }}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#0f172a' }}>
          Dispute Queue
        </h1>
        <div style={{
          background: 'rgba(255,184,28,0.08)',
          border: '1px solid rgba(255,184,28,0.3)',
          color: '#92400e',
          padding: '1rem 1.25rem',
          borderRadius: 8,
        }}>
          Dispute adjudication is currently disabled. Set{' '}
          <code>STAMPS_ADMIN_ENABLED=true</code> on Vercel to open the queue.
        </div>
      </main>
    );
  }

  const disputes = await stampService.listDisputedStampsForStaff({
    isStaff: true,
    targetType: filterType,
    limit,
    offset,
  });

  return (
    <main style={{ padding: '24px 16px 64px', fontFamily: '-apple-system, system-ui, sans-serif', color: '#0f172a' }}>
      <div style={{ maxWidth: 920, margin: '0 auto' }}>
        <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'baseline', gap: '0.75rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Dispute Queue</h1>
          <span style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            background: disputes.length > 0 ? '#dc2626' : '#94a3b8',
            color: '#fff',
            padding: '0.2rem 0.5rem',
            borderRadius: 999,
          }}>
            {disputes.length} {disputes.length === 1 ? 'dispute' : 'disputes'}
          </span>
          <span style={{ fontSize: '0.85rem', color: '#64748b', marginLeft: 'auto' }}>
            Signed in as {admin.email}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <FilterChip href="/admin/stamps/disputes" label="All" active={!filterType} />
          <FilterChip href="/admin/stamps/disputes?targetType=rink" label="Rinks" active={filterType === 'rink'} />
          <FilterChip href="/admin/stamps/disputes?targetType=venue" label="Venues" active={filterType === 'venue'} />
          <FilterChip href="/admin/stamps/disputes?targetType=event" label="Events" active={filterType === 'event'} />
        </div>

        {disputes.length === 0 ? (
          <div style={{
            background: '#f1f5f9',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: '2rem',
            textAlign: 'center',
            color: '#64748b',
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✅</div>
            <div style={{ fontWeight: 600, color: '#0f172a' }}>No disputed stamps</div>
            <div style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
              {filterType
                ? `No ${filterType} disputes right now. Try a different filter.`
                : 'System-wide queue is clear. Holders can flag disputes via their dashboard; they surface here automatically.'}
            </div>
          </div>
        ) : (
          <StaffDisputeActions
            disputes={disputes.map((d) => ({
              stampId: d.stampId,
              targetType: d.targetType,
              targetId: d.targetId,
              targetDisplay: d.targetDisplay,
              targetLocation: d.targetLocation,
              stamperDisplayName: d.stamperDisplayName,
              stamperRole: d.stamperRole,
              stampedAt: d.stampedAt,
              disputeReason: d.disputeReason,
            }))}
          />
        )}

        {disputes.length === limit && (
          <div style={{ marginTop: '1rem', textAlign: 'center' }}>
            <a
              href={`/admin/stamps/disputes?${new URLSearchParams({
                ...(filterType ? { targetType: filterType } : {}),
                offset: String(offset + limit),
              }).toString()}`}
              style={{
                display: 'inline-block',
                padding: '0.5rem 1rem',
                border: '1px solid #cbd5e1',
                borderRadius: 6,
                color: '#0f172a',
                textDecoration: 'none',
                fontSize: '0.85rem',
              }}
            >
              Next page →
            </a>
          </div>
        )}
      </div>
    </main>
  );
}

function FilterChip({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <a
      href={href}
      style={{
        padding: '0.35rem 0.85rem',
        borderRadius: 999,
        fontSize: '0.8rem',
        fontWeight: 600,
        textDecoration: 'none',
        background: active ? '#0f172a' : '#fff',
        color: active ? '#fff' : '#475569',
        border: active ? '1px solid #0f172a' : '1px solid #cbd5e1',
      }}
    >
      {label}
    </a>
  );
}
