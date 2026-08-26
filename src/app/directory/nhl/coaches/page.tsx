// src/app/directory/nhl/coaches/page.tsx
//
// Public listing of every 2025-26 NHL coaching staff member.
// Hides AUDIT-REQUIRED rows from public view (Arnel's directive 2026-08-26).
// Per-row opt-out instead of full table, so teams can have some rows
// public and others pending review.

import type { Metadata } from 'next';
import Link from 'next/link';
import {
  getAllCoachingStaff,
  ROLE_LABEL,
  STATUS_LABEL,
  STATUS_COLOR,
  stripAuditTag,
  hasAuditTag,
} from '@/lib/nhl-coaching';

export const metadata: Metadata = {
  title: 'NHL Coaches 2025-26 | Complete Coaching Staff Directory',
  description:
    'Every NHL head coach, assistant coach, and goaltending coach for the 2025-26 season. Mid-season firings, hirings, and interim coaches included.',
  alternates: { canonical: 'https://rinkstop.com/directory/nhl/coaches' },
};

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default async function NhlCoachesPage() {
  const all = await getAllCoachingStaff('2025-26');

  // Filter out rows flagged for audit. Keep unconfirmed-roster rows
  // (Montreal, NYR, Tampa Bay) visible because they're public information.
  const publicRows = all.filter((r) => !hasAuditTag(r.notes));
  const hiddenCount = all.length - publicRows.length;

  // Group by team, head coach first
  const byTeam = new Map<string, typeof publicRows>();
  for (const row of publicRows) {
    if (!byTeam.has(row.team_name)) byTeam.set(row.team_name, []);
    byTeam.get(row.team_name)!.push(row);
  }
  for (const rows of byTeam.values()) {
    rows.sort((a, b) => a.display_order - b.display_order || a.id - b.id);
  }

  // Sort teams alphabetically
  const teams = Array.from(byTeam.entries()).sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '0.75rem 1rem 3rem', color: '#e5e5e5' }}>
      {/* Breadcrumb */}
      <nav style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '1rem' }}>
        <Link href="/" style={{ color: 'rgba(255,255,255,0.5)' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/directory" style={{ color: 'rgba(255,255,255,0.5)' }}>Directory</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/directory/nhl" style={{ color: 'rgba(255,255,255,0.5)' }}>NHL</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: 'rgba(255,255,255,0.7)' }}>Coaches</span>
      </nav>

      <h1
        className="font-sport"
        style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#fff', letterSpacing: '0.02em', margin: 0 }}
      >
        2025-26 NHL Coaching Staff
      </h1>
      <p style={{ color: 'rgba(255,255,255,0.6)', marginTop: '0.5rem', fontSize: '0.875rem' }}>
        Every head coach, assistant coach, and goaltending coach for the 2025-26 NHL season.
        Mid-season firings, hirings, and interim appointments are included.
      </p>

      {hiddenCount > 0 && (
        <div
          style={{
            background: 'rgba(251, 191, 36, 0.08)',
            border: '1px solid rgba(251, 191, 36, 0.3)',
            borderRadius: '6px',
            padding: '0.75rem 1rem',
            marginTop: '1.25rem',
            color: '#fbbf24',
            fontSize: '0.8125rem',
          }}
        >
          ⚠️ {hiddenCount} rows are pending audit review and are temporarily hidden.
          See <Link href="/admin/nhl-coaching-audit" style={{ color: '#fbbf24', textDecoration: 'underline' }}>the admin audit page</Link> for the full list.
        </div>
      )}

      <div style={{ marginTop: '2rem' }}>
        {teams.map(([teamName, rows]) => (
          <section
            key={teamName}
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
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                paddingBottom: '0.5rem',
              }}
            >
              {teamName}
            </h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <th style={{ textAlign: 'left', padding: '0.4rem', color: '#9ca3af', fontWeight: 600 }}>Role</th>
                  <th style={{ textAlign: 'left', padding: '0.4rem', color: '#9ca3af', fontWeight: 600 }}>Name</th>
                  <th style={{ textAlign: 'left', padding: '0.4rem', color: '#9ca3af', fontWeight: 600 }}>Tenure</th>
                  <th style={{ textAlign: 'left', padding: '0.4rem', color: '#9ca3af', fontWeight: 600 }}>Status</th>
                  <th style={{ textAlign: 'left', padding: '0.4rem', color: '#9ca3af', fontWeight: 600 }}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '0.4rem', color: '#9ca3af' }}>{ROLE_LABEL[r.role]}</td>
                    <td style={{ padding: '0.4rem', fontWeight: 500 }}>{r.name}</td>
                    <td style={{ padding: '0.4rem', color: '#9ca3af' }}>
                      {fmtDate(r.start_date)} → {fmtDate(r.end_date)}
                    </td>
                    <td style={{ padding: '0.4rem' }}>
                      <span
                        style={{
                          background: `${STATUS_COLOR[r.status]}22`,
                          color: STATUS_COLOR[r.status],
                          padding: '0.1rem 0.4rem',
                          borderRadius: '3px',
                          fontSize: '0.7rem',
                          fontWeight: 500,
                        }}
                      >
                        {STATUS_LABEL[r.status]}
                      </span>
                    </td>
                    <td style={{ padding: '0.4rem', color: '#d4d4d4' }}>
                      {stripAuditTag(r.notes) ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}
      </div>

      <footer style={{ marginTop: '2.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>
          Data audited from team press releases and NHL reporting. If you spot an
          error, please open an issue at rinkstop.com/contact.
        </p>
      </footer>
    </main>
  );
}