'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface ClaimForm {
  claimType: 'rink' | 'team' | 'player';
  entityName: string;
  entityId: string;
  reason: string;
  proof: string;
}

export default function ClaimsPage() {
  const router = useRouter();
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<ClaimForm>({
    claimType: 'rink',
    entityName: '',
    entityId: '',
    reason: '',
    proof: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.entityName || !form.reason) {
      setError('Please fill in all required fields.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claim_type: form.claimType,
          entity_name: form.entityName,
          entity_id: form.entityId || null,
          reason: form.reason,
          proof: form.proof,
        }),
      });
      if (res.ok) {
        setSubmitted(true);
      } else {
        const data = await res.json();
        setError(data.error || 'Something went wrong. Please try again.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: 640 }}>
        <div style={{
          background: '#0f0f0f',
          border: '1px solid #1e1e1e',
          borderRadius: 12,
          padding: '3rem 2rem',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: '3rem', margin: '0 0 1rem' }}>✅</p>
          <h2 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', margin: '0 0 0.75rem' }}>
            CLAIM SUBMITTED
          </h2>
          <p style={{ color: '#888', fontSize: '0.9rem', lineHeight: 1.65, margin: '0 auto 1.5rem', maxWidth: 400 }}>
            We've received your claim request and will review it shortly. You'll receive an email once our team has made a decision.
          </p>
          <button
            onClick={() => { setSubmitted(false); setForm({ claimType: 'rink', entityName: '', entityId: '', reason: '', proof: '' }); }}
            style={{
              background: 'transparent',
              color: '#38bdf8',
              border: '1px solid #38bdf8',
              borderRadius: 6,
              padding: '0.625rem 1.25rem',
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            Submit Another Claim
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: 640 }}>

      <div style={{
        background: '#0f0f0f',
        border: '1px solid #1e1e1e',
        borderRadius: 12,
        padding: '1.5rem',
      }}>
        <h2 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '1.25rem', color: '#fff', letterSpacing: '0.04em', margin: '0 0 0.25rem' }}>
          CLAIM A LISTING
        </h2>
        <p style={{ color: '#666', fontSize: '0.875rem', margin: 0, lineHeight: 1.6 }}>
          Found your rink, team, or player without an owner? Submit a claim and we'll verify your association.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{
          background: '#0f0f0f',
          border: '1px solid #1e1e1e',
          borderRadius: 12,
          padding: '1.5rem',
        }}>
          <h3 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '1rem', color: '#888', letterSpacing: '0.06em', margin: '0 0 1.25rem' }}>
            CLAIM DETAILS
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', color: '#888', fontSize: '0.8rem', marginBottom: '0.4rem' }}>
                Type of listing *
              </label>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                {(['rink', 'team', 'player'] as const).map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, claimType: type }))}
                    style={{
                      padding: '0.5rem 1rem',
                      borderRadius: 6,
                      border: `1px solid ${form.claimType === type ? '#C8102E' : '#1e1e1e'}`,
                      background: form.claimType === type ? 'rgba(200,16,46,0.15)' : '#141414',
                      color: form.claimType === type ? '#C8102E' : '#888',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textTransform: 'capitalize',
                    }}
                  >
                    {type === 'rink' ? '🏒 Rink' : type === 'team' ? '🏒 Team' : '🧑 Player'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', color: '#888', fontSize: '0.8rem', marginBottom: '0.4rem' }}>
                Name of rink, team, or player *
              </label>
              <input
                type="text"
                value={form.entityName}
                onChange={e => setForm(f => ({ ...f, entityName: e.target.value }))}
                placeholder="e.g. Alexandra Palace Ice Rink"
                required
                style={{
                  width: '100%',
                  background: '#141414',
                  border: '1px solid #1e1e1e',
                  borderRadius: 6,
                  padding: '0.625rem 0.875rem',
                  color: '#e2e8f0',
                  fontSize: '0.9rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', color: '#888', fontSize: '0.8rem', marginBottom: '0.4rem' }}>
                Listing URL (if you have it)
              </label>
              <input
                type="text"
                value={form.entityId}
                onChange={e => setForm(f => ({ ...f, entityId: e.target.value }))}
                placeholder="https://rinkstop.com/directory/rinks/..."
                style={{
                  width: '100%',
                  background: '#141414',
                  border: '1px solid #1e1e1e',
                  borderRadius: 6,
                  padding: '0.625rem 0.875rem',
                  color: '#e2e8f0',
                  fontSize: '0.9rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', color: '#888', fontSize: '0.8rem', marginBottom: '0.4rem' }}>
                Why should you own this listing? *
              </label>
              <textarea
                value={form.reason}
                onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                placeholder="I am the general manager / owner / head coach of this rink..."
                rows={3}
                required
                style={{
                  width: '100%',
                  background: '#141414',
                  border: '1px solid #1e1e1e',
                  borderRadius: 6,
                  padding: '0.625rem 0.875rem',
                  color: '#e2e8f0',
                  fontSize: '0.9rem',
                  outline: 'none',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                  lineHeight: 1.6,
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', color: '#888', fontSize: '0.8rem', marginBottom: '0.4rem' }}>
                Proof of association (optional)
              </label>
              <textarea
                value={form.proof}
                onChange={e => setForm(f => ({ ...f, proof: e.target.value }))}
                placeholder="Business license number, team roster, website link showing your name..."
                rows={2}
                style={{
                  width: '100%',
                  background: '#141414',
                  border: '1px solid #1e1e1e',
                  borderRadius: 6,
                  padding: '0.625rem 0.875rem',
                  color: '#e2e8f0',
                  fontSize: '0.9rem',
                  outline: 'none',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                  lineHeight: 1.6,
                }}
              />
            </div>
          </div>
        </div>

        {error && (
          <p style={{ color: '#f87171', fontSize: '0.875rem', background: 'rgba(248,113,113,0.1)', padding: '0.75rem 1rem', borderRadius: 6, border: '1px solid rgba(248,113,113,0.2)', margin: 0 }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          style={{
            background: submitting ? '#8b0a1e' : '#C8102E',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '0.875rem 1.5rem',
            fontSize: '0.9rem',
            fontWeight: 700,
            cursor: submitting ? 'not-allowed' : 'pointer',
            alignSelf: 'flex-start',
            letterSpacing: '0.02em',
          }}
        >
          {submitting ? 'Submitting...' : 'Submit Claim →'}
        </button>
      </form>
    </div>
  );
}