// src/components/CoachingStaffSection.tsx
//
// Renders a team's 2025-26 NHL coaching staff as a compact table.
// Shown on /directory/nhl/teams/[slug]/page.tsx below the roster section.
//
// Renders a yellow "Pending review" badge on rows whose notes contain
// AUDIT-REQUIRED (mid-season firings, truncated source notes, etc.).
// Clicking the badge reveals the audit reason.

import {
  NhlCoachRow,
  ROLE_LABEL,
  STATUS_LABEL,
  STATUS_COLOR,
  stripAuditTag,
  hasAuditTag,
} from '@/lib/nhl-coaching';

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function extractAuditReason(notes: string | null): string | null {
  if (!notes) return null;
  const m = notes.match(/\[AUDIT-REQUIRED:([^\]]+)\]/);
  return m ? m[1].trim() : null;
}

export default function CoachingStaffSection({
  staff,
  season,
}: {
  staff: NhlCoachRow[];
  season: string;
}) {
  if (staff.length === 0) return null;

  const hasAnyAudit = staff.some((s) => hasAuditTag(s.notes));

  return (
    <section
      aria-labelledby="coaching-staff-heading"
      style={{ marginTop: '2.5rem' }}
    >
      <h2
        id="coaching-staff-heading"
        style={{
          fontSize: '1.5rem',
          fontWeight: 700,
          marginBottom: '0.5rem',
          color: '#fff',
        }}
      >
        {season} Coaching Staff
      </h2>
      {hasAnyAudit && (
        <p
          style={{
            background: 'rgba(251, 191, 36, 0.1)',
            border: '1px solid rgba(251, 191, 36, 0.4)',
            borderRadius: '6px',
            padding: '0.5rem 0.75rem',
            marginBottom: '1rem',
            color: '#fbbf24',
            fontSize: '0.875rem',
          }}
        >
          ⚠️ Some rows are pending audit review before public release.
        </p>
      )}
      <div style={{ overflowX: 'auto' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '0.875rem',
            color: '#e5e5e5',
          }}
        >
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.15)' }}>
              <th
                scope="col"
                style={{ textAlign: 'left', padding: '0.5rem', fontWeight: 600 }}
              >
                Role
              </th>
              <th
                scope="col"
                style={{ textAlign: 'left', padding: '0.5rem', fontWeight: 600 }}
              >
                Name
              </th>
              <th
                scope="col"
                style={{ textAlign: 'left', padding: '0.5rem', fontWeight: 600 }}
              >
                Tenure
              </th>
              <th
                scope="col"
                style={{ textAlign: 'left', padding: '0.5rem', fontWeight: 600 }}
              >
                Status
              </th>
              <th
                scope="col"
                style={{ textAlign: 'left', padding: '0.5rem', fontWeight: 600 }}
              >
                Notes
              </th>
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => {
              const audit = hasAuditTag(s.notes);
              const reason = extractAuditReason(s.notes);
              const cleanNotes = stripAuditTag(s.notes);
              return (
                <tr
                  key={s.id}
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <td style={{ padding: '0.5rem', color: '#9ca3af' }}>
                    {ROLE_LABEL[s.role]}
                  </td>
                  <td style={{ padding: '0.5rem', fontWeight: 500 }}>
                    {s.name}
                    {audit && (
                      <button
                        type="button"
                        title={reason ?? 'Pending audit review'}
                        style={{
                          marginLeft: '0.5rem',
                          background: 'rgba(251, 191, 36, 0.15)',
                          border: '1px solid rgba(251, 191, 36, 0.5)',
                          color: '#fbbf24',
                          fontSize: '0.7rem',
                          padding: '0.125rem 0.4rem',
                          borderRadius: '4px',
                          cursor: 'help',
                        }}
                      >
                        Pending review
                      </button>
                    )}
                  </td>
                  <td style={{ padding: '0.5rem', color: '#9ca3af' }}>
                    {fmtDate(s.start_date)} → {fmtDate(s.end_date)}
                  </td>
                  <td style={{ padding: '0.5rem' }}>
                    <span
                      style={{
                        background: `${STATUS_COLOR[s.status]}22`,
                        color: STATUS_COLOR[s.status],
                        padding: '0.125rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                      }}
                    >
                      {STATUS_LABEL[s.status]}
                    </span>
                  </td>
                  <td style={{ padding: '0.5rem', color: '#d4d4d4', fontSize: '0.8125rem' }}>
                    {cleanNotes ?? '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}