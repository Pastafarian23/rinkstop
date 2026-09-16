#!/usr/bin/env node
/**
 * Audit orchestrator for the nightly cron.
 *
 * 1. Runs the audit pipeline on ALL 688 highlight articles (~10 min)
 * 2. Counts FAIL articles
 * 3. Compares to previous FAIL count (in /tmp/audit-prev-fail-count.txt)
 * 4. Writes result file at /tmp/audit-result.json with PASS/FAIL/CANNOT_VERIFY counts
 * 5. If FAIL > 0 OR FAIL count grew, writes a summary message in the result
 *    file so the cron delivery can post it to RinkStop Ops
 *
 * The cron delivery is configured with `announce` mode; the message text
 * is read from /tmp/audit-result.json by the wrapper orchestrator.
 *
 * Used by: scripts/run-verify-claims-detached.sh (cron 13320ed0, daily 04:00 CT)
 */

require('fs').readFileSync('/root/.openclaw/workspace/rinkstop-platform/.env', 'utf8').split('\n').forEach(l => {
  const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
});
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const RESULT_FILE = process.env.AUDIT_RESULT_FILE || '/tmp/audit-result.json';
const PREV_FAIL_FILE = process.env.AUDIT_PREV_FAIL_FILE || '/tmp/audit-prev-fail-count.txt';

function log(msg) { process.stdout.write(`[${new Date().toISOString()}] ${msg}\n`); }

(async () => {
  log('Starting audit pipeline (all 688 articles)…');

  // Run audit as child process to capture output
  await new Promise((resolve) => {
    const child = spawn('node', ['scripts/_audit-pipeline.cjs', '--limit=700', '--json'], {
      cwd: '/root/.openclaw/workspace/rinkstop-platform',
      stdio: ['ignore', 'pipe', 'inherit'],
    });
    let stdout = '';
    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.on('close', (code) => {
      try {
        // Audit-pipeline writes to stdout when --json is set
        const data = JSON.parse(stdout);
        processAuditResult(data);
      } catch (e) {
        log(`Failed to parse audit JSON: ${e.message}`);
        // Soft-error: still write to PREV_FAIL_FILE so we don't lose state
        // Don't escalate to cron-level failure — Highlightly 429 etc. are transient.
        fs.writeFileSync(RESULT_FILE, JSON.stringify({
          status: 'warn',
          error: e.message,
          exitCode: code,
          timestamp: new Date().toISOString(),
          message: `⚠️ Audit run finished but JSON parse failed: ${e.message}\nLikely transient (Highlightly 429 / API rate-limit). Will retry at next cron tick.`,
        }, null, 2));
        if (fs.existsSync(PREV_FAIL_FILE)) {
          // Keep prev FAIL count unchanged
        } else {
          fs.writeFileSync(PREV_FAIL_FILE, '0');
        }
      }
      resolve();
    });
  });
})().catch(e => {
  log(`FATAL: ${e.message}`);
  process.exit(1);
});

function processAuditResult(data) {
  const { summary, reports } = data;
  const fails = reports.filter(a => a.results?.some(r => r.status === 'FAIL'));
  const pass = summary.PASS || 0;
  const failCount = fails.length;
  const cannotVerify = summary.CANNOT_VERIFY || 0;

  // Read previous FAIL count
  let prevFail = 0;
  try {
    if (fs.existsSync(PREV_FAIL_FILE)) {
      prevFail = parseInt(fs.readFileSync(PREV_FAIL_FILE, 'utf8').trim(), 10) || 0;
    }
  } catch (e) {}

  const grew = failCount > prevFail;
  const hasFail = failCount > 0;

  // Build summary message
  let message = '';
  if (hasFail) {
    const failList = fails.slice(0, 10).map(a => `  • ${a.title}`).join('\n');
    const more = fails.length > 10 ? `\n  … and ${fails.length - 10} more` : '';
    message = `🚨 Article accuracy audit: ${failCount} FAIL\n` +
              `Previous FAIL count: ${prevFail} (${grew ? 'GROWING' : 'stable'})\n` +
              `PASS: ${pass} | CANNOT_VERIFY: ${cannotVerify}\n\n` +
              (grew ? `⚠️ FAIL count grew by ${failCount - prevFail} since last run.\n` : '') +
              `Top FAIL articles:\n${failList}${more}\n\n` +
              `Action: review in /admin or run scripts/_regenerate-hockeytech-fails.cjs`;
  } else {
    message = `✅ Article accuracy audit: 0 FAIL\n` +
              `PASS: ${pass} | CANNOT_VERIFY: ${cannotVerify}\n` +
              `Previous FAIL count: ${prevFail} (stable)`;
  }

  fs.writeFileSync(RESULT_FILE, JSON.stringify({
    status: 'ok',
    timestamp: new Date().toISOString(),
    summary: { PASS: pass, FAIL: failCount, CANNOT_VERIFY: cannotVerify },
    failCount,
    prevFail,
    grew,
    failSlugs: fails.map(a => a.slug),
    failTitles: fails.map(a => a.title),
    message,
  }, null, 2));

  // Also write to legacy path for backward compat with existing cron prompt
  fs.writeFileSync('/tmp/verify-claims.result.json', JSON.stringify({
    status: 'ok',
    total: reports.length,
    ok: pass,
    false: failCount,
    no_fixture: 0,
    no_foundation: cannotVerify,
    archived: 0,
    message,
  }, null, 2));

  // Save current FAIL count for next run
  fs.writeFileSync(PREV_FAIL_FILE, String(failCount));

  log(`Audit done. PASS=${pass} FAIL=${failCount} CANNOT_VERIFY=${cannotVerify}`);
  log(`Message: ${message}`);
}
