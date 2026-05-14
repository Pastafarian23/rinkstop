'use client';

import { useState, useEffect } from 'react';
import RelatedContent from '@/components/RelatedContent';

interface Props {
  rinkId: string;
  rinkCity?: string;
}

export default function RinkRelated({ rinkId, rinkCity }: Props) {
  const [teamsHere, setTeamsHere] = useState<any[]>([]);
  const [nearbyTeams, setNearbyTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    let loaded = 0;
    const total = 2;

    const checkDone = () => { loaded++; if (loaded >= total) setLoading(false); };

    // Teams that play at this rink
    fetch(`/api/teams?rinkId=${rinkId}`, { signal: controller.signal })
      .then(r => r.json())
      .then(data => {
        const teams: any[] = data?.data || [];
        setTeamsHere(teams);
      })
      .catch(() => {})
      .finally(() => { loaded++; checkDone(); });

    // Nearby teams (same city)
    if (rinkCity) {
      fetch(`/api/teams?city=${encodeURIComponent(rinkCity)}&limit=10`, { signal: controller.signal })
        .then(r => r.json())
        .then(data => {
          const teams: any[] = data?.data || [];
          setNearbyTeams(teams.filter((t: any) => t.id !== undefined).slice(0, 5));
        })
        .catch(() => {})
        .finally(() => { loaded++; checkDone(); });
    } else {
      loaded++; checkDone();
    }

    setTimeout(() => controller.abort(), 8000);
    return () => controller.abort();
  }, [rinkId, rinkCity]);

  if (loading) return null;

  const sections: Array<{ title?: string; items: any[]; emptyMessage?: string }> = [];

  if (teamsHere.length > 0) {
    sections.push({
      title: '🏒 Teams That Play Here',
      items: teamsHere.map(t => ({ id: t.id, name: t.name, slug: t.id, type: 'team', logo_url: t.logo_url, city: t.city, country: t.country })),
    });
  }

  if (nearbyTeams.length > 0) {
    const unique = nearbyTeams.filter(t => !teamsHere.find(th => th.id === t.id));
    if (unique.length > 0) {
      sections.push({
        title: `Teams in ${rinkCity}`,
        items: unique.map(t => ({ id: t.id, name: t.name, slug: t.id, type: 'team', logo_url: t.logo_url, city: t.city, country: t.country })),
      });
    }
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