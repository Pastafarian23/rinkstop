import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase';

export default async function ReviewsPage() {
  const { userId } = await auth();
  if (!userId) redirect('/login');

  const user = await currentUser();
  const email = user?.emailAddresses?.[0]?.emailAddress || '';

  // Fetch user's reviews. Prefer matching by Clerk userId (most accurate), but
  // fall back to email for legacy reviews submitted before Clerk was set up.
  // Use service role so users also see their own pending reviews.
  let reviews: any[] | null = null;
  if (userId) {
    const { data } = await supabaseAdmin
      .from('rink_reviews')
      .select('id, rating, review_text, reviewer_name, created_at, rink_id, status, user_id, reviewer_email')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    reviews = data;
  }
  if (!reviews || reviews.length === 0) {
    // Fall back to email match for older reviews
    const { data } = await supabaseAdmin
      .from('rink_reviews')
      .select('id, rating, review_text, reviewer_name, created_at, rink_id, status, user_id, reviewer_email')
      .eq('reviewer_email', email)
      .order('created_at', { ascending: false });
    reviews = data;
  }

  // Fetch rink names for each review
  const rinkIds = [...new Set((reviews || []).map(r => r.rink_id).filter(Boolean))];
  let rinkNames: Record<string, string> = {};
  if (rinkIds.length > 0) {
    const { data: rinks } = await supabaseAdmin
      .from('rinks')
      .select('id, name')
      .in('id', rinkIds);
    rinkNames = Object.fromEntries((rinks || []).map(r => [r.id, r.name]));
  }

  function renderStars(score: number) {
    return (
      <span style={{ display: 'inline-flex', gap: '2px' }}>
        {[1, 2, 3, 4, 5].map(i => (
          <span key={i} style={{ color: i <= score ? '#FFD700' : '#333', fontSize: '14px' }}>★</span>
        ))}
      </span>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: 720 }}>

      <div style={{
        background: '#0f0f0f',
        border: '1px solid #1e1e1e',
        borderRadius: 12,
        padding: '1.5rem',
      }}>
        <h2 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '1.25rem', color: '#fff', letterSpacing: '0.04em', margin: '0 0 0.25rem' }}>
          MY REVIEWS
        </h2>
        <p style={{ color: '#666', fontSize: '0.875rem', margin: 0 }}>
          {reviews?.length || 0} review{(reviews?.length || 0) !== 1 ? 's' : ''} submitted
        </p>
      </div>

      {/* Reviews list */}
      {(!reviews || reviews.length === 0) ? (
        <div style={{
          background: '#0f0f0f',
          border: '1px solid #1e1e1e',
          borderRadius: 12,
          padding: '3rem 1.5rem',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: '2rem', margin: '0 0 0.75rem' }}>⭐</p>
          <p style={{ color: '#888', fontSize: '1rem', margin: '0 0 0.5rem' }}>No reviews yet</p>
          <p style={{ color: '#555', fontSize: '0.875rem', margin: 0 }}>
            Visit a rink page and leave a review to see it here.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {(reviews || []).map(review => (
            <div key={review.id} style={{
              background: '#0f0f0f',
              border: '1px solid #1e1e1e',
              borderRadius: 12,
              padding: '1.25rem 1.5rem',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', gap: '1rem' }}>
                <div>
                  <p style={{ color: '#C8102E', fontWeight: 600, fontSize: '0.95rem', margin: 0 }}>
                    {rinkNames[review.rink_id] || 'Unknown Rink'}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                    {renderStars(review.rating)}
                    <span style={{ color: '#FFD700', fontSize: '13px', fontWeight: 600 }}>{review.rating}/5</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <span style={{
                    display: 'inline-block',
                    padding: '0.2rem 0.6rem',
                    borderRadius: 4,
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    background: review.status === 'approved' ? 'rgba(74,222,128,0.15)' : 'rgba(251,146,60,0.15)',
                    color: review.status === 'approved' ? '#4ade80' : '#fb923c',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}>
                    {review.status || 'pending'}
                  </span>
                  <p style={{ color: '#555', fontSize: '0.75rem', margin: '0.25rem 0 0' }}>
                    {new Date(review.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              </div>
              {review.review_text && (
                <p style={{ color: '#94a3b8', fontSize: '0.875rem', lineHeight: 1.65, margin: 0 }}>
                  {review.review_text}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}