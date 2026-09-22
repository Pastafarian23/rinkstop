'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface ResolvedTag {
  tag: string;
  href: string;
  // 'team' | 'league' | 'rink' | 'news-search' — controls the chip color
  kind: 'team' | 'league' | 'rink' | 'news-search';
}

interface TagChipsProps {
  tags: string[];
}

// Per-Arnel 2026-09-22 10:47 CDT: tag chips at the bottom of an
// article should resolve to actual entity pages (team / league / rink)
// when a match exists in our directory, instead of always linking to
// `/news?tag=X` (a generic news search). Users navigating from an
// article should land on the actual team/league page with full data.
export default function TagChips({ tags }: TagChipsProps) {
  const [resolved, setResolved] = useState<ResolvedTag[]>([]);

  useEffect(() => {
    if (tags.length === 0) {
      setResolved([]);
      return;
    }
    let cancelled = false;
    // Resolve all tags in one call — /api/related-directory already
    // accepts a list of `tag` query params.
    const params = new URLSearchParams();
    tags.forEach(t => params.append('tag', t));
    params.set('limit', String(tags.length * 3)); // each tag could match multiple entities
    fetch(`/api/related-directory?${params.toString()}`)
      .then(r => r.ok ? r.json() : Promise.resolve({ items: [] }))
      .then(d => {
        if (cancelled) return;
        const items: any[] = d?.items || [];
        // For each tag, pick the best match:
        //   - Prefer team > league > rink when multiple matches exist
        //   - If multiple matches of the same kind, prefer exact slug match
        //   - Fall back to news-search when nothing matches
        const tagToEntity: Record<string, ResolvedTag> = {};
        for (const it of items) {
          const tagLower = (it.name || '').toLowerCase();
          // The entity name might be 'Philadelphia Flyers' and tag 'flyers'
          // — match by substring either way
          for (const tag of tags) {
            const t = tag.toLowerCase();
            if (tagLower === t || tagLower.includes(t) || t.includes(tagLower)) {
              const existing = tagToEntity[tag];
              // Prefer team > league > rink
              const newKind = it.type;
              if (!existing || kindRank(newKind) > kindRank(existing.kind)) {
                tagToEntity[tag] = {
                  tag,
                  href: `/${it.type === 'rink' ? 'directory/rinks' : it.type === 'team' ? 'directory/teams' : 'directory/leagues'}/${it.slug}`,
                  kind: newKind,
                };
              }
            }
          }
        }
        const out: ResolvedTag[] = tags.map(tag => tagToEntity[tag] || {
          tag,
          href: `/news?tag=${tag}`,
          kind: 'news-search' as const,
        });
        setResolved(out);
      })
      .catch(() => { if (!cancelled) setResolved(tags.map(t => ({ tag: t, href: `/news?tag=${t}`, kind: 'news-search' as const }))); });
    return () => { cancelled = true; };
  }, [tags.join(',')]);

  if (tags.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
      {resolved.map((t, i) => {
        const colorMap: Record<ResolvedTag['kind'], { bg: string; color: string; label: string }> = {
          team: { bg: 'rgba(120,180,255,0.08)', color: '#7CB6FF', label: '👥' },
          league: { bg: 'rgba(255,184,28,0.08)', color: '#FFB81C', label: '🏆' },
          rink: { bg: 'rgba(120,200,160,0.08)', color: '#78C8A0', label: '🏒' },
          'news-search': { bg: 'rgba(200,16,46,0.08)', color: '#C8102E', label: '' },
        };
        const c = colorMap[t.kind];
        return (
          <Link
            key={`${t.tag}-${i}`}
            href={t.href}
            title={t.kind === 'news-search' ? `More articles tagged "${t.tag}"` : `${t.kind} page`}
            style={{
              background: c.bg,
              color: c.color,
              padding: '0.25rem 0.75rem',
              borderRadius: '2px',
              fontSize: '0.75rem',
              textDecoration: 'none',
            }}
          >
            {c.label && <span style={{ marginRight: '0.3rem' }}>{c.label}</span>}
            {t.tag}
          </Link>
        );
      })}
    </div>
  );
}

function kindRank(k: ResolvedTag['kind']): number {
  // Higher = better match. Team wins, then league, then rink, then news-search.
  switch (k) {
    case 'team': return 4;
    case 'league': return 3;
    case 'rink': return 2;
    case 'news-search': return 1;
  }
}
