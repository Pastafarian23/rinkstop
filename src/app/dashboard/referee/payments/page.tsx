/**
 * /dashboard/referee/payments
 *
 * WS4 Chunk 2 — Referee payment ledger.
 *
 * Lists every referee_payments row for the signed-in referee, sorted by
 * created_at DESC. Shows amount, status, paid_at, paid_via, reference.
 *
 * Auth: signed in + referee account type + flag enabled.
 * Read-only in chunk 2 (the API routes for status updates are a follow-up).
 */

import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  getAuthorizationContext,
  isRefereeToolsEnabled,
  refereeService,
} from '@/lib/passport';
import { resolveCanonicalUserId } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Payment Ledger' };

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function statusColor(status: string): string {
  switch (status) {
    case 'paid':     return '#059669';
    case 'owed':     return '#92400e';
    case 'pending':  return '#475569';
    case 'waived':   return '#1e40af';
    case 'disputed': return '#b91c1c';
    default:         return '#475569';
  }
}

function statusBg(status: string): string {
  switch (status) {
    case 'paid':     return 'rgba(52,211,153,0.12)';
    case 'owed':     return 'rgba(255,184,28,0.12)';
    case 'pending':  return 'rgba(148,163,184,0.12)';
    case 'waived':   return 'rgba(96,165,250,0.12)';
    case 'disputed': return 'rgba(248,113,113,0.12)';
    default:         return 'rgba(148,163,184,0.12)';
  }
}

export default async function RefereePaymentsPage() {
  const session = await auth();
  if (!session?.userId) redirect('/login?error=signin_required');

  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);

  if (!isRefereeToolsEnabled()) {
    return (
      <main style={{ padding: '24px 16px' }}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Payment Ledger</h1>
        <div style={{ background: 'rgba(255,184,28,0.08)', border: '1px solid rgba(255,184,28,0.3)', color: '#92400e', padding: '1rem', borderRadius: 8 }}>
          Referee tools are not yet enabled.
        </div>
      </main>
    );
  }

  const authz = await getAuthorizationContext(userId);
  if (!authz.isReferee) {
    return (
      <main style={{ padding: '24px 16px' }}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Payment Ledger</h1>
        <div style={{ background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.3)', color: '#1e3a8a', padding: '1rem', borderRadius: 8 }}>
          You need a Referee account type to view payments.
        </div>
      </main>
    );
  }

  let payments: Awaited<ReturnType<typeof refereeService.listPaymentsForReferee>> = [];
  try {
    payments = await refereeService.listPaymentsForReferee(userId, { limit: 200 });
  } catch (e) {
    console.error('[referee/payments] failed to load:', e);
  }

  const totalPaid = payments.filter((p) => p.status === 'paid').reduce((s, p) => s + Number(p.amount || 0), 0);
  const totalOwed = payments.filter((p) => p.status === 'owed' || p.status === 'pending').reduce((s, p) => s + Number(p.amount || 0), 0);

  return (
    <main style={{ padding: '24px 16px 64px', fontFamily: '-apple-system, system-ui, sans-serif', color: '#0f172a' }}>
      <div style={{ maxWidth: 920, margin: '0 auto' }}>
        <Link href="/dashboard/referee" style={{ fontSize: '0.85rem', color: '#64748b', textDecoration: 'underline' }}>
          ← Dashboard
        </Link>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.5rem 0 1rem 0' }}>
          Payment Ledger
        </h1>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <SummaryTile label="Total paid" value={`${payments[0]?.currency ?? 'PHP'} ${totalPaid.toFixed(2)}`} color="#059669" />
          <SummaryTile label="Outstanding" value={`${payments[0]?.currency ?? 'PHP'} ${totalOwed.toFixed(2)}`} color={totalOwed > 0 ? '#b91c1c' : '#475569'} />
        </div>

        {payments.length === 0 ? (
          <div style={{ padding: '1.5rem', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 8, color: '#64748b', textAlign: 'center', fontSize: '0.9rem' }}>
            No payment records yet. Once staff records a game fee, it'll appear here.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {payments.map((p) => (
              <div
                key={p.id}
                style={{
                  padding: '0.85rem 1rem',
                  background: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <div style={{ fontWeight: 600, fontSize: '1rem' }}>
                    {p.currency} {p.amount.toFixed(2)}
                  </div>
                  <span style={{
                    padding: '0.2rem 0.6rem',
                    background: statusBg(p.status),
                    color: statusColor(p.status),
                    borderRadius: 999,
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                  }}>
                    {p.status}
                  </span>
                </div>
                <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.25rem' }}>
                  {p.paidAt ? `Paid ${formatDateTime(p.paidAt)}` : `Created ${formatDateTime(p.createdAt)}`}
                  {p.paidVia && ` • ${p.paidVia}`}
                  {p.referenceNumber && ` • ref ${p.referenceNumber}`}
                </div>
                {p.notes && (
                  <div style={{ fontSize: '0.85rem', color: '#475569', marginTop: '0.5rem' }}>
                    {p.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function SummaryTile({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{
      padding: '1rem',
      background: '#fff',
      border: '1px solid #e2e8f0',
      borderRadius: 8,
      borderLeft: `4px solid ${color}`,
    }}>
      <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
        {label}
      </div>
      <div style={{ fontSize: '1.4rem', fontWeight: 700, marginTop: '0.25rem' }}>
        {value}
      </div>
    </div>
  );
}