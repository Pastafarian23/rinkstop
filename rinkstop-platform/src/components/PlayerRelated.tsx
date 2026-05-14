'use client';

import { useState, useEffect } from 'react';
import RelatedContent from '@/components/RelatedContent';

interface Props {
  teamId: string;
  teamName: string;
  teamSlug: string;
  homeRinkId?: string;
  homeRinkName?: string;
}

export default function PlayerRelated({ teamId, teamName, teamSlug, homeRinkId, homeRinkName }: Props) {
  const [otherPlayers, setOtherPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    fetch(`/api/players?teamId=${teamId}&limit=20`, { signal: controller.signal })
      .then(r => r.json())
      .then(data => {
        const players: any[] = data?.data || [];
        // Keep first 5 other players (exclude self via slice after filtering if we had playerId, but we don't have it here)
        // We just show up to 5 from the team — the detail page will filter by position
        setOtherPlayers(players.slice(0, 5).map((p: any) => ({
          id: p.id,
          name: `${p.first_name} ${p.last_name}`,
          slug: p.id,
          type: 'player',
          headshot_url: p.headshot_url,
          position: p.position,
        })));
      })
      .catch(() => {})
      .finally(() => {
        setLoading(false);
      });

    setTimeout(() => controller.abort(), 8000);
    return () => controller.abort();
  }, [teamId]);

  if (loading) return null;

  const sections: Array<{ title?: string; items: any[]; emptyMessage?: string }> = [];

  if (teamId && teamName) {
    sections.push({
      title: '🏒 Current Team',
      items: [{ id: teamId, name: teamName, slug: teamSlug, type: 'team' }],
    });
  }

  if (homeRinkId && homeRinkName) {
    sections.push({
      title: '🏟️ Team Rink',
      items: [{ id: homeRinkId, name: homeRinkName, slug: homeRinkId, type: 'rink' }],
    });
  }

  if (otherPlayers.length > 0) {
    sections.push({
      title: `Other Players on ${teamName}`,
      items: otherPlayers,
    });
  }

  return (
    <>
      {sections.map((section, i) => (
        <RelatedContent
          key={i}
          title={section.title}
          items={section.items}
          emptyMessage={section.emptyMessage}
          layout="grid"
        />
      ))}
    </>
  );
}