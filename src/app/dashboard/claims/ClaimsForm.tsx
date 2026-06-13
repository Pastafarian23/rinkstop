'use client';
import { useState } from 'react';
import Link from 'next/link';
import { formatTierPrice } from '@/lib/pricing';

interface ClaimForm {
  claimType: 'rink' | 'team' | 'player';
  entityName: string;
  entityId: string;
  reason: string;
  proof: string;
}

interface ClaimsFormProps {
  tier: string;
  maxClaims: number; // -1 means unlimited
  currentCount: number;
}

export default function ClaimsForm({ tier, maxClaims, currentCount }: ClaimsFormProps) {
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

  const isUnlimited = maxClaims === -1;
  const atCap = !isUnlimited && currentCount >= maxClaims;
  const usagePct = isUnlimited ? 0 : Math.min(100, Math.round((currentCount / Math.max(1, maxClaims)) * 100));

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

      {/* Claim usage meter */}
      <div style={{
        background: '#0f0f0f',
        border: `1px solid ${atCap ? 'rgba(200,16,46,0.4)' : '#1e1e1e'}`,
        borderRadius: 12,
        padding: '1.25rem 1.5rem',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.5rem' }}>
          <span style={{ color: '#888', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Claims used ({tier} tier)
          </span>
          <span style={{ color: atCap ? '#C8102E' : '#fff', fontSize: '0.95rem', fontWeight: 700 }}>
            {currentCount} / {isUnlimited ? '∞' : maxClaims}
          </span>
        </div>
        {!isUnlimited && (
          <div style={{ height: 6, background: '#1e1e1e', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${usagePct}%`,
              background: atCap ? '#C8102E' : usagePct > 80 ? '#FFB81C' : '#38bdf8',
              transition: 'width 0.3s',
            }} />
          </div>
        )}
        {atCap && (
          <p style={{ color: '#C8102E', fontSize: '0.8rem', margin: '0.75rem 0 0', lineHeight: 1.5 }}>
            You've reached the {maxClaims}-claim limit on the {tier} tier.{' '}
            <Link href="/pricing" style={{ color: '#FFB81C', textDecoration: 'underline' }}>
              Upgrade to Pro
            </Link>{' '}
            for unlimited claims and bulk claim.
          </p>
        )}
        {tier === 'free' && (
          <p style={{ color: '#FFB81C', fontSize: '0.8rem', margin: '0.75rem 0 0', lineHeight: 1.5 }}>
            The Free tier doesn't include claims.{' '}
            <Link href="/pricing" style={{ color: '#FFB81C', textDecoration: 'underline' }}>
              See paid plans
            </Link>{' '}
            starting at {formatTierPrice('supporter')}/year.
          </p>
        )}
      </div>

      {atCap ? (
        <div style={{
          background: 'rgba(200,16,46,0.06)',
          border: '1px solid rgba(200,16,46,0.3)',
          borderRadius: 12,
          padding: '2rem 1.5rem',
          textAlign: 'center',
        }}>
          <p style={{ color: '#C8102E', fontSize: '0.95rem', margin: '0 0 1rem', fontWeight: 600 }}>
            Claim limit reached
          </p>
          <p style={{ color: '#888', fontSize: '0.875rem', lineHeight: 1.6, margin: '0 0 1.25rem' }}>
            You've used all {maxClaims} claim slots on the {tier} tier. Upgrade to Pro for unlimited claims, bulk claim, and Featured Listing rotation.
          </p>
          <Link
            href="/pricing"
            style={{
              display: 'inline-block',
              background: '#C8102E',
              color: '#fff',
              borderRadius: 6,
              padding: '0.75rem 1.5rem',
              fontSize: '0.9rem',
              fontWeight: 700,
              textDecoration: 'none',
              letterSpacing: '0.02em',
            }}
          >
            Upgrade to Pro →
          </Link>
        </div>
      ) : tier === 'free' ? (
        <div style={{
          background: 'rgba(255,184,28,0.06)',
          border: '1px solid rgba(255,184,28,0.3)',
          borderRadius: 12,
          padding: '2rem 1.5rem',
          textAlign: 'center',
        }}>
          <p style={{ color: '#FFB81C', fontSize: '0.95rem', margin: '0 0 1rem', fontWeight: 600 }}>
            Upgrade required
          </p>
          <p style={{ color: '#888', fontSize: '0.875rem', lineHeight: 1.6, margin: '0 0 1.25rem' }}>
            Claiming listings is part of our paid membership. Supporter is {formatTierPrice('supporter')}/year (1 claim), Verified is {formatTierPrice('verified')}/year (up to 5), Pro is {formatTierPrice('pro')}/year (unlimited + bulk).
          </p>
          <Link
            href="/pricing"
            style={{
              display: 'inline-block',
              background: '#FFB81C',
              color: '#0a0a0a',
              borderRadius: 6,
              padding: '0.75rem 1.5rem',
              fontSize: '0.9rem',
              fontWeight: 700,
              textDecoration: 'none',
              letterSpacing: '0.02em',
            }}
          >
            See Plans →
          </Link>
        </div>
      ) : (
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
      )}
    </div>
  );
}
