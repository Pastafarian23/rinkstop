const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const cred = JSON.parse(
  fs.readFileSync(path.join(os.homedir(), '.openclaw/credentials/vercel.json'), 'utf8'),
);

const PROJECT = 'prj_GVvqDaSS264FFo6q8LYAKGVe0bvM';
const BRANCH = process.argv[2] || 'feat/unified-profile-preview';

async function main() {
  // Resolve the GitHub repo id.
  const ghToken = process.env.GITHUB_TOKEN;
  let repoId;
  if (ghToken) {
    const r = await fetch('https://api.github.com/repos/Pastafarian23/rinkstop', {
      headers: { Authorization: `Bearer ${ghToken}`, 'User-Agent': 'rinkstop' },
    });
    if (r.ok) repoId = (await r.json()).id;
  }
  if (!repoId) {
    console.error('need GITHUB_TOKEN to resolve repoId');
    process.exit(1);
  }
  console.log('repoId:', repoId);

  const body = {
    name: 'rinkstop-platform',
    target: 'staging',
    gitSource: { type: 'github', repoId, ref: BRANCH },
    project: PROJECT,
    env: { PERSON_IDENTITY_ENABLED: 'true' },
  };

  const res = await fetch(`https://api.vercel.com/v13/deployments?projectId=${PROJECT}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cred.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const d = await res.json();
  if (!res.ok) {
    console.error('create failed', res.status, JSON.stringify(d).slice(0, 800));
    process.exit(1);
  }
  console.log('id:', d.id);
  console.log('url:', d.url);
  console.log('state:', d.readyState);
}
main();
