'use client';

/**
 * src/app/admin/funnel/FunnelView.tsx
 *
 * Client component that renders two funnel tables (business + personal)
 * with a window dropdown. Refreshes data when the dropdown changes.
 *
 * Server fetches the initial data on first render; this component then
 * manages refetch on user interaction.
 *
 * WS9: click a step row to open a drill-down panel below the table showing
 * the most recent raw events for that step. Selection persists per step;
 * clicking the same row again collapses the panel.
 */
import { useEffect, useState, useTransition } from 'react';
import { FunnelStep } from './FunnelStep';
import { FunnelEventList } from './FunnelEventList';
import type { FunnelResult } from '@/lib/funnel';
import { eventLabel } from '@/lib/funnel';

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
        <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem' }}>
          Click any step row to see recent events
        </span>
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

      <FunnelTable title={data.tracks.business.label} funnel={data.tracks.business} windowDays={days} />
      <FunnelTable title={data.tracks.personal.label} funnel={data.tracks.personal} windowDays={days} />
      <BreakdownSection days={days} />
    </div>
  );
}

interface BreakdownApiResponse {
  ok: boolean;
  by: 'listing' | 'country' | 'source' | 'landing';
  days: number;
  total_groups: number;
  truncated: boolean;
  groups: Array<{
    key: string;
    events: Record<string, number>;
    total: number;
  }>;
  total_rows_scanned: number;
}

const BREAKDOWN_DIMS = [
  { key: 'landing', label: 'Landing page' },
  { key: 'source', label: 'Traffic source' },
  { key: 'listing', label: 'Listing' },
  { key: 'country', label: 'Country' },
] as const;

function BreakdownSection({ days }: { days: number }) {
  const [dim, setDim] = useState<typeof BREAKDOWN_DIMS[number]['key']>('landing');
  const [data, setData] = useState<BreakdownApiResponse | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    startTransition(async () => {
      setError(null);
      try {
        const res = await fetch(
          `/api/admin/funnel-breakdown?days=${days}&by=${dim}&limit=50`,
          { credentials: 'include' }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json: BreakdownApiResponse = await res.json();
        if (!cancelled) setData(json);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? 'fetch failed');
      }
    });
    return () => { cancelled = true; };
  }, [days, dim]);

  const totalEvents = data?.groups.reduce((s, g) => s + g.total, 0) ?? 0;

  return (
    <section style={{ background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: 12, padding: '1.25rem 1.5rem' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <div style={{ flex: 1 }}>
          <h2 style={{
            fontFamily: "'Bebas Neue', Impact, sans-serif",
            fontSize: '1.15rem', color: '#fff', letterSpacing: '0.05em',
            margin: '0 0 0.25rem',
          }}>
            WHERE ARE USERS DROPPING OUT?
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', margin: 0 }}>
            Per Arnel Phase 11. Breakdown of all analytics events by dimension over the same window.
          </p>
        </div>
        <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>
          Break down by:
          <select
            value={dim}
            onChange={(e) => setDim(e.target.value as typeof BREAKDOWN_DIMS[number]['key'])}
            disabled={pending}
            style={{
              marginLeft: 8, padding: '0.35rem 0.6rem', fontSize: '0.85rem',
              background: '#0a0a0a', color: '#fff', border: '1px solid #1e1e1e',
              borderRadius: 6, cursor: pending ? 'wait' : 'pointer',
            }}
          >
            {BREAKDOWN_DIMS.map((d) => (
              <option key={d.key} value={d.key}>{d.label}</option>
            ))}
          </select>
        </label>
      </header>

      {error && (
        <p style={{ color: '#FF6B7A', fontSize: '0.85rem' }}>Error: {error}</p>
      )}

      {data && (
        <>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', margin: '0 0 0.75rem' }}>
              {data.total_groups.toLocaleString()} groups · {totalEvents.toLocaleString()} events scanned ·{' '}
              {data.truncated && <span style={{ color: '#FFB81C' }}>top 50 shown</span>}
              {!data.truncated && 'all shown'}
            </p>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #1e1e1e' }}>
                    <th style={{ textAlign: 'left', padding: '0.4rem 0.75rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', width: 32 }}>#</th>
                    <th style={{ textAlign: 'left', padding: '0.4rem 0.75rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {BREAKDOWN_DIMS.find((d) => d.key === dim)?.label}
                    </th>
                    <th style={{ textAlign: 'right', padding: '0.4rem 0.75rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Events</th>
                    <th style={{ textAlign: 'right', padding: '0.4rem 0.75rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>% share</th>
                  </tr>
                </thead>
                <tbody>
                  {data.groups.map((g, i) => (
                    <tr key={g.key} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '0.45rem 0.75rem', color: 'rgba(255,255,255,0.35)', fontSize: '0.8rem' }}>{i + 1}</td>
                      <td style={{ padding: '0.45rem 0.75rem', color: '#fff', fontSize: '0.85rem', wordBreak: 'break-all' }}>
                        {g.key}
                      </td>
                      <td style={{ padding: '0.45rem 0.75rem', color: '#fff', fontSize: '0.85rem', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {g.total.toLocaleString()}
                      </td>
                      <td style={{ padding: '0.45rem 0.75rem', color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {totalEvents > 0 ? ((g.total / totalEvents) * 100).toFixed(1) : '0.0'}%
                      </td>
                    </tr>
                  ))}
                  {data.groups.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ padding: '1rem', color: 'rgba(255,255,255,0.4)', textAlign: 'center', fontSize: '0.85rem' }}>
                        No events in this window for the selected dimension.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
      )}

      {!data && !error && (
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>Loading…</p>
      )}
    </section>
  );
}

interface FunnelTableProps {
  title: string;
  funnel: FunnelResult;
  windowDays: number;
}

function FunnelTable({ title, funnel, windowDays }: FunnelTableProps) {
  const biggestDrop = funnel.biggest_drop_index;
  const totalEntered = funnel.steps[0]?.unique_users ?? 0;
  // Selected step (event name) for drill-down. null = nothing open.
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);

  const toggle = (event: string) =>
    setSelectedEvent((prev) => (prev === event ? null : event));

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
                isSelected={selectedEvent === step.event}
                onClick={() => toggle(step.event)}
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

      {/* WS9 drill-down */}
      {selectedEvent && (
        <FunnelEventList
          name={selectedEvent}
          humanLabel={eventLabel(selectedEvent)}
          days={windowDays}
        />
      )}
    </section>
  );
}