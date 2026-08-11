import Link from 'next/link';

/**
 * Phase 4A — Identity verification hint shown ABOVE the claim form.
 *
 * Goal: get users to verify BEFORE submitting, not after a rejection.
 * Verified claims get processed faster (we trust the identity, so we only
 * verify the business association) and skip the Didit back-and-forth.
 *
 * Three states:
 *   - verified = true  → green "You're verified" pill (no action needed)
 *   - verified = false → amber "Verify for faster review" with link to /dashboard/identity
 *   - hide entirely on free / at-cap / identity pages where it would be noise
 *
 * This is a server component, no client state. The link to /dashboard/identity
 * starts the Didit flow. ~$1.50/verification (kept on the tier-gated side
 * to prevent abuse).
 */
export function ClaimVerifyHint({ verified }: { verified: boolean }) {
  if (verified) {
    return (
      <div
        data-testid="claim-verify-hint-verified"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
          background: 'rgba(20,184,166,0.08)',
          border: '1px solid rgba(20,184,166,0.3)',
          borderRadius: 10,
          padding: '0.7rem 1rem',
          marginBottom: '1.25rem',
          fontSize: '0.85rem',
          color: 'rgba(255,255,255,0.85)',
          lineHeight: 1.4,
        }}
      >
        <span style={{ color: '#14B8A6', fontSize: '1.1rem', fontWeight: 700 }}>✓</span>
        <span style={{ flex: 1 }}>
          <strong style={{ color: '#14B8A6' }}>Identity verified</strong> — your claim skips the
          identity check during review and goes straight to association verification.
        </span>
      </div>
    );
  }

  return (
    <div
      data-testid="claim-verify-hint"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.85rem',
        background: 'rgba(255,184,28,0.06)',
        border: '1px solid rgba(255,184,28,0.3)',
        borderRadius: 10,
        padding: '0.85rem 1.1rem',
        marginBottom: '1.25rem',
      }}
    >
      <div style={{ fontSize: '1.4rem', flexShrink: 0 }}>🪪</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            color: '#FFB81C',
            fontWeight: 700,
            fontSize: '0.9rem',
            marginBottom: '0.3rem',
            letterSpacing: '0.01em',
          }}
        >
          Verify your identity to speed up review
        </div>
        <div
          style={{
            color: 'rgba(255,255,255,0.75)',
            fontSize: '0.825rem',
            lineHeight: 1.5,
            marginBottom: '0.65rem',
          }}
        >
          Claims with verified identity are processed within 24 hours. Without
          verification, our team has to manually confirm who you are (1–2 business days).
          Takes about 2 minutes with an ID + selfie.
        </div>
        <Link
          href="/dashboard/identity"
          style={{
            display: 'inline-block',
            background: '#FFB81C',
            color: '#0a0a0a',
            padding: '0.5rem 1rem',
            borderRadius: 6,
            textDecoration: 'none',
            fontWeight: 700,
            fontSize: '0.825rem',
            letterSpacing: '0.02em',
          }}
        >
          Verify now →
        </Link>
      </div>
    </div>
  );
}