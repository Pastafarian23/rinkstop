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
//   - Verifies after promoting, and reports LOUDLY if it did not take effect
//
// 2026-10-23 rewrite — two bugs had disabled this script entirely:
//   BUG 1 (candidate filter): it required `d.target === null`. Vercel now
//     stamps `target: "production"` on main-branch deploys that were never
//     promoted, so the filter never matched and the cron reported "no
//     staged main deploy — nothing to do" while production silently served
//     the previous commit. Observed on deploy c4f8b268 (2026-10-23).
//     Fix: pick the newest READY main-branch deployment and compare it to
//     what the aliases actually point at. The target value is irrelevant.
//   BUG 2 (alias lookup): it used `/v4/aliases/{alias}?teamId=...`, which
//     returns 403 "The request is missing an authentication token" for this
//     token. The 403 was swallowed by a try/catch that only logged, so every
//     promotion attempt was skipped. `/v1/aliases/{alias}` (no teamId) works
//     and returns deploymentId. Fix: use v1 and drop teamId.
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
const TEAM_ID = CREDS.teamId; // retained for reference; no endpoint needs it (teamId params caused 403)
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
  // v1 — NOT v4. The v4 variant (/v4/aliases/{alias}) returns 403
  // "The request is missing an authentication token" with this token, and
  // the old code swallowed that in a try/catch so promotion never ran.
  // Verified live 2026-10-23: /v1/aliases/rinkstop.com -> 200 + deploymentId.
  const data = await api('GET', `/v1/aliases/${encodeURIComponent(alias)}`);
  return data.deploymentId;
}

async function listRecentDeploys(limit = 5) {
  const data = await api('GET', `/v6/deployments?projectId=${PROJECT_ID}&limit=${limit}`);
  return data.deployments || [];
}

async function promoteDeployment(deploymentId, alias) {
  return api('POST', `/v2/deployments/${deploymentId}/aliases`, { alias });
}

async function main() {
  const startedAt = new Date().toISOString();
  console.log(`${LOG_PREFIX} start ${startedAt}`);

  // 1. Resolve where production actually points right now.
  const aliasTargets = {};
  let aliasLookupOk = true;
  for (const alias of PRODUCTION_ALIASES) {
    try {
      aliasTargets[alias] = await getAliasTarget(alias);
    } catch (err) {
      console.error(`${LOG_PREFIX} alias ${alias} lookup failed:`, err.message);
      aliasLookupOk = false;
    }
  }
  if (!aliasLookupOk) {
    // Without alias state we cannot safely decide anything. Bail loudly
    // rather than guessing — a wrong guess here either promotes the wrong
    // commit or leaves production stale without saying so.
    console.error(`${LOG_PREFIX} FATAL: could not read production alias state — refusing to act`);
    process.exit(3);
  }

  console.log(
    `${LOG_PREFIX} production aliases -> ${PRODUCTION_ALIASES.map(
      (a) => `${a}=${String(aliasTargets[a]).slice(14, 22)}`,
    ).join(' ')}`,
  );

  // 2. Candidate = newest READY main-branch deployment that production is
  //    NOT already serving. Deliberately does NOT filter on `target`:
  //    Vercel stamps target:"production" on main deploys that were never
  //    promoted (observed on c4f8b268), and target:null on the older STAGED
  //    shape. Alias state is the only trustworthy signal.
  //
  //    GUARD (added 2026-10-23 after a live rollback): never promote a
  //    deployment OLDER than what production already serves. An earlier
  //    version of this filter would happily roll production backwards when
  //    the alias lagged a fast sequence of deploys, which is strictly worse
  //    than doing nothing. Sort explicitly by `created` rather than trusting
  //    API return order.
  const deploys = await listRecentDeploys(10);
  const mainDeploys = deploys
    .filter((d) => d.state === 'READY' && (d.meta || {}).githubCommitRef === 'main')
    .sort((a, b) => b.created - a.created);

  if (mainDeploys.length === 0) {
    console.log(`${LOG_PREFIX} no READY main-branch deploys found — nothing to do`);
    return;
  }

  const newestMain = mainDeploys[0];
  const liveSet = new Set(Object.values(aliasTargets).filter(Boolean));
  const servedMain = mainDeploys.find((d) => liveSet.has(d.uid));

  if (servedMain && servedMain.created >= newestMain.created) {
    console.log(
      `${LOG_PREFIX} production already serves newest main deploy ${(servedMain.meta?.githubCommitSha || '').slice(0, 8)} — nothing to do`,
    );
    return;
  }

  const candidate = newestMain;
  const meta = candidate.meta || {};
  const shortSha = (meta.githubCommitSha || '').slice(0, 8);
  const msgFirstLine = (meta.githubCommitMessage || '').split('\n')[0];
  console.log(`${LOG_PREFIX} candidate ${candidate.uid} sha=${shortSha} msg="${msgFirstLine}"`);
  console.log(`${LOG_PREFIX}   (target="${candidate.target}" readyState=${candidate.readyState} — ignored, alias state is authoritative)`);

  // 2. For each production alias, check current target and promote if needed
  let promoted = false;
  const failed = [];
  for (const alias of PRODUCTION_ALIASES) {
    const current = aliasTargets[alias];

    if (current === candidate.uid) {
      console.log(`${LOG_PREFIX} ${alias} already -> ${current.slice(14, 22)} — no work`);
      continue;
    }

    console.log(`${LOG_PREFIX} ${alias}: ${String(current).slice(14, 22)} -> ${candidate.uid.slice(14, 22)} (promoting)`);
    try {
      const result = await promoteDeployment(candidate.uid, alias);
      const oldDep = result.oldDeploymentId ? result.oldDeploymentId.slice(14, 22) : 'unknown';
      console.log(`${LOG_PREFIX} ${alias} PROMOTED ${oldDep} -> ${candidate.uid.slice(14, 22)} uid=${String(result.uid).slice(0, 16)}`);
      promoted = true;
    } catch (err) {
      console.error(`${LOG_PREFIX} ${alias} promote failed:`, err.message);
      failed.push(alias);
    }
  }

  if (failed.length > 0) {
    console.error(`${LOG_PREFIX} FATAL: promotion failed for ${failed.join(', ')} — production may be serving stale code`);
    process.exit(4);
  }

  if (promoted) {
    const flag = {
      promotedAt: startedAt,
      deploymentId: candidate.uid,
      shortSha,
      commitMessage: msgFirstLine,
    };
    fs.writeFileSync(FLAG_PATH, JSON.stringify(flag, null, 2));
    console.log(`${LOG_PREFIX} PROMOTED — flag written to ${FLAG_PATH}`);
  }

  // 3. Verify. The whole point of this script is that production ends up on
  //    the newest main commit. Confirm it actually happened rather than
  //    trusting a 200 from the POST — this is the check whose absence let a
  //    stale deploy masquerade as healthy for hours.
  const verifyFailures = [];
  for (const alias of PRODUCTION_ALIASES) {
    let after;
    try {
      after = await getAliasTarget(alias);
    } catch (err) {
      verifyFailures.push(`${alias} (lookup failed: ${err.message})`);
      continue;
    }
    if (after !== candidate.uid) {
      verifyFailures.push(`${alias} -> ${String(after).slice(14, 22)} (expected ${candidate.uid.slice(14, 22)})`);
    }
  }
  if (verifyFailures.length > 0) {
    console.error(
      `${LOG_PREFIX} VERIFY FAILED for ${shortSha}: ${verifyFailures.join('; ')} — production is NOT on the newest main commit`,
    );
    process.exit(5);
  }
  console.log(`${LOG_PREFIX} VERIFY OK — both aliases -> ${candidate.uid.slice(14, 22)} (${shortSha})`);
}

main().catch((err) => {
  console.error(`${LOG_PREFIX} fatal:`, err);
  process.exit(2);
});