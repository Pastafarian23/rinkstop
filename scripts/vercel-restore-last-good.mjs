#!/usr/bin/env node
// scripts/vercel-restore-last-good.mjs
//
// Re-point rinkstop.com and www.rinkstop.com to the last Vercel deployment
// with state=READY, target=production, and the highest aliasAssigned timestamp
// that is NOT a known-broken commit.
//
// Why this exists (added 2026-10-10):
//   When a Vercel build fails (compile or ISR timeout), the production alias
//   can end up pointing at a deployment that isn't serving, or no deployment
//   at all. There's no API to "rollback" per se, but the fastest manual
//   recovery is POST /v2/deployments/{id}/aliases for the last good dep.
//
// Safety:
//   - Skips the current commit SHA (the one that just broke)
//   - Only promotes state=READY deployments
//   - Only promotes deployments with target=production
//   - Falls back to "any state=READY dep with aliasAssigned" if no
//     target=production is found
//
// Usage:
//   node scripts/vercel-restore-last-good.mjs                    # restore to last good
//   node scripts/vercel-restore-last-good.mjs --exclude-sha=abc  # exclude specific commit

import fs from 'node:fs';

const CREDS = JSON.parse(fs.readFileSync('/root/.openclaw/credentials/vercel.json', 'utf8'));
const TOKEN = CREDS.token;
const PROJECT_ID = CREDS.projectId;
const TEAM_ID = CREDS.teamId;

const args = process.argv.slice(2);
let excludeSha = null;
for (const arg of args) {
  if (arg.startsWith('--exclude-sha=')) excludeSha = arg.split('=')[1];
}

async function api(path, options = {}) {
  const url = `https://api.vercel.com${path}${path.includes('?') ? '&' : '?'}teamId=${TEAM_ID}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    throw new Error(`Vercel API ${path} returned ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

async function findLastGood() {
  // Strategy: get last 20 production deploys, filter READY, exclude the bad one
  const data = await api(
    `/v6/deployments?projectId=${PROJECT_ID}&limit=20&state=READY&target=production`
  );
  const candidates = (data.deployments || []).filter((d) => {
    if (d.readyState !== 'READY') return false;
    if (excludeSha && d.meta?.githubCommitSha?.startsWith(excludeSha)) return false;
    return d.aliasAssigned != null;
  });
  if (candidates.length === 0) {
    // Fallback: any READY dep with alias assigned
    const fallback = await api(
      `/v6/deployments?projectId=${PROJECT_ID}&limit=20&state=READY`
    );
    const fallbackCandidates = (fallback.deployments || []).filter(
      (d) => d.aliasAssigned != null
    );
    return fallbackCandidates[0] || null;
  }
  return candidates[0];
}

async function reassignAlias(deploymentId, alias) {
  const res = await fetch(
    `https://api.vercel.com/v2/deployments/${deploymentId}/aliases?teamId=${TEAM_ID}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ alias }),
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Alias assignment for ${alias} returned ${res.status}: ${text}`);
  }
  return await res.json();
}

async function main() {
  console.log('=== Vercel last-good-deployment restore ===');
  const lastGood = await findLastGood();
  if (!lastGood) {
    console.error('FATAL: no READY deployments found. Manual intervention required.');
    process.exit(2);
  }
  const sha = lastGood.meta?.githubCommitSha?.slice(0, 7) || 'unknown';
  console.log(`Last good deployment: ${lastGood.uid} (commit ${sha})`);
  console.log(`  URL: ${lastGood.url}`);
  console.log(`  aliasAssigned: ${new Date(lastGood.aliasAssigned).toISOString()}`);

  for (const alias of ['rinkstop.com', 'www.rinkstop.com']) {
    try {
      const result = await reassignAlias(lastGood.uid, alias);
      console.log(`✓ ${alias} -> ${lastGood.uid} (${result.uid.slice(0, 12)}...)`);
    } catch (e) {
      console.error(`✗ ${alias}: ${e.message}`);
    }
  }

  // Verify
  console.log('\nVerifying with 5s wait + curl...');
  await new Promise((r) => setTimeout(r, 5000));
  for (const host of ['rinkstop.com', 'www.rinkstop.com']) {
    const res = await fetch(`https://${host}/api/health`, {
      redirect: 'manual',
    });
    console.log(`  https://${host}/api/health: ${res.status}`);
  }
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
