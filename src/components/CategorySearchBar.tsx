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

interface CategorySearchBarProps {
  /**
   * Category to scope the search to. Maps to a directory page.
   * - 'team'     → /directory/teams
   * - 'player'   → /directory/players
   * - 'rink'     → /directory/rinks
   * - 'league'   → /directory/leagues
   * - 'brand'    → /directory/brands
   */
  category: 'team' | 'player' | 'rink' | 'league' | 'brand';
  /**
   * Page this search bar lives on (used for analytics + placeholder).
   */
  page: string;
  /**
   * Optional: max-width override for the search bar.
   */
  maxWidth?: number;
}

const CATEGORY_META: Record<CategorySearchBarProps['category'], { label: string; placeholder: string; emoji: string; allResultsHref: string }> = {
  team: {
    label: 'Team',
    placeholder: 'Search teams...',
    emoji: '🏒',
    allResultsHref: '/directory/teams',
  },
  player: {
    label: 'Player',
    placeholder: 'Search players...',
    emoji: '⭐',
    allResultsHref: '/directory/players',
  },
  rink: {
    label: 'Rink',
    placeholder: 'Search rinks...',
    emoji: '🏟️',
    allResultsHref: '/directory/rinks',
  },
  league: {
    label: 'League',
    placeholder: 'Search leagues...',
    emoji: '🏆',
    allResultsHref: '/directory/leagues',
  },
  brand: {
    label: 'Brand',
    placeholder: 'Search brands...',
    emoji: '🛍️',
    allResultsHref: '/directory/brands',
  },
};

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
 * CategorySearchBar — search bar matching the homepage aesthetic, scoped
 * to a single entity category. Used on /directory/teams, /directory/players,
 * /directory/rinks, etc.
 *
 * Behavior:
 *  - Type 2+ chars → debounced fetch (250ms) to /api/search/suggest?category=X
 *  - Dropdown shows grouped results (rink/team/player/league/brand emoji)
 *  - Click any match → navigates directly to that entity's page
 *  - Press Enter with a query → /directory/X?q=... (full results page)
 *  - Keyboard: ↑↓ navigate, Enter selects, Esc closes
 *  - Recent searches: server-stored via /api/profile/search-history
 *  - Empty result: "+ Add as a new listing" CTA links to /add-listing?name=X
 *
 * Visual style mirrors HomeSearch.tsx (CSS classes search-wrap/search-input/search-btn
 * from globals.css) so the directory pages match the homepage aesthetic.
 */
export default function CategorySearchBar({ category, page, maxWidth = 600 }: CategorySearchBarProps) {
  const router = useRouter();
  const meta = CATEGORY_META[category];

  const [q, setQ] = useState('');
  const [results, setResults] = useState<SuggestItem[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState<number>(-1);
  const [recentSearches, setRecentSearches] = useState<Array<{ query: string; last_searched_at: string }>>([]);
  const [showRecent, setShowRecent] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch recent searches on mount
  useEffect(() => {
    fetch('/api/profile/search-history')
      .then((r) => r.json())
      .then((d) => setRecentSearches(d.searches ?? []))
      .catch(() => {/* best-effort */});
  }, []);

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
          `/api/search/suggest?q=${encodeURIComponent(term)}&category=${category}`
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
  }, [q, category]);

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

  // Track search on submission (analytics + history)
  async function trackSearch(query: string): Promise<void> {
    try {
      await fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'search_query',
          pathname: page,
          props: { q: query, source: `directory_${category}`, category },
        }),
      });
    } catch {/* best-effort */}
    try {
      await fetch('/api/profile/search-history/upsert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: query, source: `directory_${category}` }),
      });
    } catch {/* best-effort */}
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const term = q.trim();
    if (!term) return;
    setOpen(false);
    setShowRecent(false);
    trackSearch(term);
    router.push(`${meta.allResultsHref}?q=${encodeURIComponent(term)}`);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      // Form submit handler will catch this; let the form handle it
    } else if (e.key === 'Escape') {
      setOpen(false);
      setShowRecent(false);
      inputRef.current?.blur();
    }
  }

  function handleSuggestionClick(item: SuggestItem, e: React.MouseEvent) {
    e.preventDefault();
    setOpen(false);
    trackSearch(q);
    router.push(item.href);
  }

  function handleRecentClick(entry: { query: string }) {
    setQ(entry.query);
    setShowRecent(false);
    setOpen(false);
    trackSearch(entry.query);
    router.push(`${meta.allResultsHref}?q=${encodeURIComponent(entry.query)}`);
  }

  const showRecentPanel = !q.trim() && recentSearches.length > 0 && showRecent;

  return (
    <div ref={wrapRef} style={{ position: 'relative', maxWidth, width: '100%' }}>
      <form onSubmit={handleSubmit} className="search-wrap" style={{ maxWidth: '100%' }}>
        <input
          ref={inputRef}
          type="search"
          className="search-input"
          placeholder={meta.placeholder}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setActiveIdx(-1);
          }}
          onFocus={() => {
            if (!q.trim() && recentSearches.length > 0) setShowRecent(true);
            if (results.length > 0) setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          aria-label={`Search ${meta.label.toLowerCase()}s`}
          name="q"
          role="combobox"
          aria-expanded={open || showRecentPanel}
          aria-controls={`category-search-listbox-${category}`}
          aria-autocomplete="list"
          aria-activedescendant={activeIdx >= 0 ? `category-search-opt-${activeIdx}` : undefined}
          autoComplete="off"
          spellCheck={false}
          style={{ borderRadius: '4px 0 0 4px' }}
        />
        <button type="submit" className="search-btn" aria-label="Search">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </button>
      </form>

      {/* Recent searches panel */}
      {showRecentPanel && (
        <ul
          role="listbox"
          aria-label="Recent searches"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            background: '#0a0a0a',
            border: '1px solid #1e1e1e',
            borderRadius: 6,
            boxShadow: '0 12px 32px rgba(0,0,0,0.6)',
            maxHeight: 360,
            overflowY: 'auto',
            zIndex: 50,
            margin: 0,
            padding: '0.4rem 0',
            listStyle: 'none',
          }}
        >
          <li role="presentation" style={{ padding: '0.25rem 0' }}>
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
              Recent searches
            </div>
            {recentSearches.slice(0, 8).map((entry) => (
              <button
                key={entry.query + entry.last_searched_at}
                type="button"
                onClick={() => handleRecentClick(entry)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                  width: '100%',
                  padding: '0.6rem 0.85rem',
                  background: 'transparent',
                  border: 'none',
                  color: 'rgba(255,255,255,0.8)',
                  fontSize: '0.875rem',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <span aria-hidden="true" style={{ opacity: 0.5 }}>🕐</span>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {entry.query}
                </span>
                <span aria-hidden="true" style={{ opacity: 0.4, fontSize: '0.75rem' }}>↗</span>
              </button>
            ))}
          </li>
        </ul>
      )}

      {/* Results dropdown */}
      {open && results.length > 0 && (
        <ul
          id={`category-search-listbox-${category}`}
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
          {Array.from(groupBy(results, (r) => r.type).entries()).map(([type, items]) => {
            const typeMeta = {
              rink: { label: 'Rink', emoji: '🏟️' },
              team: { label: 'Team', emoji: '🏒' },
              player: { label: 'Player', emoji: '⭐' },
              league: { label: 'League', emoji: '🏆' },
              brand: { label: 'Brand', emoji: '🛍️' },
            }[type as SuggestType];
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
                  {typeMeta.emoji} {typeMeta.label}s
                </div>
                {items.map((item) => {
                  const flatIdx = results.indexOf(item);
                  const isActive = flatIdx === activeIdx;
                  return (
                    <a
                      key={`${type}-${item.id}`}
                      id={`category-search-opt-${flatIdx}`}
                      role="option"
                      aria-selected={isActive}
                      href={item.href}
                      onClick={(e) => handleSuggestionClick(item, e)}
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
                        {typeMeta.emoji}
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
                    </a>
                  );
                })}
              </li>
            );
          })}
        </ul>
      )}

      {/* No-match CTA */}
      {open && results.length === 0 && !loading && q.trim().length >= 2 && !showRecentPanel && (
        <ul
          role="listbox"
          aria-label="No matches"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            background: '#0a0a0a',
            border: '1px solid #1e1e1e',
            borderRadius: 6,
            boxShadow: '0 12px 32px rgba(0,0,0,0.6)',
            zIndex: 50,
            margin: 0,
            padding: '0.85rem',
            listStyle: 'none',
          }}
        >
          <li role="presentation">
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
              onClick={() => trackSearch(q)}
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
        </ul>
      )}

      {/* See all results footer */}
      {open && q.trim().length >= 2 && (
        <a
          href={`${meta.allResultsHref}?q=${encodeURIComponent(q.trim())}`}
          onClick={(e) => {
            e.preventDefault();
            trackSearch(q);
            router.push(`${meta.allResultsHref}?q=${encodeURIComponent(q.trim())}`);
          }}
          style={{
            position: 'absolute',
            top: `calc(100% + ${results.length > 0 ? 4 : 0}px)`,
            left: 0,
            right: 0,
            marginTop: results.length > 0 ? '4px' : 0,
            background: '#0a0a0a',
            border: '1px solid #1e1e1e',
            borderRadius: 6,
            padding: '0.6rem 0.85rem',
            color: 'rgba(255,255,255,0.5)',
            fontSize: '0.8125rem',
            textDecoration: 'none',
            letterSpacing: '0.02em',
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          See all {meta.label.toLowerCase()}s for &ldquo;{q.trim()}&rdquo; →
        </a>
      )}
    </div>
  );
}
