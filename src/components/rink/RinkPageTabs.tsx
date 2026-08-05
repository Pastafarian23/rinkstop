'use client';

/**
 * Rink page tab switcher.
 *
 * Client component. Tabs:
 *   - overview (default — no `?tab=` param needed)
 *   - programming (?tab=programming)
 *
 * Per WS17 PR2 locked decision #1: tab default is implicit in URL. Only the
 * non-default tab is in the URL as `?tab=programming`.
 *
 * Renders no content itself — only the tab bar. Content panels are rendered
 * server-side and toggled with display:none based on the active tab, so SSR
 * + SEO still works without a client round-trip.
 */

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

type TabKey = 'overview' | 'programming';

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'overview', label: 'Overview' },
  { key: 'programming', label: 'Programming & Events' },
];

export default function RinkPageTabs() {
  const router = useRouter();
  const params = useSearchParams();

  const rawTab = params.get('tab');
  const active: TabKey = rawTab === 'programming' ? 'programming' : 'overview';

  const select = useCallback(
    (tab: TabKey) => {
      if (tab === active) return;
      // Build new URL: only add ?tab= when non-default.
      const newParams = new URLSearchParams(params.toString());
      if (tab === 'overview') {
        newParams.delete('tab');
      } else {
        newParams.set('tab', tab);
      }
      const qs = newParams.toString();
      // Preserve hash if any (not used on rink page but cheap to be safe).
      router.push(qs ? `?${qs}` : '?', { scroll: false });
    },
    [active, params, router],
  );

  return (
    <div
      role="tablist"
      aria-label="Rink page sections"
      style={{
        display: 'flex',
        gap: '0',
        borderBottom: '1px solid var(--border)',
        marginBottom: '24px',
        overflowX: 'auto',
      }}
    >
      {TABS.map((t) => {
        const isActive = active === t.key;
        return (
          <button
            key={t.key}
            role="tab"
            aria-selected={isActive}
            aria-controls={`panel-${t.key}`}
            id={`tab-${t.key}`}
            tabIndex={isActive ? 0 : -1}
            onClick={() => select(t.key)}
            type="button"
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: isActive ? '2px solid #38bdf8' : '2px solid transparent',
              color: isActive ? '#fff' : '#94a3b8',
              fontSize: '14px',
              fontWeight: isActive ? 700 : 500,
              padding: '12px 20px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'color 0.15s, border-color 0.15s',
            }}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
