#!/usr/bin/env node
// scripts/cron-vercel-auto-promote.mjs
//
// Self-healing Vercel production promotion. Detects staged deploys whose git
// ref is `main` and swaps the production alias (rinkstop.com, www.rinkstop.com)
// to point at them.
//
// Why this exists (added 2026-08-06):
//   Vercel project setting `productionBranch` is null on rinkstop-platform.
//   The GitHub integration creates a deployment for every push, but with no
//   production branch set, the integration never auto-promotes the deploy
//   to the production alias. PR squash merges to main land as STAGED
//   (target=null, readySubstate=STAGED) until something manually swaps the
//   alias. Confirmed: PR #98 (direct commit to main) was PROMOTED, but
//   PR #99 (squash merge from fix-gsc-sub-sitemaps branch) was STAGED.
//
//   Cannot fix via PATCH /v10/projects/{id} — the API rejects
//   `productionBranch` with "should NOT have additional property". Field is
//   dashboard-only. Vercel support ticket filed; workaround lives here.
//
// Safety:
//   - Only promotes deployments with state=READY (not ERROR, CANCELED, etc.)
//   - Only promotes deployments with meta.githubCommitRef === 'main'
//     (never PR previews, never feature branches)
//   - Only promotes when alias is currently pointing to a different
//     deployment (avoids redundant work + the v2/v4 double-call bug we
//     saw manually firing both endpoints back-to-back)
//   - Idempotent: a second run within 5 min finds nothing to do
//
// Schedule via OpenClaw cron: every 5 min, silent on no-op.
//
// When this becomes unnecessary:
//   Once the Vercel project setting `productionBranch = main` is set in
//   the dashboard (Vercel support ticket 2026-08-06), auto-promotion will
//   resume natively. Keep this script as defense-in-depth — it catches
//   future Vercel integration regressions and self-heals within 5 min.

import fs from 'node:fs';

const CREDS_PATH = '/root/.openclaw/credentials/vercel.json';
const CREDS = JSON.parse(fs.readFileSync(CREDS_PATH, 'utf8'));
const TOKEN = CREDS.token;
const PROJECT_ID = CREDS.projectId;
const TEAM_ID = CREDS.teamId;
const PRODUCTION_ALIASES = ['rinkstop.com', 'www.rinkstop.com'];
const FLAG_PATH = '/tmp/vercel-auto-promote-last.json';
const LOG_PREFIX = '[cron:vercel-auto-promote]';

const VERCEL_API = 'https://api.vercel.com';

async function api(method, urlPath, body) {
  const init = {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
  };
  if (body !== undefined) init.body = JSON.stringify(body);
  const res = await fetch(`${VERCEL_API}${urlPath}`, init);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${method} ${urlPath} -> ${res.status} ${text.slice(0, 200)}`);
  }
  return res.json();
}

async function getAliasTarget(alias) {
  const data = await api('GET', `/v4/aliases/${encodeURIComponent(alias)}?teamId=${TEAM_ID}`);
  return data.deploymentId;
}

async function listRecentDeploys(limit = 5) {
  const data = await api('GET', `/v6/deployments?projectId=${PROJECT_ID}&teamId=${TEAM_ID}&limit=${limit}`);
  return data.deployments || [];
}

async function promoteDeployment(deploymentId, alias) {
  return api('POST', `/v2/deployments/${deploymentId}/aliases?teamId=${TEAM_ID}`, { alias });
}

async function main() {
  const startedAt = new Date().toISOString();
  console.log(`${LOG_PREFIX} start ${startedAt}`);

  // 1. Find candidate: latest READY deployment on main with target=null
  const deploys = await listRecentDeploys(5);
  const candidate = deploys.find((d) => {
    const meta = d.meta || {};
    return (
      d.state === 'READY' &&
      d.target === null &&
      meta.githubCommitRef === 'main'
    );
  });

  if (!candidate) {
    console.log(`${LOG_PREFIX} no staged main deploy — nothing to do`);
    return;
  }

  const meta = candidate.meta || {};
  const shortSha = (meta.githubCommitSha || '').slice(0, 8);
  const msgFirstLine = (meta.githubCommitMessage || '').split('\n')[0];
  console.log(`${LOG_PREFIX} candidate ${candidate.id} sha=${shortSha} msg="${msgFirstLine}"`);

  // 2. For each production alias, check current target and promote if needed
  let promoted = false;
  for (const alias of PRODUCTION_ALIASES) {
    let current;
    try {
      current = await getAliasTarget(alias);
    } catch (err) {
      console.error(`${LOG_PREFIX} alias ${alias} lookup failed:`, err.message);
      continue;
    }

    if (current === candidate.id) {
      console.log(`${LOG_PREFIX} ${alias} already -> ${current.slice(14)} — no work`);
      continue;
    }

    console.log(`${LOG_PREFIX} ${alias}: ${current.slice(14)} -> ${candidate.id.slice(14)} (promoting)`);
    try {
      const result = await promoteDeployment(candidate.id, alias);
      const oldDep = result.oldDeploymentId ? result.oldDeploymentId.slice(14) : 'unknown';
      console.log(`${LOG_PREFIX} ${alias} PROMOTED ${oldDep} -> ${candidate.id.slice(14)} uid=${result.uid.slice(0, 16)}`);
      promoted = true;
    } catch (err) {
      console.error(`${LOG_PREFIX} ${alias} promote failed:`, err.message);
    }
  }

  if (promoted) {
    const flag = {
      promotedAt: startedAt,
      deploymentId: candidate.id,
      shortSha,
      commitMessage: msgFirstLine,
    };
    fs.writeFileSync(FLAG_PATH, JSON.stringify(flag, null, 2));
    console.log(`${LOG_PREFIX} PROMOTED — flag written to ${FLAG_PATH}`);
  }
}

main().catch((err) => {
  console.error(`${LOG_PREFIX} fatal:`, err);
  process.exit(2);
});