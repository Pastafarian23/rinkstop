require('./load-secrets.cjs');
#!/usr/bin/env node
// Add cross-references from the Finland article to the (soon-to-be-published) Norway article.
// Run BEFORE publishing Norway, so the link is in place when Norway goes live.
const fs = require('fs');
const https = require('https');
const envFile = fs.readFileSync('/root/.openclaw/workspace/rinkstop-platform/.env', 'utf8');
for (const line of envFile.split('\n')) {
  const m = line.match(/^([A-Z_]+)\s*=\s*(.+)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const FINLAND_SLUG = 'finland-defeats-switzerland-in-overtime-to-capture-2026-world-championship-gold';
const NORWAY_URL = 'https://rinkstop.com/blog/norway-stuns-canada-in-overtime-to-win-first-ever-world-championship-medal';

// 1. Get the current Finland content
const get = https.request(`${SUPABASE_URL}/rest/v1/posts?select=id,content&slug=eq.${FINLAND_SLUG}`, {
  method: 'GET',
  headers: {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
  },
}, (res) => {
  let data = '';
  res.on('data', (c) => (data += c));
  res.on('end', () => {
    if (res.statusCode !== 200) {
      console.error('GET failed:', res.statusCode, data);
      process.exit(1);
    }
    const posts = JSON.parse(data);
    if (!posts.length) {
      console.error('Finland post not found');
      process.exit(1);
    }
    const post = posts[0];
    let content = post.content;

    // If we've already added the cross-ref, skip
    if (content.includes('Norway stunned Canada')) {
      console.log('Cross-reference already present. Skipping.');
      return;
    }

    // Insert the cross-reference section just before "## What This Win Means for International Hockey"
    const marker = '## What This Win Means for International Hockey';
    const crossRefSection = `## A Historic Sunday in Zurich

Finland's gold was one of two overtime thrillers on the final day of the 2026 IIHF World Championship. Later that same evening, [Norway stunned Canada 3-2 in overtime to win the bronze medal](${NORWAY_URL}) — the country's first-ever World Championship medal, 75 years after its previous best finish of fourth place in 1951.

Noah Steen scored 3:32 into overtime to cap one of the biggest upsets in international hockey history. The two games made the final Sunday of the 2026 tournament one of the most dramatic in recent memory.

`;

    if (content.includes(marker)) {
      content = content.replace(marker, crossRefSection + marker);
    } else {
      // If marker not found, append at end
      content = content + '\n\n' + crossRefSection;
    }

    // 2. PATCH the updated content
    const patchBody = JSON.stringify({ content });
    const patch = https.request(`${SUPABASE_URL}/rest/v1/posts?id=eq.${post.id}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
    }, (res2) => {
      let d = '';
      res2.on('data', (c) => (d += c));
      res2.on('end', () => {
        console.log('PATCH status:', res2.statusCode);
        if (res2.statusCode >= 400) {
          console.error('PATCH failed:', d);
          process.exit(1);
        }
        const result = JSON.parse(d);
        console.log('\n✅ Finland article updated with cross-reference to Norway.');
        console.log('   New word count:', result[0]?.content?.split(/\s+/).filter(w => w).length);
      });
    });
    patch.on('error', (e) => { console.error('PATCH error:', e); process.exit(1); });
    patch.write(patchBody);
    patch.end();
  });
});
get.on('error', (e) => { console.error('GET error:', e); process.exit(1); });
get.end();
