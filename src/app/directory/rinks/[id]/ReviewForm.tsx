'use client';
import { useState } from 'react';

interface ReviewFormProps {
  rinkId: string;
  rinkName: string;
  onReviewSubmitted?: () => void;
}

export default function ReviewForm({ rinkId, rinkName, onReviewSubmitted }: ReviewFormProps) {
  const [formRating, setFormRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [formName, setFormName] = useState('');
  const [formText, setFormText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const renderStars = (score: number) => (
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
          rink_id: rinkId,
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
        onReviewSubmitted?.();
      } else {
        setSubmitMsg({ type: 'error', text: data.error || 'Something went wrong. Please try again.' });
      }
    } catch {
      setSubmitMsg({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setSubmitting(false);
    }
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

  return (
    <div style={{ background: 'rgba(13,17,23,0.6)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '24px' }}>
      <h3 style={{ color: '#fff', fontWeight: 600, fontSize: '16px', marginBottom: '16px' }}>Write a Review</h3>
      <form onSubmit={handleSubmitReview} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ color: 'var(--muted)', fontSize: '13px' }}>Your Rating *</label>
          {renderPicker()}
          {formRating > 0 && (
            <span style={{ color: '#FFD700', fontSize: '13px', fontWeight: 600 }}>
              {formRating} star{formRating !== 1 ? 's' : ''}
            </span>
          )}
        </div>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ color: 'var(--muted)', fontSize: '13px' }}>
            Your Review (optional)
            <span style={{ color: 'var(--dim)', marginLeft: '6px', fontSize: '12px' }}>{formText.length}/1000</span>
          </label>
          <textarea
            value={formText}
            onChange={e => setFormText(e.target.value.slice(0, 1000))}
            placeholder={`Share your experience at ${rinkName}…`}
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
  );
}