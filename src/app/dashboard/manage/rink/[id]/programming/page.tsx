// src/app/dashboard/manage/rink/[id]/programming/page.tsx
//
// WS17 PR3a - Owner programming list page.
//
// Server component. Loads the owner's programming rows via the owner
// API (which itself enforces rinks.claimed_by_user_id = auth.uid()).
// Groups by day_of_week (Sunday → Saturday) for display.

import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import { resolveCanonicalUserId } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'] as const;

const SKILL_LABELS: Record<string, string> = {
  all: 'All levels',
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  elite: 'Elite',
};

const GENDER_LABELS: Record<string, string> = {
  all: 'All genders',
  boys: 'Boys',
  girls: 'Girls',
  men: 'Men',
  women: 'Women',
  coed: 'Coed',
};

interface ProgrammingRow {
  id: string;
  rink_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  activity_type: string;
  skill_level: string;
  gender: string;
  age_min: number | null;
  age_max: number | null;
  price_cents: number | null;
  currency: string;
  capacity: number | null;
  description: string | null;
  gear_rules: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

function formatPrice(cents: number | null, currency: string): string {
  if (cents === null) return 'Free';
  return `${currency} ${(cents / 100).toFixed(2)}`;
}

function formatAgeRange(min: number | null, max: number | null): string {
  if (min === null && max === null) return '';
  if (min !== null && max !== null) return `Ages ${min}–${max}`;
  if (min !== null) return `Ages ${min}+`;
  return `Up to age ${max}`;
}

export default async function OwnerProgrammingPage({ params }: PageProps) {
  const session = await auth();
  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);
  if (!session.userId) redirect('/login');
  const { id } = await params;

  // Owner check: confirm caller has approved claim on this rink.
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

  // Load rink name for the page header.
  const { data: rink } = await supabaseAdmin
    .from('rinks')
    .select('id, name')
    .eq('id', id)
    .maybeSingle();

  // Load all programming for this rink (any status — archived shown for transparency).
  const { data: programming, error } = await supabaseAdmin
    .from('rink_programming')
    .select('id, rink_id, day_of_week, start_time, end_time, activity_type, skill_level, gender, age_min, age_max, price_cents, currency, capacity, description, gear_rules, status, created_at, updated_at')
    .eq('rink_id', id)
    .order('day_of_week', { ascending: true })
    .order('start_time', { ascending: true });

  if (error) {
    console.error('[owner-programming-page] load failed', error);
  }

  const rows = (programming ?? []) as ProgrammingRow[];

  // Group by day_of_week
  const grouped: Record<number, ProgrammingRow[]> = {};
  for (const r of rows) {
    if (!grouped[r.day_of_week]) grouped[r.day_of_week] = [];
    grouped[r.day_of_week].push(r);
  }

  const archivedCount = rows.filter(r => r.status === 'archived').length;
  const publishedCount = rows.filter(r => r.status === 'published').length;
  const draftCount = rows.filter(r => r.status === 'draft').length;

  return (
    <div style={{ maxWidth: 960 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <Link href={`/dashboard/manage/rink/${id}`} style={{ fontSize: '0.85rem', color: '#94A3B8', textDecoration: 'none' }}>
            ← {rink?.name || 'Rink'} dashboard
          </Link>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#fff', marginTop: '0.25rem' }}>Programming</h1>
          <p style={{ fontSize: '0.9rem', color: '#94A3B8', marginTop: '0.25rem' }}>
            Recurring weekly schedule for {rink?.name || 'this rink'}.
          </p>
        </div>
        <Link
          href={`/dashboard/manage/rink/${id}/programming/new`}
          style={{ display: 'inline-block', background: '#38BDF8', color: '#0F172A', padding: '0.625rem 1.125rem', borderRadius: 8, fontWeight: 600, textDecoration: 'none', fontSize: '0.875rem' }}
        >
          + Add programming
        </Link>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', fontSize: '0.8rem', color: '#94A3B8' }}>
        <span style={{ background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.3)', padding: '0.25rem 0.625rem', borderRadius: 999 }}>
          {publishedCount} published
        </span>
        <span style={{ background: 'rgba(255,184,28,0.08)', border: '1px solid rgba(255,184,28,0.3)', padding: '0.25rem 0.625rem', borderRadius: 999 }}>
          {draftCount} draft
        </span>
        {archivedCount > 0 && (
          <span style={{ background: 'rgba(148,163,184,0.1)', border: '1px solid rgba(148,163,184,0.3)', padding: '0.25rem 0.625rem', borderRadius: 999 }}>
            {archivedCount} archived
          </span>
        )}
      </div>

      {rows.length === 0 ? (
        <div style={{ background: 'rgba(13,17,23,0.6)', border: '1px solid var(--border)', borderRadius: 12, padding: '2.5rem 2rem', textAlign: 'center' }}>
          <p style={{ color: '#cbd5e1', fontSize: '1rem', marginBottom: '0.75rem' }}>
            No programming yet. Add a recurring slot to get started.
          </p>
          <Link
            href={`/dashboard/manage/rink/${id}/programming/new`}
            style={{ display: 'inline-block', background: '#38BDF8', color: '#0F172A', padding: '0.5rem 1rem', borderRadius: 6, fontWeight: 600, textDecoration: 'none', fontSize: '0.85rem' }}
          >
            + Add programming
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {DAYS.map((dayName, dayIdx) => {
            const dayRows = grouped[dayIdx] || [];
            if (dayRows.length === 0) return null;
            return (
              <div key={dayIdx} style={{ background: 'rgba(13,17,23,0.6)', border: '1px solid var(--border)', borderRadius: 12, padding: '1rem 1.25rem' }}>
                <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff', marginBottom: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {dayName}
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                  {dayRows.map(r => (
                    <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.625rem', flexWrap: 'wrap' }}>
                          <span style={{ color: '#fff', fontWeight: 600, fontSize: '0.95rem' }}>
                            {r.start_time.slice(0,5)}–{r.end_time.slice(0,5)}
                          </span>
                          <span style={{ color: '#cbd5e1', fontSize: '0.875rem' }}>
                            {r.activity_type.replace(/_/g, ' ')}
                          </span>
                          <span style={{ color: '#94A3B8', fontSize: '0.8rem' }}>
                            {SKILL_LABELS[r.skill_level] || r.skill_level}
                            {r.gender !== 'all' ? ` · ${GENDER_LABELS[r.gender] || r.gender}` : ''}
                            {formatAgeRange(r.age_min, r.age_max) ? ` · ${formatAgeRange(r.age_min, r.age_max)}` : ''}
                          </span>
                        </div>
                        {r.description && (
                          <div style={{ color: '#94A3B8', fontSize: '0.8rem', marginTop: '0.25rem', maxWidth: 600 }}>
                            {r.description}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
                        <span style={{ color: '#cbd5e1', fontSize: '0.85rem', fontWeight: 500 }}>
                          {formatPrice(r.price_cents, r.currency)}
                        </span>
                        <StatusBadge status={r.status} />
                        <Link
                          href={`/dashboard/manage/rink/${id}/programming/${r.id}/edit`}
                          style={{ color: '#38BDF8', fontSize: '0.8rem', textDecoration: 'none', padding: '0.25rem 0.5rem' }}
                        >
                          Edit
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
        <Link href={`/dashboard/manage/rink/${id}`} style={{ color: '#94A3B8', fontSize: '0.85rem', textDecoration: 'none' }}>
          ← Back to rink dashboard
        </Link>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; fg: string }> = {
    published: { bg: 'rgba(56,189,248,0.15)', fg: '#7DD3FC' },
    draft: { bg: 'rgba(255,184,28,0.15)', fg: '#FCD34D' },
    archived: { bg: 'rgba(148,163,184,0.15)', fg: '#94A3B8' },
  };
  const c = colors[status] || { bg: 'rgba(148,163,184,0.15)', fg: '#94A3B8' };
  return (
    <span style={{ background: c.bg, color: c.fg, padding: '0.125rem 0.5rem', borderRadius: 999, fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
      {status}
    </span>
  );
}
