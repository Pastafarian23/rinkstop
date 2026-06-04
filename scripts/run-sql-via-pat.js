const fs = require('fs');
const creds = JSON.parse(fs.readFileSync('/root/.openclaw/credentials/supabase.json', 'utf8'));
const sqlFile = process.argv[2];
const sql = fs.readFileSync(sqlFile, 'utf8');
const projectRef = 'yszheonqyyskkjoxoexk';

(async () => {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${creds.pat}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  console.log('Status:', res.status);
  console.log(text);
})();
