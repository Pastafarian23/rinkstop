/**
 * /admin/bookings/new
 *
 * Admin form to create an admin-arranged booking on behalf of a buyer + rink.
 * Used by Arnel (and any future admin) to broker ice-time bookings through
 * RinkStop for the Cebu Ice Datus ↔ SM Seaside Skating pilot (and any future
 * brokered booking).
 *
 * Access: requireAdmin() — gated by /admin/layout.tsx.
 *
 * UX:
 *   - Server-renders rink dropdown + buyer team dropdown from DB
 *   - Client form (NewBookingForm) collects the slot details + buyer contact
 *   - POSTs to /api/admin/bookings which creates the Stripe checkout session
 *     + row + emails
 *   - On success, shows the payment URL + bookingId for Arnel to copy/paste
 */

import { requireAdmin } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';
import NewBookingForm from './NewBookingForm';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'New booking — Admin',
  robots: { index: false, follow: false },
};

export default async function NewBookingPage() {
  await requireAdmin();

  // Load rinks (active only) + team_workspaces for the dropdowns.
  // 1000-row cap is fine — pilot has 1,917 rinks but most are inactive.
  const [{ data: rinks }, { data: teams }] = await Promise.all([
    supabaseAdmin
      .from('rinks')
      .select('id, name, slug, city, country')
      .eq('is_active', true)
      .order('name')
      .limit(2000),
    supabaseAdmin
      .from('team_workspaces')
      .select('id, name, slug, home_city, country')
      .eq('is_active', true)
      .order('name')
      .limit(2000),
  ]);

  return (
    <div style={{ maxWidth: 720 }}>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#041E42', margin: '0 0 0.5rem' }}>
        New admin-arranged booking
      </h1>
      <p style={{ color: '#6b7280', fontSize: '0.9rem', margin: '0 0 1.5rem', lineHeight: 1.5 }}>
        Broker an ice-time booking on behalf of a buyer. RinkStop handles payment + agreement;
        you settle with the rink offline. For the Cebu Ice Datus ↔ SM Seaside pilot.
      </p>
      <NewBookingForm
        rinks={(rinks || []).map((r: any) => ({
          id: r.id,
          name: r.name,
          slug: r.slug,
          city: r.city,
          country: r.country,
        }))}
        teams={(teams || []).map((t: any) => ({
          id: t.id,
          name: t.name,
          slug: t.slug,
          home_city: t.home_city,
          country: t.country,
        }))}
      />
    </div>
  );
}