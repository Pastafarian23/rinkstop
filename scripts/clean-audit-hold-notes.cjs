#!/usr/bin/env node
/**
 * clean-audit-hold-notes.cjs
 *
 * ONE-TIME cleanup for the auto-publish audit-hold note bloat.
 *
 * Background (2026-10-21):
 *   scripts/auto-publish-audit-validated.cjs appended a markdown note to
 *   posts.content every time it held a draft:
 *
 *     *Pre-publish audit (2026-10-15): ⛔ HELD — CRITICAL_UNVERIFIED.
 *      2/3 claims passed. Critical claims unverified: YES.
 *      Requires human review before publication.*
 *
 *   with no dedupe. Over ~3 weeks of 30-minute runs that stacked
 *   76,067 notes into 303 rows:
 *     - 56 of those rows were already PUBLISHED, so visitors saw
 *       "⛔ HELD — Requires human review" on live rinkstop.com articles
 *     - drafts grew to ~90KB each (max 279 stacked notes on one row)
 *
 *   The script has been fixed to record audit state in COLUMNS instead
 *   (last_audit_status / last_audit_check_at / last_issue_summary /
 *   human_review_status). This script removes the legacy notes from
 *   content and backfills the audit columns from the last note that was
 *   on each row.
 *
 * Safety:
 *   - Writes a full JSON backup of every touched row to
 *     BACKUP_DIR before the first write. If that file is missing, abort.
 *   - --dry-run (default) reports what would change and writes nothing.
 *   - Only strips notes matching the exact known audit-hold shapes.
 *     Everything else in content is preserved byte-for-byte.
 *
 * Usage:
 *   node scripts/clean-audit-hold-notes.cjs            # dry run
 *   node scripts/clean-audit-hold-notes.cjs --apply    # write
 */

require('fs').readFileSync('.env', 'utf8').split('\n').forEach(l => {
  const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
});
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const BACKUP_DIR = process.env.AUDIT_NOTE_BACKUP_DIR || '/root/.openclaw/workspace/backups';
const BACKUP_FILE = path.join(BACKUP_DIR, `audit-hold-notes-${new Date().toISOString().slice(0, 10)}.json`);

// The two note shapes the auto-publish pipeline produced.
// Shape 1 (current): "⛔ HELD — <REASONS>. N/M claims passed. ..."
// Shape 2 (legacy):  "N claims, N pass, N fail. Check audit-result.json for details."
const NOTE_SHAPES = [
  /\n\n\*Pre-publish audit \(\d{4}-\d{2}-\d{2}\): ⛔ HELD — [^*]*\*/g,
  /\n\n\*Pre-publish audit \(\d{4}-\d{2}-\d{2}\): \d+ claims, \d+ pass, \d+ fail\. Check audit-result\.json for details\.\*/g,
];

// Map the reasons embedded in a note to a last_audit_status value that
// satisfies posts_last_audit_status_check.
function auditStatusFromNote(note) {
  if (/CRITICAL_UNVERIFIED/.test(note) && !/FAIL/.test(note)) return 'CANNOT_VERIFY';
  if (/FAIL_DISAGREE/.test(note)) return 'FAIL_DISAGREE';
  if (/FAIL_CONFIDENCE/.test(note)) return 'FAIL_CONFIDENCE';
  if (/FAIL/.test(note)) return 'FAIL';
  return 'CANNOT_VERIFY';
}

function stripNotes(content) {
  let stripped = content;
  let removed = 0;
  let lastNote = null;
  for (const re of NOTE_SHAPES) {
    const matches = stripped.match(re);
    if (matches) {
      removed += matches.length;
      // The last note chronologically is the most recent audit verdict.
      lastNote = matches[matches.length - 1];
      stripped = stripped.replace(re, '');
    }
  }
  return { stripped, removed, lastNote };
}

(async () => {
  const apply = process.argv.includes('--apply');

  console.log(`Loading posts…${apply ? '' : ' (DRY RUN — no writes)'}`);
  const { data: rows, error } = await sb
    .from('posts')
    .select('id, slug, status, content, last_audit_status, last_audit_check_at, last_issue_summary, human_review_status');
  if (error) {
    console.error('DB error:', error.message);
    process.exit(1);
  }
  console.log(`Scanned ${rows.length} rows`);

  const touched = [];
  let totalNotesRemoved = 0;
  let bytesReclaimed = 0;

  for (const row of rows) {
    const content = row.content || '';
    if (!content.includes('Pre-publish audit')) continue;
    const { stripped, removed, lastNote } = stripNotes(content);
    if (removed === 0) continue;

    const bytes = content.length - stripped.length;
    totalNotesRemoved += removed;
    bytesReclaimed += bytes;

    const update = { content: stripped };

    // Backfill audit columns from the most recent note, so the review
    // dashboard has the same information the notes carried.
    if (!row.last_audit_status && lastNote) {
      update.last_audit_status = auditStatusFromNote(lastNote);
    }
    if (!row.human_review_status) {
      update.human_review_status = row.status === 'published' ? 'approved' : 'pending';
    }
    if (!row.last_issue_summary && lastNote) {
      const m = lastNote.match(/(\d+)\/(\d+) claims passed/);
      update.last_issue_summary =
        `Audit hold — ${m ? `${m[1]}/${m[2]} claims verified` : 'held by pre-publish audit'}. ` +
        `Requires human review before publication.`;
    }

    touched.push({ row, update, removed, bytes });
  }

  const publishedTouched = touched.filter(t => t.row.status === 'published').length;
  console.log('');
  console.log(`Rows with audit notes : ${touched.length} (${publishedTouched} already published)`);
  console.log(`Notes removed        : ${totalNotesRemoved}`);
  console.log(`Bytes reclaimed      : ${bytesReclaimed.toLocaleString('en-US')}`);

  // Sanity check: make sure we did not destroy article structure.
  const structural = ['**Final Score:**', '## ', '*Source:', 'Source:'];
  let lostStructure = 0;
  for (const t of touched) {
    const before = t.row.content || '';
    const after = t.update.content;
    for (const marker of structural) {
      const b = before.split(marker).length - 1;
      const a = after.split(marker).length - 1;
      if (a < b) lostStructure++;
    }
  }
  console.log(`Structural markers lost: ${lostStructure} (expected 0)`);

  if (!apply) {
    console.log('');
    console.log('DRY RUN. Re-run with --apply to write.');
    return;
  }

  if (lostStructure > 0) {
    console.error('ABORT: structural markers would be lost. Not writing.');
    process.exit(1);
  }

  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const backup = {
    createdAt: new Date().toISOString(),
    rows: touched.map(t => ({
      id: t.row.id,
      slug: t.row.slug,
      status: t.row.status,
      content: t.row.content,
      last_audit_status: t.row.last_audit_status,
      last_audit_check_at: t.row.last_audit_check_at,
      last_issue_summary: t.row.last_issue_summary,
      human_review_status: t.row.human_review_status,
    })),
  };
  fs.writeFileSync(BACKUP_FILE, JSON.stringify(backup, null, 2));
  console.log(`Backup written: ${BACKUP_FILE} (${backup.rows.length} rows)`);

  if (!fs.existsSync(BACKUP_FILE)) {
    console.error('ABORT: backup missing. Not writing.');
    process.exit(1);
  }

  let ok = 0;
  let failed = 0;
  for (const t of touched) {
    const { error: updErr } = await sb.from('posts').update(t.update).eq('id', t.row.id);
    if (updErr) {
      console.error(`FAIL ${t.row.slug}: ${updErr.message}`);
      failed++;
    } else {
      ok++;
    }
  }
  console.log(`Updated ${ok} rows, ${failed} failed.`);
  if (failed > 0) process.exit(1);
})().catch(e => {
  console.error('FATAL:', e.message, e.stack);
  process.exit(1);
});
