'use client';

/**
 * src/app/admin/funnel/FunnelView.tsx
 *
 * Client component that renders two funnel tables (business + personal)
 * with a window dropdown. Refreshes data when the dropdown changes.
 *
 * Server fetches the initial data on first render; this component then
 * manages refetch on user interaction.
 */
import { useEffect, useState, useTransition } from 'react';
import { FunnelStep } from './FunnelStep';
import type { FunnelResult } from '@/lib/funnel';

interface ApiResponse {
  window_days: number;
  since: string;
  generated_at?: string;
  degraded?: boolean;
  note?: string;
  tracks: {
    business: FunnelResult;
    personal: FunnelResult;
  };
}

interface Props {
  initialData: ApiResponse;
}

const WINDOWS = [7, 30, 90] as const;

export function FunnelView({ initialData }: Props) {
  const [days, setDays] = useState<number>(initialData.window_days);
  const [data, setData] = useState<ApiResponse>(initialData);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (days === initialData.window_days) return;
    let cancelled = false;
    startTransition(async () => {
      setError(null);
      try {
        const res = await fetch(`/api/admin/funnel?days=${days}`, { credentials: 'include' });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const json: ApiResponse = await res.json();
        if (!cancelled) setData(json);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? 'fetch failed');
      }
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>
          Window:
          <select
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value, 10))}
            disabled={pending}
            style={{
              marginLeft: 8, padding: '0.35rem 0.6rem', fontSize: '0.85rem',
              background: '#0a0a0a', color: '#fff', border: '1px solid #1e1e1e',
              borderRadius: 6, cursor: pending ? 'wait' : 'pointer',
            }}
          >
            {WINDOWS.map((w) => (
              <option key={w} value={w}>Last {w} days</option>
            ))}
          </select>
        </label>
        {data.degraded && (
          <span style={{ color: '#FFB81C', fontSize: '0.8rem' }}>
            ⚠️ {data.note ?? 'Analytics partially unavailable'}
          </span>
        )}
        {error && (
          <span style={{ color: '#FF6B7A', fontSize: '0.8rem' }}>
            Error: {error}
          </span>
        )}
        {pending && (
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>
            Loading…
          </span>
        )}
      </div>

      <FunnelTable title={data.tracks.business.label} funnel={data.tracks.business} />
      <FunnelTable title={data.tracks.personal.label} funnel={data.tracks.personal} />
    </div>
  );
}

interface FunnelTableProps {
  title: string;
  funnel: FunnelResult;
}

function FunnelTable({ title, funnel }: FunnelTableProps) {
  const biggestDrop = funnel.biggest_drop_index;
  const totalEntered = funnel.steps[0]?.unique_users ?? 0;

  return (
    <section style={{ background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: 12, padding: '1.25rem 1.5rem' }}>
      <h2 style={{
        fontFamily: "'Bebas Neue', Impact, sans-serif",
        fontSize: '1.15rem', color: '#fff', letterSpacing: '0.05em',
        margin: '0 0 0.25rem',
      }}>
        {title}
      </h2>
      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', margin: '0 0 1rem' }}>
        {totalEntered.toLocaleString()} {totalEntered === 1 ? 'user' : 'users'} entered
      </p>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #1e1e1e' }}>
              <th style={{ textAlign: 'left', padding: '0.4rem 0.75rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', width: 32 }}>#</th>
              <th style={{ textAlign: 'left', padding: '0.4rem 0.75rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Step</th>
              <th style={{ textAlign: 'right', padding: '0.4rem 0.75rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Users</th>
              <th style={{ textAlign: 'right', padding: '0.4rem 0.75rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>% of top</th>
              <th style={{ textAlign: 'right', padding: '0.4rem 0.75rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>% of prev</th>
            </tr>
          </thead>
          <tbody>
            {funnel.steps.map((step, i) => (
              <FunnelStep
                key={step.event}
                step={step}
                index={i}
                isBiggestDrop={biggestDrop === i}
              />
            ))}
          </tbody>
        </table>
      </div>

      {biggestDrop !== null && funnel.steps[biggestDrop] && funnel.steps[biggestDrop - 1] && (
        <p style={{ marginTop: '0.75rem', color: '#FFB81C', fontSize: '0.85rem' }}>
          ⚠️ Biggest drop: {funnel.steps[biggestDrop - 1].event} → {funnel.steps[biggestDrop].event}{' '}
          ({(((funnel.steps[biggestDrop - 1].pct_of_prev ?? 0) - (funnel.steps[biggestDrop].pct_of_prev ?? 0))).toFixed(1)}pp loss)
        </p>
      )}
    </section>
  );
}