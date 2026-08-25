// src/app/dashboard/manage/rink/[id]/staff/page.tsx
//
// WS17 PR4 Phase 2A — Rink staff management page.
//
// Server component. Lists all rink_employees for the rink. Supports add/remove
// via the staff API (POST/DELETE via client component below).

import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import StaffClient from './StaffClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

const ROLE_LABELS: Record<string, string> = {
  coach: 'Coach',
  instructor: 'Instructor',
  lifeguard: 'Lifeguard',
  ice_operator: 'Ice Operator',
  front_desk: 'Front Desk',
  manager: 'Manager',
  other: 'Other',
};

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  active: { bg: 'rgba(56,189,248,0.15)', fg: '#7DD3FC' },
  inactive: { bg: 'rgba(255,184,28,0.15)', fg: '#FCD34D' },
  terminated: { bg: 'rgba(239,68,68,0.15)', fg: '#FCA5A5' },
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default async function StaffPage({ params }: PageProps) {
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

  if (!claimCount) {
    return (
      <div style={{ maxWidth: 720 }}>
        <div style={{ background: 'rgba(255,184,28,0.08)', border: '1px solid rgba(255,184,28,0.3)', color: '#FFB81C', padding: '1rem 1.25rem', borderRadius: 8, fontSize: '0.9rem' }}>
          You don&rsquo;t have an approved claim for this rink.
        </div>
        <Link href="/dashboard/claims" style={{ display: 'inline-block', marginTop: '1rem', color: '#14B8A6' }}>← Back to claims</Link>
      </div>
    );
  }

  // Load rink
  const { data: rink } = await supabaseAdmin
    .from('rinks')
    .select('id, name')
    .eq('id', id)
    .maybeSingle();

  // Load staff
  const { data: staff, error } = await supabaseAdmin
    .from('rink_employees')
    .select('id, rink_id, user_id, name, email, phone, role, status, hire_date, hourly_rate_cents, bio, photo_url, created_at, updated_at')
    .eq('rink_id', id)
    .order('created_at', { ascending: true });

  if (error) console.error('[staff-page] load failed', error);

  const rows = staff ?? [];

  return (
    <div style={{ maxWidth: 960 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <Link href={`/dashboard/manage/rink/${id}`} style={{ fontSize: '0.85rem', color: '#94A3B8', textDecoration: 'none' }}>
            ← {rink?.name || 'Rink'} dashboard
          </Link>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#fff', marginTop: '0.25rem' }}>Staff</h1>
          <p style={{ fontSize: '0.9rem', color: '#94A3B8', marginTop: '0.25rem' }}>
            Employees and contracted coaches at {rink?.name || 'this rink'}.
          </p>
        </div>
      </div>

      <StaffClient rinkId={id} rinkName={rink?.name || ''} initialStaff={rows} />

      <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
        <Link href={`/dashboard/manage/rink/${id}`} style={{ color: '#94A3B8', fontSize: '0.85rem', textDecoration: 'none' }}>
          ← Back to rink dashboard
        </Link>
      </div>
    </div>
  );
}
