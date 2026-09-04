// src/app/dashboard/rentals/page.tsx
//
// Parent: view their kid's equipment rentals.
// Server component. Loads rentals + item details + payment status.

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import RentalsClient from './RentalsClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ rental_id?: string; checkout?: string }>;
}

const RENTAL_STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  pending: { bg: 'rgba(255,184,28,0.15)', fg: '#FCD34D' },
  active: { bg: 'rgba(74,222,128,0.15)', fg: '#86EFAC' },
  overdue: { bg: 'rgba(200,16,46,0.15)', fg: '#FCA5A5' },
  returned: { bg: 'rgba(148,163,184,0.15)', fg: '#94A3B8' },
  cancelled: { bg: 'rgba(148,163,184,0.15)', fg: '#94A3B8' },
};

const EQUIPMENT_TYPES: Record<string, string> = {
  skates: 'Skates', stick: 'Stick', helmet: 'Helmet', gloves: 'Gloves',
  pants: 'Pants', shin_pads: 'Shin Pads', shoulder_pads: 'Shoulder Pads',
  elbow_pads: 'Elbow Pads', jersey: 'Jersey', sock: 'Sock', puck: 'Puck',
  cones: 'Cones', goal: 'Goal', net: 'Net', bag: 'Bag',
  water_bottle: 'Water Bottle', tape: 'Tape', mouthguard: 'Mouthguard',
  skate_sharpener: 'Skate Sharpener', other: 'Other',
};

function formatPrice(cents: number | null, currency: string): string {
  if (!cents) return '—';
  return `${currency} ${(cents / 100).toFixed(2)}`;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
  catch { return '—'; }
}

export default async function ParentRentalsPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.userId) redirect('/login');
  const userId = await resolveCanonicalUserId(session.userId, '');
  const sp = await searchParams;

  // Load rentals with embedded item info
  const { data: rentals } = await supabaseAdmin
    .from('equipment_rentals')
    .select('*, equipment_items!inner(label,type,brand,model,size)', { count: 'exact' })
    .eq('parent_user_id', userId)
    .order('created_at', { ascending: false });

  // Load payments for these rentals
  const rentalIds = (rentals ?? []).map((r: any) => r.id);
  const paymentsResult: { data: any[] | null } = rentalIds.length > 0
    ? await supabaseAdmin
        .from('rental_payments')
        .select('*')
        .in('rental_id', rentalIds)
        .order('created_at', { ascending: false })
    : { data: [] };
  const payments = paymentsResult.data ?? [];

  // Group payments by rental_id
  const paymentsByRental: Record<string, any[]> = {};
  for (const p of (payments ?? []) as any[]) {
    if (!paymentsByRental[p.rental_id]) paymentsByRental[p.rental_id] = [];
    paymentsByRental[p.rental_id].push(p);
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ margin: '0 0 0.25rem', fontSize: '1.5rem', color: 'var(--fg)' }}>My Rentals</h1>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Equipment your kid is renting. Pay deposits and monthly fees here.
          </p>
        </div>
        <Link href="/dashboard" style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textDecoration: 'none' }}>
          ← Back to dashboard
        </Link>
      </div>

      {sp.checkout === 'success' && (
        <div style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.4)', color: '#86EFAC', padding: '1rem', borderRadius: 8, marginBottom: '1rem', fontSize: '0.9rem' }}>
          ✓ Payment received. Your rental will be activated once confirmed by Stripe (usually instant).
        </div>
      )}
      {sp.checkout === 'cancelled' && (
        <div style={{ background: 'rgba(255,184,28,0.1)', border: '1px solid rgba(255,184,28,0.4)', color: '#FCD34D', padding: '1rem', borderRadius: 8, marginBottom: '1rem', fontSize: '0.9rem' }}>
          Checkout cancelled. No payment was charged.
        </div>
      )}

      <RentalsClient
        rentals={(rentals ?? []) as any[]}
        paymentsByRental={paymentsByRental}
        rentalStatusColors={RENTAL_STATUS_COLORS}
        equipmentTypes={EQUIPMENT_TYPES}
        formatPrice={formatPrice}
        formatDate={formatDate}
      />
    </div>
  );
}
