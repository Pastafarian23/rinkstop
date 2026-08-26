// src/app/admin/nhl-coaching-audit/page.tsx
//
// Admin-only page that surfaces all rows in nhl_coaching_staff whose notes
// field contains AUDIT-REQUIRED. Built so Arnel can review mid-season
// firings + truncated source notes before they ship publicly.
//
// Per Arnel's directive (2026-08-26): "We have to make sure this is completely
// accurate." This page is the gate.
//
// Access: same admin auth pattern as the rest of /admin/* (see src/lib/admin-auth.ts).

import { verifyCoachingAudit, stripAuditTag, ROLE_LABEL } from '@/lib/nhl-coaching';

export const metadata = {
  title: 'NHL Coaching Audit | Admin',
  robots: { index: false, follow: false },
};

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function extractReason(notes: string | null): string {
  if (!notes) return '';
  const m = notes.match(/\[AUDIT-REQUIRED:([^\]]+)\]/);
  return m ? m[1].trim() : 'no reason extracted';
}

export default async function NhlCoachingAuditPage() {
  // Auth is handled by src/app/admin/layout.tsx (requireAdmin).
  const flagged = await verifyCoachingAudit('2025-26');

  // Group by team for easier scanning
  const byTeam = new Map<string, typeof flagged>();
  for (const row of flagged) {
    const key = `${row.team_name} (id=${row.nhl_team_id})`;
    if (!byTeam.has(key)) byTeam.set(key, []);
    byTeam.get(key)!.push(row);
  }

  return (
    <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '1rem', color: '#e5e5e5' }}>
      <header style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#fff' }}>
          NHL Coaching Staff — Audit Review
        </h1>
        <p style={{ color: '#9ca3af', marginTop: '0.5rem', fontSize: '0.875rem' }}>
          {flagged.length} rows flagged for human review across {byTeam.size} teams.
          Each row below contains an <code>AUDIT-REQUIRED</code> tag in its notes field.
        </p>
        <p style={{ color: '#fbbf24', marginTop: '0.5rem', fontSize: '0.875rem' }}>
          ⚠️ Per Arnel&apos;s directive (2026-08-26): do not publicly display these rows
          until they have been verified against an authoritative source.
        </p>
      </header>

      {flagged.length === 0 ? (
        <div
          style={{
            background: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid rgba(34, 197, 94, 0.4)',
            color: '#22c55e',
            padding: '1rem',
            borderRadius: '6px',
          }}
        >
          ✅ All 2025-26 coaching staff rows have been audited. No flags remain.
        </div>
      ) : (
        Array.from(byTeam.entries()).map(([teamKey, rows]) => (
          <section
            key={teamKey}
            style={{
              marginBottom: '1.5rem',
              background: 'var(--s2)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '1rem',
            }}
          >
            <h2
              style={{
                fontSize: '1.1rem',
                fontWeight: 700,
                color: '#fff',
                marginBottom: '0.75rem',
              }}
            >
              {teamKey}{' '}
              <span
                style={{
                  color: '#fbbf24',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  marginLeft: '0.5rem',
                }}
              >
                {rows.length} flagged row{rows.length === 1 ? '' : 's'}
              </span>
            </h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.15)' }}>
                  <th style={{ textAlign: 'left', padding: '0.4rem', color: '#9ca3af', fontWeight: 600 }}>Role</th>
                  <th style={{ textAlign: 'left', padding: '0.4rem', color: '#9ca3af', fontWeight: 600 }}>Name</th>
                  <th style={{ textAlign: 'left', padding: '0.4rem', color: '#9ca3af', fontWeight: 600 }}>Tenure</th>
                  <th style={{ textAlign: 'left', padding: '0.4rem', color: '#9ca3af', fontWeight: 600 }}>Audit reason</th>
                  <th style={{ textAlign: 'left', padding: '0.4rem', color: '#9ca3af', fontWeight: 600 }}>Source notes (verbatim)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <td style={{ padding: '0.4rem' }}>{ROLE_LABEL[r.role]}</td>
                    <td style={{ padding: '0.4rem', fontWeight: 500 }}>{r.name}</td>
                    <td style={{ padding: '0.4rem', color: '#9ca3af' }}>
                      {fmtDate(r.start_date)} → {fmtDate(r.end_date)}
                    </td>
                    <td
                      style={{
                        padding: '0.4rem',
                        background: 'rgba(251, 191, 36, 0.1)',
                        color: '#fbbf24',
                        fontSize: '0.75rem',
                      }}
                    >
                      {extractReason(r.notes)}
                    </td>
                    <td style={{ padding: '0.4rem', color: '#d4d4d4' }}>
                      {stripAuditTag(r.notes) ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))
      )}

      <footer style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
        <p style={{ color: '#9ca3af', fontSize: '0.75rem' }}>
          To resolve a flag: verify the row against an authoritative source
          (NHL.com, The Athletic, official team PR), then run the
          <code style={{ marginLeft: '0.25rem', marginRight: '0.25rem' }}>update_nhl_coaching_staff_notes.sql</code>
          migration (or a follow-up commit) to strip the AUDIT-REQUIRED tag.
        </p>
      </footer>
    </main>
  );
}