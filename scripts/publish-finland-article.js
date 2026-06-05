#!/usr/bin/env node
// Publish Finland World Championship article to Supabase with backdate to 2026-05-31
const fs = require('fs');
const path = require('path');
const https = require('https');
// Load .env manually (no dotenv dep)
const envFile = fs.readFileSync('/root/.openclaw/workspace/rinkstop-platform/.env', 'utf8');
for (const line of envFile.split('\n')) {
  const m = line.match(/^([A-Z_]+)\s*=\s*(.+)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}

const SUPABASE_URL = 'https://yszheonqyyskkjoxoexk.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const articlePath = '/root/.openclaw/workspace/rinkstop-content/articles/011-finland-wins-2026-world-championship.md';
let content = fs.readFileSync(articlePath, 'utf8');

// Strip the H1 heading (the title is a separate field)
content = content.replace(/^#\s+[^\n]+\n+/, '').trim();

// Calculate reading time (avg 200 wpm)
const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;
const readingTime = Math.max(1, Math.round(wordCount / 200));

// Slug
const slug = 'finland-defeats-switzerland-in-overtime-to-capture-2026-world-championship-gold';

const post = {
  slug,
  title: 'Finland Defeats Switzerland in Overtime to Capture 2026 World Championship Gold',
  subtitle: 'Konsta Helenius scores 10:42 into overtime to lift Finland to fifth world title',
  content,
  content_html: null,
  author_name: 'Arnel',
  author_role: 'Founder, RinkStop',
  status: 'published',
  published_at: '2026-05-31T20:30:00+00:00',  // Gold-medal game was late May 31, 2026 (OT ended ~20:30 UTC)
  seo_title: 'Finland Defeats Switzerland in Overtime to Win 2026 World Championship | RinkStop',
  seo_description: 'Finland beat Switzerland 1-0 in overtime to win its fifth IIHF World Championship gold medal. Konsta Helenius scored the winner 10:42 into OT. Full recap.',
  og_image_url: null,
  tags: ['rinkstop', 'blog', 'iihf', 'world-championship', 'finland', 'switzerland', 'international-hockey'],
  category: 'blog',
  reading_time_minutes: readingTime,
  view_count: 0,
  is_featured: false,
  country: null,
  country_slug: null,
};

console.log('Article to publish:');
console.log(`  Title: ${post.title}`);
console.log(`  Slug: ${post.slug}`);
console.log(`  Reading time: ${readingTime} min (${wordCount} words)`);
console.log(`  Backdate (published_at): ${post.published_at}`);
console.log();

const body = JSON.stringify(post);
const req = https.request(`${SUPABASE_URL}/rest/v1/posts`, {
  method: 'POST',
  headers: {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
  },
}, (res) => {
  let data = '';
  res.on('data', (c) => (data += c));
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    if (res.statusCode >= 400) {
      console.error('Error:', data);
      process.exit(1);
    }
    const result = JSON.parse(data);
    console.log('\n✅ Published. Post id:', result[0]?.id);
    console.log('   Slug:', result[0]?.slug);
    console.log('   Live URL: https://rinkstop.com/blog/' + result[0]?.slug);
  });
});
req.on('error', (e) => {
  console.error('Request error:', e);
  process.exit(1);
});
req.write(body);
req.end();
