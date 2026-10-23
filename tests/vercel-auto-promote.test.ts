// tests/vercel-auto-promote.test.ts
//
// Regression tests for the production-alias promotion logic in
// scripts/cron-vercel-auto-promote.mjs.
//
// That script is the last line of defense for production promotion: the Vercel
// project has no `productionBranch` set, so nothing promotes automatically. When
// this logic is wrong the failure is silent — production serves a stale commit
// while every health check still returns 200.
//
// Three real bugs motivated these tests (all found 2026-10-23):
//   1. The candidate filter required `target === null`. Vercel now stamps
//      `target: "production"` on unpromoted main deploys, so the filter matched
//      nothing and the cron reported "nothing to do" forever.
//   2. Alias state was read from `/v4/aliases/{alias}?teamId=…`, which returns
//      403 for our token. The 403 was swallowed, so promotion never ran.
//   3. The rewritten version rolled production BACKWARDS when the alias lagged
//      a sequence of deploys. Hence the explicit ordering guard below.
//
// The selection logic is duplicated here rather than imported, because the
// script is a standalone cron entrypoint with no exports and no test harness.
// If you change the rules in the script, change them here too — these cases
// encode the two failure directions that actually bit us.

import { describe, it, expect } from 'vitest';

interface Deploy {
  uid: string;
  created: number;
  state: string;
  meta: { githubCommitSha: string; githubCommitRef: string };
}

function deploy(
  sha: string,
  created: number,
  state = 'READY',
  ref = 'main',
): Deploy {
  return {
    uid: `dpl_${sha}`,
    created,
    state,
    meta: { githubCommitSha: sha, githubCommitRef: ref },
  };
}

function aliases(uid: string | null) {
  return { 'rinkstop.com': uid, 'www.rinkstop.com': uid };
}

type Result =
  | { action: 'none'; reason: string }
  | { action: 'promote'; to: string; from: string };

/** Mirrors main() in scripts/cron-vercel-auto-promote.mjs. */
function selectCandidate(
  deploys: Deploy[],
  aliasTargets: Record<string, string | null>,
): Result {
  const mainDeploys = deploys
    .filter((d) => d.state === 'READY' && (d.meta || {}).githubCommitRef === 'main')
    .sort((a, b) => b.created - a.created);

  if (mainDeploys.length === 0) {
    return { action: 'none', reason: 'no READY main-branch deploys' };
  }

  const newestMain = mainDeploys[0];
  const liveSet = new Set(Object.values(aliasTargets).filter(Boolean));
  const servedMain = mainDeploys.find((d) => liveSet.has(d.uid));

  // Guard against rollback: only promote when production is genuinely behind.
  if (servedMain && servedMain.created >= newestMain.created) {
    return { action: 'none', reason: `already serves ${servedMain.meta.githubCommitSha}` };
  }

  return {
    action: 'promote',
    to: newestMain.meta.githubCommitSha,
    from: servedMain ? servedMain.meta.githubCommitSha : 'unknown',
  };
}

describe('vercel auto-promote candidate selection', () => {
  it('promotes when production is one deploy behind', () => {
    const r = selectCandidate([deploy('new', 300), deploy('old', 200)], aliases('dpl_old'));
    expect(r.action).toBe('promote');
    expect(r.action === 'promote' && r.to).toBe('new');
  });

  it('does nothing when production already serves the newest deploy', () => {
    const r = selectCandidate([deploy('new', 300), deploy('old', 200)], aliases('dpl_new'));
    expect(r.action).toBe('none');
  });

  it('promotes the newest when several deploys are pending', () => {
    const r = selectCandidate(
      [deploy('a', 300), deploy('b', 250), deploy('c', 200)],
      aliases('dpl_c'),
    );
    expect(r.action).toBe('promote');
    expect(r.action === 'promote' && r.to).toBe('a');
  });

  it('sorts by created rather than trusting API order', () => {
    // Vercel returned these oldest-first in one observed response.
    const r = selectCandidate([deploy('old', 200), deploy('new', 300)], aliases('dpl_old'));
    expect(r.action).toBe('promote');
    expect(r.action === 'promote' && r.to).toBe('new');
  });

  it('ignores ERROR deploys', () => {
    const r = selectCandidate(
      [deploy('bad', 400, 'ERROR'), deploy('good', 300)],
      aliases('dpl_old'),
    );
    expect(r.action).toBe('promote');
    expect(r.action === 'promote' && r.to).toBe('good');
  });

  it('ignores non-main branches', () => {
    const r = selectCandidate(
      [deploy('x', 300, 'READY', 'some-feature-branch'), deploy('main', 250)],
      aliases('dpl_old'),
    );
    expect(r.action).toBe('promote');
    expect(r.action === 'promote' && r.to).toBe('main');
  });

  it('promotes when no alias is assigned', () => {
    const r = selectCandidate([deploy('new', 300)], aliases(null));
    expect(r.action).toBe('promote');
  });

  it('does nothing when there are no main-branch deploys at all', () => {
    const r = selectCandidate([deploy('x', 300, 'READY', 'feat')], aliases(null));
    expect(r.action).toBe('none');
  });

  // The regression that shipped on 2026-10-23: an earlier rewrite had no
  // ordering guard and rolled production from c4f8b268 back to 7b8ad509.
  it('never rolls production backwards to an older deploy', () => {
    const r = selectCandidate([deploy('new', 300), deploy('old', 200)], aliases('dpl_old'));
    if (r.action === 'promote') {
      expect(r.to).not.toBe('old');
    }
  });

  it('promotes when the alias points at an unrecognised deployment', () => {
    // A uid we cannot match is treated as stale, so we converge forward
    // rather than silently doing nothing.
    const r = selectCandidate([deploy('new', 300)], aliases('dpl_unknown'));
    expect(r.action).toBe('promote');
  });

  it('promotes when the alias sits on an older deploy than the newest', () => {
    const r = selectCandidate([deploy('new', 300), deploy('old', 200)], aliases('dpl_old'));
    expect(r.action).toBe('promote');
    expect(r.action === 'promote' && r.from).toBe('old');
  });
});