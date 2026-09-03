const URLS = [
  'https://rinkstop.com/',
  'https://rinkstop.com/directory',
  'https://rinkstop.com/directory/teams',
  'https://rinkstop.com/directory/rinks',
  'https://rinkstop.com/directory/players',
  'https://rinkstop.com/directory/leagues',
  'https://rinkstop.com/directory/international',
  'https://rinkstop.com/hockey-database',
  'https://rinkstop.com/data-coverage',
  'https://rinkstop.com/draft/nhl/2026',
  'https://rinkstop.com/tools/hockey-stick-size-calculator',
  'https://rinkstop.com/about',
  'https://rinkstop.com/news',
  'https://rinkstop.com/news/what-makes-a-hockey-rink-survive-in-a-non-traditional-market',
  'https://rinkstop.com/news/montreal-victoire-first-walter-cup-2026',
  'https://rinkstop.com/news/2026-nhl-draft-round-1-storylines',
];

const WEAK_ALT_PATTERNS = [
  /^(image|img|photo|picture|untitled|dsc\d+|img_\d+)$/i,
  /^\d+$/,
  /^(.)\1{3,}/,
];

function classify(alt) {
  if (alt === null) return 'no-alt-attribute';
  const trimmed = alt.trim();
  if (trimmed === '') return 'empty';
  if (trimmed.length < 5) return 'too-short';
  if (WEAK_ALT_PATTERNS.some(p => p.test(trimmed))) return 'placeholder';
  if (trimmed.length > 250) return 'too-long';
  return null;
}

async function checkUrl(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) return { url, status: res.status };
  const html = await res.text();
  const imgs = [...html.matchAll(/<img\b[^>]+>/g)].map(m => m[0]);
  const issues = [];
  let good = 0;
  for (const img of imgs) {
    const src = (img.match(/\bsrc=["']([^"']+)/) || [])[1] || '(no src)';
    const hasAlt = /\balt=/.test(img);
    const altMatch = hasAlt ? (img.match(/\balt=["']([^"']*)/) || [])[1] : null;
    const alt = hasAlt ? altMatch : null;
    const cls = classify(alt);
    if (cls) {
      issues.push({ type: cls, src: src.slice(0, 70), alt: alt || '' });
    } else {
      good++;
    }
  }
  return {
    url: url.replace('https://rinkstop.com', ''),
    totalImgs: imgs.length,
    goodImgs: good,
    issueCount: issues.length,
    issues: issues.slice(0, 8),
  };
}

const results = await Promise.all(URLS.map(checkUrl));
console.log('='.repeat(80));
console.log('Alt-Text Audit — 16 key pages');
console.log('='.repeat(80));
console.log();
let totalImgs = 0, totalIssues = 0;
for (const r of results) {
  totalImgs += r.totalImgs || 0;
  totalIssues += r.issueCount || 0;
  console.log(`📄 ${r.url}`);
  console.log(`   Images: ${r.totalImgs} | Good: ${r.goodImgs} | Issues: ${r.issueCount}`);
  for (const issue of (r.issues || []).slice(0, 5)) {
    const altStr = issue.alt ? ` (alt: "${issue.alt.slice(0,40)}")` : '';
    console.log(`   - [${issue.type}] ${issue.src}${altStr}`);
  }
  console.log();
}
console.log('='.repeat(80));
console.log(`TOTAL: ${totalImgs} images, ${totalIssues} issues across ${results.length} pages`);
console.log('='.repeat(80));
