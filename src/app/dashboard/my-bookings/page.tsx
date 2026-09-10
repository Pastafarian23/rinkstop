/**
 * /dashboard/my-bookings
 *
 * Buyer-side view of admin-arranged bookings. Lists bookings the signed-in
 * user is the buyer on. (RLS already restricts to buyer_user_id = auth.uid(),
 * so the supabaseAdmin SELECT here is defense-in-depth.)
 *
 * Phase 1 of the Cebu Ice Datus ↔ SM Seaside Skating pilot (and any future
 * admin-arranged booking). Shows:
 *   - Booking title + rink name + slot time + price + fee + settlement
 *   - Payment status (pending/paid/failed) + paid_at
 *   - Stripe payment URL (clickable if still pending)
 *   - Booking status (pending_payment/paid/confirmed/completed/cancelled)
 *   - Notes from buyer (if any)
 *
 * Access: Clerk session + the user is the buyer on at least one row. RLS
 * means anon + non-buyer users get empty result sets, not 403.
 */

import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import { resolveCanonicalUserId } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'My bookings — RinkStop',
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: Promise<{ paid?: string; cancelled?: string; booking?: string }>;
}

function formatMoney(cents: number, currency: string): string {
  const symbol =
    currency.toUpperCase() === 'USD' ? '$' :
    currency.toUpperCase() === 'PHP' ? '₱' :
    currency.toUpperCase() === 'EUR' ? '€' :
    currency.toUpperCase() === 'GBP' ? '£' :
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

export default async function MyBookingsPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session.userId) redirect('/login?next=/dashboard/my-bookings');

  const cu = await currentUser();
  const email = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, email);

  const sp = await searchParams;
  const justPaid = sp.paid === '1';
  const justCancelled = sp.cancelled === '1';

  // RLS allows buyer_user_id = auth.uid()::text. supabaseAdmin bypasses RLS,
  // so we filter explicitly. Defense-in-depth: even if RLS drifts, this stays
  // scoped to the current user.
  const { data: bookings, error } = await supabaseAdmin
    .from('admin_arranged_bookings')
    .select(`
      id, title, notes, start_time, end_time,
      price_cents, fee_cents, settlement_cents, currency,
      payment_status, paid_at, status, created_at,
      payment_intent_id,
      rink:rinks(id, name, slug, city, country)
    `)
    .eq('buyer_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('[my-bookings] query failed', error);
  }

  return (
    <div style={{ maxWidth: 800 }}>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#041E42', margin: '0 0 0.5rem' }}>
        My bookings
      </h1>
      <p style={{ color: '#6b7280', fontSize: '0.9rem', margin: '0 0 1.5rem' }}>
        Bookings arranged by RinkStop on your behalf. Pay the link to confirm; we'll handle the agreement.
      </p>

      {justPaid && (
        <div style={{ background: '#ecfdf5', border: '1px solid #10b981', borderRadius: 8, padding: '1rem', color: '#065f46', marginBottom: '1rem' }}>
          <strong>Payment received.</strong> Your booking will move to confirmed once the rink acknowledges.
        </div>
      )}
      {justCancelled && (
        <div style={{ background: '#fffbeb', border: '1px solid #FFB81C', borderRadius: 8, padding: '1rem', color: '#92400e', marginBottom: '1rem' }}>
          Payment cancelled. Your booking is still pending — reopen the payment link below to confirm.
        </div>
      )}

      {!bookings || bookings.length === 0 ? (
        <div style={{ background: '#f7f7f8', border: '1px solid #e5e7eb', borderRadius: 8, padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📋</div>
          <div style={{ fontWeight: 600, color: '#374151', marginBottom: '0.25rem' }}>No bookings yet</div>
          <div style={{ fontSize: '0.85rem' }}>
            When RinkStop brokers a booking for you, it'll show up here.
          </div>
          <div style={{ marginTop: '1rem' }}>
            <Link href="/dashboard" style={{ color: '#041E42', textDecoration: 'underline' }}>← Back to dashboard</Link>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {bookings.map((b: any) => {
            const tz = b.rink?.country === 'Philippines' ? 'Asia/Manila' : 'UTC';
            const startLocal = formatLocalTime(b.start_time, tz);
            const endLocal = formatLocalTime(b.end_time, tz);
            const isPending = b.payment_status === 'pending_payment';
            return (
              <div
                key={b.id}
                style={{
                  background: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                  padding: '1.25rem',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '1rem', marginBottom: '0.75rem' }}>
                  <div>
                    <div style={{ fontWeight: 700, color: '#041E42', fontSize: '1.05rem' }}>
                      {b.title}
                    </div>
                    <div style={{ color: '#6b7280', fontSize: '0.85rem', marginTop: 2 }}>
                      {b.rink?.name}{b.rink?.city ? ` · ${b.rink.city}` : ''}{b.rink?.country ? ` · ${b.rink.country}` : ''}
                    </div>
                  </div>
                  <StatusBadge status={b.status} paymentStatus={b.payment_status} />
                </div>

                <div style={{ background: '#EEF5FF', borderRadius: 6, padding: '0.75rem 1rem', marginBottom: '0.75rem', fontSize: '0.9rem' }}>
                  <div><strong>Slot:</strong> {startLocal} – {endLocal}</div>
                  <div><strong>Total:</strong> {formatMoney(b.price_cents, b.currency)} (includes RinkStop fee {formatMoney(b.fee_cents, b.currency)})</div>
                </div>

                {b.notes && (
                  <div style={{ background: '#fffbeb', borderLeft: '3px solid #FFB81C', padding: '0.5rem 0.75rem', marginBottom: '0.75rem', fontSize: '0.85rem' }}>
                    {b.notes}
                  </div>
                )}

                {isPending && b.payment_intent_id && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <Link
                      href={`https://checkout.stripe.com/c/pay/${b.payment_intent_id}`}
                      style={{
                        display: 'inline-block',
                        padding: '0.5rem 1rem',
                        background: '#C8102E',
                        color: '#fff',
                        textDecoration: 'none',
                        borderRadius: 6,
                        fontWeight: 600,
                        fontSize: '0.9rem',
                      }}
                    >
                      Pay now →
                    </Link>
                    <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                      Session id: <code>{b.payment_intent_id}</code>
                    </div>
                  </div>
                )}

                <div style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: '0.75rem' }}>
                  Booking ID: <code>{b.id}</code>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status, paymentStatus }: { status: string; paymentStatus: string }) {
  if (status === 'pending_payment') {
    return <Badge color="#FFB81C" bg="rgba(255,184,28,0.1)" label="Awaiting payment" />;
  }
  if (status === 'paid' || paymentStatus === 'paid') {
    return <Badge color="#10b981" bg="rgba(16,185,129,0.1)" label="Paid" />;
  }
  if (status === 'confirmed') {
    return <Badge color="#041E42" bg="rgba(4,30,66,0.1)" label="Confirmed" />;
  }
  if (status === 'completed') {
    return <Badge color="#041E42" bg="rgba(4,30,66,0.1)" label="Completed" />;
  }
  if (status === 'cancelled') {
    return <Badge color="#C8102E" bg="rgba(200,16,46,0.1)" label="Cancelled" />;
  }
  if (status === 'declined') {
    return <Badge color="#C8102E" bg="rgba(200,16,46,0.1)" label="Declined by rink" />;
  }
  return <Badge color="#6b7280" bg="#f7f7f8" label={status} />;
}

function Badge({ color, bg, label }: { color: string; bg: string; label: string }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '0.25rem 0.75rem',
      borderRadius: 999,
      background: bg,
      color,
      fontSize: '0.75rem',
      fontWeight: 700,
      letterSpacing: '0.02em',
    }}>
      {label}
    </span>
  );
}