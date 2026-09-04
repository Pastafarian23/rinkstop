// src/app/dashboard/manage/rink/[id]/equipment/page.tsx
//
// WS17 Equipment — Owner equipment inventory + rental management.
//
// Server component. Loads items + settings for the owner's rink.
// Passes to EquipmentClient for CRUD + rental flows.

import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import EquipmentClient from './EquipmentClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  active: { bg: 'rgba(74,222,128,0.15)', fg: '#86EFAC' },
  retired: { bg: 'rgba(148,163,184,0.15)', fg: '#94A3B8' },
  lost: { bg: 'rgba(251,191,36,0.15)', fg: '#FCD34D' },
  broken: { bg: 'rgba(200,16,46,0.15)', fg: '#FCA5A5' },
  lent: { bg: 'rgba(56,189,248,0.15)', fg: '#7DD3FC' },
};

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

const CONDITIONS: Record<string, string> = {
  new: 'New', excellent: 'Excellent', good: 'Good', worn: 'Worn',
  damaged: 'Damaged', needs_repair: 'Needs Repair',
};

interface EquipmentItem {
  id: string;
  label: string;
  type: string;
  brand: string | null;
  model: string | null;
  size: string | null;
  status: string;
  condition: string;
  acquired_at: string | null;
  acquired_price_cents: number | null;
  notes: string | null;
}

interface RentalRow {
  id: string;
  parent_user_id: string;
  item_id: string;
  equipment_items: { label: string; type: string; brand: string | null; model: string | null; size: string | null } | null;
  starts_at: string;
  ends_at: string | null;
  returned_at: string | null;
  status: string;
  deposit_required_cents: number;
  deposit_paid_cents: number;
  monthly_rate_cents: number;
  next_bill_at: string | null;
}

function formatPrice(cents: number | null, currency: string): string {
  if (!cents) return '—';
  return `${currency} ${(cents / 100).toFixed(2)}`;
}

export default async function OwnerEquipmentPage({ params }: PageProps) {
  const session = await auth();
  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);
  if (!session.userId) redirect('/login');
  const { id } = await params;

  // Owner check
  const { count: claimCount } = await supabaseAdmin
    .from('claims')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('claim_type', 'rink')
    .eq('entity_id', id)
    .eq('status', 'approved');

  if ((claimCount ?? 0) === 0) {
    return (
      <div style={{ maxWidth: 720, margin: '2rem auto', padding: '1.5rem', background: 'rgba(200,16,46,0.1)', border: '1px solid rgba(200,16,46,0.4)', borderRadius: 8, color: '#FF6B7A' }}>
        <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem' }}>Access denied</h2>
        <p style={{ margin: 0 }}>You must be an approved rink owner to access this page.</p>
      </div>
    );
  }

  // Load items
  const { data: items } = await supabaseAdmin
    .from('equipment_items')
    .select('*')
    .eq('owner_type', 'rink')
    .eq('owner_id', id)
    .order('created_at', { ascending: false });

  // Load active rentals
  const { data: rentals } = await supabaseAdmin
    .from('equipment_rentals')
    .select('*, equipment_items(label,type,brand,model,size)', { count: 'exact' })
    .eq('rink_id', id)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false })
    .limit(50);

  // Load settings
  const { data: settings } = await supabaseAdmin
    .from('rink_rental_settings')
    .select('*')
    .eq('rink_id', id)
    .maybeSingle();

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ margin: '0 0 0.25rem', fontSize: '1.5rem', color: 'var(--fg)' }}>Equipment & Rentals</h1>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Manage gear inventory, track rentals, and collect payments.
          </p>
        </div>
        <Link href={`/dashboard/manage/rink/${id}`} style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textDecoration: 'none' }}>
          ← Back to dashboard
        </Link>
      </div>

      <EquipmentClient
        rinkId={id}
        initialItems={(items ?? []) as EquipmentItem[]}
        initialRentals={(rentals ?? []) as RentalRow[]}
        initialSettings={settings}
        equipmentTypes={EQUIPMENT_TYPES}
        statusColors={STATUS_COLORS}
        rentalStatusColors={RENTAL_STATUS_COLORS}
        formatPrice={formatPrice}
      />
    </div>
  );
}
