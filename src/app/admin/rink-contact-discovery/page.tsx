import { requireAdmin } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';
import RinkContactReview from './RinkContactReview';

export const dynamic = 'force-dynamic';

interface ContactCandidate {
  id: string;
  rink_id: string;
  email: string;
  source_url: string;
  confidence: number;
  status: 'pending' | 'approved' | 'rejected' | 'used';
  rejected_reason: string | null;
  notes: string | null;
  discovered_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  rink_name?: string;
  rink_city?: string | null;
  rink_state?: string | null;
  rink_country?: string | null;
  rink_website?: string | null;
}

async function getCandidates(filter: 'pending' | 'approved' | 'rejected' | 'used' | 'all' = 'pending') {
  let query = supabaseAdmin
    .from('rink_contact_discovery')
    .select(`
      id, rink_id, email, source_url, confidence, status, rejected_reason, notes,
      discovered_at, reviewed_at, reviewed_by,
      rinks!inner(name, city, province_state, country, website_url)
    `)
    .order('confidence', { ascending: false })
    .order('discovered_at', { ascending: false })
    .limit(500);

  if (filter !== 'all') {
    query = query.eq('status', filter);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  return data.map((row: any): ContactCandidate => ({
    id: row.id,
    rink_id: row.rink_id,
    email: row.email,
    source_url: row.source_url,
    confidence: Number(row.confidence) || 0,
    status: row.status,
    rejected_reason: row.rejected_reason,
    notes: row.notes,
    discovered_at: row.discovered_at,
    reviewed_at: row.reviewed_at,
    reviewed_by: row.reviewed_by,
    rink_name: row.rinks?.name,
    rink_city: row.rinks?.city,
    rink_state: row.rinks?.province_state,
    rink_country: row.rinks?.country,
    rink_website: row.rinks?.website_url,
  }));
}

async function getStats() {
  const { data, error } = await supabaseAdmin
    .from('rink_contact_discovery')
    .select('status');
  if (error || !data) return { pending: 0, approved: 0, rejected: 0, used: 0, total: 0 };
  const counts: Record<string, number> = { pending: 0, approved: 0, rejected: 0, used: 0 };
  for (const r of data) {
    if (counts[r.status] !== undefined) counts[r.status]++;
  }
  return { ...counts, total: data.length };
}

export default async function RinkContactDiscoveryPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  await requireAdmin();
  const { filter: filterParam } = await searchParams;
  const filter = (filterParam as any) || 'pending';

  const [candidates, stats] = await Promise.all([
    getCandidates(filter),
    getStats(),
  ]);

  return (
    <div style={{ padding: '1.5rem', maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', margin: 0 }}>
          🔍 Rink Contact Discovery
        </h1>
        <p style={{ color: '#9ca3af', marginTop: '0.5rem', fontSize: '0.9rem' }}>
          Scraped email candidates from rink websites. Review and approve before any are
          written back to rinks.email or used in outreach.
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <StatCard label="Pending" value={stats.pending} color="#FFB81C" active={filter === 'pending'} href="/admin/rink-contact-discovery?filter=pending" />
        <StatCard label="Approved" value={stats.approved} color="#14B8A6" active={filter === 'approved'} href="/admin/rink-contact-discovery?filter=approved" />
        <StatCard label="Rejected" value={stats.rejected} color="#9ca3af" active={filter === 'rejected'} href="/admin/rink-contact-discovery?filter=rejected" />
        <StatCard label="Used" value={stats.used} color="#3b82f6" active={filter === 'used'} href="/admin/rink-contact-discovery?filter=used" />
        <StatCard label="Total" value={stats.total} color="#fff" active={filter === 'all'} href="/admin/rink-contact-discovery?filter=all" />
      </div>

      <RinkContactReview candidates={candidates} currentFilter={filter} />
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
  active,
  href,
}: {
  label: string;
  value: number;
  color: string;
  active: boolean;
  href: string;
}) {
  return (
    <a
      href={href}
      style={{
        background: active ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
        border: active ? `1px solid ${color}` : '1px solid rgba(255,255,255,0.06)',
        borderRadius: 8,
        padding: '0.85rem 1rem',
        textDecoration: 'none',
        display: 'block',
        transition: 'border-color 0.15s',
      }}
    >
      <div style={{ color, fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        {label}
      </div>
      <div style={{ color: '#fff', fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem', lineHeight: 1 }}>
        {value}
      </div>
    </a>
  );
}
