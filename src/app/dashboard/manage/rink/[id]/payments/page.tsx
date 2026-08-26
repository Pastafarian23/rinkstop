// src/app/dashboard/manage/rink/[id]/payments/page.tsx
//
// WS17 PR4 Phase 2B - Rink payment dashboard.
// Shows Stripe Connect status + booking earnings.

import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

async function getRinkPayments(rinkId: string) {
  const { data: bookings } = await supabaseAdmin
    .from('booking_requests')
    .select('id, status, payment_status, counter_price_cents, paid_at, requested_start, requested_end, listing:ice_listings(id, title)')
    .eq('rink_id', rinkId)
    .in('status', ['confirmed', 'completed', 'paid'])
    .order('paid_at', { ascending: false })
    .limit(50);

  return bookings || [];
}

async function getRinkOwner(rinkId: string) {
  const { data } = await supabaseAdmin
    .from('rink_owners')
    .select('stripe_account_id, stripe_onboarding_complete, stripe_onboarding_started_at')
    .eq('rink_id', rinkId)
    .maybeSingle();

  return data;
}

export default async function RinkPaymentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) {
    redirect('/sign-in');
  }

  const { id: rinkId } = await params;

  // Verify rink ownership
  const { data: claim } = await supabaseAdmin
    .from('claims')
    .select('id')
    .eq('entity_id', rinkId)
    .eq('claim_type', 'rink')
    .eq('user_id', userId)
    .eq('status', 'approved')
    .maybeSingle();

  if (!claim) {
    redirect('/dashboard');
  }

  const [bookings, rinkOwner] = await Promise.all([
    getRinkPayments(rinkId),
    getRinkOwner(rinkId),
  ]);

  const isOnboarded = rinkOwner?.stripe_onboarding_complete && !!rinkOwner?.stripe_account_id;

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Payments & Earnings</h1>

      {/* Stripe Connect Status */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Stripe Connect Status</h2>

        {!isOnboarded ? (
          <div>
            <p className="text-gray-600 mb-4">
              Connect a Stripe account to receive payments for ice rentals.
              RinkStop handles all KYC, banking, and tax forms through Stripe&apos;s
              hosted onboarding flow. You never share SSN or bank details with RinkStop.
            </p>
            <form action="/api/rink-connections/stripe/onboard" method="POST">
              <input type="hidden" name="rinkId" value={rinkId} />
              <button
                type="submit"
                className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700"
              >
                Connect with Stripe
              </button>
            </form>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="inline-block w-3 h-3 bg-green-500 rounded-full"></span>
              <span className="text-green-700 font-medium">Connected</span>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Account ID: <code className="bg-gray-100 px-2 py-1 rounded">{rinkOwner?.stripe_account_id}</code>
            </p>
            <a
              href={`https://dashboard.stripe.com/connect/accounts/${rinkOwner?.stripe_account_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:text-indigo-800 underline text-sm"
            >
              View Stripe Dashboard →
            </a>
          </div>
        )}
      </div>

      {/* Earnings Summary */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Booking Earnings</h2>

        {bookings.length === 0 ? (
          <p className="text-gray-500">No paid bookings yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Date</th>
                  <th className="text-left py-2">Ice Slot</th>
                  <th className="text-right py-2">Amount</th>
                  <th className="text-center py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking: any) => (
                  <tr key={booking.id} className="border-b">
                    <td className="py-3">
                      {booking.paid_at ? new Date(booking.paid_at).toLocaleDateString() : '-'}
                    </td>
                    <td className="py-3">
                      {(booking.listing as any)?.title || 'Ice Time'}
                    </td>
                    <td className="py-3 text-right">
                      ${((booking.counter_price_cents || 0) / 100).toFixed(2)}
                    </td>
                    <td className="py-3 text-center">
                      <span className={`px-2 py-1 rounded text-xs ${
                        booking.payment_status === 'paid'
                          ? 'bg-green-100 text-green-800'
                          : booking.payment_status === 'refunded'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {booking.payment_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
