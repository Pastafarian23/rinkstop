import { RoleChip } from './RoleChip';

export interface RosterMember {
  id: string;
  userId: string;
  displayName: string | null;
  username: string | null;
  role: string;
  jerseyNumber: number | null;
  position: string | null;
  joinedAt: string;
  isMinor: boolean;
}

export interface RosterMemberStatus {
  /** Total amount this member still owes (sum of amount_due - amount_paid for non-paid, non-waived records). */
  outstandingCents: number;
  /** ISO currency code (e.g. 'PHP', 'USD'). Same for all rows on a team. */
  currency: string;
  /** Number of required docs this member has signed. */
  docsSigned: number;
  /** Number of required docs that need this member's signature. */
  docsRequired: number;
}

export function RosterTable({
  members,
  statusByUserId,
  teamCurrency,
}: {
  members: RosterMember[];
  statusByUserId?: Record<string, RosterMemberStatus>;
  teamCurrency?: string;
}) {
  if (members.length === 0) {
    return (
      <div
        style={{
          background: '#0f0f0f',
          border: '1px solid #1e1e1e',
          borderRadius: 12,
          padding: '2rem 1.5rem',
          textAlign: 'center',
          color: 'rgba(255,255,255,0.5)',
        }}
      >
        <p style={{ margin: 0, fontSize: '0.9rem' }}>
          No members yet. Generate an invite code from the Invites tab to add players and staff.
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        background: '#0f0f0f',
        border: '1px solid #1e1e1e',
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '0.875rem',
        }}
      >
        <thead>
          <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid #1e1e1e' }}>
            <th style={thStyle}>Member</th>
            <th style={thStyle}>Role</th>
            <th style={thStyle}>#</th>
            <th style={thStyle}>Pos</th>
            {statusByUserId && <th style={thStyle}>Documents</th>}
            {statusByUserId && <th style={thStyle}>Fees</th>}
            <th style={thStyle}>Joined</th>
          </tr>
        </thead>
        <tbody>
          {members.map((m) => (
            <tr key={m.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <td style={tdStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #041E42 0%, #14B8A6 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 13,
                      fontWeight: 700,
                      color: '#fff',
                      flexShrink: 0,
                    }}
                    aria-hidden
                  >
                    {(m.displayName || m.username || '?').charAt(0).toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: '#fff', fontWeight: 600 }}>
                      {m.displayName || m.username || m.userId}
                    </div>
                    {m.username && (
                      <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.75rem' }}>
                        @{m.username}
                      </div>
                    )}
                    {m.isMinor && (
                      <div
                        style={{
                          color: '#F472B6',
                          fontSize: '0.7rem',
                          marginTop: 2,
                        }}
                      >
                        👶 Minor (parental consent on file)
                      </div>
                    )}
                  </div>
                </div>
              </td>
              <td style={tdStyle}>
                <RoleChip role={m.role} />
              </td>
              <td style={{ ...tdStyle, textAlign: 'center', color: 'rgba(255,255,255,0.7)' }}>
                {m.jerseyNumber ?? '—'}
              </td>
              <td style={{ ...tdStyle, color: 'rgba(255,255,255,0.6)' }}>{m.position ?? '—'}</td>
              {statusByUserId && (
                <td style={tdStyle}>
                  <DocsCell status={statusByUserId[m.userId]} />
                </td>
              )}
              {statusByUserId && (
                <td style={tdStyle}>
                  <FeesCell status={statusByUserId[m.userId]} fallbackCurrency={teamCurrency} />
                </td>
              )}
              <td style={{ ...tdStyle, color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>
                {new Date(m.joinedAt).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '0.75rem 1rem',
  fontSize: '0.7rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'rgba(255,255,255,0.5)',
};

const tdStyle: React.CSSProperties = {
  padding: '0.75rem 1rem',
  verticalAlign: 'middle',
};

// ─────────────────────────────────────────────────────────────────
// Per-member status cells
// ─────────────────────────────────────────────────────────────────

function DocsCell({ status }: { status?: RosterMemberStatus }) {
  if (!status || status.docsRequired === 0) {
    return <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.8rem' }}>—</span>;
  }
  const pct = status.docsSigned / status.docsRequired;
  let dot = '#22c55e'; // green
  let label = `${status.docsSigned}/${status.docsRequired}`;
  if (status.docsSigned === 0) {
    dot = '#C8102E';
    label = `0/${status.docsRequired}`;
  } else if (pct < 1) {
    dot = '#FFB81C';
  }
  return (
    <span
      title={`${status.docsSigned} of ${status.docsRequired} required documents signed`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        fontSize: '0.8rem',
        color: 'rgba(255,255,255,0.85)',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: dot,
          flexShrink: 0,
        }}
        aria-hidden
      />
      {label}
    </span>
  );
}

function FeesCell({
  status,
  fallbackCurrency,
}: {
  status?: RosterMemberStatus;
  fallbackCurrency?: string;
}) {
  if (!status) {
    return <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.8rem' }}>—</span>;
  }
  if (status.outstandingCents === 0) {
    return (
      <span
        title="All payments up to date"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem',
          fontSize: '0.8rem',
          color: '#22c55e',
        }}
      >
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }} aria-hidden />
        Paid up
      </span>
    );
  }
  const currency = status.currency || fallbackCurrency || 'USD';
  return (
    <span
      title={`${formatMoney(status.outstandingCents / 100, currency)} outstanding`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        fontSize: '0.8rem',
        color: '#FFB81C',
        fontVariantNumeric: 'tabular-nums',
        fontWeight: 600,
      }}
    >
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#FFB81C' }} aria-hidden />
      {formatMoney(status.outstandingCents / 100, currency)} owing
    </span>
  );
}

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(0)}`;
  }
}
