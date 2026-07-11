'use client';

import { useEffect, useState } from 'react';

type LookupOption = { id: string; name: string };

export function useFederationOrgLeague() {
  const [federations, setFederations] = useState<LookupOption[]>([]);
  const [orgs, setOrgs] = useState<LookupOption[]>([]);
  const [leagues, setLeagues] = useState<LookupOption[]>([]);

  const reload = async () => {
    try {
      const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!base || !key) return;

      const headers = { apikey: key, Authorization: `Bearer ${key}` };

      const [fRes, oRes, lRes] = await Promise.all([
        fetch(`${base}/rest/v1/federations?select=id,name,slug&is_active=eq.true&order=name`, { headers }),
        fetch(`${base}/rest/v1/organizations?select=id,name,slug&is_active=eq.true&order=name`, { headers }),
        fetch(`${base}/rest/v1/leagues?select=id,name,slug&is_active=eq.true&order=name`, { headers }),
      ]);

      if (fRes.ok) setFederations(await fRes.json());
      if (oRes.ok) setOrgs(await oRes.json());
      if (lRes.ok) setLeagues(await lRes.json());
    } catch {}
  };

  useEffect(() => { reload(); }, []);

  return { federations, orgs, leagues, reload };
}
