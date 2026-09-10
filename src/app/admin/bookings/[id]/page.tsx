/**
 * /admin/bookings/[id]
 *
 * Admin detail view for a single admin-arranged booking. Arnel uses this
 * to:
 *   - See full booking details (buyer contact, slot, price breakdown)
 *   - Mark settlement as "sent" once he wires the rink the money offline
 *     (bank transfer / GCash reference recorded here)
 *   - Cancel a booking if the buyer pulls out
 *
 * Phase 2 of the ice-marketplace MVP. Settlement tracker is the missing
 * piece — once this lands, the broker flow is complete end-to-end:
 *   create → buyer pays → rink confirms → slot happens → Arnel settles → done
 *
 * Auth: requireAdmin()
 */

import { requireAdmin } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import SettlementForm from './SettlementForm';
import CancelButton from './CancelButton';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Booking detail — Admin',
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ id: string }>;
}

function formatMoney(cents: number, currency: string): string {
  const symbol =
    currency.toUpperCase() === 'USD' ? '$' :
    currency.toUpperCase() === 'PHP' ? '₱' :
    currency.toUpperCase() === 'EUR' ? '€' :
    '';
  return `${symbol}${(cents / 100).toFixed(2)} ${currency.toUpperCase()}`;
}

function formatLocalTime(iso: string, tz: string): string {
  try {
    return new Date(iso).toLocaleString('en-US', {
      timeZone: tz,
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

export default async function AdminBookingDetailPage({ params }: PageProps) {
  await requireAdmin();
  const { id } = await params;

  const { data: booking, error } = await supabaseAdmin
    .from('admin_arranged_bookings')
    .select(`
      id, title, notes, start_time, end_time,
      price_cents, fee_cents, settlement_cents, currency,
      payment_status, paid_at, payment_intent_id, payment_processor,
      status, cancelled_reason, cancelled_by_user_id,
      settlement_status, settlement_method, settlement_sent_at, settlement_reference,
      created_at, created_by,
      buyer_user_id, buyer_contact_name, buyer_contact_email, buyer_contact_phone,
      buyer_team_workspace_id,
      rink:rinks(id, name, slug, country, phone, email, website_url, google_phone)
    `)
    .eq('id', id)
    .maybeSingle();

  if (error || !booking) {
    return (
      <div style={{ maxWidth: 720 }}>
        <div style={{ background: 'rgba(200,16,46,0.1)', border: '1px solid #C8102E', borderRadius: 8, padding: '1.5rem', color: '#991b1b' }}>
          <strong>Booking not found.</strong>
        </div>
        <Link href="/admin/bookings" style={{ display: 'inline-block', marginTop: '1rem', color: '#041E42' }}>← Back to bookings</Link>
      </div>
    );
  }

  const rink = booking.rink as any;
  const tz = rink?.country === 'Philippines' ? 'Asia/Manila' : 'UTC';
  const startLocal = formatLocalTime(booking.start_time, tz);
  const endLocal = formatLocalTime(booking.end_time, tz);

  // Determine if settlement can be marked (booking is paid/confirmed/completed AND settlement not already confirmed)
  const canMarkSettlement = (
    (booking.status === 'paid' || booking.status === 'confirmed' || booking.status === 'completed') &&
    booking.settlement_status !== 'confirmed'
  );

  const canCancel = (
    booking.status !== 'cancelled' &&
    booking.status !== 'completed' &&
    booking.status !== 'refunded'
  );

  return (
    <div style={{ maxWidth: 800 }}>
      <Link href="/admin/bookings" style={{ color: '#14B8A6', fontSize: '0.85rem', textDecoration: 'none' }}>
        ← All bookings
      </Link>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#041E42', margin: '0.25rem 0 0.25rem' }}>
        {booking.title}
      </h1>
      <div style={{ color: '#6b7280', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
        Booking ID: <code>{booking.id}</code>
      </div>

      {/* Status overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <StatusCard label="Booking status" value={booking.status} />
        <StatusCard label="Payment status" value={booking.payment_status} />
        <StatusCard label="Settlement status" value={booking.settlement_status} />
      </div>

      {/* Slot + price section */}
      <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '1.25rem', marginBottom: '1rem' }}>
        <h2 style={{ margin: '0 0 0.75rem', fontSize: '1.05rem', fontWeight: 700, color: '#041E42' }}>Slot</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.9rem' }}>
          <div><strong>Start:</strong> {startLocal}</div>
          <div><strong>End:</strong> {endLocal}</div>
        </div>
        {booking.notes && (
          <div style={{ marginTop: '0.75rem', background: '#fffbeb', borderLeft: '3px solid #FFB81C', padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}>
            <strong>Notes:</strong> {booking.notes}
          </div>
        )}
      </section>

      {/* Money section */}
      <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '1.25rem', marginBottom: '1rem' }}>
        <h2 style={{ margin: '0 0 0.75rem', fontSize: '1.05rem', fontWeight: 700, color: '#041E42' }}>Money</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', fontSize: '0.9rem' }}>
          <div>
            <div style={{ color: '#6b7280', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total (buyer pays)</div>
            <div style={{ fontWeight: 700, color: '#041E42', fontSize: '1.05rem' }}>{formatMoney(booking.price_cents, booking.currency)}</div>
          </div>
          <div>
            <div style={{ color: '#6b7280', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>RinkStop fee</div>
            <div style={{ fontWeight: 700, color: '#041E42', fontSize: '1.05rem' }}>{formatMoney(booking.fee_cents, booking.currency)}</div>
          </div>
          <div>
            <div style={{ color: '#6b7280', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Rink receives</div>
            <div style={{ fontWeight: 700, color: '#041E42', fontSize: '1.05rem' }}>{formatMoney(booking.settlement_cents, booking.currency)}</div>
          </div>
        </div>
        {booking.payment_intent_id && (
          <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#6b7280' }}>
            <strong>Payment reference:</strong> <code>{booking.payment_intent_id}</code>
            {booking.payment_processor && ` · ${booking.payment_processor}`}
          </div>
        )}
      </section>

      {/* Buyer section */}
      <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '1.25rem', marginBottom: '1rem' }}>
        <h2 style={{ margin: '0 0 0.75rem', fontSize: '1.05rem', fontWeight: 700, color: '#041E42' }}>Buyer</h2>
        <div style={{ fontSize: '0.9rem' }}>
          <div><strong>{booking.buyer_contact_name}</strong></div>
          <div style={{ color: '#374151' }}>
            <a href={`mailto:${booking.buyer_contact_email}`} style={{ color: '#041E42' }}>{booking.buyer_contact_email}</a>
          </div>
          {booking.buyer_contact_phone && <div>{booking.buyer_contact_phone}</div>}
          {booking.buyer_team_workspace_id && (
            <div style={{ marginTop: '0.5rem', color: '#6b7280', fontSize: '0.8rem' }}>
              Team workspace: <code>{booking.buyer_team_workspace_id}</code>
            </div>
          )}
        </div>
      </section>

      {/* Rink section */}
      <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '1.25rem', marginBottom: '1rem' }}>
        <h2 style={{ margin: '0 0 0.75rem', fontSize: '1.05rem', fontWeight: 700, color: '#041E42' }}>Rink</h2>
        <div style={{ fontSize: '0.9rem' }}>
          <div><strong>{rink?.name || '—'}</strong></div>
          {rink?.slug && (
            <div style={{ color: '#6b7280', fontSize: '0.8rem' }}>
              <Link href={`/directory/rinks/${rink.slug}`} target="_blank" style={{ color: '#041E42' }}>
                /directory/rinks/{rink.slug} →
              </Link>
            </div>
          )}
          {/* Rink contact info — only visible to admins (here), NOT shown on public listing */}
          {(rink?.phone || rink?.email || rink?.website_url || rink?.google_phone) && (
            <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: '#fffbeb', border: '1px solid #FFB81C', borderRadius: 6, fontSize: '0.85rem' }}>
              <div style={{ fontWeight: 600, color: '#92400e', marginBottom: '0.25rem' }}>Contact for forward (admin-only):</div>
              {rink.phone && <div>📞 <code>{rink.phone}</code></div>}
              {rink.google_phone && <div>📞 Google: <code>{rink.google_phone}</code></div>}
              {rink.email && <div>✉️ <code>{rink.email}</code></div>}
              {rink.website_url && <div>🌐 <a href={rink.website_url} target="_blank" rel="noopener noreferrer">{rink.website_url}</a></div>}
            </div>
          )}
        </div>
      </section>

      {/* Settlement form (Phase 2 — the missing piece) */}
      {canMarkSettlement && (
        <section style={{ background: '#EEF5FF', border: '2px solid #041E42', borderRadius: 8, padding: '1.25rem', marginBottom: '1rem' }}>
          <h2 style={{ margin: '0 0 0.75rem', fontSize: '1.05rem', fontWeight: 700, color: '#041E42' }}>Settlement tracker</h2>
          <p style={{ margin: '0 0 0.75rem', fontSize: '0.85rem', color: '#374151' }}>
            Once you've sent the rink their {formatMoney(booking.settlement_cents, booking.currency)} offline (bank transfer / GCash / etc.), mark it sent and record the reference.
          </p>
          <SettlementForm bookingId={booking.id} currentStatus={booking.settlement_status} />
        </section>
      )}

      {/* Show settlement info if already marked */}
      {booking.settlement_status !== 'not_sent' && (
        <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '1.25rem', marginBottom: '1rem' }}>
          <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.05rem', fontWeight: 700, color: '#041E42' }}>Settlement log</h2>
          <div style={{ fontSize: '0.9rem' }}>
            <div><strong>Status:</strong> {booking.settlement_status}</div>
            {booking.settlement_method && <div><strong>Method:</strong> {booking.settlement_method}</div>}
            {booking.settlement_sent_at && <div><strong>Sent at:</strong> {new Date(booking.settlement_sent_at).toLocaleString()}</div>}
            {booking.settlement_reference && <div><strong>Reference:</strong> <code>{booking.settlement_reference}</code></div>}
          </div>
        </section>
      )}

      {/* Cancel button */}
      {canCancel && (
        <section style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(200,16,46,0.04)', border: '1px solid rgba(200,16,46,0.2)', borderRadius: 8 }}>
          <CancelButton bookingId={booking.id} />
        </section>
      )}

      {/* Footer audit info */}
      <div style={{ marginTop: '2rem', padding: '0.75rem 1rem', background: '#f7f7f8', borderRadius: 6, fontSize: '0.75rem', color: '#6b7280' }}>
        <div>Created: {new Date(booking.created_at).toLocaleString()}</div>
        <div>Created by: <code>{booking.created_by}</code></div>
        {booking.paid_at && <div>Paid at: {new Date(booking.paid_at).toLocaleString()}</div>}
      </div>
    </div>
  );
}

function StatusCard({ label, value }: { label: string; value: string }) {
  const color = (() => {
    switch (value) {
      case 'pending_payment':
      case 'not_sent':
        return { bg: 'rgba(255,184,28,0.1)', fg: '#92400e', border: '#FFB81C' };
      case 'paid':
      case 'confirmed':
      case 'sent':
        return { bg: 'rgba(16,185,129,0.1)', fg: '#065f46', border: '#10b981' };
      case 'completed':
      case 'confirmed':
        return { bg: 'rgba(4,30,66,0.1)', fg: '#041E42', border: '#041E42' };
      case 'declined':
      case 'cancelled':
      case 'failed':
      case 'refunded':
        return { bg: 'rgba(200,16,46,0.1)', fg: '#991b1b', border: '#C8102E' };
      default:
        return { bg: '#f7f7f8', fg: '#6b7280', border: '#e5e7eb' };
    }
  })();
  return (
    <div style={{ background: color.bg, border: `1px solid ${color.border}`, borderRadius: 8, padding: '0.75rem 1rem' }}>
      <div style={{ fontSize: '0.7rem', color: color.fg, textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: color.fg, marginTop: '0.25rem' }}>{value.replace(/_/g, ' ')}</div>
    </div>
  );
}