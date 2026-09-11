#!/usr/bin/env node
/**
 * scripts/fix-top-20-colors.mjs
 *
 * Light-mode-on-dark-bg color replacement for the top GSC-impressed pages.
 * Catches the same bug class that the Visual QC gate (gate 4 of
 * scripts/pre-deploy-gate.sh) catches.
 *
 * Applied across the top-20 URLs from the 90-day GSC export.
 *
 * Mappings:
 *   '#555'        -> 'rgba(255,255,255,0.4)'   (breadcrumb links)
 *   '#A0A0A0'     -> 'rgba(255,255,255,0.6)'   (breadcrumb current)
 *   '#444'        -> 'rgba(255,255,255,0.55)'  (paragraph)
 *   '#666'        -> 'rgba(255,255,255,0.4)'   (disclosure footer)
 *
 * Quoted in BOTH single and double-quote forms to catch the
 * double-quoted `"#888"` class that bit us on 2026-09-11.
 *
 * Skip:
 *   - background: usages (those are correct on dark bg as fill colors)
 *   - Same mapping as the PR1 fix that shipped 24 /learn subpages.
 *
 * Usage:
 *   node scripts/fix-top-20-colors.mjs --dry-run
 *   node scripts/fix-top-20-colors.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const TARGETS = [
  // Top 20 GSC URLs map to 10 unique templates (rink pages share [slug],
  // news pages share [slug], state pages share [state]/[city], etc).
  // Fixing the template fixes all instances in the top-20 batch.
  'src/app/directory/khl/page.tsx',
  'src/app/directory/ahl/page.tsx',
  'src/app/directory/teams/page.tsx',
  'src/app/directory/leagues/page.tsx',
  'src/app/directory/united-states/page.tsx',
  'src/app/directory/united-states/[state]/[city]/page.tsx',
  'src/app/directory/rinks/[slug]/page.tsx',
  'src/app/gear-brands/page.tsx',
  'src/app/federations/[country]/page.tsx',
  'src/app/news/[pillar]/[subpillar]/[slug]/page.tsx',
];

// Only `color:` matches. background: / borderColor: stays untouched.
const MAPPINGS = [
  { from: /color:\s*['"]#555(?![0-9a-fA-F])['"]/g,  to: "color: 'rgba(255,255,255,0.4)'" },
  { from: /color:\s*['"]#A0A0A0['"]/g,             to: "color: 'rgba(255,255,255,0.6)'" },
  { from: /color:\s*['"]#444(?![0-9a-fA-F])['"]/g,  to: "color: 'rgba(255,255,255,0.55)'" },
  { from: /color:\s*['"]#666(?![0-9a-fA-F])['"]/g,  to: "color: 'rgba(255,255,255,0.4)'" },
];

const dryRun = process.argv.includes('--dry-run');

let grandTotal = 0;
for (const relPath of TARGETS) {
  const abs = path.join(REPO_ROOT, relPath);
  if (!fs.existsSync(abs)) {
    console.log(`SKIP (not found): ${relPath}`);
    continue;
  }
  const orig = fs.readFileSync(abs, 'utf8');
  let text = orig;
  let fileTotal = 0;
  for (const { from, to } of MAPPINGS) {
    const matches = text.match(from);
    if (matches && matches.length) {
      fileTotal += matches.length;
      text = text.replace(from, to);
    }
  }
  if (text !== orig) {
    console.log(`${dryRun ? 'would update' : 'updated'}: ${relPath} (${fileTotal} replacements)`);
    grandTotal += fileTotal;
    if (!dryRun) fs.writeFileSync(abs, text, 'utf8');
  } else {
    console.log(`clean: ${relPath}`);
  }
}

console.log(`\n${dryRun ? '[DRY RUN] ' : ''}Total: ${grandTotal} replacements across ${TARGETS.length} files`);