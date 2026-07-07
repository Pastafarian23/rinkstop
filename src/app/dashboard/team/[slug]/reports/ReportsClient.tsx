'use client';

import { useEffect, useState } from 'react';

interface ReportSummary {
  period: string;
  payments_count: number;
  total_invoiced: number;
  total_paid: number;
  total_outstanding: number;
  overdue_count: number;
  paid_count: number;
  pending_count: number;
}

interface ByStatusRow {
  id: string;
  title: string;
  invoiced: number;
  paid: number;
  outstanding: number;
  records: number;
  paid_records: number;
}

interface RecentRow {
  id: string;
  payment_id: string;
  amount_due: number | null;
  amount_paid: number | null;
  status: string;
  paid_at: string | null;
}

interface ReportsClientProps {
  teamSlug: string;
  teamName: string;
  userId: string;
}

function fmtMoney(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function ReportsClient({ teamSlug, teamName, userId: _userId }: ReportsClientProps) {
  const [period, setPeriod] = useState<'last_30_days' | 'last_90_days' | 'ytd' | 'all'>('last_90_days');
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [byStatus, setByStatus] = useState<ByStatusRow[]>([]);
  const [recent, setRecent] = useState<RecentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/team/${teamSlug}/reports/financial?period=${period}`)
      .then((r) => r.ok ? r.json() : Promise.reject(r))
      .then((d) => {
        if (cancelled) return;
        setSummary(d.summary || null);
        setByStatus(d.by_status || []);
        setRecent(d.recent_payments || []);
      })
      .catch((e) => {
        if (cancelled) return;
        const msg = (e && typeof e === 'object' && 'json' in e) ? 'Could not load report' : (e instanceof Error ? e.message : String(e));
        setError(msg);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [teamSlug, period]);

  return (
    <div
      data-testid="team-reports"
      style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: 960, margin: '0 auto' }}
    >
      <header>
        <h1
          style={{
            fontFamily: "'Bebas Neue', Impact, sans-serif",
            fontSize: '1.5rem', color: '#fff', letterSpacing: '0.05em', margin: '0 0 0.25rem',
          }}
        >
          FINANCIAL REPORTING — {teamName}
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.875rem', margin: 0 }}>
          Aggregated payment data for this org. v1 derives from payments and payment_records.
        </p>
      </header>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {(['last_30_days', 'last_90_days', 'ytd', 'all'] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPeriod(p)}
            data-testid={`reports-period-${p}`}
            style={{
              padding: '0.4rem 0.85rem',
              background: period === p ? 'rgba(20,184,166,0.15)' : 'transparent',
              border: `1px solid ${period === p ? 'rgba(20,184,166,0.4)' : 'rgba(255,255,255,0.15)'}`,
              color: period === p ? '#14B8A6' : 'rgba(255,255,255,0.65)',
              borderRadius: 6,
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {p === 'last_30_days' ? 'Last 30 days' : p === 'last_90_days' ? 'Last 90 days' : p === 'ytd' ? 'Year to date' : 'All time'}
          </button>
        ))}
      </div>

      {error ? (
        <div
          role="alert"
          style={{
            padding: '0.65rem 0.85rem',
            background: 'rgba(200,16,46,0.12)',
            border: '1px solid rgba(200,16,46,0.4)',
            borderRadius: 8,
            color: '#FF6B7A',
            fontSize: '0.85rem',
          }}
        >
          {error}
        </div>
      ) : null}

      {loading ? (
        <div style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '2rem 0' }}>Loading…</div>
      ) : summary ? (
        <>
          {/* Summary cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 12,
            }}
          >
            <SummaryCard label="Total invoiced" value={fmtMoney(summary.total_invoiced)} accent="#fff" />
            <SummaryCard label="Total paid" value={fmtMoney(summary.total_paid)} accent="#14B8A6" />
            <SummaryCard label="Outstanding" value={fmtMoney(summary.total_outstanding)} accent="#FFB81C" />
            <SummaryCard label="Overdue records" value={String(summary.overdue_count)} accent={summary.overdue_count > 0 ? '#FF6B7A' : '#fff'} />
            <SummaryCard label="Paid records" value={String(summary.paid_count)} accent="#14B8A6" />
            <SummaryCard label="Pending records" value={String(summary.pending_count)} accent="#fff" />
            <SummaryCard label="Payments" value={String(summary.payments_count)} accent="#fff" />
          </div>

          {/* By payment */}
          <section
            style={{
              background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: 12, padding: '1.25rem',
            }}
          >
            <h2
              style={{
                fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '1.05rem', color: '#fff', letterSpacing: '0.05em',
                margin: '0 0 0.75rem',
              }}
            >
              BY PAYMENT
            </h2>
            {byStatus.length === 0 ? (
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>No payments in this period.</p>
            ) : (
              <table
                style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}
              >
                <thead>
                  <tr style={{ borderBottom: '1px solid #1e1e1e' }}>
                    <Th>Title</Th>
                    <Th align="right">Invoiced</Th>
                    <Th align="right">Paid</Th>
                    <Th align="right">Outstanding</Th>
                    <Th align="right">Records</Th>
                  </tr>
                </thead>
                <tbody>
                  {byStatus.map((row) => (
                    <tr key={row.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <Td>{row.title}</Td>
                      <Td align="right">{fmtMoney(row.invoiced)}</Td>
                      <Td align="right">{fmtMoney(row.paid)}</Td>
                      <Td align="right" color={row.outstanding > 0 ? '#FFB81C' : '#14B8A6'}>{fmtMoney(row.outstanding)}</Td>
                      <Td align="right">{row.paid_records} / {row.records}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          {/* Recent */}
          <section
            style={{
              background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: 12, padding: '1.25rem',
            }}
          >
            <h2
              style={{
                fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '1.05rem', color: '#fff', letterSpacing: '0.05em',
                margin: '0 0 0.75rem',
              }}
            >
              RECENT PAYMENTS
            </h2>
            {recent.length === 0 ? (
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>No completed payments in this period.</p>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {recent.map((r) => (
                  <li
                    key={r.id}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '0.5rem 0.75rem', background: '#0a0a0a', border: '1px solid #141414', borderRadius: 6,
                      color: '#fff', fontSize: '0.85rem',
                    }}
                  >
                    <span style={{ color: 'rgba(255,255,255,0.5)' }}>{fmtDate(r.paid_at)}</span>
                    <span style={{ color: '#14B8A6' }}>{fmtMoney(r.amount_paid ?? 0)}</span>
                    <span style={{ color: 'rgba(255,255,255,0.4)' }}>record {r.id.slice(0, 8)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}

function SummaryCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div
      style={{
        background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: 10, padding: '0.85rem 1rem',
      }}
    >
      <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ color: accent, fontSize: '1.25rem', fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function Th({ children, align }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <th
      style={{
        textAlign: align || 'left', color: 'rgba(255,255,255,0.55)', fontSize: '0.7rem',
        textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0.4rem 0.5rem', fontWeight: 600,
      }}
    >
      {children}
    </th>
  );
}

function Td({ children, align, color }: { children: React.ReactNode; align?: 'left' | 'right'; color?: string }) {
  return (
    <td style={{ textAlign: align || 'left', color: color || '#fff', padding: '0.5rem' }}>{children}</td>
  );
}
