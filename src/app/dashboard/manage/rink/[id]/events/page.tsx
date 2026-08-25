// src/app/dashboard/manage/rink/[id]/events/page.tsx
//
// WS17 PR3b - Owner events list page with CRUD.
//
// Server component. Loads all events for the owner's rink via supabaseAdmin
// (server-side, no RLS needed). Links to new/edit event pages.

import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import { resolveCanonicalUserId } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  published: { bg: 'rgba(56,189,248,0.15)', fg: '#7DD3FC' },
  draft: { bg: 'rgba(255,184,28,0.15)', fg: '#FCD34D' },
  cancelled: { bg: 'rgba(200,16,46,0.15)', fg: '#FCA5A5' },
  completed: { bg: 'rgba(148,163,184,0.15)', fg: '#94A3B8' },
};

const VISIBILITY_COLORS: Record<string, { bg: string; fg: string }> = {
  public: { bg: 'rgba(74,222,128,0.15)', fg: '#86EFAC' },
  unlisted: { bg: 'rgba(148,163,184,0.15)', fg: '#94A3B8' },
  private: { bg: 'rgba(200,16,46,0.15)', fg: '#FCA5A5' },
};

interface EventRow {
  id: string;
  rink_id: string;
  slug: string;
  title: string;
  event_type: string;
  starts_at: string;
  ends_at: string;
  status: string;
  visibility: string;
  price_cents: number | null;
  currency: string;
  capacity: number | null;
  spots_remaining: number | null;
  banner_image_url: string | null;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatPrice(cents: number | null, currency: string): string {
  if (cents === null) return 'Free';
  return `${currency} ${(cents / 100).toFixed(2)}`;
}

function formatEventType(type: string): string {
  return type.replace(/_/g, ' ');
}

export default async function OwnerEventsPage({ params }: PageProps) {
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
      <div style={{ maxWidth: 960 }}>
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
    .select('id, name, slug')
    .eq('id', id)
    .maybeSingle();

  // Load all events for this rink, sorted by starts_at descending.
  const { data: events, error } = await supabaseAdmin
    .from('rink_events')
    .select('id, rink_id, slug, title, event_type, starts_at, ends_at, status, visibility, price_cents, currency, capacity, spots_remaining, banner_image_url')
    .eq('rink_id', id)
    .order('starts_at', { ascending: false });

  if (error) {
    console.error('[owner-events-page] load failed', error);
  }

  const rows = (events ?? []) as EventRow[];

  const publishedCount = rows.filter(r => r.status === 'published').length;
  const draftCount = rows.filter(r => r.status === 'draft').length;
  const cancelledCount = rows.filter(r => r.status === 'cancelled').length;
  const completedCount = rows.filter(r => r.status === 'completed').length;

  return (
    <div style={{ maxWidth: 960 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <Link href={`/dashboard/manage/rink/${id}`} style={{ fontSize: '0.85rem', color: '#94A3B8', textDecoration: 'none' }}>
            ← {rink?.name || 'Rink'} dashboard
          </Link>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#fff', marginTop: '0.25rem' }}>Events</h1>
          <p style={{ fontSize: '0.9rem', color: '#94A3B8', marginTop: '0.25rem' }}>
            One-off events for {rink?.name || 'this rink'}.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'center' }}>
          <Link
            href={`/dashboard/manage/rink/${id}/events/new`}
            style={{
              display: 'inline-block',
              background: '#38BDF8',
              color: '#0F172A',
              border: 'none',
              borderRadius: 8,
              padding: '0.6rem 1.1rem',
              fontWeight: 600,
              fontSize: '0.875rem',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            + New event
          </Link>
          {rink?.slug && (
            <a
              href={`/events/rink/${rink.slug}?tab=events`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-block',
                color: 'rgba(255,255,255,0.5)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 8,
                padding: '0.6rem 0.875rem',
                fontSize: '0.8rem',
                textDecoration: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              ↗ Preview live
            </a>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', fontSize: '0.8rem', color: '#94A3B8', flexWrap: 'wrap' }}>
        {publishedCount > 0 && <CountBadge label="published" count={publishedCount} />}
        {draftCount > 0 && <CountBadge label="draft" count={draftCount} />}
        {cancelledCount > 0 && <CountBadge label="cancelled" count={cancelledCount} />}
        {completedCount > 0 && <CountBadge label="completed" count={completedCount} />}
        {rows.length === 0 && (
          <span style={{ color: '#64748b', fontStyle: 'italic' }}>No events yet</span>
        )}
      </div>

      {rows.length === 0 ? (
        <div style={{ background: 'rgba(13,17,23,0.6)', border: '1px solid var(--border)', borderRadius: 12, padding: '2.5rem 2rem', textAlign: 'center' }}>
          <p style={{ color: '#cbd5e1', fontSize: '1rem', marginBottom: '0.75rem' }}>
            No events yet. Create your first event to get started.
          </p>
          <Link
            href={`/dashboard/manage/rink/${id}/events/new`}
            style={{ display: 'inline-block', background: '#38BDF8', color: '#0F172A', borderRadius: 8, padding: '0.625rem 1.25rem', fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none' }}
          >
            Create first event
          </Link>
        </div>
      ) : (
        <div style={{ background: 'rgba(13,17,23,0.6)', border: '1px solid var(--border)', borderRadius: 12, padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          {rows.map(r => (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', padding: '0.875rem 1rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.625rem', flexWrap: 'wrap' }}>
                  <Link href={`/dashboard/manage/rink/${id}/events/${r.id}/edit`} style={{ color: '#fff', fontWeight: 600, fontSize: '0.95rem', textDecoration: 'none' }}>
                    {r.title}
                  </Link>
                  <span style={{ color: '#94A3B8', fontSize: '0.8rem' }}>
                    {formatEventType(r.event_type)}
                  </span>
                </div>
                <div style={{ color: '#94A3B8', fontSize: '0.8rem', marginTop: '0.2rem' }}>
                  {formatDate(r.starts_at)}
                  {r.starts_at !== r.ends_at && ` – ${formatDate(r.ends_at)}`}
                  {r.capacity != null && ` · ${r.spots_remaining != null ? `${r.spots_remaining} spots left` : `${r.capacity} capacity`}`}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>
                  {formatPrice(r.price_cents, r.currency)}
                </span>
                {r.status && <StatusBadge label={r.status} colors={STATUS_COLORS[r.status]} />}
                {r.visibility && <StatusBadge label={r.visibility} colors={VISIBILITY_COLORS[r.visibility]} />}
                <Link
                  href={`/dashboard/manage/rink/${id}/events/${r.id}/edit`}
                  style={{ color: '#38BDF8', fontSize: '0.8rem', textDecoration: 'none', padding: '0.2rem 0.4rem', border: '1px solid rgba(56,189,248,0.3)', borderRadius: 4 }}
                >
                  Edit
                </Link>
                <Link
                  href={`/events/${r.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#94A3B8', fontSize: '0.8rem', textDecoration: 'none', padding: '0.2rem 0.4rem' }}
                >
                  ↗
                </Link>
              </div>
            </div>
          ))}
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

function CountBadge({ label, count }: { label: string; count: number }) {
  return (
    <span style={{ background: 'rgba(148,163,184,0.1)', border: '1px solid rgba(148,163,184,0.3)', padding: '0.25rem 0.625rem', borderRadius: 999 }}>
      {count} {label}
    </span>
  );
}

function StatusBadge({ label, colors }: { label: string; colors: { bg: string; fg: string } | undefined }) {
  const c = colors || { bg: 'rgba(148,163,184,0.15)', fg: '#94A3B8' };
  return (
    <span style={{ background: c.bg, color: c.fg, padding: '0.125rem 0.5rem', borderRadius: 999, fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
      {label}
    </span>
  );
}
