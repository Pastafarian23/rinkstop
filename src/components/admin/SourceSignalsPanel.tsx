'use client';

import { useState, useEffect } from 'react';

interface Highlight {
  id: number;
  title: string;
  home_team_name?: string;
  away_team_name?: string;
  league_name?: string;
  match_date?: string;
  video_url?: string;
  embed_url?: string;
  channel?: string;
  source?: string;
}

interface Props {
  post: {
    id: string;
    highlight_id?: number | null;
    highlight_id_override?: number | null;
    team_home_id?: string | null;
    team_away_id?: string | null;
    league_id?: string | null;
    player_id?: string | null;
    country_slug?: string | null;
    created_at?: string;
    author_name?: string;
    author_role?: string;
    view_count?: number;
  };
}

/**
 * "What the pipeline saw" sidebar.
 * Shows the upstream signals used to generate the article, so the
 * reviewer can quickly judge: "is this the right article?" in 5 seconds.
 *
 * If signals look wrong, the reviewer can demote (existing button) or
 * fix the cross-link override (existing panel). This panel is read-only.
 */
export default function SourceSignalsPanel({ post }: Props) {
  const effectiveHighlightId = post.highlight_id_override ?? post.highlight_id ?? null;
  const [highlight, setHighlight] = useState<Highlight | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch the highlight details (if any) so we can show its source URL + match
  useEffect(() => {
    if (!effectiveHighlightId) { setHighlight(null); return; }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const r = await fetch(`/api/admin/search/highlights?q=&limit=200`);
        if (!r.ok) return;
        const d = await r.json();
        if (cancelled) return;
        const hit = (d.highlights || []).find((h: any) => h.id === effectiveHighlightId);
        setHighlight(hit || null);
      } catch {} finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [effectiveHighlightId]);

  return (
    <div className="admin-card p-4" style={{ marginTop: '1rem' }}>
      <h3 style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', margin: '0 0 0.75rem' }}>
        📡 Source signals
        <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', fontWeight: 400, marginLeft: 8 }}>
          what the pipeline used
        </span>
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.8rem' }}>
        {post.highlight_id != null && (
          <SignalRow label="Pipeline highlight">
            <code style={{ color: '#FACC15' }}>HL #{post.highlight_id}</code>
            {post.highlight_id_override != null && (
              <span style={{ fontSize: '0.7rem', color: '#14B8A6', marginLeft: 6 }}>
                → #{post.highlight_id_override} (override)
              </span>
            )}
          </SignalRow>
        )}

        {post.team_home_id && (
          <SignalRow label="Home team">
            <code style={{ fontSize: '0.75rem' }}>{post.team_home_id.slice(0, 8)}…</code>
          </SignalRow>
        )}
        {post.team_away_id && (
          <SignalRow label="Away team">
            <code style={{ fontSize: '0.75rem' }}>{post.team_away_id.slice(0, 8)}…</code>
          </SignalRow>
        )}
        {post.league_id && (
          <SignalRow label="League">
            <code style={{ fontSize: '0.75rem' }}>{post.league_id.slice(0, 8)}…</code>
          </SignalRow>
        )}
        {post.player_id && (
          <SignalRow label="Player">
            <code style={{ fontSize: '0.75rem' }}>{post.player_id.slice(0, 8)}…</code>
          </SignalRow>
        )}
        {post.country_slug && (
          <SignalRow label="Country">
            <span style={{ fontSize: '0.75rem' }}>🌍 {post.country_slug}</span>
          </SignalRow>
        )}

        {post.author_name && (
          <SignalRow label="Author">
            <span style={{ color: 'rgba(255,255,255,0.85)' }}>{post.author_name}</span>
            {post.author_role && (
              <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginLeft: 4 }}>· {post.author_role}</span>
            )}
          </SignalRow>
        )}

        {post.created_at && (
          <SignalRow label="Created">
            <span style={{ fontSize: '0.75rem' }}>{new Date(post.created_at).toLocaleString()}</span>
          </SignalRow>
        )}

        {post.view_count != null && (
          <SignalRow label="Views">
            <span style={{ fontSize: '0.75rem' }}>{post.view_count.toLocaleString()}</span>
          </SignalRow>
        )}

        {!post.highlight_id && !post.team_home_id && !post.team_away_id && !post.league_id && !post.player_id && (
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>
            No pipeline signals recorded on this post.
          </div>
        )}
      </div>

      {loading && (
        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: 8 }}>Loading highlight…</div>
      )}

      {highlight && (
        <div style={{ marginTop: 12, padding: 10, background: 'rgba(0,0,0,0.2)', borderRadius: 4, fontSize: '0.8rem' }}>
          <div style={{ fontWeight: 500, color: 'rgba(255,255,255,0.9)', marginBottom: 4 }}>{highlight.title}</div>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>
            {highlight.home_team_name} vs {highlight.away_team_name}
            {highlight.league_name ? ` · ${highlight.league_name}` : ''}
          </div>
          {highlight.match_date && (
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', marginTop: 2 }}>
              {new Date(highlight.match_date).toLocaleDateString()}
              {highlight.channel ? ` · via ${highlight.channel}` : ''}
            </div>
          )}
          {(highlight.video_url || highlight.embed_url) && (
            <a
              href={highlight.embed_url || highlight.video_url}
              target="_blank"
              rel="noopener"
              style={{ display: 'inline-block', marginTop: 6, fontSize: '0.7rem', color: '#14B8A6' }}
            >
              Watch original →
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function SignalRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', minWidth: 100, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </span>
      <span style={{ flex: 1 }}>{children}</span>
    </div>
  );
}
