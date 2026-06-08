const fs = require('fs');
const creds = JSON.parse(fs.readFileSync('/root/.openclaw/credentials/supabase.json', 'utf8'));
const projectRef = 'yszheonqyyskkjoxoexk';
(async () => {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${creds.pat}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'nhl_players' ORDER BY ordinal_position" }),
  });
  const data = await res.json();
  for (const col of data) {
    console.log(col.column_name, '|', col.data_type);
  }
})();
