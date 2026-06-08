import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Breadcrumbs from '@/components/Breadcrumbs';
import { supabase } from '@/lib/supabase';
import RinkGames from '@/components/RinkGames';
import RinkReviews from '@/components/RinkReviews';
import ReviewForm from './ReviewForm';
import SaveButton from '@/components/SaveButton';
import { rinkPageDecision, robotsMeta } from '@/lib/seo';


export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { data: rink } = await supabase
    .from('rinks')
    .select('name, slug, city, country, province_state, notes, website_url, phone, address, capacity, ice_size, surface_type, email')
    .eq('slug', slug)
    .single();

  if (!rink) return { title: 'Rink Not Found | RinkStop' };

  // Count populated fields to score content quality (use correct column names)
  const fields = ['city', 'country', 'province_state', 'notes', 'website_url', 'phone', 'email', 'address', 'capacity', 'ice_size', 'surface_type'];
  const fieldCount = fields.filter(f => rink[f] && (Array.isArray(rink[f]) ? rink[f].length > 0 : String(rink[f]).trim().length > 0)).length;
  // Estimate word count from notes (the main unique content field on rinks)
  const noteWords = rink.notes ? String(rink.notes).split(/\s+/).filter(w => w.length > 0).length : 0;
  const addrWords = rink.address ? String(rink.address).split(/\s+/).filter(w => w.length > 0).length : 0;
  const uniqueWordCount = noteWords + addrWords;
  const decision = rinkPageDecision(fieldCount, uniqueWordCount);

  return {
    title: `${rink.name} | RinkStop`,
    description: `Find ice hockey teams, leagues, games, and more at ${rink.name} in ${rink.city || ''}, ${rink.country || ''}.`,
    robots: robotsMeta(decision),
    openGraph: {
      title: `${rink.name} | RinkStop`,
      description: `Hockey at ${rink.name} in ${rink.city || ''}, ${rink.country || ''}.`,
      type: 'website',
    },
  };
}

export default async function RinkDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  // Fetch rink by slug (URL contains slug, not UUID)
  const { data: rink, error } = await supabase
    .from('rinks')
    .select('id, name, slug, city, province_state, country, address, latitude, longitude, capacity, ice_size, surface_type, website_url, phone, email, logo_url, is_active, notes, source')
    .eq('slug', slug)
    .single();

  if (error || !rink) {
    notFound();
  }

  // Fetch upcoming games for this rink (venueId = rink.id)
  const { data: games } = await supabase
    .from('games')
    .select('id, date, time, home_team_id, away_team_id, home_team_name, away_team_name, venue_id, venue_name, location, status, home_score, away_score, period, period_time_remaining, broadcast')
    .eq('venue_id', rink.id)
    .gte('date', new Date().toISOString().split('T')[0])
    .order('date', { ascending: true })
    .limit(20);

  // Fetch reviews (rink_reviews table; only approved reviews are visible to anon per RLS)
  const { data: reviewsData } = await supabase
    .from('rink_reviews')
    .select('id, rating, review_text, reviewer_name, created_at')
    .eq('rink_id', rink.id)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(10);

  const reviews = reviewsData || [];
  const averageRating = reviews.length
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  const BASE_URL = 'https://rinkstop.com';

  // Schema for SEO
  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
          { '@type': 'ListItem', position: 2, name: 'Rinks', item: `${BASE_URL}/directory/rinks` },
          { '@type': 'ListItem', position: 3, name: rink.name, item: `${BASE_URL}/directory/rinks/${rink.slug}` },
        ],
      },
      {
        '@type': 'SportsActivityLocation',
        '@id': `${BASE_URL}/directory/rinks/${rink.slug}`,
        name: rink.name,
        description: `${rink.name} -- Ice rink in ${rink.city || ''}${rink.province_state ? ', ' + rink.province_state : ''}${rink.country ? ', ' + rink.country : ''}${rink.capacity ? '. Capacity: ' + rink.capacity.toLocaleString() : ''}`,
        url: `${BASE_URL}/directory/rinks/${rink.slug}`,
        ...(rink.logo_url ? { image: rink.logo_url } : {}),
        ...(rink.address ? {
          address: {
            '@type': 'PostalAddress',
            addressLocality: rink.city,
            addressRegion: rink.province_state,
            addressCountry: rink.country,
            streetAddress: rink.address,
          },
        } : {}),
        ...(rink.latitude && rink.longitude ? { geo: { '@type': 'GeoCoordinates', latitude: rink.latitude, longitude: rink.longitude } } : {}),
        ...(rink.capacity ? { numberOfRooms: { '@type': 'QuantitativeValue', value: rink.capacity, unitText: 'spectators' } } : {}),
        ...(rink.phone ? { telephone: rink.phone } : {}),
        ...(rink.website_url ? { url: rink.website_url } : {}),
        sport: 'Ice Hockey',
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>

        {/* Permanently Closed Banner */}
        {!rink.is_active && (
          <div style={{ background: 'rgba(220,38,38,0.15)', border: '1px solid #dc2626', borderRadius: '12px', padding: '16px 20px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '24px' }}>🚫</span>
            <div>
              <p style={{ color: '#fca5a5', fontWeight: 600, fontSize: '15px', marginBottom: '2px' }}>Permanently Closed</p>
              <p style={{ color: 'rgba(252,165,165,0.7)', fontSize: '13px' }}>This rink is no longer operating.</p>
            </div>
          </div>
        )}

        <Breadcrumbs links={[
          { label: 'Directory', href: '/directory' },
          { label: 'Rinks', href: '/directory/rinks' },
          { label: rink.name, href: `/directory/rinks/${rink.slug}` },
        ]} />

        <Link
          href="/directory/rinks"
          style={{ color: '#38bdf8', fontSize: '14px', marginBottom: '12px', display: 'inline-block', textDecoration: 'none' }}
        >
          &larr; Back to Rinks
        </Link>

        <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#fff', marginBottom: '12px', marginTop: '8px' }}>
          {rink.name}
        </h1>

        {/* Actions: Save to favorites */}
        <div style={{ marginBottom: '24px' }}>
          <SaveButton favoriteType="rink" favoriteId={rink.id} entityName={rink.name} size="md" />
        </div>

        {/* Details Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div style={{ background: 'rgba(13,17,23,0.6)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <h2 style={{ fontWeight: 600, marginBottom: '12px', color: '#fff', fontSize: '16px' }}>Details</h2>
            <dl style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <dt style={{ color: 'var(--muted)', fontSize: '13px' }}>Location</dt>
                <dd style={{ color: '#cbd5e1', fontSize: '14px' }}>{rink.city}, {rink.province_state}, {rink.country}</dd>
              </div>
              {rink.address && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <dt style={{ color: 'var(--muted)', fontSize: '13px' }}>Address</dt>
                  <dd style={{ color: '#cbd5e1', fontSize: '14px' }}>{rink.address}</dd>
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <dt style={{ color: 'var(--muted)', fontSize: '13px' }}>Ice</dt>
                <dd style={{ color: '#cbd5e1', fontSize: '14px' }}>{rink.ice_size} · {rink.surface_type}</dd>
              </div>
              {rink.capacity && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <dt style={{ color: 'var(--muted)', fontSize: '13px' }}>Capacity</dt>
                  <dd style={{ color: '#cbd5e1', fontSize: '14px' }}>{rink.capacity.toLocaleString()}</dd>
                </div>
              )}
            </dl>
          </div>

          <div style={{ background: 'rgba(13,17,23,0.6)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <h2 style={{ fontWeight: 600, marginBottom: '12px', color: '#fff', fontSize: '16px' }}>Contact</h2>
            <dl style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {rink.phone && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <dt style={{ color: 'var(--muted)', fontSize: '13px' }}>Phone</dt>
                  <dd style={{ color: '#cbd5e1', fontSize: '14px' }}>{rink.phone}</dd>
                </div>
              )}
              {rink.email && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <dt style={{ color: 'var(--muted)', fontSize: '13px' }}>Email</dt>
                  <dd style={{ color: '#cbd5e1', fontSize: '14px' }}>{rink.email}</dd>
                </div>
              )}
              {rink.website_url && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <dt style={{ color: 'var(--muted)', fontSize: '13px' }}>Website</dt>
                  <dd>
                    <a href={rink.website_url} target="_blank" rel="noopener noreferrer" style={{ color: '#38bdf8', fontSize: '14px', textDecoration: 'none' }}>
                      {rink.website_url}
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Map */}
          {(rink.latitude && rink.longitude) ? (
            <div style={{ background: 'rgba(13,17,23,0.6)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h2 style={{ fontWeight: 600, color: '#fff', fontSize: '16px' }}>Location</h2>
              <iframe
                title={`${rink.name} location`}
                width="100%"
                height="200"
                loading="lazy"
                src={`https://www.google.com/maps?q=${rink.latitude},${rink.longitude}&output=embed`}
                style={{ border: 0, borderRadius: '8px' }}
              />
            </div>
          ) : null}
        </div>

        {/* Notes */}
        {rink.notes && (
          <div style={{ background: 'rgba(13,17,23,0.6)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '24px' }}>
            <p style={{ color: '#cbd5e1', fontSize: '14px', lineHeight: 1.7, fontStyle: 'italic' }}>{rink.notes}</p>
          </div>
        )}

        <div style={{ borderTop: '1px solid var(--border)', marginBottom: '20px' }} />

        {/* Games Section */}
        <RinkGames rinkId={rink.id} rinkName={rink.name} initialGames={games || []} />

        <div style={{ borderTop: '1px solid var(--border)', marginBottom: '20px' }} />

        {/* Reviews Section */}
        <RinkReviews
          reviews={reviews}
          averageRating={averageRating}
          totalReviews={reviews.length}
          rinkId={rink.id}
        />

        {/* Review Form */}
        <ReviewForm rinkId={rink.id} rinkName={rink.name} />

      </div>
    </>
  );
}