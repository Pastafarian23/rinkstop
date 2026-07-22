'use client';

/**
 * /dashboard/manage/rink/[id]/rink-qr-card.tsx
 *
 * WS3 PR5 — Operator QR card on the rink management page.
 *
 * Shows the rink's verification tier, the QR identifier, and a
 * scannable SVG (loaded lazily from /api/dashboard/manage/rink/[id]/qr).
 * Operator can download the SVG for printing on signs.
 *
 * If qr_revoked_at is set (rare — only happens after an admin rotation),
 * the card shows "Rotated" state and points the operator to contact
 * RinkStop for a new sign. The /api endpoint already returns 404 in that
 * case (handled by the lookup above), so the QR preview just shows the
 * revoked state.
 */

import { useEffect, useRef, useState } from 'react';

interface Props {
  rinkId: string;
  rinkName: string;
  qrIdentifier: string;
  verificationTier: string;
  qrRevokedAt: string | null;
}

const TIER_LABEL: Record<string, string> = {
  unverified: 'Unverified',
  self_reported: 'Self-reported',
  claimed: 'Claimed',
  federation_verified: 'Federation verified',
  nhl_arena: 'NHL arena',
};

const TIER_COLOR: Record<string, { bg: string; fg: string }> = {
  unverified: { bg: 'rgba(148,163,184,0.15)', fg: '#cbd5e1' },
  self_reported: { bg: 'rgba(148,163,184,0.15)', fg: '#cbd5e1' },
  claimed: { bg: 'rgba(20,184,166,0.12)', fg: '#14B8A6' },
  federation_verified: { bg: 'rgba(99,102,241,0.15)', fg: '#a5b4fc' },
  nhl_arena: { bg: 'rgba(255,184,28,0.15)', fg: '#FFB81C' },
};

export function RinkQrCard({
  rinkId,
  rinkName,
  qrIdentifier,
  verificationTier,
  qrRevokedAt,
}: Props) {
  const [svg, setSvg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (qrRevokedAt) return;
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    setLoading(true);
    fetch(`/api/dashboard/manage/rink/${rinkId}/qr`)
      .then(async (res) => {
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(body.error ?? `Request failed (${res.status})`);
        }
        return res.text();
      })
      .then((text) => setSvg(text))
      .catch((err) => setError(err instanceof Error ? err.message : 'Network error'))
      .finally(() => setLoading(false));
  }, [rinkId, qrRevokedAt]);

  const tierStyle = TIER_COLOR[verificationTier] ?? TIER_COLOR.unverified;

  return (
    <section
      style={{
        background: '#0f0f0f',
        border: '1px solid #1e1e1e',
        borderRadius: 12,
        padding: '1.5rem 1.75rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{ fontSize: '1.5rem' }}>📱</div>
        <h2
          style={{
            fontFamily: "'Bebas Neue', Impact, sans-serif",
            fontSize: '1.15rem',
            color: '#fff',
            letterSpacing: '0.05em',
            margin: 0,
            flex: 1,
          }}
        >
          PASSPORT QR CODE
        </h2>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            padding: '0.2rem 0.55rem',
            borderRadius: 999,
            background: tierStyle.bg,
            color: tierStyle.fg,
            border: `1px solid ${tierStyle.fg}33`,
          }}
        >
          {TIER_LABEL[verificationTier] ?? verificationTier}
        </span>
      </div>

      {qrRevokedAt ? (
        <div
          style={{
            background: 'rgba(252,165,165,0.08)',
            border: '1px solid rgba(252,165,165,0.3)',
            borderRadius: 8,
            padding: '1rem 1.25rem',
            color: '#FCA5A5',
            fontSize: '0.9rem',
          }}
        >
          <strong>This QR was rotated on {new Date(qrRevokedAt).toLocaleDateString()}.</strong>{' '}
          Old printed signs no longer work. Contact RinkStop support to get
          a new QR for {rinkName}.
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div
            style={{
              width: 200,
              height: 200,
              background: '#fff',
              borderRadius: 8,
              padding: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {loading && <span style={{ color: '#041E42', fontSize: 12 }}>Loading…</span>}
            {error && (
              <span style={{ color: '#b91c1c', fontSize: 12, textAlign: 'center' }}>
                {error}
              </span>
            )}
            {svg && (
              <div
                aria-label={`QR code for ${rinkName}`}
                style={{ width: '100%', height: '100%' }}
                dangerouslySetInnerHTML={{ __html: svg }}
              />
            )}
          </div>

          <div style={{ flex: 1, minWidth: 240 }}>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', margin: '0 0 12px', lineHeight: 1.5 }}>
              Print this QR and post it at your rink entrance, scorekeeper
              table, or locker room. When visitors scan it with their phone
              camera, it opens the Hockey Passport stamp confirmation page
              for {rinkName}.
            </p>

            <dl style={{ margin: 0, fontSize: '0.85rem' }}>
              <Row label="QR identifier" value={qrIdentifier} mono />
              <Row label="Resolves to" value="/qr/[identifier]" mono />
            </dl>

            <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
              <a
                href={`/api/dashboard/manage/rink/${rinkId}/qr`}
                download={`rinkstop-qr-${qrIdentifier.slice(0, 8)}.svg`}
                style={{
                  background: '#14B8A6',
                  color: '#0a0a0a',
                  padding: '0.5rem 1rem',
                  borderRadius: 6,
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  textDecoration: 'none',
                  display: 'inline-block',
                }}
              >
                Download SVG
              </a>
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    window.open(
                      `https://rinkstop.com/qr/${qrIdentifier}`,
                      '_blank',
                      'noopener,noreferrer'
                    );
                  }
                }}
                style={{
                  background: 'transparent',
                  color: '#14B8A6',
                  border: '1px solid #14B8A6',
                  padding: '0.5rem 1rem',
                  borderRadius: 6,
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Test scan
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 12,
        padding: '6px 0',
        borderTop: '1px solid #1e1e1e',
      }}
    >
      <dt
        style={{
          fontSize: 11,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.5)',
          margin: 0,
        }}
      >
        {label}
      </dt>
      <dd
        style={{
          color: '#fff',
          fontSize: mono ? 12 : 13,
          fontFamily: mono ? 'ui-monospace, monospace' : 'inherit',
          margin: 0,
          textAlign: 'right',
          wordBreak: 'break-all',
        }}
      >
        {value}
      </dd>
    </div>
  );
}
