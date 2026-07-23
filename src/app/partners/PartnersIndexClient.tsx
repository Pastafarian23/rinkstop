'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CATEGORIES, type Category } from '@/app/dashboard/listings/ListingsManager';

export interface PartnerListing {
  id: string;
  owner_user_id: string;
  business_name: string;
  category: Category;
  description: string | null;
  location: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  website: string | null;
  logo_url: string | null;
  photos: string[];
  hours: Record<string, string> | null;
  tier: string;
  is_published: boolean;
  is_featured?: boolean;
  featured_until?: string | null;
  created_at: string;
  updated_at: string;
}

interface Props {
  initial: PartnerListing[];
}

export default function PartnersIndexClient({ initial }: Props) {
  const [listings] = useState<PartnerListing[]>(initial);
  const [category, setCategory] = useState<Category | 'all'>('all');
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const today = new Date().toISOString();
    return listings.filter((l) => {
      if (category !== 'all' && l.category !== category) return false;
      if (q.trim()) {
        const needle = q.toLowerCase();
        const hay = `${l.business_name} ${l.description || ''} ${l.location || ''}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    // Phase 1c-2: trim the expired-featured flag so sort order reflects
    // reality. The server already sorts by is_featured desc + updated_at
    // desc, but a row with featured_until in the past shouldn't surface as
    // featured. We just hide the badge here; the row stays in the list.
    }).map((l) => ({
      ...l,
      // Display-only: clear the featured flag if expired so the badge
      // doesn't render. The DB keeps is_featured=true (for audit) until
      // the next time the owner re-features or an admin unfeatures.
      is_featured: l.is_featured && (!l.featured_until || l.featured_until > today) ? true : false,
    }));
  }, [listings, category, q]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div
        style={{
          background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: 12,
          padding: '1.25rem', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center',
        }}
      >
        <div style={{ flex: 1, minWidth: 200 }}>
          <input
            type="search" placeholder="Search by name, location, or keyword…"
            value={q} onChange={(e) => setQ(e.target.value)}
            style={{
              background: '#0a0a0a', border: '1px solid #1e1e1e', borderRadius: 6, color: '#fff',
              padding: '0.5rem 0.75rem', fontSize: '0.9rem', width: '100%', outline: 'none', fontFamily: 'inherit',
              boxSizing: 'border-box',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <CategoryPill value="all" current={category} onClick={() => setCategory('all')}>All</CategoryPill>
          {CATEGORIES.map((c) => (
            <CategoryPill key={c.value} value={c.value} current={category} onClick={() => setCategory(c.value)}>
              {c.emoji} {c.label}
            </CategoryPill>
          ))}
        </div>
      </div>

      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>
        {filtered.length} {filtered.length === 1 ? 'business' : 'businesses'}{category !== 'all' || q ? ' (filtered)' : ''}
      </div>

      {filtered.length === 0 ? (
        <div
          style={{
            background: '#0f0f0f', border: '1px dashed rgba(255,255,255,0.15)', borderRadius: 12,
            padding: '2.5rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem',
          }}
        >
          <div style={{ fontSize: '2.5rem' }}>🛍️</div>
          <h3 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '1.25rem', color: '#fff', letterSpacing: '0.05em', margin: 0 }}>
            {listings.length === 0 ? 'NO BUSINESS LISTINGS YET' : 'NOTHING MATCHES'}
          </h3>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', maxWidth: 420, margin: 0, lineHeight: 1.5 }}>
            {listings.length === 0
              ? 'Pro shops, sharpening, camps, and training facilities will show up here once they publish a listing.'
              : 'Try a different category or clear your search.'}
          </p>
          {listings.length > 0 && (
            <button
              type="button"
              onClick={() => { setCategory('all'); setQ(''); }}
              style={{ background: 'transparent', border: '1px solid #14B8A6', color: '#14B8A6', borderRadius: 6, padding: '0.4rem 0.85rem', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          {filtered.map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </div>
      )}
    </div>
  );
}

function CategoryPill({ value, current, onClick, children }: { value: Category | 'all'; current: Category | 'all'; onClick: () => void; children: React.ReactNode }) {
  const active = value === current;
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: active ? 'rgba(20,184,166,0.12)' : 'transparent',
        border: active ? '1.5px solid #14B8A6' : '1px solid rgba(255,255,255,0.1)',
        color: active ? '#14B8A6' : 'rgba(255,255,255,0.7)',
        padding: '0.35rem 0.75rem', borderRadius: 999, fontSize: '0.8rem', fontWeight: active ? 700 : 500,
        cursor: 'pointer', whiteSpace: 'nowrap',
      }}
    >
      {children}
    </button>
  );
}

function ListingCard({ listing }: { listing: PartnerListing }) {
  const cat = CATEGORIES.find((c) => c.value === listing.category);
  const cover = listing.photos[0] || null;
  return (
    <Link
      href={`/partners/${listing.id}`}
      style={{
        background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: 12, overflow: 'hidden',
        textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column',
        transition: 'border-color 0.15s, transform 0.15s',
      }}
    >
      <div
        style={{
          aspectRatio: '16/9', background: cover ? `url(${cover}) center/cover` : 'linear-gradient(135deg, #1e1e1e 0%, #0a0a0a 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '2.5rem',
          position: 'relative',
        }}
      >
        {!cover && (cat?.emoji || '🛍️')}
        {listing.is_featured ? (
          <span
            data-testid="listing-featured-badge"
            style={{
              position: 'absolute',
              top: 8,
              left: 8,
              background: '#FFB81C',
              color: '#0a0a0a',
              fontSize: '0.65rem',
              fontWeight: 800,
              letterSpacing: '0.06em',
              padding: '0.2rem 0.5rem',
              borderRadius: 4,
            }}
          >
            ⭐ FEATURED
          </span>
        ) : null}
      </div>
      <div style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <h3 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '1.1rem', color: '#fff', letterSpacing: '0.05em', margin: 0 }}>
          {listing.business_name}
        </h3>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>
          {cat?.emoji} {cat?.label}{listing.location ? ` · ${listing.location}` : ''}
        </div>
        {listing.description && (
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', margin: 0, lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {listing.description}
          </p>
        )}
        <div style={{ display: 'flex', gap: 12, marginTop: 6, flexWrap: 'wrap', color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>
          {listing.website && <span>🌐 Website</span>}
          {listing.contact_email && <span>✉️ Email</span>}
          {listing.contact_phone && <span>📞 Phone</span>}
        </div>
      </div>
    </Link>
  );
}
