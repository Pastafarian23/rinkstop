// 2026-10-14: helper — read preview sitemap URLs and report counts
// by status + league tier.  Used for Task 1 verification.
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const https = require('https');

// parse .env.local manually
const env = {};
for (const line of fs.readFileSync('/root/.openclaw/workspace/rinkstop-platform/.env.local', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2];
}
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const TOP_TIER = new Set([
  'nhl','ahl','pwhl','khl','shl','liiga','del','nl',
  'extraliga','ncaa','chl','whl','ohl','qmjhl','ushl',
]);

const preview = process.env.PREVIEW || 'https://rinkstop-platform-fpe0ap8sy-arnellarracas-4208s-projects.vercel.app';

function getXml(url) {
  return new Promise((resolve, reject) => {
    https.get(url + '?_=' + Date.now(), (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => resolve(body));
      res.on('error', reject);
    });
  });
}

(async () => {
  const xml = await getXml(preview + '/sitemap-games.xml');
  const ids = [...xml.matchAll(/\/directory\/games\/([a-f0-9-]{36})/g)].map(m => m[1]);
  console.log('total URLs:', ids.length);
  const map = new Map();
  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200);
    const { data } = await sb
      .from('fixtures')
      .select('id, status, league:leagues(slug)')
      .in('id', chunk);
    for (const f of data || []) map.set(f.id, { status: f.status, league: f.league?.slug || '?' });
  }
  const byStatus = {};
  const byTier = { top: 0, lower: 0, unknown: 0 };
  for (const id of ids) {
    const m = map.get(id);
    if (!m) { byStatus['missing'] = (byStatus['missing']||0) + 1; continue; }
    byStatus[m.status] = (byStatus[m.status]||0) + 1;
    const tier = TOP_TIER.has((m.league||'').toLowerCase()) ? 'top' : (m.league === '?' ? 'unknown' : 'lower');
    byTier[tier]++;
  }
  console.log('by status:', byStatus);
  console.log('by tier:', byTier);
  const first = ids.slice(0, 1000).map(id => map.get(id)).filter(Boolean);
  const firstByStatus = {};
  for (const m of first) firstByStatus[m.status] = (firstByStatus[m.status]||0)+1;
  console.log('first 1000 by status:', firstByStatus);
  console.log('finished sample 68c35920... in sitemap:', ids.includes('68c35920-11db-4be1-b6a9-17ba085edd94'));
})();
