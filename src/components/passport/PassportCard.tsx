/**
 * src/components/passport/PassportCard.tsx
 *
 * Display-only Passport Card (Phase 2C).
 *
 * Workstream 2 rule: read-only, no editing. Consumes data from
 * getDashboardState() — never queries Passport tables directly.
 *
 * Visual principles (per spec): professional, timeless, minimal, clean,
 * credible. Not social media, not gamification, not NFT.
 */

import type {
  PassportRecord,
  PassportUnifiedView,
} from '@/lib/passport/types';
import { PassportCardActions } from './PassportCardActions';

interface PassportCardProps {
  passport: PassportRecord;
  view: PassportUnifiedView | null;
  holderName: string;
  photoUrl?: string | null;
  /**
   * WS2 PR2 — QR image source. When provided, the Card renders the QR <img>
   * in the footer area. Server-side rendered. The endpoint is gated by
   * PASSPORT_INTERNAL_API + PASSPORT_ASSETS_API; the Card does not gate on
   * those flags here (the page-level /dashboard/passport route is responsible
   * for the master gate).
   */
  qrImageSrc?: string;
}

const STATUS_LABEL: Record<PassportRecord['status'], string> = {
  pending: 'Pending',
  active: 'Active',
  suspended: 'Suspended',
  deactivated: 'Archived',
};

const VERIFICATION_LABEL: Record<PassportRecord['verificationLevel'], string> = {
  none: 'Unverified',
  email_verified: 'Email Verified',
  id_verified: 'ID Verified',
  federation_verified: 'Federation Verified',
};

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function PassportCard({ passport, view, holderName, photoUrl, qrImageSrc }: PassportCardProps) {
  const cardStyle: React.CSSProperties = {
    background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 12,
    padding: '1.5rem',
    color: '#fff',
  };

  const fieldLabelStyle: React.CSSProperties = {
    fontSize: '0.6875rem',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: '0.25rem',
  };

  const fieldValueStyle: React.CSSProperties = {
    fontSize: '0.9375rem',
    color: '#fff',
    fontWeight: 500,
  };

  const passportIdStyle: React.CSSProperties = {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
    fontSize: '0.875rem',
    letterSpacing: '0.04em',
    color: '#FFB81C',
  };

  return (
    <section aria-label="Hockey Passport Card" style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <p style={{
            fontFamily: "'Bebas Neue', Impact, sans-serif",
            fontSize: '0.75rem',
            letterSpacing: '0.12em',
            color: 'rgba(255,255,255,0.5)',
            margin: 0,
          }}>
            RINKSTOP HOCKEY PASSPORT
          </p>
          <p style={{ ...passportIdStyle, marginTop: '0.25rem' }}>
            {passport?.passportId ?? 'Not yet issued'}
          </p>
        </div>
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={`${holderName}'s passport photo`}
            style={{
              width: 64, height: 64, borderRadius: '50%',
              objectFit: 'cover', border: '2px solid rgba(255,184,28,0.4)',
              flexShrink: 0,
            }}
          />
        ) : (
          <div
            aria-hidden="true"
            style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'rgba(255,184,28,0.1)',
              border: '2px solid rgba(255,184,28,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: '1.5rem', color: '#FFB81C', flexShrink: 0,
            }}
          >
            {holderName?.[0]?.toUpperCase() ?? '?'}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '1rem 1.25rem' }}>
        <div>
          <p style={fieldLabelStyle}>Passport Holder</p>
          <p style={fieldValueStyle}>{holderName || '—'}</p>
        </div>
        <div>
          <p style={fieldLabelStyle}>Status</p>
          <p style={fieldValueStyle}>{passport ? STATUS_LABEL[passport.status] : 'Pending issuance'}</p>
        </div>
        <div>
          <p style={fieldLabelStyle}>Verification Level</p>
          <p style={fieldValueStyle}>{passport ? VERIFICATION_LABEL[passport.verificationLevel] : 'Unverified'}</p>
        </div>
        <div>
          <p style={fieldLabelStyle}>Issue Date</p>
          <p style={fieldValueStyle}>{formatDate(passport?.issuedAt ?? null)}</p>
        </div>
        <div>
          <p style={fieldLabelStyle}>Member Since</p>
          <p style={fieldValueStyle}>{formatDate(passport?.createdAt ?? null)}</p>
        </div>
        <div>
          <p style={fieldLabelStyle}>Current Roles</p>
          <p style={fieldValueStyle}>{deriveRoles(view)}</p>
        </div>
      </div>

      {/*
        WS2 PR2 — bottom action footer with QR image and the three action buttons
        per workstreams/passport-card-design-system.md.
        Copy/Share/View actions are extracted to PassportCardActions.tsx so the
        Card itself stays server-rendered.
      */}
      <div
        style={{
          marginTop: '1.25rem',
          paddingTop: '1rem',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          gap: '1rem',
          alignItems: 'flex-end',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: '1 1 auto', minWidth: 0 }}>
          <p style={fieldLabelStyle}>QR Code</p>
          {qrImageSrc ? (
            <img
              src={qrImageSrc}
              alt="Hockey Passport QR code — scan to look up this Passport"
              width={120}
              height={120}
              style={{
                display: 'block',
                marginTop: '0.25rem',
                borderRadius: 6,
                background: '#fff',
                padding: 6,
              }}
            />
          ) : (
            <div
              aria-hidden="true"
              style={{
                width: 120,
                height: 120,
                borderRadius: 6,
                background: 'rgba(255,184,28,0.1)',
                border: '1px solid rgba(255,184,28,0.3)',
                marginTop: '0.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: '0.75rem',
                color: '#FFB81C',
                letterSpacing: '0.12em',
              }}
            >
              QR
            </div>
          )}
        </div>
        <div style={{ flex: '0 0 auto' }}>
          <PassportCardActions passportId={passport.passportId} />
        </div>
      </div>
    </section>
  );
}

function deriveRoles(view: PassportUnifiedView | null): string {
  if (!view) return '—';
  const roles: string[] = [];
  if (view.isPlayer) roles.push('Player');
  if (view.isCoach) roles.push('Coach');
  if (view.isParent) roles.push('Parent');
  if (view.isOrganizationAdmin) roles.push('Org Admin');
  return roles.length > 0 ? roles.join(' · ') : '—';
}