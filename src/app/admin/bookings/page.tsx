/**
 * /admin/bookings
 *
 * Admin list view of all admin-arranged bookings. Arnel uses this to
 * track the pilot: see what's pending payment, what's been paid, what
 * needs settlement sent to the rink, what the rink has declined.
 *
 * Filters: status, payment_status, settlement_status
 * Phase 2: link to /admin/bookings/[id] for detail + settlement marker
 */

import { requireAdmin } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Bookings — Admin',
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: Promise<{
    status?: string;
    payment_status?: string;
    settlement_status?: string;
  }>;
}

function formatMoney(cents: number, currency: string): string {
  const symbol =
    currency.toUpperCase() === 'USD' ? '$' :
    currency.toUpperCase() === 'PHP' ? '₱' :
    currency.toUpperCase() === 'EUR' ? '€' :
    '';
  return `${symbol}${(cents / 100).toFixed(2)} ${currency.toUpperCase()}`;
}

function formatLocalTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-US', {
      timeZone: 'UTC',
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return iso;
  }
}

export default async function AdminBookingsListPage({ searchParams }: PageProps) {
  await requireAdmin();

  const sp = await searchParams;
  const statusFilter = sp.status;
  const paymentFilter = sp.payment_status;
  const settlementFilter = sp.settlement_status;

  let query = supabaseAdmin
    .from('admin_arranged_bookings')
    .select(`
      id, title, start_time, end_time,
      price_cents, fee_cents, settlement_cents, currency,
      payment_status, paid_at, status, settlement_status,
      settlement_sent_at, settlement_method, settlement_reference,
      created_at, buyer_contact_name, buyer_contact_email,
      rink:rinks(id, name, slug, country)
    `)
    .order('created_at', { ascending: false })
    .limit(200);

  if (statusFilter) query = query.eq('status', statusFilter);
  if (paymentFilter) query = query.eq('payment_status', paymentFilter);
  if (settlementFilter) query = query.eq('settlement_status', settlementFilter);

  const { data: bookings, error } = await query;

  if (error) {
    console.error('[admin/bookings] query failed', error);
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#041E42', margin: '0 0 0.25rem' }}>
            Admin bookings
          </h1>
          <p style={{ color: '#6b7280', fontSize: '0.9rem', margin: 0 }}>
            All admin-arranged bookings. {(bookings || []).length} shown.
          </p>
        </div>
        <Link
          href="/admin/bookings/new"
          style={{ padding: '0.5rem 1rem', background: '#C8102E', color: '#fff', borderRadius: 6, textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem' }}
        >
          + New booking
        </Link>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <FilterChip label="All" href="/admin/bookings" active={!statusFilter && !paymentFilter && !settlementFilter} />
        <FilterChip label="Pending payment" href="/admin/bookings?status=pending_payment" active={statusFilter === 'pending_payment'} />
        <FilterChip label="Paid" href="/admin/bookings?status=paid" active={statusFilter === 'paid'} />
        <FilterChip label="Confirmed" href="/admin/bookings?status=confirmed" active={statusFilter === 'confirmed'} />
        <FilterChip label="Declined" href="/admin/bookings?status=declined" active={statusFilter === 'declined'} />
        <FilterChip label="Completed" href="/admin/bookings?status=completed" active={statusFilter === 'completed'} />
        <FilterChip label="Cancelled" href="/admin/bookings?status=cancelled" active={statusFilter === 'cancelled'} />
        <span style={{ width: 1, background: '#e5e7eb', margin: '0 0.25rem' }} />
        <FilterChip label="Settlement: not_sent" href="/admin/bookings?settlement_status=not_sent" active={settlementFilter === 'not_sent'} />
        <FilterChip label="Settlement: sent" href="/admin/bookings?settlement_status=sent" active={settlementFilter === 'sent'} />
        <FilterChip label="Settlement: confirmed" href="/admin/bookings?settlement_status=confirmed" active={settlementFilter === 'confirmed'} />
      </div>

      {(!bookings || bookings.length === 0) ? (
        <div style={{ background: '#f7f7f8', border: '1px solid #e5e7eb', borderRadius: 8, padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
          <div style={{ fontWeight: 600, color: '#374151', marginBottom: '0.25rem' }}>No bookings</div>
          <div style={{ fontSize: '0.85rem' }}>Try clearing filters, or create a new booking above.</div>
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead style={{ background: '#f7f7f8', borderBottom: '1px solid #e5e7eb' }}>
              <tr>
                <th style={{ textAlign: 'left', padding: '0.75rem 1rem', color: '#6b7280', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Booking</th>
                <th style={{ textAlign: 'left', padding: '0.75rem 1rem', color: '#6b7280', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Rink</th>
                <th style={{ textAlign: 'left', padding: '0.75rem 1rem', color: '#6b7280', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Slot</th>
                <th style={{ textAlign: 'right', padding: '0.75rem 1rem', color: '#6b7280', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total</th>
                <th style={{ textAlign: 'right', padding: '0.75rem 1rem', color: '#6b7280', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Settlement</th>
                <th style={{ textAlign: 'left', padding: '0.75rem 1rem', color: '#6b7280', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Status</th>
                <th style={{ textAlign: 'left', padding: '0.75rem 1rem', color: '#6b7280', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Payment</th>
                <th style={{ textAlign: 'left', padding: '0.75rem 1rem', color: '#6b7280', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Settlement</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b: any) => (
                <tr key={b.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <div style={{ fontWeight: 600, color: '#041E42' }}>{b.title}</div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{b.buyer_contact_name} &lt;{b.buyer_contact_email}&gt;</div>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: '#374151' }}>
                    {b.rink?.name || '—'}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: '#374151', fontSize: '0.8rem' }}>
                    {formatLocalTime(b.start_time)}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 600, color: '#041E42' }}>
                    {formatMoney(b.price_cents, b.currency)}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right', color: '#374151' }}>
                    {formatMoney(b.settlement_cents, b.currency)}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <StatusPill value={b.status} />
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <StatusPill value={b.payment_status} />
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <StatusPill value={b.settlement_status} />
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                    <Link href={`/admin/bookings/${b.id}`} style={{ color: '#041E42', fontWeight: 600, fontSize: '0.85rem', textDecoration: 'underline' }}>
                      Open →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FilterChip({ label, href, active }: { label: string; href: string; active: boolean }) {
  return (
    <Link
      href={href}
      style={{
        padding: '0.35rem 0.75rem',
        borderRadius: 999,
        background: active ? '#041E42' : '#fff',
        color: active ? '#fff' : '#374151',
        border: '1px solid ' + (active ? '#041E42' : '#e5e7eb'),
        textDecoration: 'none',
        fontSize: '0.8rem',
        fontWeight: 500,
      }}
    >
      {label}
    </Link>
  );
}

function StatusPill({ value }: { value: string }) {
  const color = (() => {
    switch (value) {
      case 'pending_payment':
      case 'not_sent':
        return { bg: 'rgba(255,184,28,0.1)', fg: '#92400e' };
      case 'paid':
      case 'confirmed':
      case 'sent':
        return { bg: 'rgba(16,185,129,0.1)', fg: '#065f46' };
      case 'completed':
        return { bg: 'rgba(4,30,66,0.1)', fg: '#041E42' };
      case 'declined':
      case 'cancelled':
      case 'failed':
      case 'refunded':
        return { bg: 'rgba(200,16,46,0.1)', fg: '#991b1b' };
      default:
        return { bg: '#f7f7f8', fg: '#6b7280' };
    }
  })();
  return (
    <span style={{
      display: 'inline-block',
      padding: '0.15rem 0.5rem',
      borderRadius: 999,
      background: color.bg,
      color: color.fg,
      fontSize: '0.7rem',
      fontWeight: 700,
      letterSpacing: '0.02em',
    }}>
      {value.replace(/_/g, ' ')}
    </span>
  );
}