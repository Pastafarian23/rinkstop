'use client';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
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
  maxClaims: number; // -1 means Federation/custom
  currentCount: number;
}

export default function ClaimsForm({ tier, maxClaims, currentCount }: ClaimsFormProps) {
  const searchParams = useSearchParams();
  // Read deep-link params (e.g. /dashboard/claims?entity=team&id=...&name=...)
  // and pre-fill the form. Supports entity=team|rink|player.
  // If the param is missing or invalid, fall back to the default (rink).
  const initialEntity = (() => {
    const e = searchParams?.get('entity');
    if (e === 'team' || e === 'player' || e === 'rink') return e;
    return 'rink' as const;
  })();
  const initialName = searchParams?.get('name') || '';
  const initialId = searchParams?.get('id') || '';

  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<ClaimForm>({
    claimType: initialEntity,
    entityName: initialName,
    entityId: initialId,
    reason: '',
    proof: '',
  });

  // Keep form in sync if URL params change (e.g. user navigates with new
  // ?entity=... after the form mounted). Most cases this is a no-op.
  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      claimType: initialEntity,
      entityName: prev.entityName || initialName,
      entityId: prev.entityId || initialId,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialEntity, initialName, initialId]);

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
  const isFree = tier === 'free' || maxClaims === 0;
  const atCap = !isUnlimited && !isFree && currentCount >= maxClaims;
  const usagePct = isUnlimited || isFree ? 0 : Math.min(100, Math.round((currentCount / Math.max(1, maxClaims)) * 100));

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

        {/* Why upgrade? prompt — shown only to free users after their first claim. */}
        {tier === 'free' && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(200,16,46,0.08) 0%, rgba(255,184,28,0.06) 100%)',
            border: '1px solid rgba(255,184,28,0.3)',
            borderRadius: 12,
            padding: '1.5rem 1.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.25rem' }}>⭐</span>
              <h3 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '1.1rem', color: '#FFB81C', letterSpacing: '0.04em', margin: 0 }}>
                CLAIM YOUR LISTING IS FREE — BUT HERE&apos;S WHAT YOU GET FOR $19.99/YR
              </h3>
            </div>
            <ul style={{ margin: 0, padding: '0 0 0 1.25rem', color: '#d1d5db', fontSize: '0.9rem', lineHeight: 1.7 }}>
              <li><strong style={{ color: '#fff' }}>Founding Member badge</strong> — limited to first 500 paid members</li>
              <li><strong style={{ color: '#fff' }}>24-hour claim review</strong> (vs 2 business days for free)</li>
              <li><strong style={{ color: '#fff' }}>Unlimited claims</strong> for your organization (free = 1)</li>
              <li><strong style={{ color: '#fff' }}>Weekly digest</strong> of activity on your listings</li>
            </ul>
            <Link
              href="/pricing?tier=verified_identity"
              style={{
                background: '#C8102E',
                color: '#fff',
                padding: '0.7rem 1.5rem',
                borderRadius: 8,
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: '0.95rem',
                textAlign: 'center',
                marginTop: '0.25rem',
                letterSpacing: '0.02em',
              }}
            >
              Become a Founding Member →
            </Link>
          </div>
        )}
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

      {/* Claim usage meter - only for paid tiers. Free tier skips the meter and goes straight to the upgrade panel. */}
      {!isFree && (
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
              {currentCount} / {isUnlimited ? 'Custom' : maxClaims}
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
              {tier === 'business_plus' || tier === 'federation' ? `You've reached the ${maxClaims}-claim limit.` : `You've reached the ${maxClaims}-claim limit on the ${tier} tier.`}{' '}
              <Link href="/pricing" style={{ color: '#FFB81C', textDecoration: 'underline' }}>
                {tier === 'business_plus' || tier === 'federation' ? 'Contact Sales' : 'Upgrade'}
              </Link>{' '}
              {tier === 'business_plus' || tier === 'federation' ? 'for custom claim volume and bulk claim.' : 'for more claims and bulk claim. If you need more, contact sales for Federation.'}
            </p>
          )}
        </div>
      )}

      {isFree ? (
        <div style={{
          background: 'rgba(255,184,28,0.06)',
          border: '1px solid rgba(255,184,28,0.3)',
          borderRadius: 12,
          padding: '2rem 1.5rem',
          textAlign: 'center',
        }}>
          <p style={{ color: '#FFB81C', fontSize: '0.95rem', margin: '0 0 1rem', fontWeight: 600 }}>
            Upgrade required to claim
          </p>
          <p style={{ color: '#888', fontSize: '0.875rem', lineHeight: 1.6, margin: '0 0 1.25rem' }}>
            The Free tier doesn't include claims. Verified Identity is {formatTierPrice('verified_identity')}/year (claim your profile + unlimited roles under one identity), Identity Plus is {formatTierPrice('identity_plus')}/year (Family Hub + advanced features), Business Listing is {formatTierPrice('business_listing')}/year (1 listing), Business Plus is {formatTierPrice('business_plus')}/year (multiple listings + featured placement), and Federation is custom for larger organizations.
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
      ) : atCap ? (
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
            {tier === 'business_plus' || tier === 'federation' ? `You've used all ${maxClaims} claim slots. Contact sales for Federation custom volume.` : `You've used all ${maxClaims} claim slots on the ${tier} tier. Upgrade for more claims. For more than 25, contact sales for Federation.`}
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
            {tier === 'business_plus' || tier === 'federation' ? 'Contact Sales →' : 'Upgrade →'}
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
