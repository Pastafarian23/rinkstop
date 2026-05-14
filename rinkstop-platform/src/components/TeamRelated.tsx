'use client';

import { useState, useEffect } from 'react';
import RelatedContent from '@/components/RelatedContent';

interface Props {
  leagueId: string;
  currentTeamId: string;
  homeRinkId?: string;
}

export default function TeamRelated({ leagueId, currentTeamId, homeRinkId }: Props) {
  const [homeRink, setHomeRink] = useState<any>(null);
  const [league, setLeague] = useState<any>(null);
  const [otherTeams, setOtherTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    let loaded = 0;
    const total = 3;

    const checkDone = () => { loaded++; if (loaded >= total) setLoading(false); };

    // Fetch rink
    if (homeRinkId) {
      fetch(`/api/rinks?id=${homeRinkId}`, { signal: controller.signal })
        .then(r => r.json())
        .then(data => {
          const rink = Array.isArray(data) ? data.find((x: any) => x.id === homeRinkId) : null;
          if (rink) setHomeRink(rink);
        })
        .catch(() => {});
    } else {
      loaded++; checkDone();
    }

    // Fetch league
    if (leagueId) {
      fetch(`/api/leagues?id=${leagueId}`, { signal: controller.signal })
        .then(r => r.json())
        .then(data => {
          const lg = Array.isArray(data) ? data.find((x: any) => x.id === leagueId) : null;
          if (lg) setLeague(lg);
        })
        .catch(() => {});
    } else {
      loaded++; checkDone();
    }

    // Fetch other teams in same league
    if (leagueId) {
      fetch(`/api/teams?leagueId=${leagueId}&limit=10`, { signal: controller.signal })
        .then(r => r.json())
        .then(data => {
          const teams: any[] = data?.data || [];
          setOtherTeams(teams.filter((t: any) => t.id !== currentTeamId).slice(0, 5));
        })
        .catch(() => {});
    } else {
      loaded++; checkDone();
    }

    setTimeout(() => controller.abort(), 8000);
    return () => controller.abort();
  }, [leagueId, currentTeamId, homeRinkId]);

  if (loading) return null;

  const sections: Array<{ title?: string; items: any[]; emptyMessage?: string }> = [];

  if (homeRink) {
    sections.push({
      title: '🏟️ Home Rink',
      items: [{ id: homeRink.id, name: homeRink.name, slug: homeRink.id, type: 'rink', city: homeRink.city, country: homeRink.country }],
    });
  }

  if (league) {
    sections.push({
      title: '🏆 League',
      items: [{ id: league.id, name: league.name, slug: league.id, type: 'league' }],
    });
  }

  if (otherTeams.length > 0) {
    sections.push({
      title: `Teams in ${league?.name || 'League'}`,
      items: otherTeams.map(t => ({ id: t.id, name: t.name, slug: t.id, type: 'team', logo_url: t.logo_url, city: t.city, country: t.country })),
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