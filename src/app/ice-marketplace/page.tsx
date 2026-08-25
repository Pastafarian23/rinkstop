// src/app/ice-marketplace/page.tsx
//
// WS17 PR4 Phase 2A — Public ice marketplace page.
//
// Browse and filter all publicly listed available ice slots across rinks.

import Link from 'next/link';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Ice Marketplace — RinkStop',
  description: 'Browse available ice time across rinks on RinkStop. Find open slots, practice ice, tournament ice, and more.',
};

interface SearchParams {
  rink_id?: string;
  slot_type?: string;
  age_group?: string;
  skill_level?: string;
  limit?: string;
  offset?: string;
}

interface ListingRow {
  id: string;
  title: string;
  description: string | null;
  requested_price_cents: number | null;
  currency: string;
  start_time: string;
  end_time: string;
  timezone: string;
  age_group: string | null;
  skill_level: string | null;
  slot_type: string | null;
  visibility: string;
  status: string;
  rink: { id: string; name: string; slug: string | null; city: string | null; state_province: string | null; country: string | null } | null;
}

function formatPrice(cents: number | null, currency: string): string {
  if (cents === null) return 'Free';
  return `${currency} ${(cents / 100).toFixed(2)}`;
}

function formatSlot(dateStr: string, tz: string): string {
  const d = new Date(dateStr);
  return d.toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit', timeZone: tz,
  });
}

const SLOT_TYPES = ['open_pickup','practice','game','tournament','clinic','free_skate','rentals','other'];
const SKILL_LEVELS = ['all','beginner','intermediate','advanced','elite'];

export default async function IceMarketplacePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const rinkId = sp.rink_id;
  const slotType = sp.slot_type || '';
  const skillLevel = sp.skill_level || '';
  const ageGroup = sp.age_group || '';
  const limit = Math.min(parseInt(sp.limit || '20', 10), 100);
  const offset = parseInt(sp.offset || '0', 10);

  // Build the API URL
  const params = new URLSearchParams();
  if (rinkId) params.set('rink_id', rinkId);
  if (slotType) params.set('slot_type', slotType);
  if (skillLevel) params.set('skill_level', skillLevel);
  if (ageGroup) params.set('age_group', ageGroup);
  params.set('status', 'available');
  params.set('limit', String(limit));
  params.set('offset', String(offset));

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://rinkstop.com';
  const apiUrl = `${baseUrl}/api/ice-marketplace?${params.toString()}`;

  let listings: ListingRow[] = [];
  let total = 0;

  try {
    const res = await fetch(apiUrl, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      listings = data.listings || [];
      total = data.total || 0;
    }
  } catch {
    // graceful degradation
  }

  const hasFilters = rinkId || slotType || skillLevel || ageGroup;

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 1rem' }}>
      {/* Hero */}
      <div style={{ textAlign: 'center', padding: '2.5rem 0 2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', marginBottom: '0.5rem' }}>
          Ice Marketplace
        </h1>
        <p style={{ color: '#94A3B8', fontSize: '1rem' }}>
          Available ice time across rinks on RinkStop.
          {total > 0 && ` Showing ${offset + 1}–${Math.min(offset + limit, total)} of ${total} listings.`}
        </p>
      </div>

      {/* Filters */}
      <div style={{ background: 'rgba(13,17,23,0.8)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
        <form method="GET" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Slot type</label>
            <select name="slot_type" defaultValue={slotType} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#fff', padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}>
              <option value="">All types</option>
              {SLOT_TYPES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Skill level</label>
            <select name="skill_level" defaultValue={skillLevel} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#fff', padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}>
              <option value="">All levels</option>
              {SKILL_LEVELS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button type="submit" style={{ background: '#38BDF8', color: '#0F172A', border: 'none', padding: '0.5rem 1rem', borderRadius: 6, fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>
              Filter
            </button>
          </div>
          {hasFilters && (
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <a href="/ice-marketplace" style={{ color: '#94A3B8', fontSize: '0.85rem', textDecoration: 'none', padding: '0.5rem 0.5rem' }}>Clear filters</a>
            </div>
          )}
        </form>
      </div>

      {/* Listings */}
      {listings.length === 0 ? (
        <div style={{ background: 'rgba(13,17,23,0.6)', border: '1px solid var(--border)', borderRadius: 12, padding: '3rem 2rem', textAlign: 'center' }}>
          <p style={{ color: '#94A3B8', fontSize: '1rem' }}>
            {hasFilters ? 'No listings match your filters.' : 'No ice listings available right now. Check back soon.'}
          </p>
          {hasFilters && (
            <a href="/ice-marketplace" style={{ display: 'inline-block', marginTop: '1rem', color: '#38BDF8', fontSize: '0.9rem', textDecoration: 'none' }}>Clear filters</a>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
          {listings.map(listing => {
            const tz = listing.timezone || 'America/Chicago';
            return (
              <div key={listing.id} style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1rem 1.25rem', background: 'rgba(13,17,23,0.6)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div style={{ color: '#fff', fontWeight: 600, fontSize: '1rem' }}>{listing.title}</div>
                  <div style={{ color: '#94A3B8', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                    {listing.rink?.name || 'Unknown rink'}
                    {listing.rink?.city ? ` · ${listing.rink.city}${listing.rink.state_province ? `, ${listing.rink.state_province}` : ''}` : ''}
                  </div>
                  <div style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                    {formatSlot(listing.start_time, tz)}
                    {listing.slot_type ? ` · ${listing.slot_type.replace(/_/g, ' ')}` : ''}
                    {listing.skill_level && listing.skill_level !== 'all' ? ` · ${listing.skill_level}` : ''}
                    {listing.age_group ? ` · ${listing.age_group}` : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                  <span style={{ color: '#cbd5e1', fontSize: '1rem', fontWeight: 600 }}>
                    {formatPrice(listing.requested_price_cents, listing.currency)}
                  </span>
                  {listing.rink?.slug && (
                    <Link
                      href={`/directory/rinks/${listing.rink.slug}`}
                      style={{ background: 'rgba(56,189,248,0.1)', color: '#38BDF8', border: '1px solid rgba(56,189,248,0.3)', padding: '0.375rem 0.875rem', borderRadius: 6, textDecoration: 'none', fontSize: '0.8rem', fontWeight: 600 }}
                    >
                      View rink
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {total > limit && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
          {offset > 0 && (
            <a
              href={`/ice-marketplace?${new URLSearchParams({ ...(rinkId && { rink_id: rinkId }), ...(slotType && { slot_type: slotType }), ...(skillLevel && { skill_level: skillLevel }), offset: String(offset - limit) }).toString()}`}
              style={{ background: 'rgba(255,255,255,0.05)', color: '#94A3B8', border: '1px solid rgba(255,255,255,0.1)', padding: '0.5rem 1rem', borderRadius: 6, textDecoration: 'none', fontSize: '0.85rem' }}
            >
              ← Previous
            </a>
          )}
          {offset + limit < total && (
            <a
              href={`/ice-marketplace?${new URLSearchParams({ ...(rinkId && { rink_id: rinkId }), ...(slotType && { slot_type: slotType }), ...(skillLevel && { skill_level: skillLevel }), offset: String(offset + limit) }).toString()}`}
              style={{ background: 'rgba(255,255,255,0.05)', color: '#94A3B8', border: '1px solid rgba(255,255,255,0.1)', padding: '0.5rem 1rem', borderRadius: 6, textDecoration: 'none', fontSize: '0.85rem' }}
            >
              Next →
            </a>
          )}
        </div>
      )}
    </div>
  );
}
