'use client';

/**
 * ComplianceScore — server-renderable team compliance widget.
 *
 * Shows a traffic-light overall score + per-doc-kind breakdown
 * based on required team_documents rows and their signature status.
 *
 * Designed for embedding in the team hub page without adding layout noise.
 */

import { Federation, FederationDoc } from '@/lib/federations';

// ─── Doc-kind → label (for display) ────────────────────────────────────────

const KIND_LABELS: Record<string, string> = {
  birth_cert: 'Birth Certificate',
  transfer: 'Transfer / Release',
  insurance: 'Insurance Certificate',
  safeguarding: 'Safeguarding / BG Check',
  medical_release: 'Medical Authorization',
  registration: 'Federation Registration',
  code_of_conduct: 'Code of Conduct',
  photo_id: 'Photo ID',
  injury_waiver: 'Injury / Concussion Waiver',
};

export function docKindLabel(kind: string): string {
  return KIND_LABELS[kind] ?? kind.replace(/_/g, ' ');
}

// ─── Overall score ─────────────────────────────────────────────────────────

export type ScoreLevel = 'green' | 'yellow' | 'red';

export interface DocStatus {
  kind: string;
  label: string;
  dueDate: string | null;
  signedCount: number;
  requiredCount: number;
  isExpired: boolean;
}

export interface ComplianceScoreData {
  score: ScoreLevel;
  label: string;
  /** Fraction 0–1 */
  pct: number;
  docs: DocStatus[];
  expiringSoon: DocStatus[];
  /** Loaded from DB; undefined if not set */
  countryCode?: string;
  federation?: Federation;
}

interface Props {
  data: ComplianceScoreData;
  teamSlug?: string;
  isAdmin?: boolean;
}

const DOT_COLOR: Record<ScoreLevel, string> = {
  green: '#22c55e',
  yellow: '#FFB81C',
  red: '#C8102E',
};

export function ComplianceWidget({ data, teamSlug, isAdmin }: Props) {
  const { score, label, pct, docs, expiringSoon, federation } = data;
  const dot = DOT_COLOR[score];

  const sectionStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 10,
    padding: '1rem 1.25rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.85rem',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '0.7rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: 'rgba(255,255,255,0.45)',
    margin: 0,
  };

  return (
    <div style={sectionStyle}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: dot,
            flexShrink: 0,
            boxShadow: `0 0 6px ${dot}`,
          }}
          aria-hidden
        />
        <span
          style={{
            fontSize: '0.9rem',
            fontWeight: 700,
            color: dot,
          }}
        >
          {label}
        </span>
        <span
          style={{
            marginLeft: 'auto',
            fontSize: '0.75rem',
            color: 'rgba(255,255,255,0.4)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {docs.length === 0 ? '—' : `${Math.round(pct * 100)}% complete`}
        </span>
      </div>

      {/* Progress bar */}
      {docs.length > 0 && (
        <div
          style={{
            height: 4,
            borderRadius: 2,
            background: 'rgba(255,255,255,0.1)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${pct * 100}%`,
              background: dot,
              borderRadius: 2,
              transition: 'width 0.4s ease',
            }}
          />
        </div>
      )}

      {/* Doc list */}
      {docs.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {docs.map((d) => {
            const statusColor =
              d.requiredCount === 0
                ? 'rgba(255,255,255,0.3)'
                : d.signedCount === d.requiredCount
                ? '#22c55e'
                : d.signedCount > 0
                ? '#FFB81C'
                : '#C8102E';
            return (
              <div
                key={d.kind}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.8rem',
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: statusColor,
                    flexShrink: 0,
                  }}
                  aria-hidden
                />
                <span
                  style={{
                    flex: 1,
                    color: d.requiredCount === 0 ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.75)',
                  }}
                >
                  {d.label}
                </span>
                <span
                  style={{
                    color: statusColor,
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {d.requiredCount === 0
                    ? 'N/A'
                    : d.requiredCount === d.signedCount
                    ? '✓'
                    : `${d.signedCount}/${d.requiredCount}`}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <p
          style={{
            fontSize: '0.8rem',
            color: 'rgba(255,255,255,0.4)',
            margin: 0,
            fontStyle: 'italic',
          }}
        >
          No required documents yet.
        </p>
      )}

      {/* Expiring soon */}
      {expiringSoon.length > 0 && (
        <div
          style={{
            borderTop: '1px solid rgba(255,255,255,0.07)',
            paddingTop: '0.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.4rem',
          }}
        >
          <p style={{ ...labelStyle, margin: '0 0 0.2rem' }}>⚠️ Expiring soon</p>
          {expiringSoon.map((d) => (
            <div
              key={`${d.kind}-${d.dueDate}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.78rem',
              }}
            >
              <span style={{ color: '#FFB81C' }}>⏱</span>
              <span style={{ color: 'rgba(255,255,255,0.7)', flex: 1 }}>{d.label}</span>
              <span style={{ color: '#FFB81C', fontSize: '0.72rem' }}>
                {d.dueDate ? new Date(d.dueDate + 'T00:00:00').toLocaleDateString() : 'No due date'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Federation info */}
      {federation && (
        <div
          style={{
            borderTop: '1px solid rgba(255,255,255,0.07)',
            paddingTop: '0.75rem',
            fontSize: '0.72rem',
            color: 'rgba(255,255,255,0.4)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.2rem',
          }}
        >
          <span>
            Governed by{' '}
            <a
              href={federation.federationUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#14B8A6', textDecoration: 'none' }}
            >
              {federation.federationName}
            </a>
            {' '}· {federation.governingBody}
          </span>
          {federation.ageGroupNote && (
            <span style={{ fontStyle: 'italic' }}>{federation.ageGroupNote}</span>
          )}
          {isAdmin && teamSlug && (
            <span>
              <a
                href={`/dashboard/team/${teamSlug}/documents`}
                style={{ color: '#14B8A6', textDecoration: 'none' }}
              >
                Manage documents →
              </a>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
