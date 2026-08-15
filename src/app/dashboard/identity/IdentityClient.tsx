'use client';

/**
 * IdentityClient — the actual UI for /dashboard/identity
 *
 * States:
 *   - canVerify=false → upgrade CTA (Verified Identity or Business Listing+ required)
 *   - status='active'  → "Identity verified" with date + expiry
 *   - status='expired' → "Re-verify" CTA
 *   - status='never_verified' OR 'in_progress' → "Verify" CTA + iframe after start
 *
 * After clicking "Verify":
 *   1. POST /api/identity/verify/start → get didit url
 *   2. Open url in iframe (Option B: hosted embed, no redirect)
 *   3. User completes on Didit
 *   4. Didit redirects to ?return=1 → page re-mounts, polls /api/identity/status
 *   5. status becomes 'active' → success screen
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Status = 'never_verified' | 'active' | 'expired' | 'in_progress';

interface Props {
  canVerify: boolean;
  tier: string;
  status: Status;
  identityVerifiedAt: string | null;
  identityExpiresAt: string | null;
  daysUntilExpiry: number | null;
  method: string | null;
  latestSessionId: string | null;
  returnFromDidit: boolean;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

const STATUS_COPY: Record<Status, { title: string; body: string; ctaLabel?: string }> = {
  never_verified: {
    title: 'Verify your identity',
    body:
      'Verify with a government-issued ID and a quick selfie match. The verification takes about 60 seconds and adds an "Identity verified" check to your profile.',
    ctaLabel: 'Start verification',
  },
  in_progress: {
    title: 'Verification in progress',
    body: 'Complete the verification in the window below to finish setting up your verified identity.',
  },
  active: {
    title: 'Identity verified',
    body: 'Your government ID has been verified by Didit.me. The check appears on your profile and re-verifies automatically every 2 years.',
  },
  expired: {
    title: 'Verification expired',
    body: 'Your verification has expired. Re-verify to keep the "Identity verified" check on your profile.',
    ctaLabel: 'Re-verify now',
  },
};

export default function IdentityClient({
  canVerify,
  tier,
  status: initialStatus,
  identityVerifiedAt,
  identityExpiresAt,
  daysUntilExpiry,
  method,
  latestSessionId,
  returnFromDidit,
}: Props) {
  const [status, setStatus] = useState<Status>(initialStatus);
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [iframeError, setIframeError] = useState<string | null>(null);
  const iframeRef = React.useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    if (!iframeUrl) return;
    const frame = iframeRef.current;
    if (!frame) return;
    const handler = () => setIframeError('Browser blocked the iframe load. Check DevTools Network for X-Frame-Options / frame-ancestors on the iframe response.');
    frame.addEventListener('error', handler);
    return () => frame.removeEventListener('error', handler);
  }, [iframeUrl]);

  // If the user came back from Didit (via callback URL ?return=1),
  // poll the decision endpoint and update the status.
  useEffect(() => {
    if (!returnFromDidit || !latestSessionId) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch(`/api/identity/verify/decision?session_id=${latestSessionId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        if (data.approved) {
          setStatus('active');
          setIframeUrl(null);
        } else if (['declined', 'abandoned'].includes(data.status)) {
          setStatus('never_verified');
          setIframeUrl(null);
        }
      } catch (err) {
        // polling failure is non-fatal
      }
    };
    poll();
    return () => { cancelled = true; };
  }, [returnFromDidit, latestSessionId]);

  // While the iframe is open, poll status every 5s (Didit redirects to ?return=1 when done,
  // but the webhook may also land first — so polling catches both paths).
  useEffect(() => {
    if (!iframeUrl) return;
    let cancelled = false;
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/identity/status');
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        if (data.status === 'active') {
          setStatus('active');
          setIframeUrl(null);
        }
      } catch { /* polling failure is non-fatal */ }
    }, 5000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [iframeUrl]);

  const startVerification = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/identity/verify/start', { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 409 && data.error === 'already_verified') {
          setStatus('active');
          return;
        }
        if (res.status === 403 && data.error === 'tier_required') {
          setError('Identity verification requires a paid tier.');
          return;
        }
        setError(data.message || 'Failed to start verification');
        return;
      }
      const data = await res.json();
      setIframeUrl(data.url);
      setSessionId(data.session_id);
      setStatus('in_progress');
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copy = STATUS_COPY[status] || STATUS_COPY.never_verified;

  const debugSrc = iframeUrl ? new URL(iframeUrl).host : null;

  // Iframe open → in_progress view
  if (iframeUrl) {
    return (
      <div style={{ maxWidth: 880 }}>
        <h1 style={titleStyle}>Complete your verification</h1>
        <p style={bodyStyle}>
          Didit is loading in the secure window below. Have your government-issued ID ready.
        </p>
        {debugSrc && (
          <p style={{ color: '#FFB81C', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
            Debug iframe host: {debugSrc}
          </p>
        )}
        {iframeError && (
          <div style={{ ...errorBoxStyle, marginBottom: '0.75rem' }} role="alert">
            {iframeError}
          </div>
        )}
        <div style={iframeWrapStyle}>
          <iframe
            ref={iframeRef}
            src={iframeUrl}
            title="Identity verification"
            style={iframeStyle}
            allow="camera; microphone; autoplay; encrypted-media; fullscreen"
            referrerPolicy="no-referrer"
            data-testid="identity-iframe"
          />
        </div>
        <p style={smallNoteStyle}>
          Session ID: <code>{sessionId}</code>. If the window doesn't load,{' '}
          <a
            href={iframeUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#FFB81C' }}
          >
            open it in a new tab
          </a>.
        </p>
      </div>
    );
  }
  if (!canVerify) {
    return (
      <div style={{ maxWidth: 720 }}>
        <h1 style={titleStyle}>Identity verification</h1>
        <p style={bodyStyle}>
          Identity verification is available on <strong>Verified Identity</strong> (personal) or <strong>Business Listing</strong> (business). It costs you $0 — the platform absorbs the fee.
        </p>
        <div style={cardStyle}>
          <p style={{ ...bodyStyle, marginBottom: '1.25rem' }}>
            Upgrade to Verified Identity ($24.99/yr) to verify your identity with a government-issued ID + selfie match. The "Identity verified" check appears on your profile and re-verifies every 2 years.
          </p>
          <Link
            href="/pricing"
            style={primaryButtonStyle}
            data-testid="identity-upgrade-cta"
          >
            See pricing
          </Link>
        </div>
        <p style={smallNoteStyle}>Current tier: {tier}</p>
      </div>
    );
  }

  // Iframe open → in_progress view
  if (iframeUrl) {
    return (
      <div style={{ maxWidth: 880 }}>
        <h1 style={titleStyle}>Complete your verification</h1>
        <p style={bodyStyle}>
          Didit is loading in the secure window below. Have your government-issued ID ready.
        </p>
        <div style={iframeWrapStyle}>
          <iframe
            src={iframeUrl}
            title="Identity verification"
            style={iframeStyle}
            allow="camera; microphone; autoplay; encrypted-media; fullscreen"
            referrerPolicy="no-referrer"
            data-testid="identity-iframe"
          />
        </div>
        <p style={smallNoteStyle}>
          Session ID: <code>{sessionId}</code>. If the window doesn't load,{' '}
          <a
            href={iframeUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#FFB81C' }}
          >
            open it in a new tab
          </a>.
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <h1 style={titleStyle}>{copy.title}</h1>
      <p style={bodyStyle}>{copy.body}</p>

      {error && (
        <div style={errorBoxStyle} role="alert">
          {error}
        </div>
      )}

      {status === 'active' && (
        <div style={successCardStyle}>
          <div style={successCheckStyle}>✓</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#FFB81C', marginBottom: '0.4rem' }}>
              Verified {formatDate(identityVerifiedAt)}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', lineHeight: 1.55 }}>
              Method: {method === 'didit_passport' ? 'Passport' : method === 'didit_id_card' ? 'Government ID' : method === 'didit_selfie_only' ? 'Selfie match' : method || '—'}<br />
              Expires: {formatDate(identityExpiresAt)}{' '}
              {daysUntilExpiry !== null && daysUntilExpiry > 0 && (
                <span style={{ color: 'rgba(255,255,255,0.5)' }}>({daysUntilExpiry} days)</span>
              )}
            </div>
          </div>
        </div>
      )}

      {status === 'expired' && (
        <div style={warningCardStyle}>
          <strong>Expired on {formatDate(identityExpiresAt)}.</strong> Re-verify to keep the check on your profile.
        </div>
      )}

      {copy.ctaLabel && (
        <button
          onClick={startVerification}
          disabled={loading}
          style={primaryButtonStyle}
          data-testid="identity-start-cta"
        >
          {loading ? 'Loading…' : copy.ctaLabel}
        </button>
      )}

      <div style={howItWorksStyle}>
        <h2 style={{ fontSize: '1.1rem', color: '#fff', margin: '2rem 0 0.85rem', fontFamily: "'Bebas Neue', Impact, sans-serif", letterSpacing: '0.03em' }}>
          How it works
        </h2>
        <ol style={{ color: 'rgba(255,255,255,0.7)', lineHeight: 1.7, paddingLeft: '1.25rem' }}>
          <li>We open a secure window from <a href="https://didit.me" style={{ color: '#FFB81C' }} target="_blank" rel="noopener noreferrer">Didit.me</a> — a regulated identity provider.</li>
          <li>You scan your government-issued ID (passport, driver's license, or national ID).</li>
          <li>You take a quick selfie for a face match.</li>
          <li>Didit returns a "verified" signal. We store only the audit fields (status, country, document type, scores) — never your ID image or document number.</li>
          <li>The "Identity verified" check appears on your profile.</li>
          <li>Re-verify every 2 years. We'll prompt you 30 days before expiry.</li>
        </ol>
        <p style={{ marginTop: '1rem', color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>
          RinkStop never sees your ID image, document number, or biometric data. We get a "yes/no" signal from Didit, plus non-PII audit fields (country, document type, liveness score).
        </p>
      </div>
    </div>
  );
}

// ---------- styles ----------

const titleStyle: React.CSSProperties = {
  fontFamily: "'Bebas Neue', Impact, sans-serif",
  fontSize: '2rem',
  color: '#fff',
  margin: '0 0 0.5rem',
  letterSpacing: '0.04em',
};

const bodyStyle: React.CSSProperties = {
  color: 'rgba(255,255,255,0.7)',
  fontSize: '0.95rem',
  lineHeight: 1.6,
  margin: '0 0 1.25rem',
};

const cardStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8,
  padding: '1.5rem',
  marginTop: '0.5rem',
};

const primaryButtonStyle: React.CSSProperties = {
  display: 'inline-block',
  background: '#C8102E',
  color: '#fff',
  border: 'none',
  padding: '0.85rem 1.5rem',
  borderRadius: 6,
  fontSize: '0.95rem',
  fontWeight: 600,
  cursor: 'pointer',
  textDecoration: 'none',
  marginTop: '0.5rem',
};

const iframeWrapStyle: React.CSSProperties = {
  background: '#fff',
  borderRadius: 8,
  overflow: 'hidden',
  margin: '1rem 0',
  border: '1px solid rgba(255,255,255,0.1)',
  minHeight: 560,
};

const iframeStyle: React.CSSProperties = {
  width: '100%',
  height: 640,
  border: 'none',
  display: 'block',
};

const smallNoteStyle: React.CSSProperties = {
  color: 'rgba(255,255,255,0.4)',
  fontSize: '0.8rem',
  marginTop: '1rem',
};

const errorBoxStyle: React.CSSProperties = {
  background: 'rgba(200, 16, 46, 0.15)',
  border: '1px solid rgba(200, 16, 46, 0.4)',
  color: '#ffcdd3',
  padding: '0.85rem 1rem',
  borderRadius: 6,
  marginBottom: '1rem',
  fontSize: '0.9rem',
};

const successCardStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '1rem',
  background: 'rgba(255, 184, 28, 0.08)',
  border: '1px solid rgba(255, 184, 28, 0.35)',
  borderRadius: 8,
  padding: '1.25rem',
  margin: '1rem 0',
};

const successCheckStyle: React.CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: 22,
  background: '#041E42',
  border: '2px solid #FFB81C',
  color: '#FFB81C',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '1.4rem',
  fontWeight: 700,
  flexShrink: 0,
};

const warningCardStyle: React.CSSProperties = {
  background: 'rgba(255, 184, 28, 0.1)',
  border: '1px solid rgba(255, 184, 28, 0.3)',
  color: '#FFB81C',
  padding: '0.85rem 1rem',
  borderRadius: 6,
  margin: '1rem 0',
  fontSize: '0.9rem',
};

const howItWorksStyle: React.CSSProperties = {
  marginTop: '2.5rem',
  paddingTop: '1.5rem',
  borderTop: '1px solid rgba(255,255,255,0.1)',
};
