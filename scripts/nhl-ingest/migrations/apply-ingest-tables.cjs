require('../../load-secrets.cjs');
const fs = require('node:fs');

const creds = JSON.parse(fs.readFileSync('/root/.openclaw/credentials/supabase.json', 'utf8'));
const PAT = creds.pat;
const PROJECT = 'yszheonqyyskkjoxoexk';
const ENDPOINT = `https://api.supabase.com/v1/projects/${PROJECT}/database/query`;

const MIGRATION = process.argv[2] ? __dirname + '/' + process.argv[2] : __dirname + '/002_add_indexes.sql';

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
  const sql = fs.readFileSync(MIGRATION, 'utf8');
  const lines = sql.split('\n');
  const stmts = [];
  let current = [];
  for (const line of lines) {
    const stripped = line.trim();
    if (stripped.startsWith('--')) continue;
    current.push(line);
    if (stripped.endsWith(';')) {
      const stmt = current.join('\n').trim();
      if (stmt) stmts.push(stmt);
      current = [];
    }
  }
  console.log(`[migration] File: ${MIGRATION}`);
  console.log(`[migration] ${stmts.length} statements`);

  for (let i = 0; i < stmts.length; i++) {
    const stmt = stmts[i].trim();
    if (!stmt || stmt === 'BEGIN;' || stmt === 'COMMIT;') {
      console.log(`[migration] ${i + 1}: ${stmt === 'BEGIN;' ? 'BEGIN' : stmt === 'COMMIT;' ? 'COMMIT' : '(empty)'} — skipped`);
      continue;
    }
    const preview = stmt.replace(/\s+/g, ' ').slice(0, 90);
    console.log(`[migration] stmt ${i + 1}/${stmts.length}: ${preview}...`);
    try {
      await runQuery(stmt + ';');
      console.log(`  ✅`);
    } catch (e) {
      console.error(`  ❌ ${e.message}`);
      try { await runQuery('ROLLBACK;'); } catch (e2) {}
      process.exit(1);
    }
  }
  console.log('\n[migration] ✅ Done.');
}

main().catch(e => { console.error('[migration] Fatal:', e.message); process.exit(1); });
