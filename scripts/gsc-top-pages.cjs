#!/usr/bin/env node
/**
 * scripts/gsc-top-pages.mjs
 *
 * Extract the top-N GSC-impressed pages for a RinkStop project from the
 * 90-day GSC export cached at memory/gsc-90d-fresh-*.json (committed
 * periodically by the SEO GSC Weekly Report cron).
 *
 * Usage:
 *   node scripts/gsc-top-pages.mjs                       # top 30 (default)
 *   node scripts/gsc-top-pages.mjs 20                    # top 20
 *   node scripts/gsc-top-pages.mjs 50 --min-position=5    # top 50, position >= 5
 *   node scripts/gsc-top-pages.mjs --json                # output JSON only
 *
 * Filters:
 *   - excludes the homepage (different category — brand queries)
 *   - excludes pages with 0 clicks AND position > 50 (irrelevant tail)
 *
 * Output columns: url, impressions, clicks, ctr, position
 *
 * Used by the 2026-09-11 GSC-targeted top-20 improvements PR (post-PR1
 * of the /learn QC audit + the WS19 pre-deploy gate). Re-run after each
 * weekly GSC export to find the next batch of pages to optimize.
 */

const fs = require('fs');
const path = require('path');

const GSC_PATH = path.resolve(
  __dirname,
  '..',
  'memory',
  'gsc-90d-fresh-2026-08-31.json'
);

function parseArgs(argv) {
  const args = { top: 30, json: false, minPosition: 0 };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json') args.json = true;
    else if (a === '--min-position=5') args.minPosition = 5;
    else if (/^\d+$/.test(a)) args.top = parseInt(a, 10);
  }
  return args;
}

function fmtTable(rows) {
  if (rows.length === 0) return '(no rows)';
  const headers = ['url', 'impressions', 'clicks', 'ctr%', 'position'];
  const widths = [62, 12, 7, 7, 9];
  const lines = [];
  lines.push(
    headers
      .map((h, i) => h.padEnd(widths[i]))
      .join('')
  );
  lines.push('-'.repeat(widths.reduce((a, b) => a + b, 0)));
  for (const r of rows) {
    const shortUrl = r.page.replace('https://rinkstop.com', '');
    lines.push(
      [
        shortUrl.padEnd(62).slice(0, 62),
        String(r.impressions).padStart(12),
        String(r.clicks).padStart(7),
        (r.ctr * 100).toFixed(1).padStart(6) + '%',
        r.position.toFixed(1).padStart(9),
      ].join('')
    );
  }
  return lines.join('\n');
}

function main() {
  const args = parseArgs(process.argv);

  if (!fs.existsSync(GSC_PATH)) {
    console.error(`GSC export not found at: ${GSC_PATH}`);
    console.error('Expected: memory/gsc-90d-fresh-YYYY-MM-DD.json');
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(GSC_PATH, 'utf8'));
  const allPages = data.pages || [];

  // Filter out homepage + irrelevant tail
  const candidates = allPages.filter((p) => {
    if (p.page === 'https://rinkstop.com/') return false;
    if (p.clicks === 0 && p.position > 50) return false;
    if (p.impressions < 200) return false;
    return true;
  });

  // Filter by min-position if requested
  const filtered = candidates.filter((p) => p.position >= args.minPosition);

  // Sort by impressions desc, take top N
  const top = filtered.sort((a, b) => b.impressions - a.impressions).slice(0, args.top);

  if (args.json) {
    console.log(JSON.stringify(top, null, 2));
  } else {
    console.log(`Top ${top.length} GSC-impressed pages (90d, ${data.window.start} -> ${data.window.end}):\n`);
    console.log(fmtTable(top));
    console.log(`\nTotal impressions in top ${top.length}: ${top.reduce((a, p) => a + p.impressions, 0)}`);
    console.log(`Total clicks in top ${top.length}: ${top.reduce((a, p) => a + p.clicks, 0)}`);
    console.log(`\nRe-run: node scripts/gsc-top-pages.mjs 50 --min-position=5`);
  }
}

main();