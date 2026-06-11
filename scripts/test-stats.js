const NHL_BASE = 'https://nhl.highlightly.net';
const API_KEY = process.env.HIGHLIGHTLY_API_KEY;

async function fetchPlayerStats(id) {
  const url = NHL_BASE + '/players/' + id + '/statistics';
  const res = await fetch(url, {
    headers: {
      'x-rapidapi-key': API_KEY,
      'x-rapidapi-host': 'nhl-ncaah-api.p.rapidapi.com'
    }
  });
  if (!res.ok) {
    console.log('HTTP', res.status);
    return [];
  }
  const data = await res.json();
  return Array.isArray(data) ? data : (data.data || []);
}

async function main() {
  const stats = await fetchPlayerStats('58427177'); // Connor McDavid
  console.log('API response length:', stats.length);
  if (stats.length > 0) {
    console.log('First item keys:', Object.keys(stats[0]));
    console.log('Full first item:', JSON.stringify(stats[0]).substring(0, 500));
  }
}
main().catch(console.error);