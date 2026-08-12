'use client';

import { useEffect, useRef, useState } from 'react';

type SuggestType = 'rink' | 'team' | 'player' | 'league' | 'brand';

interface SuggestItem {
  type: SuggestType;
  id: string;
  name: string;
  slug: string;
  href: string;
  meta: string;
  matchQuality: number;
}

const TYPE_META: Record<SuggestType, { label: string; emoji: string; groupOrder: number }> = {
  rink: { label: 'Rink', emoji: '🏟️', groupOrder: 1 },
  team: { label: 'Team', emoji: '🏒', groupOrder: 2 },
  player: { label: 'Player', emoji: '⭐', groupOrder: 3 },
  league: { label: 'League', emoji: '🏆', groupOrder: 4 },
  brand: { label: 'Brand', emoji: '🛍️', groupOrder: 5 },
};

/**
 * Home page search bar with pre-generative autocomplete.
 *
 * Behavior:
 *  - Type 2+ chars → debounced fetch (250ms) to /api/search/suggest
 *  - Dropdown shows top 5-8 results, grouped by type (rink/team/etc.)
 *  - Click any match → navigates directly to that entity's page
 *  - Press Enter with a query → /directory?q=... (full results page)
 *  - Keyboard: ↑↓ navigate, Enter selects highlighted item, Esc closes
 *
 * Server-rendered fallback for no-JS: the form posts to /directory?q=...
 * (preserves the old behavior if the user's JS is broken or blocked).
 */
export default function HomeSearch() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<SuggestItem[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState<number>(-1);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced fetch when query changes
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setResults([]);
      setOpen(false);
      setActiveIdx(-1);
      return;
    }

    const ctrl = new AbortController();
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(term)}`, {
          signal: ctrl.signal,
        });
        if (!res.ok) {
          setResults([]);
          setOpen(false);
          return;
        }
        const data = await res.json();
        setResults(data.results ?? []);
        // Show the dropdown when we have results OR when the user typed
        // enough to surface a "no matches" CTA. Closing on 0 results would
        // hide the add-listing affordance.
        setOpen((data.results ?? []).length > 0 || term.length >= 2);
        setActiveIdx(-1);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setResults([]);
          setOpen(false);
        }
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [q]);

  // Click-outside to close
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setActiveIdx(-1);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  function submitFull(e: React.FormEvent) {
    e.preventDefault();
    const term = q.trim();
    if (activeIdx >= 0 && results[activeIdx]) {
      // User highlighted a suggestion — go to that
      window.location.href = results[activeIdx].href;
      return;
    }
    if (term) window.location.href = `/directory?q=${encodeURIComponent(term)}`;
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      setActiveIdx(-1);
    }
  }

  // Group results by type for the dropdown
  const grouped = groupBy(results, (r) => r.type);

  return (
    <div ref={wrapRef} style={{ position: 'relative', marginBottom: '1.5rem' }}>
      <form onSubmit={submitFull} className="search-wrap">
        <input
          ref={inputRef}
          type="search"
          className="search-input"
          placeholder="Search teams, players, leagues..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          onKeyDown={handleKeyDown}
          aria-label="Search the RinkStop directory"
          name="q"
          role="combobox"
          aria-expanded={open}
          aria-controls="home-search-listbox"
          aria-autocomplete="list"
          aria-activedescendant={activeIdx >= 0 ? `home-search-opt-${activeIdx}` : undefined}
          autoComplete="off"
          spellCheck={false}
        />
        <button type="submit" className="search-btn" aria-label="Search">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </button>
      </form>

      {/* Autocomplete dropdown */}
      {open && (results.length > 0 || q.trim().length >= 2) ? (
        <ul
          id="home-search-listbox"
          role="listbox"
          aria-label="Search suggestions"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            background: '#0a0a0a',
            border: '1px solid #1e1e1e',
            borderRadius: 6,
            boxShadow: '0 12px 32px rgba(0,0,0,0.6)',
            maxHeight: 480,
            overflowY: 'auto',
            zIndex: 50,
            margin: 0,
            padding: '0.4rem 0',
            listStyle: 'none',
          }}
        >
          {Array.from(grouped.entries()).map(([type, items]) => {
            const meta = TYPE_META[type as SuggestType];
            return (
              <li key={type} role="presentation" style={{ padding: '0.25rem 0' }}>
                <div
                  style={{
                    padding: '0.25rem 0.85rem',
                    fontSize: '0.7rem',
                    color: 'rgba(255,255,255,0.4)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    fontWeight: 700,
                  }}
                >
                  {meta.emoji} {meta.label}s
                </div>
                {items.map((item) => {
                  const flatIdx = results.indexOf(item);
                  const isActive = flatIdx === activeIdx;
                  return (
                    <a
                      key={`${type}-${item.id}`}
                      id={`home-search-opt-${flatIdx}`}
                      role="option"
                      aria-selected={isActive}
                      href={item.href}
                      onMouseEnter={() => setActiveIdx(flatIdx)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.65rem',
                        padding: '0.6rem 0.85rem',
                        background: isActive ? 'rgba(255,184,28,0.12)' : 'transparent',
                        color: '#fff',
                        textDecoration: 'none',
                        borderLeft: isActive ? '3px solid #FFB81C' : '3px solid transparent',
                        transition: 'background 0.1s',
                      }}
                    >
                      <span style={{ fontSize: '0.95rem', flexShrink: 0, color: 'rgba(255,255,255,0.6)' }}>
                        {meta.emoji}
                      </span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            color: '#fff',
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <Highlight text={item.name} q={q} />
                        </div>
                        {item.meta ? (
                          <div
                            style={{
                              color: 'rgba(255,255,255,0.45)',
                              fontSize: '0.75rem',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {item.meta}
                          </div>
                        ) : null}
                      </span>
                      <span
                        style={{
                          color: 'rgba(255,255,255,0.3)',
                          fontSize: '0.75rem',
                          flexShrink: 0,
                        }}
                      >
                        →
                      </span>
                    </a>
                  );
                })}
              </li>
            );
          })}

          {/* No-match CTA: when the suggest API returned 0 results, surface
              the add-listing path inside the dropdown. The form prefill
              (handled in AddListingForm via ?name=) means the user doesn’t
              have to retype their query. */}
          {results.length === 0 ? (
            <li
              role="presentation"
              style={{
                padding: '0.85rem 0.95rem 0.5rem',
                borderTop: '1px solid #1e1e1e',
                marginTop: '0.4rem',
              }}
            >
              <div
                style={{
                  color: 'rgba(255,255,255,0.6)',
                  fontSize: '0.8125rem',
                  marginBottom: '0.65rem',
                  lineHeight: 1.45,
                }}
              >
                No matches for <strong style={{ color: '#fff' }}>&ldquo;{q.trim()}&rdquo;</strong>
                {' '}— want to add it?
              </div>
              <a
                href={`/add-listing?name=${encodeURIComponent(q.trim())}`}
                onClick={() => {
                  try {
                    const payload = JSON.stringify({
                      name: 'add_listing_no_match_cta_click',
                      pathname: '/',
                      props: { q: q.trim() },
                    });
                    const blob = new Blob([payload], { type: 'application/json' });
                    navigator.sendBeacon?.('/api/track', blob) ||
                      fetch('/api/track', { method: 'POST', body: blob, keepalive: true });
                  } catch {
                    // best-effort analytics only
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  background: '#FFB81C',
                  color: '#0a0a0a',
                  padding: '0.55rem 0.85rem',
                  borderRadius: 6,
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  textDecoration: 'none',
                  letterSpacing: '0.02em',
                }}
              >
                + Add as a new listing
              </a>
            </li>
          ) : null}

          {/* Footer: see all results */}
          <li
            role="presentation"
            style={{
              borderTop: '1px solid #1e1e1e',
              marginTop: '0.25rem',
              paddingTop: '0.25rem',
            }}
          >
            <a
              href={`/directory?q=${encodeURIComponent(q.trim())}`}
              onMouseEnter={() => setActiveIdx(-1)}
              style={{
                display: 'block',
                padding: '0.65rem 0.85rem',
                color: '#FFB81C',
                fontSize: '0.8125rem',
                fontWeight: 600,
                textDecoration: 'none',
                textAlign: 'center',
              }}
            >
              {`See all results for \u201c${q.trim()}\u201d \u2192`}
            </a>
          </li>
        </ul>
      ) : null}

      {/* Loading indicator (small, inside the search wrap) */}
      {loading && q.trim().length >= 2 ? (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            right: 52,
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'rgba(255,255,255,0.4)',
            fontSize: '0.75rem',
            pointerEvents: 'none',
          }}
        >
          …
        </div>
      ) : null}
    </div>
  );
}

/**
 * Highlight the matching portion of text. Case-insensitive.
 * Falls back to plain text if q is empty or not found.
 */
function Highlight({ text, q }: { text: string; q: string }) {
  const term = q.trim();
  if (!term) return <>{text}</>;
  const lower = text.toLowerCase();
  const idx = lower.indexOf(term.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark
        style={{
          background: 'rgba(255,184,28,0.25)',
          color: '#FFB81C',
          padding: 0,
          fontWeight: 700,
        }}
      >
        {text.slice(idx, idx + term.length)}
      </mark>
      {text.slice(idx + term.length)}
    </>
  );
}

/**
 * Tiny groupBy helper. Avoids pulling in lodash for one use.
 */
function groupBy<T, K>(arr: T[], fn: (item: T) => K): Map<K, T[]> {
  const out = new Map<K, T[]>();
  for (const item of arr) {
    const key = fn(item);
    const list = out.get(key);
    if (list) list.push(item);
    else out.set(key, [item]);
  }
  return out;
}