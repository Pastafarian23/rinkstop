'use client';

import { useState, useEffect } from 'react';
import RelatedContent from '@/components/RelatedContent';

interface Props {
  leagueId: string;
  leagueName: string;
}

export default function LeagueRelated({ leagueId, leagueName }: Props) {
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    fetch(`/api/teams?leagueId=${leagueId}&limit=20`, { signal: controller.signal })
      .then(r => r.json())
      .then(data => {
        const teams: any[] = data?.data || [];
        setTeams(teams.map(t => ({ id: t.id, name: t.name, slug: t.id, type: 'team', logo_url: t.logo_url, city: t.city, country: t.country })));
      })
      .catch(() => {})
      .finally(() => {
        setLoading(false);
      });

    setTimeout(() => controller.abort(), 8000);
    return () => controller.abort();
  }, [leagueId]);

  if (loading) return null;

  if (teams.length === 0) {
    return (
      <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.875rem', marginTop: '1rem' }}>
        No teams registered in {leagueName} yet.
      </p>
    );
  }

  return (
    <RelatedContent
      title={`Teams in ${leagueName}`}
      items={teams}
      layout="grid"
    />
  );
}