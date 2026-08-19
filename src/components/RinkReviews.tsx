interface Review {
  id: string;
  rating: number;
  review_text: string | null;
  reviewer_name: string;
  created_at: string;
}

interface RinkReviewsProps {
  reviews: Review[];
  averageRating: number;
  totalReviews: number;
  rinkId: string;
}

function renderStars(score: number) {
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
}

export default function RinkReviews({ reviews, averageRating, totalReviews, rinkId }: RinkReviewsProps) {
  return (
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
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#FFD700', lineHeight: 1 }}>
            {averageRating.toFixed(1)}
          </div>
          <div>
            <div style={{ marginBottom: '3px' }}>{renderStars(Math.round(averageRating))}</div>
            <p style={{ color: 'var(--muted)', fontSize: '13px' }}>Average rating</p>
          </div>
        </div>
      )}

      {/* Reviews list */}
      {reviews.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '28px' }}>
          {reviews.map(review => (
            <div
              key={review.id}
              style={{
                background: 'rgba(17,24,35,0.8)',
                padding: '16px',
                borderRadius: '10px',
                border: '1px solid var(--border)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div>
                  <p style={{ color: '#e2e8f0', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>
                    {review.reviewer_name}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {renderStars(review.rating)}
                    <span style={{ color: '#FFD700', fontSize: '13px', fontWeight: 700 }}>
                      {review.rating}/5
                    </span>
                  </div>
                </div>
                <time
                  style={{ color: 'var(--dim)', fontSize: '12px', whiteSpace: 'nowrap' }}
                  dateTime={review.created_at}
                >
                  {new Date(review.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </time>
              </div>
              {review.review_text && (
                <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: 1.6 }}>
                  {review.review_text}
                </p>
              )}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}