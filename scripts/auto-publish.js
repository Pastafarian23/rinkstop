#!/usr/bin/env node
/**
 * RinkStop Auto-Publish Script — REVIEW-FIRST WORKFLOW
 *
 * NEW WORKFLOW:
 *   New Dropbox files → Draft post in Supabase → Message RinkStop Ops → Arnel reviews → Approves → Ron publishes
 *
 * Schedule: daily via cron
 */

const https = require('https');

// ── Config ──────────────────────────────────────────────────────────────────
const MATON_KEY    = '***REMOVED***';
const DROPBOX_CONN  = '0047d26c-609f-444d-ac51-074b49de5a21';
const DROPBOX_PATH  = '/RinkStop/Blog Posts';
const SUPABASE_URL  = 'https://yszheonqyyskkjoxoexk.supabase.co';
const SUPABASE_KEY  = '***REMOVED***';
const RINKSTOP_OPS  = '-5043773858'; // RinkStop Ops Telegram group

const DRY   = process.argv.includes('--dry-run');
const VERB  = process.argv.includes('--verbose');

// ── HTTP helpers ─────────────────────────────────────────────────────────────
function httpsReq(hostname, path, { method='POST', headers={}, body=null } = {}) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const req = https.request({ hostname, path, method, headers }, res => {
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, data: Buffer.concat(chunks) }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

// ── Dropbox ──────────────────────────────────────────────────────────────────
async function dropboxList(path) {
  const { status, data } = await httpsReq('gateway.maton.ai', '/dropbox/2/files/list_folder', {
    headers: {
      'Authorization': `Bearer ${MATON_KEY}`,
      'Maton-Connection': DROPBOX_CONN,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ path }),
  });
  if (status !== 200) throw new Error(`dropboxList ${status}: ${data}`);
  return JSON.parse(data);
}

async function dropboxDownload(path) {
  const { status, data } = await httpsReq('gateway.maton.ai', '/dropbox/2/files/download', {
    headers: {
      'Authorization': `Bearer ${MATON_KEY}`,
      'Maton-Connection': DROPBOX_CONN,
      'Dropbox-API-Arg': JSON.stringify({ path }),
    },
  });
  if (status !== 200) throw new Error(`dropboxDownload ${status}: ${data.toString('utf8', 0, 200)}`);
  return data;
}

// ── Telegram notification ─────────────────────────────────────────────────────
async function notifyRinkStopOps(post, filename) {
  const excerpt = (post.content || '').slice(0, 300).replace(/\n+/g, ' ').trim() + '...';
  const SITE = 'https://rinkstop-platform.vercel.app';
  const msg = `📝 *NEW BLOG POST — RINKSTOP*\n\n` +
    `*${post.title}*\n\n` +
    `📄 File: \`${filename}\`\n` +
    `👤 ${post.author_name} · ${post.reading_time_minutes} min read\n` +
    `🔗 Preview: ${SITE}/blog/${post.slug}\n\n` +
    `📖 ${excerpt}\n\n` +
    `_Reply "approve" or "publish" to go live — or "reject" to discard._`;

  await httpsReq('gateway.maton.ai', '/telegram/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${MATON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chat_id: RINKSTOP_OPS,
      text: msg,
      parse_mode: 'Markdown',
      reply_markup: JSON.stringify({
        inline_keyboard: [[
          { text: '✅ Approve & Publish', callback_data: `publish:${post.id}` },
          { text: '❌ Reject', callback_data: `reject:${post.id}` },
        ]]
      })
    }),
  });
}

// ── Supabase helpers ───────────────────────────────────────────────────────────
async function supabaseInsert(table, row) {
  const { status, data } = await httpsReq('yszheonqyyskkjoxoexk.supabase.co', `/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: JSON.stringify(row),
  });
  if (status >= 400 && status !== 409) {
    throw new Error(`Supabase ${status}: ${data.toString('utf8', 0, 200)}`);
  }
  try { return JSON.parse(data); }
  catch { return [{ id: null }]; }
}

async function supabaseUpdate(table, id, row) {
  const { status, data } = await httpsReq('yszheonqyyskkjoxoexk.supabase.co', `/rest/v1/${table}?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: JSON.stringify(row),
  });
  if (status >= 400) throw new Error(`Supabase update ${status}`);
  return JSON.parse(data);
}

async function getExistingSlugs() {
  const { status, data } = await httpsReq('yszheonqyyskkjoxoexk.supabase.co', '/rest/v1/posts?select=slug', {
    method: 'GET',
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` },
  });
  if (status !== 200) return [];
  try { const rows = JSON.parse(data); return Array.isArray(rows) ? rows.map(r => r.slug) : []; }
  catch { return []; }
}

async function getDraftIds() {
  const { status, data } = await httpsReq('yszheonqyyskkjoxoexk.supabase.co', "/rest/v1/posts?status=eq.draft&select=id,slug,title", {
    method: 'GET',
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` },
  });
  if (status !== 200) return [];
  try { return JSON.parse(data); }
  catch { return []; }
}

// ── Text extraction ──────────────────────────────────────────────────────────
function extractTextFromDocx(buf) {
  try {
    const fs = require('fs');
    const tmp = `/tmp/auto-pub-${Date.now()}.docx`;
    fs.writeFileSync(tmp, buf);
    const { execSync } = require('child_process');
    const text = execSync(
      `python3 -c "
import zipfile, re
with zipfile.ZipFile('${tmp}') as z:
    xml = z.read('word/document.xml').decode('utf-8')
    t = re.sub(r'<[^>]+>', '', xml)
    print(re.sub(r'\s+', ' ', t).strip())
"`,
      { timeout: 10000 }
    ).toString().trim();
    try { fs.unlinkSync(tmp); } catch {}
    return text;
  } catch {
    return buf.toString('utf-8').replace(/[^\x20-\x7E\n]/g, ' ').replace(/\s+/g, ' ').trim();
  }
}

// ── Slug ──────────────────────────────────────────────────────────────────────
function slugify(str) {
  return str.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

async function uniqueSlug(base, allSlugs) {
  if (!allSlugs.includes(base)) return base;
  let s = base, n = 2;
  while (allSlugs.includes(s)) s = `${base}-${n++}`;
  return s;
}

// ── Metadata ────────────────────────────────────────────────────────────────
function extractPost(text, filename) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  let title = lines[0] || 'Untitled';
  title = title.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

  let contentStart = 0;
  for (let i = 0; i < Math.min(lines.length, 6); i++) {
    if (lines[i].length > 80 && !lines[i].match(/^\*\*By|^[A-Z][a-z]+, \d{4}|^May|^April|^March/)) {
      contentStart = i; break;
    }
  }

  const rawContent = lines.slice(contentStart).join('\n\n');
  const content = rawContent
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1');

  const wordCount = content.split(/\s+/).length;
  const readingTime = Math.max(1, Math.round(wordCount / 200));

  const cleanName = filename
    .replace(/^RinkStop[_-]?Blog[_-]?/i, '')
    .replace(/\.(docx|md)$/i, '')
    .replace(/_\d{4}[_-]\d{2}[_-]\d{2}/g, '')
    .replace(/-\d{4}[_-]\d{2}[_-]\d{2}/g, '')
    .replace(/[_-]?(2026|2025)[_-]?\d{2}[_-]?\d{2}/g, '');

  return {
    title:           title.slice(0, 120),
    content:         content.slice(0, 10000),
    slugBase:        slugify(cleanName) || slugify(title),
    author_name:     'Arnel',
    author_role:     'Founder, RinkStop',
    status:          'draft',       // ← DRAFT first, not published
    published_at:    new Date().toISOString(),
    seo_title:       title.slice(0, 60),
    seo_description: (content.slice(0, 155) + '...').replace(/\n/g, ' '),
    tags:            ['hockey', 'rinkstop', 'global-directory'],
    category:        'blog',
    reading_time_minutes: readingTime,
    is_featured:     false,
  };
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🏒 RinkStop Auto-Publish — Review First${DRY ? ' [DRY RUN]' : ''}`);
  console.log('─'.repeat(52));

  const existing = await getExistingSlugs();
  const drafts  = await getDraftIds();
  console.log(`① ${existing.length} posts in database | ${drafts.length} drafts pending review`);

  const folder = await dropboxList(DROPBOX_PATH);
  const blogFiles = folder.entries.filter(e => {
    const n = e.name.toLowerCase();
    return e['.tag'] === 'file'
      && (n.endsWith('.docx') || n.endsWith('.md'))
      && !n.includes('_facebook') && !n.includes('_instagram')
      && !n.includes('_linkedin') && !n.includes('_twitter')
      && !n.includes('_social');
  });

  console.log(`② ${blogFiles.length} blog files in Dropbox`);

  // Filter to truly new files only
  const newFiles = blogFiles.filter(f => {
    const nm = f.name.replace(/\.(docx|md)$/i, '');
    const testSlug = slugify(nm.replace(/^RinkStop[_-]?Blog[_-]?/i, '').replace(/[_-]\d{4}[_-]\d{2}[_-]\d{2}/g, ''));
    return !existing.includes(testSlug)
      && !existing.some(s => s === testSlug || s.startsWith(testSlug + '-'));
  });

  console.log(`③ ${newFiles.length} new (unpublished) files found\n`);

  if (newFiles.length === 0) {
    console.log('✅ All caught up — no new posts to queue.');
    return;
  }

  let queued = 0;
  for (const file of newFiles) {
    const ext = file.name.toLowerCase().endsWith('.docx') ? 'docx' : 'md';
    const filePath = `${DROPBOX_PATH}/${file.name}`;
    console.log(`📝 "${file.name}"`);

    if (DRY) { console.log('   [dry-run] skipping\n'); continue; }

    try {
      const buf = await dropboxDownload(filePath);
      const rawText = ext === 'md'
        ? buf.toString('utf-8')
        : extractTextFromDocx(buf);

      if (VERB) console.log('   Raw preview:', rawText.slice(0, 80), '...');

      const post = extractPost(rawText, file.name);
      post.slug = await uniqueSlug(post.slugBase, existing);
      delete post.slugBase;

      console.log(`   Title:   ${post.title.slice(0, 65)}`);
      console.log(`   Slug:    ${post.slug}`);
      console.log(`   Status:  draft (awaiting approval)`);
      console.log(`   Read:    ${post.reading_time_minutes} min`);

      // Save as DRAFT
      const result = await supabaseInsert('posts', post);
      const postId = result[0]?.id;
      existing.push(post.slug); // prevent duplicate slug errors in same run
      console.log(`   💾 Saved as draft (id: ${postId})`);

      // Notify RinkStop Ops channel
      await notifyRinkStopOps({ ...post, id: postId }, file.name);
      console.log(`   📲 Sent to RinkStop Ops for review ✅`);
      queued++;
    } catch (err) {
      console.error(`   ❌ ${err.message}\n`);
    }
  }

  console.log(`\n🏒 Auto-publish complete! ${queued} posts queued for review.`);
  console.log('   → Review in RinkStop Ops channel → Reply "publish" when ready');
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });