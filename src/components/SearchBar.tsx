'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

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

interface SearchHistoryRow {
  query: string;
  source: string;
  last_searched_at: string;
}

const TYPE_META: Record<SuggestType, { label: string; emoji: string; groupOrder: number }> = {
  rink: { label: 'Rink', emoji: '🏟️', groupOrder: 1 },
  team: { label: 'Team', emoji: '🏒', groupOrder: 2 },
  player: { label: 'Player', emoji: '⭐', groupOrder: 3 },
  league: { label: 'League', emoji: '🏆', groupOrder: 4 },
  brand: { label: 'Brand', emoji: '🛍️', groupOrder: 5 },
};

interface SearchBarProps {
  /**
   * 'home_hero' | 'dashboard_header' | 'command_palette'
   * Determines analytics source tag, placeholder copy, and which recent-searches
   * API to call (command_palette uses GET; dashboard_header uses same).
   */
  source: 'home_hero' | 'dashboard_header' | 'command_palette';
  /**
   * Override the input placeholder. Falls back to a default based on source.
   */
  placeholder?: string;
  /**
   * Initial query to pre-fill (used by command palette when opened via recent search).
   */
  initialQuery?: string;
  /**
   * Called when the user submits a directory query (Enter or "See all" click).
   * The parent can opt out of the default navigation by returning false.
   */
  onDirectorySubmit?: (q: string) => boolean | void;
  /**
   * Class name forwarded to the outer wrapper div.
   */
  className?: string;
  /**
   * Auto-focus the input on mount (used by command palette).
   */
  autoFocus?: boolean;
}

function groupResults(items: SuggestItem[]): Map<number, SuggestItem[]> {
  const groups = new Map<number, SuggestItem[]>();
  for (const item of items) {
    const go = TYPE_META[item.type]?.groupOrder ?? 99;
    if (!groups.has(go)) groups.set(go, []);
    groups.get(go)!.push(item);
  }
  return groups;
}

async function recordSearch(q: string, source: string): Promise<void> {
  try {
    await fetch('/api/profile/search-history/upsert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q, source }),
    });
  } catch {
    // Best-effort — search history failures must never break search
  }
}

export default function SearchBar({
  source,
  placeholder,
  initialQuery = '',
  autoFocus = false,
}: SearchBarProps) {
  const router = useRouter();
  const [q, setQ] = useState(initialQuery);
  const [results, setResults] = useState<SuggestItem[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState<number>(-1);
  const [recentSearches, setRecentSearches] = useState<SearchHistoryRow[]>([]);
  const [showRecent, setShowRecent] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-focus if requested
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Fetch recent searches on mount for dashboard/command_palette
  useEffect(() => {
    if (source === 'home_hero') return;
    fetch('/api/profile/search-history')
      .then((r) => r.json())
      .then((d) => setRecentSearches(d.searches ?? []))
      .catch(() => {/* best-effort */});
  }, [source]);

  // Debounced suggest fetch
  useEffect(() => {
    const term = q.trim();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (term.length < 2) {
      setResults([]);
      setOpen(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/search/suggest?q=${encodeURIComponent(term)}`
        );
        const data = await res.json();
        setResults(data.results ?? []);
        setOpen(true);
        setActiveIdx(-1);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [q]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setShowRecent(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Keyboard: navigate, select, close
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) return;
    const flat = results;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, flat.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      if (activeIdx >= 0 && flat[activeIdx]) {
        const item = flat[activeIdx];
        setOpen(false);
        recordSearch(q, source);
        router.push(item.href);
      } else if (q.trim()) {
        setOpen(false);
        recordSearch(q, source);
        router.push(`/directory?q=${encodeURIComponent(q.trim())}`);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      setShowRecent(false);
      inputRef.current?.blur();
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQ(e.target.value);
    setActiveIdx(-1);
  }

  function handleSuggestionClick(item: SuggestItem) {
    recordSearch(q, source);
    setOpen(false);
    router.push(item.href);
  }

  function handleRecentClick(entry: SearchHistoryRow) {
    setQ(entry.query);
    setShowRecent(false);
    setOpen(false);
    recordSearch(entry.query, source);
    router.push(`/directory?q=${encodeURIComponent(entry.query)}`);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    setOpen(false);
    setShowRecent(false);
    recordSearch(q, source);
    router.push(`/directory?q=${encodeURIComponent(q.trim())}`);
  }

  function handleSeeAllClick() {
    if (!q.trim()) return;
    setOpen(false);
    setShowRecent(false);
    recordSearch(q, source);
    router.push(`/directory?q=${encodeURIComponent(q.trim())}`);
  }

  // Recent searches shown when input is empty and recentSearches exist
  const showRecentSearches = !q.trim() && recentSearches.length > 0;

  const defaultPlaceholder =
    source === 'command_palette'
      ? 'Search rinks, teams, players...'
      : 'Search hockey near you...';

  const flatResults = results;
  const grouped = groupResults(results);

  return (
    <div
      ref={wrapRef}
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: source === 'home_hero' ? 600 : 480,
      }}
    >
      <form onSubmit={handleSubmit} style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          type="search"
          value={q}
          onChange={handleInputChange}
          onFocus={() => {
            if (!q.trim() && recentSearches.length > 0) setShowRecent(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? defaultPlaceholder}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          style={{
            width: '100%',
            padding: source === 'home_hero'
              ? '0.85rem 1rem 0.85rem 3rem'
              : '0.65rem 1rem 0.65rem 2.5rem',
            fontSize: source === 'home_hero' ? '1.0625rem' : '0.9375rem',
            background: 'rgba(255,255,255,0.08)',
            border: '1.5px solid rgba(255,255,255,0.15)',
            borderRadius: 10,
            color: '#fff',
            outline: 'none',
            boxSizing: 'border-box',
            transition: 'border-color 0.15s, background 0.15s',
          }}
          onFocusCapture={(e) => {
            e.currentTarget.style.borderColor = '#C8102E';
            e.currentTarget.style.background = 'rgba(255,255,255,0.12)';
          }}
          onBlurCapture={(e) => {
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
            e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
          }}
        />
        {/* Search icon */}
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: source === 'home_hero' ? '0.85rem' : '0.7rem',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'rgba(255,255,255,0.45)',
            pointerEvents: 'none',
            fontSize: source === 'home_hero' ? '1.1rem' : '0.95rem',
            lineHeight: 1,
          }}
        >
          🔍
        </span>
        {/* Loading spinner */}
        {loading && (
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              right: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'rgba(255,255,255,0.5)',
              fontSize: '0.8rem',
              pointerEvents: 'none',
            }}
          >
            ⏳
          </span>
        )}
      </form>

      {/* Dropdown panel */}
      {(open || showRecent) && (
        <ul
          role="listbox"
          aria-label="Search suggestions"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            zIndex: 9999,
            background: '#0a0a0a',
            border: '1.5px solid rgba(255,255,255,0.12)',
            borderRadius: 12,
            boxShadow: '0 16px 48px rgba(0,0,0,0.7)',
            overflow: 'hidden',
            listStyle: 'none',
            margin: 0,
            padding: 0,
            maxHeight: source === 'home_hero' ? 480 : 420,
            overflowY: 'auto',
          }}
        >
          {/* Recent searches */}
          {showRecentSearches && (
            <>
              <li
                role="presentation"
                style={{
                  padding: '0.5rem 0.75rem 0.25rem',
                  fontSize: '0.7rem',
                  color: 'rgba(255,255,255,0.35)',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  fontWeight: 700,
                }}
              >
                Recent searches
              </li>
              {recentSearches.map((entry) => (
                <li key={entry.query + entry.last_searched_at}>
                  <button
                    type="button"
                    onClick={() => handleRecentClick(entry)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.6rem',
                      width: '100%',
                      padding: '0.55rem 0.85rem',
                      background: 'transparent',
                      border: 'none',
                      color: 'rgba(255,255,255,0.7)',
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <span aria-hidden="true" style={{ opacity: 0.45, fontSize: '0.8rem' }}>🕐</span>
                    <span style={{ flex: 1 }}>{entry.query}</span>
                    <span style={{ fontSize: '0.7rem', opacity: 0.4 }}>↗</span>
                  </button>
                </li>
              ))}
              <li
                role="presentation"
                style={{ borderTop: '1px solid #1e1e1e', marginTop: '0.25rem' }}
              />
            </>
          )}

          {/* Results grouped by type */}
          {[...grouped.entries()]
            .sort(([a], [b]) => a - b)
            .map(([, items]) => {
              const first = items[0];
              const meta = TYPE_META[first.type];
              return (
                <li key={first.type} role="presentation">
                  {/* Group label */}
                  <div
                    role="presentation"
                    style={{
                      padding: '0.5rem 0.85rem 0.2rem',
                      fontSize: '0.7rem',
                      color: 'rgba(255,255,255,0.3)',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      fontWeight: 700,
                    }}
                  >
                    {meta?.emoji} {meta?.label ?? first.type}s
                  </div>
                  {items.map((item) => {
                    const globalIdx = flatResults.indexOf(item);
                    const isActive = globalIdx === activeIdx;
                    return (
                      <a
                        key={item.id}
                        href={item.href}
                        role="option"
                        aria-selected={isActive}
                        onClick={(e) => {
                          e.preventDefault();
                          handleSuggestionClick(item);
                        }}
                        onMouseEnter={() => setActiveIdx(globalIdx)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.6rem',
                          padding: '0.55rem 0.85rem',
                          background: isActive ? 'rgba(200,16,46,0.18)' : 'transparent',
                          textDecoration: 'none',
                          color: '#fff',
                          cursor: 'pointer',
                          borderLeft: isActive ? '2.5px solid #C8102E' : '2.5px solid transparent',
                        }}
                      >
                        <span
                          style={{
                            flex: 1,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            fontSize: '0.9375rem',
                          }}
                        >
                          {item.name}
                        </span>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            color: 'rgba(255,255,255,0.4)',
                            flexShrink: 0,
                          }}
                        >
                          {item.meta}
                        </span>
                      </a>
                    );
                  })}
                </li>
              );
            })}

          {/* No-match CTA */}
          {results.length === 0 && !loading && q.trim().length >= 2 && !showRecentSearches && (
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
          )}

          {/* Footer: see all results */}
          {q.trim().length >= 2 && (
            <li
              role="presentation"
              style={{
                borderTop: '1px solid #1e1e1e',
                marginTop: '0.25rem',
                paddingTop: '0.25rem',
              }}
            >
              <button
                type="button"
                onClick={handleSeeAllClick}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  width: '100%',
                  padding: '0.6rem 0.85rem',
                  background: 'transparent',
                  border: 'none',
                  color: 'rgba(255,255,255,0.5)',
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  letterSpacing: '0.02em',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.85)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}
              >
                See all results for &ldquo;{q.trim()}&rdquo; →
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
