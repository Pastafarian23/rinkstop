require('../../load-secrets.cjs');
const fs = require('node:fs');

const creds = JSON.parse(fs.readFileSync('/root/.openclaw/credentials/supabase.json', 'utf8'));
const PAT = creds.pat;
const PROJECT = 'yszheonqyyskkjoxoexk';
const ENDPOINT = `https://api.supabase.com/v1/projects/${PROJECT}/database/query`;

async function runQuery(query) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PAT}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status}: ${text.slice(0, 500)}`);
  return text;
}

async function main() {
  const sql = fs.readFileSync(__dirname + '/003_player_trades.sql', 'utf8');
  const lines = sql.split('\n');
  const stmts = [];
  let cur = [];
  for (const line of lines) {
    const s = line.trim();
    if (s.startsWith('--')) continue;
    cur.push(line);
    if (s.endsWith(';')) {
      const stmt = cur.join('\n').trim();
      if (stmt) stmts.push(stmt);
      cur = [];
    }
  }
  console.log(`[migration] ${stmts.length} statements`);
  for (let i = 0; i < stmts.length; i++) {
    const stmt = stmts[i].trim();
    if (!stmt || stmt === 'BEGIN;' || stmt === 'COMMIT;') continue;
    const preview = stmt.replace(/\s+/g, ' ').slice(0, 80);
    console.log(`[migration] ${i + 1}: ${preview}...`);
    try {
      await runQuery(stmt + ';');
      console.log('  ✅');
    } catch (e) {
      console.error(`  ❌ ${e.message}`);
      process.exit(1);
    }
  }
  console.log('\n[migration] ✅ Done.');
}

main().catch(e => { console.error(e.message); process.exit(1); });
