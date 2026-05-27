'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Breadcrumbs from '@/components/Breadcrumbs';
import RinkRelated from '@/components/RinkRelated';

const BASE_URL = 'https://rinkstop.com';

interface Review {
  id: string;
  rating: number;
  review_text: string | null;
  reviewer_name: string;
  reviewer_email: string | null;
  created_at: string;
}

export default function RinkDetail() {
  const { id } = useParams();
  const [rink, setRink] = useState<any>(null);
  const [games, setGames] = useState<any[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  // Review form state
  const [formRating, setFormRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [formName, setFormName] = useState('');
  const [formText, setFormText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetch(`/api/rinks?id=${id}`).then(r => r.json()).then(d => {
      setRink(d || null);
    });
    fetch(`/api/games?venueId=${id}`).then(r => r.json()).then(d => setGames(d || []));
  }, [id]);

  // Load reviews
  const loadReviews = () => {
    setReviewsLoading(true);
    fetch(`/api/rinks/${id}/reviews`)
      .then(r => r.json())
      .then(d => {
        if (!d.error) {
          setReviews(d.data || []);
          setAverageRating(d.average_rating || 0);
          setTotalReviews(d.total_reviews || 0);
        }
        setReviewsLoading(false);
      })
      .catch(() => setReviewsLoading(false));
  };

  useEffect(() => {
    if (!rink) return;

    const existingSchema = document.querySelector('script[type="application/ld+json"][data-rink]');
    if (existingSchema) existingSchema.remove();

    const schema = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
            { '@type': 'ListItem', position: 2, name: 'Rinks', item: `${BASE_URL}/directory/rinks` },
            { '@type': 'ListItem', position: 3, name: rink.name, item: `${BASE_URL}/directory/rinks/${rink.id}` },
          ],
        },
        {
          '@type': 'SportsActivityLocation',
          '@id': `https://rinkstop.com/directory/rinks/${rink.id}`,
          name: rink.name,
          description: `${rink.name}  --  Ice rink in ${rink.city || ''}${rink.province_state ? ', ' + rink.province_state : ''}${rink.country ? ', ' + rink.country : ''}${rink.capacity ? '. Capacity: ' + rink.capacity.toLocaleString() : ''}`,
          url: `${BASE_URL}/directory/rinks/${rink.id}`,
          ...(rink.logo_url ? { image: rink.logo_url } : {}),
          ...(rink.address ? {
            address: { '@type': 'PostalAddress', addressLocality: rink.city, addressRegion: rink.province_state, addressCountry: rink.country, streetAddress: rink.address },
          } : {}),
          ...(rink.latitude && rink.longitude ? { geo: { '@type': 'GeoCoordinates', latitude: rink.latitude, longitude: rink.longitude } } : {}),
          ...(rink.capacity ? { numberOfRooms: { '@type': 'QuantitativeValue', value: rink.capacity, unitText: 'spectators' } } : {}),
          ...(rink.ice_size ? { floorSize: { '@type': 'QuantitativeValue', value: rink.ice_size, unitCode: 'MTK' } } : {}),
          ...(rink.phone ? { telephone: rink.phone } : {}),
          ...(rink.website_url ? { url: rink.website_url } : {}),
          ...(rink.surface_type ? { additionalProperty: [{ '@type': 'PropertyValue', name: 'Ice Surface', value: rink.surface_type }] } : {}),
          sport: 'Ice Hockey',
        },
      ],
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-rink', rink.id);
    script.text = JSON.stringify(schema);
    document.head.appendChild(script);
    return () => { document.head.removeChild(script); };;
  }, [rink]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formRating) {
      setSubmitMsg({ type: 'error', text: 'Please select a star rating (1-5).' });
      return;
    }
    setSubmitting(true);
    setSubmitMsg(null);
    try {
      const res = await fetch('/api/rinks/reviews/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rink_id: id,
          rating: formRating,
          review_text: formText || null,
          reviewer_name: formName || 'Anonymous',
        }),
      });
      const data = await res.json();
      if (res.ok && data.data) {
        setSubmitMsg({ type: 'success', text: 'Thanks! Your review has been submitted.' });
        setFormRating(0);
        setFormName('');
        setFormText('');
        loadReviews(); // refresh the list
      } else {
        setSubmitMsg({ type: 'error', text: data.error || 'Something went wrong. Please try again.' });
      }
    } catch {
      setSubmitMsg({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  const displayRating = (r: number) => {
    return (
      <span style={{ display: 'inline-flex', gap: '2px' }}>
        {[1, 2, 3, 4, 5].map(i => (
          <span key={i} style={{ fontSize: '14px' }}>★</span>
        ))}
      </span>
    );
  };

  const renderStars = (score: number, max: number = 5) => {
    return (
      <span style={{ display: 'inline-flex', gap: '2px' }}>
        {[1, 2, 3, 4, 5].map(i => (
          <span
            key={i}
            style={{
              color: i <= score ? '#FFD700' : '#333',
              fontSize: '14px',
              lineHeight: 1,
            }}
          >★</span>
        ))}
      </span>
    );
  };

  const renderPicker = () => {
    const active = hoverRating || formRating;
    return (
      <span style={{ display: 'inline-flex', gap: '4px', cursor: 'pointer' }}>
        {[1, 2, 3, 4, 5].map(i => (
          <span
            key={i}
            onClick={() => setFormRating(i)}
            onMouseEnter={() => setHoverRating(i)}
            onMouseLeave={() => setHoverRating(0)}
            style={{
              color: i <= active ? '#FFD700' : '#555',
              fontSize: '22px',
              lineHeight: 1,
              transition: 'color 0.1s',
              userSelect: 'none',
            }}
          >★</span>
        ))}
      </span>
    );
  };

  if (!rink) return <p style={{ color: 'var(--muted)' }}>Loading...</p>;

  return (
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
      <Link href="/directory/rinks" style={{ color: '#38bdf8', fontSize: '14px', marginBottom: '12px', display: 'inline-block', textDecoration: 'none' }}>
        &larr; Back to Rinks
      </Link>
      <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#fff', marginBottom: '24px', marginTop: '8px' }}>
        {rink.name}
      </h1>

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
              src={`https://www.google.com/maps?q=${rink.latitude},${rink.longitude}&hl=en&z=14&output=embed`}
              width="100%"
              height="220"
              style={{ border: 0, borderRadius: '8px', filter: 'invert(90%) hue-rotate(180deg)' }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title={`Map of ${rink.name}`}
            />
          </div>
        ) : (
          <div style={{ background: 'rgba(13,17,23,0.6)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <h2 style={{ fontWeight: 600, color: '#fff', fontSize: '16px', marginBottom: '8px' }}>Location</h2>
            {rink.address ? (
              <a
                href={`https://www.google.com/maps/search/${encodeURIComponent(rink.address + ' ' + [rink.city, rink.province_state, rink.country].filter(Boolean).join(' '))}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#38bdf8', fontSize: '14px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                📍 View {rink.name} on Google Maps
              </a>
            ) : (
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>No location data available</p>
            )}
          </div>
        )}
      </div>

      {/* Events */}
      <div style={{ background: 'rgba(13,17,23,0.6)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '24px' }}>
        <h2 style={{ fontWeight: 600, marginBottom: '16px', color: '#fff', fontSize: '16px' }}>Events at this Rink</h2>
        {games.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {games.slice(0, 5).map((f: any) => (
              <div key={f.id} style={{ background: 'rgba(30,41,59,0.5)', padding: '12px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <p style={{ color: '#94a3b8', fontSize: '13px' }}>{new Date(f.scheduled_at).toLocaleDateString()}</p>
                <p style={{ color: '#fff', fontWeight: 500, fontSize: '14px' }}>{f.home?.name} vs {f.away?.name}</p>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '14px', fontStyle: 'italic' }}>No scheduled events</p>
        )}
      </div>

      {/* Related Teams */}
      <RinkRelated rinkId={rink.id} rinkCity={rink.city} />

      {/* ---- REVIEWS SECTION ---- */}
      <div style={{ background: 'rgba(13,17,23,0.6)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '24px' }}>
        <h2 style={{ fontWeight: 700, fontSize: '18px', color: '#fff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          Arena Reviews
          {totalReviews > 0 && (
            <span style={{ fontSize: '14px', color: 'var(--muted)', fontWeight: 400 }}>
              {totalReviews} review{totalReviews !== 1 ? 's' : ''}
            </span>
          )}
        </h2>

        {/* Average rating banner */}
        {totalReviews > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', padding: '14px 18px', background: 'var(--s3)', borderRadius: '10px', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '32px', fontWeight: 800, color: '#FFD700', lineHeight: 1 }}>{averageRating}</div>
            <div>
              <div style={{ marginBottom: '3px' }}>{renderStars(Math.round(averageRating))}</div>
              <p style={{ color: 'var(--muted)', fontSize: '13px' }}>Average rating</p>
            </div>
          </div>
        )}

        {/* Reviews list */}
        {reviewsLoading ? (
          <p style={{ color: 'var(--muted)', fontSize: '14px' }}>Loading reviews…</p>
        ) : reviews.length === 0 ? (
          <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '20px' }}>No reviews yet. Be the first to leave one!</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '28px' }}>
            {reviews.map(review => (
              <div key={review.id} style={{ background: 'rgba(17,24,35,0.8)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <p style={{ color: '#e2e8f0', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>
                      {review.reviewer_name}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {renderStars(review.rating)}
                      <span style={{ color: '#FFD700', fontSize: '13px', fontWeight: 700 }}>{review.rating}/5</span>
                    </div>
                  </div>
                  <time style={{ color: 'var(--dim)', fontSize: '12px', whiteSpace: 'nowrap' }}>
                    {new Date(review.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </time>
                </div>
                {review.review_text && (
                  <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: 1.6 }}>{review.review_text}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Divider */}
        <div style={{ borderTop: '1px solid var(--border)', marginBottom: '20px' }} />

        {/* Write-a-Review Form */}
        <h3 style={{ color: '#fff', fontWeight: 600, fontSize: '16px', marginBottom: '16px' }}>Write a Review</h3>

        <form onSubmit={handleSubmitReview} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Star picker */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ color: 'var(--muted)', fontSize: '13px' }}>Your Rating *</label>
            {renderPicker()}
            {formRating > 0 && (
              <span style={{ color: '#FFD700', fontSize: '13px', fontWeight: 600 }}>
                {formRating} star{formRating !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Name */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ color: 'var(--muted)', fontSize: '13px' }}>Your Name (optional)</label>
            <input
              type="text"
              value={formName}
              onChange={e => setFormName(e.target.value)}
              placeholder="Anonymous"
              maxLength={80}
              style={{
                background: 'var(--s3)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '9px 12px',
                color: '#e2e8f0',
                fontSize: '14px',
                outline: 'none',
                width: '100%',
                maxWidth: '320px',
              }}
            />
          </div>

          {/* Review text */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ color: 'var(--muted)', fontSize: '13px' }}>
              Your Review (optional)
              <span style={{ color: 'var(--dim)', marginLeft: '6px', fontSize: '12px' }}>
                {formText.length}/1000
              </span>
            </label>
            <textarea
              value={formText}
              onChange={e => setFormText(e.target.value.slice(0, 1000))}
              placeholder="Share your experience at this rink…"
              rows={4}
              style={{
                background: 'var(--s3)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '9px 12px',
                color: '#e2e8f0',
                fontSize: '14px',
                outline: 'none',
                resize: 'vertical',
                width: '100%',
                lineHeight: 1.6,
              }}
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            style={{
              background: submitting ? 'var(--red-dark)' : 'var(--red)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 24px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: submitting ? 'not-allowed' : 'pointer',
              alignSelf: 'flex-start',
              transition: 'background 0.2s',
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting ? 'Submitting…' : 'Submit Review'}
          </button>

          {/* Feedback message */}
          {submitMsg && (
            <p style={{
              color: submitMsg.type === 'success' ? '#4ade80' : '#f87171',
              fontSize: '14px',
              background: submitMsg.type === 'success' ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)',
              padding: '10px 14px',
              borderRadius: '8px',
              border: `1px solid ${submitMsg.type === 'success' ? 'rgba(74,222,128,0.2)' : 'rgba(248,113,113,0.2)'}`,
            }}>
              {submitMsg.text}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
