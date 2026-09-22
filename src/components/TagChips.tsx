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
  // 2026-09-22 per Arnel 10:47 CDT: canonical team/league FKs from the
  // post. When set, these are queried FIRST so the tag chips always
  // resolve to the teams/leagues the article is actually about — not
  // substring matches like 'Flyers' → 'Nazareth University Golden
  // Flyers'. Falls back to substring matching via /api/related-directory
  // when no FK match is found for a tag.
  teamHomeId?: string | null;
  teamAwayId?: string | null;
  leagueId?: string | null;
}

// Per-Arnel 2026-09-22 10:47 CDT: tag chips at the bottom of an
// article should resolve to actual entity pages (team / league / rink)
// when a match exists in our directory, instead of always linking to
// `/news?tag=X` (a generic news search). Users navigating from an
// article should land on the actual team/league page with full data.
export default function TagChips({ tags, teamHomeId, teamAwayId, leagueId }: TagChipsProps) {
  const [resolved, setResolved] = useState<ResolvedTag[]>([]);

  useEffect(() => {
    if (tags.length === 0) {
      setResolved([]);
      return;
    }
    let cancelled = false;
    // 2026-09-22: 2-phase resolution. Phase 1 — fetch the FK-named
    // teams + league via a small dedicated endpoint. These become
    // priority tags that override substring matches. Phase 2 — call
    // /api/related-directory for the remaining tags.
    const priorityLookup = async (): Promise<Record<string, ResolvedTag>> => {
      const out: Record<string, ResolvedTag> = {};
      const fks: Array<{ id: string; type: 'team' | 'league' }> = [];
      if (teamHomeId) fks.push({ id: teamHomeId, type: 'team' });
      if (teamAwayId) fks.push({ id: teamAwayId, type: 'team' });
      if (leagueId) fks.push({ id: leagueId, type: 'league' });
      if (fks.length === 0) return out;
      try {
        const res = await fetch(`/api/related-directory/by-id?ids=${fks.map(f => `${f.type}:${f.id}`).join(',')}`);
        if (!res.ok) return out;
        const d = await res.json();
        for (const it of (d.items || []) as any[]) {
          // Map this entity to any tag that matches it by substring
          // (e.g. 'Philadelphia Flyers' matches tag 'flyers' or 'philadelphia').
          // Use the LONGEST matching tag (most specific match wins).
          const nameLower = (it.name || '').toLowerCase();
          for (const tag of tags) {
            const t = tag.toLowerCase();
            if (nameLower === t || nameLower.includes(t) || t.includes(nameLower)) {
              const existing = out[tag];
              if (!existing || (existing.kind === 'news-search') || kindRank(it.type) > kindRank(existing.kind)) {
                out[tag] = {
                  tag,
                  href: `/${it.type === 'rink' ? 'directory/rinks' : it.type === 'team' ? 'directory/teams' : 'directory/leagues'}/${it.slug}`,
                  kind: it.type,
                };
              }
            }
          }
        }
      } catch {}
      return out;
    };

    const substringLookup = async (priority: Record<string, ResolvedTag>): Promise<Record<string, ResolvedTag>> => {
      const out = { ...priority };
      const remainingTags = tags.filter(t => !priority[t]);
      if (remainingTags.length === 0) return out;
      const params = new URLSearchParams();
      remainingTags.forEach(t => params.append('tag', t));
      params.set('limit', String(remainingTags.length * 3));
      try {
        const res = await fetch(`/api/related-directory?${params.toString()}`);
        if (!res.ok) return out;
        const d = await res.json();
        const items: any[] = d?.items || [];
        for (const it of items) {
          const nameLower = (it.name || '').toLowerCase();
          for (const tag of remainingTags) {
            const t = tag.toLowerCase();
            if (nameLower === t || nameLower.includes(t) || t.includes(nameLower)) {
              const existing = out[tag];
              if (!existing || kindRank(it.type) > kindRank(existing.kind)) {
                out[tag] = {
                  tag,
                  href: `/${it.type === 'rink' ? 'directory/rinks' : it.type === 'team' ? 'directory/teams' : 'directory/leagues'}/${it.slug}`,
                  kind: it.type,
                };
              }
            }
          }
        }
      } catch {}
      return out;
    };

    (async () => {
      const priority = await priorityLookup();
      const merged = await substringLookup(priority);
      if (cancelled) return;
      const out: ResolvedTag[] = tags.map(tag => merged[tag] || {
        tag,
        href: `/news?tag=${tag}`,
        kind: 'news-search' as const,
      });
      setResolved(out);
    })();
    return () => { cancelled = true; };
  }, [tags.join(','), teamHomeId || '', teamAwayId || '', leagueId || '']);

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
