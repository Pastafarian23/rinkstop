'use client';

import { useState, useEffect, useRef } from 'react';

interface Props {
  pipelineHighlightId: number | null | undefined;
  overrideHighlightId: number | null | undefined;
  onChange: (id: number | null) => void;
  scopeTeamId?: string | null;
}

/**
 * Searchable dropdown for highlight_backups. The pipeline puts a
 * highlight_id on the post when the article was generated from a
 * highlight; the reviewer can swap it for the correct one if the
 * pipeline picked the wrong highlight.
 */
export default function HighlightOverridePanel({
  pipelineHighlightId,
  overrideHighlightId,
  onChange,
  scopeTeamId,
}: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [pipelineLabel, setPipelineLabel] = useState<string>('');
  const [overrideLabel, setOverrideLabel] = useState<string>('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // Fetch pipeline highlight title (if any) once
  useEffect(() => {
    if (!pipelineHighlightId) { setPipelineLabel(''); return; }
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`/api/admin/search/highlights?q=&limit=200`);
        if (!r.ok) return;
        const d = await r.json();
        if (cancelled) return;
        const hit = (d.highlights || []).find((h: any) => h.id === pipelineHighlightId);
        if (hit) setPipelineLabel(`${hit.title} · ${hit.home_team_name} vs ${hit.away_team_name}`);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [pipelineHighlightId]);

  useEffect(() => {
    if (!overrideHighlightId) { setOverrideLabel(''); return; }
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`/api/admin/search/highlights?q=&limit=200`);
        if (!r.ok) return;
        const d = await r.json();
        if (cancelled) return;
        const hit = (d.highlights || []).find((h: any) => h.id === overrideHighlightId);
        if (hit) setOverrideLabel(`${hit.title} · ${hit.home_team_name} vs ${hit.away_team_name}`);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [overrideHighlightId]);

  useEffect(() => {
    if (!open) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set('q', query);
        params.set('limit', '15');
        if (scopeTeamId) params.set('team', scopeTeamId);
        const r = await fetch(`/api/admin/search/highlights?${params}`);
        if (!r.ok) { setResults([]); return; }
        const d = await r.json();
        setResults(d.highlights || []);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 200);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [query, open, scopeTeamId]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const isOverride = overrideHighlightId != null;
  const displayLabel = isOverride
    ? (overrideLabel || `HL #${overrideHighlightId}`)
    : (pipelineLabel || '(none)');

  return (
    <div className="admin-card p-4" style={{ marginTop: '1rem' }}>
      <h3 style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', margin: '0 0 0.75rem' }}>
        🎬 Highlight
        <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', fontWeight: 400, marginLeft: 8 }}>
          swap if the pipeline linked the wrong one
        </span>
      </h3>

      <div ref={rootRef} style={{ position: 'relative' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '0.4rem 0.6rem',
            background: isOverride ? 'rgba(20,184,166,0.08)' : 'rgba(0,0,0,0.2)',
            border: `1px solid ${isOverride ? 'rgba(20,184,166,0.3)' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: 4,
            fontSize: '0.85rem',
            minHeight: 32,
          }}
        >
          <span style={{ flex: 1, color: 'rgba(255,255,255,0.9)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {displayLabel}
          </span>
          {isOverride && (
            <button
              type="button"
              onClick={() => onChange(null)}
              title="Clear override (use pipeline value)"
              style={{ background: 'transparent', border: 0, color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '0.85rem', padding: 0, lineHeight: 1 }}
            >
              ✕
            </button>
          )}
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            style={{ background: 'transparent', border: 0, color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: '0.85rem', padding: 0, lineHeight: 1 }}
          >
            {isOverride ? '↻' : '✎'}
          </button>
        </div>
        {open && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              marginTop: 4,
              background: '#0F172A',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 6,
              zIndex: 50,
              maxHeight: 400,
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
            }}
          >
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search highlight title…"
              autoFocus
              style={{
                margin: 6,
                padding: '0.4rem 0.6rem',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 4,
                color: 'white',
                fontSize: '0.85rem',
              }}
            />
            <div style={{ overflowY: 'auto', maxHeight: 340 }}>
              {loading && (
                <div style={{ padding: 8, color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>Searching…</div>
              )}
              {!loading && results.length === 0 && (
                <div style={{ padding: 8, color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>No matches</div>
              )}
              {!loading && results.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => {
                    onChange(h.id);
                    setOpen(false);
                    setQuery('');
                  }}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    textAlign: 'left',
                    background: 'transparent',
                    border: 0,
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    color: 'rgba(255,255,255,0.85)',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ fontWeight: 500, color: 'rgba(255,255,255,0.95)' }}>{h.title}</div>
                  <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
                    {h.home_team_name} vs {h.away_team_name}
                    {h.league_name ? ` · ${h.league_name}` : ''}
                    {h.match_date ? ` · ${new Date(h.match_date).toLocaleDateString()}` : ''}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
