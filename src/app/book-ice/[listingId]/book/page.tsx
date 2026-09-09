// /book-ice/[listingId]
//
// Public booking inquiry form. Anonymous (no auth required).
// Posts to /api/public-booking which inserts to public_booking_inquiries.
//
// Why this exists: the /ice-marketplace page shows listings to anyone,
// but the existing booking flow requires a Clerk user + a connection to
// the rink. That's fine for repeat users, but it's a dead end for the
// first-time visitor who finds us via search and wants to inquire. This
// page is the public entry point.

import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Book Ice Time — RinkStop',
  description: 'Request to book an open ice slot on RinkStop. No account required.',
  robots: { index: false, follow: false }, // inquiry pages shouldn't be indexed
};

interface PageProps {
  params: Promise<{ listingId: string }>;
}

function formatPrice(cents: number | null, currency: string): string {
  if (cents === null) return 'Free';
  return `${currency} ${(cents / 100).toFixed(2)}`;
}

function formatSlot(dateStr: string, tz: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: tz,
  });
}

export default async function PublicBookPage({ params }: PageProps) {
  const { listingId: id } = await params;

  const { data: listing } = await supabaseAdmin
    .from('ice_listings')
    .select(`
      id, title, description, requested_price_cents, currency,
      start_time, end_time, timezone, age_group, skill_level, slot_type,
      status, visibility,
      rink:rinks(id, name, slug, city, province_state, country)
    `)
    .eq('id', id)
    .maybeSingle();

  if (!listing || listing.status !== 'available' || listing.visibility !== 'public') {
    notFound();
  }

  const tz = listing.timezone || 'America/Chicago';
  const rink = listing.rink as any;

  return (
    <main
      data-page="public-book"
      data-listing-id={listing.id}
      style={{
        minHeight: '100vh',
        background: '#0F172A',
        color: '#fff',
        padding: '2rem 1rem 4rem',
      }}
    >
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <Link
          href="/ice-marketplace"
          style={{
            color: 'rgba(255,255,255,0.6)',
            fontSize: '0.875rem',
            textDecoration: 'none',
            display: 'inline-block',
            marginBottom: '1.5rem',
          }}
        >
          ← Back to ice marketplace
        </Link>

        {/* Listing summary card */}
        <div
          style={{
            background: 'rgba(56,189,248,0.08)',
            border: '1px solid rgba(56,189,248,0.3)',
            borderRadius: 12,
            padding: '1.25rem 1.5rem',
            marginBottom: '2rem',
          }}
        >
          <div
            style={{
              fontSize: '0.6875rem',
              fontWeight: 800,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: '#38BDF8',
              marginBottom: '0.5rem',
            }}
          >
            You are booking
          </div>
          <h1
            style={{
              fontFamily: '"Bebas Neue", sans-serif',
              fontSize: '1.75rem',
              margin: '0 0 0.5rem',
              letterSpacing: '0.02em',
            }}
          >
            {listing.title}
          </h1>
          <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.95rem', marginBottom: '0.5rem' }}>
            {rink?.name || 'Unknown rink'}
            {rink?.city ? ` · ${rink.city}${rink?.province_state ? `, ${rink.province_state}` : ''}` : ''}
          </div>
          <div style={{ color: '#38BDF8', fontSize: '0.95rem', fontWeight: 600 }}>
            {formatSlot(listing.start_time, tz)} → {formatSlot(listing.end_time, tz)}
          </div>
          <div
            style={{
              marginTop: '0.5rem',
              color: '#FFB81C',
              fontSize: '1.125rem',
              fontWeight: 700,
            }}
          >
            {formatPrice(listing.requested_price_cents, listing.currency)}
            {listing.slot_type ? ` · ${listing.slot_type.replace(/_/g, ' ')}` : ''}
            {listing.skill_level && listing.skill_level !== 'all' ? ` · ${listing.skill_level}` : ''}
            {listing.age_group ? ` · ${listing.age_group}` : ''}
          </div>
        </div>

        {/* The form */}
        <h2
          style={{
            fontFamily: '"Bebas Neue", sans-serif',
            fontSize: '1.5rem',
            margin: '0 0 1rem',
            color: '#fff',
            letterSpacing: '0.04em',
          }}
        >
          Your contact info
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
          No account required. We&apos;ll email the rink owner and they&apos;ll get back to you.
        </p>

        <form
          method="POST"
          action="/api/public-booking"
          style={{
            background: '#0a1a36',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12,
            padding: '1.5rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1.25rem',
          }}
        >
          <input type="hidden" name="listing_id" value={listing.id} />
          <input type="hidden" name="source" value="ice_marketplace" />
          <input type="hidden" name="source_url" value={`/ice-marketplace/${listing.id}/book`} />

          <div>
            <label htmlFor="contact_name" style={labelStyle}>
              Your name *
            </label>
            <input id="contact_name" name="contact_name" type="text" required style={inputStyle} placeholder="Jane Smith" />
          </div>

          <div>
            <label htmlFor="contact_email" style={labelStyle}>
              Email *
            </label>
            <input
              id="contact_email"
              name="contact_email"
              type="email"
              required
              style={inputStyle}
              placeholder="jane@example.com"
            />
          </div>

          <div>
            <label htmlFor="contact_phone" style={labelStyle}>
              Phone (optional)
            </label>
            <input
              id="contact_phone"
              name="contact_phone"
              type="tel"
              style={inputStyle}
              placeholder="+1 555 123 4567"
            />
          </div>

          <div>
            <label htmlFor="team_or_org" style={labelStyle}>
              Team or organization
            </label>
            <input
              id="team_or_org"
              name="team_or_org"
              type="text"
              style={inputStyle}
              placeholder="Riverside U12 Travel, or 'Parent of Joey'"
            />
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label htmlFor="notes" style={labelStyle}>
              Anything the rink should know?
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={4}
              style={{ ...inputStyle, resize: 'vertical' }}
              placeholder="e.g. 'We need 1 hour of practice ice, U12 level, would like the slot we listed but flexible on time.'"
            />
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <button
              type="submit"
              style={{
                display: 'inline-block',
                padding: '0.875rem 1.75rem',
                background: '#C8102E',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                fontWeight: 700,
                fontSize: '1rem',
                fontFamily: 'inherit',
                cursor: 'pointer',
              }}
            >
              Send inquiry to {rink?.name || 'the rink'}
            </button>
            <p
              style={{
                margin: '0.75rem 0 0',
                fontSize: '0.75rem',
                color: 'rgba(255,255,255,0.5)',
              }}
            >
              By submitting, you agree to be contacted by the rink about this booking. RinkStop does not share your email
              with anyone else.
            </p>
          </div>
        </form>
      </div>
    </main>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.75rem',
  fontWeight: 600,
  color: 'rgba(255,255,255,0.7)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom: '0.375rem',
};

const inputStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '0.625rem 0.75rem',
  background: '#0f1e3a',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: 6,
  color: '#fff',
  fontSize: '0.9375rem',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
};
