const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const cred = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.openclaw/credentials/vercel.json'), 'utf8'));
const PROJECT = 'prj_GVvqDaSS264FFo6q8LYAKGVe0bvM';

async function api(path, method, body) {
  const res = await fetch(`https://api.vercel.com${path}`, {
    method,
    headers: { Authorization: `Bearer ${cred.token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let d; try { d = JSON.parse(text); } catch { d = text; }
  if (!res.ok) { console.error('ERR', res.status, JSON.stringify(d).slice(0, 600)); process.exit(1); }
  return d;
}

(async () => {
  const action = process.argv[2];
  if (action === 'list') {
    const d = await api(`/v10/projects/${PROJECT}/env`, 'GET');
    for (const e of d.envs ?? []) {
      if (e.key === 'PERSON_IDENTITY_ENABLED') console.log(e.key, '=', e.value, '| target=', e.target, '| id=', e.id);
    }
    const all = (d.envs ?? []).filter(e => e.key === 'PERSON_IDENTITY_ENABLED');
    if (!all.length) console.log('(PERSON_IDENTITY_ENABLED is NOT set)');
    return;
  }
  if (action === 'set') {
    const value = process.argv[3];
    const existing = await api(`/v10/projects/${PROJECT}/env`, 'GET');
    const found = (existing.envs ?? []).find(e => e.key === 'PERSON_IDENTITY_ENABLED');
    if (found) {
      await api(`/v10/projects/${PROJECT}/env/${found.id}`, 'PATCH', { value });
      console.log('PATCHED', found.id, '->', value);
    } else {
      const created = await api(`/v10/projects/${PROJECT}/env`, 'POST', {
        key: 'PERSON_IDENTITY_ENABLED', value, type: 'plain', target: ['production', 'preview', 'development'],
      });
      console.log('CREATED', created.id, '->', value);
    }
    return;
  }
  if (action === 'unset') {
    const existing = await api(`/v10/projects/${PROJECT}/env`, 'GET');
    const found = (existing.envs ?? []).filter(e => e.key === 'PERSON_IDENTITY_ENABLED');
    for (const f of found) { await api(`/v10/projects/${PROJECT}/env/${f.id}`, 'DELETE'); console.log('DELETED', f.id); }
    if (!found.length) console.log('(nothing to delete)');
  }
})();
