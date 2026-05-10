#!/usr/bin/env node
/**
 * approve-post.js — Approval + Dropbox Save + CMS Publish pipeline
 *
 * Ensures posts in Dropbox and on site match proper header format and are SEO-optimized.
 *
 * Usage:
 *   node approve-post.js <project> <draft-file> [--blog|--social] [--publish]
 *
 * Examples:
 *   node approve-post.js rinkstop drafts/rinkstop/my-post.md --blog --publish
 *   node approve-post.js sativaexchange drafts/sativa/my-post.md --blog
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const WORKSPACE = '/root/.openclaw/workspace';
const TODAY = new Date().toISOString().split('T')[0];

// ============================================================
// PROJECT CONFIG
// ============================================================

const PROJECT_CONFIG = {
  rinkstop: {
    approvedDir: path.join(WORKSPACE, 'approved', 'rinkstop'),
    blogDir: 'Blog Posts',
    socialDir: 'Social Media',
    dropboxBaseDir: 'RinkStop',
    channel: '-5043773858',
    url: 'https://rinkstop.com',
    seoDefaults: {
      siteName: 'RinkStop',
      siteUrl: 'https://rinkstop.com',
      author: 'Arnel',
      authorRole: 'Founder, RinkStop',
      authorBio: 'Coach, hockey director, and founder of RinkStop — connecting the global hockey community.',
    },
  },
  sativaexchange: {
    approvedDir: path.join(WORKSPACE, 'approved', 'sativaexchange'),
    blogDir: 'Blog Posts',
    socialDir: 'Social Media',
    dropboxBaseDir: 'SativaExchange',
    channel: '-5167418353',
    url: 'https://sativaexchange.com',
    seoDefaults: {
      siteName: 'SativaExchange',
      siteUrl: 'https://sativaexchange.com',
      author: 'Arnel',
      authorRole: 'Founder, SativaExchange',
    },
  },
  topshelftoker: {
    approvedDir: path.join(WORKSPACE, 'approved', 'topshelftoker'),
    blogDir: 'Blog Posts',
    socialDir: 'Social Media',
    dropboxBaseDir: 'TopShelfToker',
    channel: '-5164369379',
    url: 'https://topshelftoker.com',
    seoDefaults: {
      siteName: 'TopShelfToker',
      siteUrl: 'https://topshelftoker.com',
      author: 'Arnel',
      authorRole: 'Founder, TopShelfToker',
    },
  },
};

// ============================================================
// ARGUMENT PARSING
// ============================================================

const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('Usage: node approve-post.js <project> <draft-file> [--blog|--social] [--publish]');
  console.error('');
  console.error('Projects: rinkstop, sativaexchange, topshelftoker');
  console.error('');
  console.error('Example:');
  console.error('  node approve-post.js rinkstop drafts/rinkstop/my-post.md --blog --publish');
  process.exit(1);
}

const projectKey = args[0];
const draftPath = args[1];
const isBlog = args.includes('--blog');
const isSocial = args.includes('--social');
const PUBLISH = args.includes('--publish');

const config = PROJECT_CONFIG[projectKey];
if (!config) {
  console.error('Unknown project: ' + projectKey);
  console.error('Available: ' + Object.keys(PROJECT_CONFIG).join(', '));
  process.exit(1);
}

if (!isBlog && !isSocial) {
  console.error('Must specify --blog or --social');
  process.exit(1);
}

// ============================================================
// STEP 1: Validate draft
// ============================================================

if (!fs.existsSync(draftPath)) {
  console.error('Draft not found: ' + draftPath);
  console.error('Generate drafts with: node scripts/daily-content-gen.js');
  process.exit(1);
}

const rawContent = fs.readFileSync(draftPath, 'utf-8');
console.log('\n=== Approval Pipeline ===');
console.log('Project:  ' + projectKey);
console.log('Draft:    ' + path.basename(draftPath));
console.log('Type:     ' + (isBlog ? 'Blog Post' : 'Social Post'));
console.log('Publish:  ' + (PUBLISH ? 'YES' : 'NO (Dropbox save only)'));
console.log('');

// ============================================================
// STEP 2: Extract & validate title
// ============================================================

let title = '';
const h1Match = rawContent.match(/^#\s+(.+)$/m);
if (h1Match) {
  title = h1Match[1].trim();
} else {
  const lines = rawContent.split('\n').filter(function(l) {
    return l.trim() && !l.startsWith('<!--') && !l.startsWith('[DRAFT');
  });
  title = lines.length > 0 ? lines[0].replace(/^#+/, '').trim() : 'Untitled';
}

console.log('Title:    ' + title);

// ============================================================
// STEP 3: Compliance check (TopShelfToker specific)
// ============================================================

var COMPLIANCE_WARNINGS = [];
if (projectKey === 'topshelftoker') {
  const medicalTerms = ['treats', 'cures', 'relieves', 'heals', 'medicinal', 'therapeutic', 'remedy', 'health benefits', 'pain relief', 'anxiety'];
  for (var t = 0; t < medicalTerms.length; t++) {
    var term = medicalTerms[t];
    if (rawContent.toLowerCase().indexOf(term) !== -1) {
      COMPLIANCE_WARNINGS.push('Possible medical/health claim: "' + term + '"');
    }
  }
  if (rawContent.toLowerCase().indexOf('under 21') !== -1 || rawContent.toLowerCase().indexOf('minors') !== -1) {
    COMPLIANCE_WARNINGS.push('Content references age — ensure 21+ audience only');
  }
}

if (COMPLIANCE_WARNINGS.length > 0) {
  console.log('\n⚠️  COMPLIANCE WARNINGS:');
  COMPLIANCE_WARNINGS.forEach(function(w) { console.log('  ' + w); });
  console.log('  Fix these before publishing.');
} else {
  console.log('\n✅ Compliance check passed');
}

// ============================================================
// STEP 4: Determine output paths
// ============================================================

var slug = title.toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .substring(0, 80);

var typeDir = isBlog ? config.blogDir : config.socialDir;
var approvedPath = path.join(config.approvedDir, typeDir, TODAY + '-' + slug + '.md');

// ============================================================
// STEP 5: Save to approved folder with SEO header
// ============================================================

var approvedDir = path.dirname(approvedPath);
if (!fs.existsSync(approvedDir)) {
  fs.mkdirSync(approvedDir, { recursive: true });
}

var wordCount = rawContent.split(/\s+/).length;
var readTime = Math.max(1, Math.ceil(wordCount / 200));

// SEO-optimized approval header
var approvalHeader = [
  '---',
  'title: "' + title + '"',
  'project: ' + projectKey,
  'type: ' + (isBlog ? 'blog' : 'social'),
  'date: ' + TODAY,
  'status: approved',
  'approvedBy: Arnel',
  'approvedAt: ' + new Date().toISOString(),
  'originalDraft: ' + draftPath,
  'seo_title: "' + title + ' | ' + config.seoDefaults.siteName + '"',
  'seo_description: "' + (rawContent.substring(0, 160).replace(/[^\w\s-]/g, '').trim()) + '"',
  'author: ' + config.seoDefaults.author,
  'author_role: "' + config.seoDefaults.authorRole + '"',
  'reading_time: ' + readTime + ' minutes',
  'word_count: ' + wordCount,
  'tags: [' + (isBlog ? projectKey + ', blog' : projectKey + ', social') + ']',
  'canonical: ' + config.seoDefaults.siteUrl + '/' + (isBlog ? 'blog/' : '') + slug,
  '---',
  ''
].join('\n');

// Add author line to content if blog
var finalContent = rawContent;
if (isBlog) {
  var authorLine = '*By ' + config.seoDefaults.author + ' — ' + config.seoDefaults.authorRole + '*\n\n*' + TODAY + '*\n\n';
  // Remove existing byline if present
  finalContent = rawContent.replace(/^\*By .+\*\n\n\*.+\*\n\n/, '');
  finalContent = authorLine + finalContent;
}

fs.writeFileSync(approvedPath, approvalHeader + finalContent);
console.log('✅ Approved: ' + approvedPath.replace(WORKSPACE + '/', ''));
console.log('   SEO title: ' + title + ' | ' + config.seoDefaults.siteName);
console.log('   Reading time: ~' + readTime + ' min (' + wordCount + ' words)');

// ============================================================
// STEP 6: Save to Dropbox as formatted .docx
// ============================================================

async function saveToDropbox() {
  const docx = require('docx');
  var Document = docx.Document;
  var Packer = docx.Packer;
  var Paragraph = docx.Paragraph;
  var TextRun = docx.TextRun;
  var HeadingLevel = docx.HeadingLevel;
  var AlignmentType = docx.AlignmentType;

  var dropboxDir = '/' + config.dropboxBaseDir + '/' + typeDir;
  var dropboxFilename = TODAY + '-' + slug + '.docx';
  var dropboxPath = dropboxDir + '/' + dropboxFilename;

  var lines = rawContent.split('\n');
  var children = [];

  // Title — centered, large
  children.push(new Paragraph({
    children: [new TextRun({ text: title, bold: true, size: 36 })],
    heading: HeadingLevel.HEADING_1,
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
  }));

  // Author line
  children.push(new Paragraph({
    children: [new TextRun({
      text: 'By ' + config.seoDefaults.author + ' — ' + config.seoDefaults.authorRole,
      italics: true,
      color: '666666',
      size: 20
    })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 100 },
  }));

  // Date
  children.push(new Paragraph({
    children: [new TextRun({ text: TODAY, size: 18, color: '999999' })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 300 },
  }));

  // Body content
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    var trimmed = line.trim();

    if (trimmed.indexOf('<!--') === 0) continue; // Skip comments
    if (trimmed.indexOf('[DRAFT') === 0) continue; // Skip draft notes

    if (trimmed.indexOf('## ') === 0 || trimmed.indexOf('### ') === 0) {
      children.push(new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: trimmed.replace(/^#{2,3}\s/, ''), bold: true, size: 28 })],
        spacing: { before: 300, after: 100 },
      }));
    } else if (trimmed.indexOf('- ') === 0) {
      children.push(new Paragraph({
        text: trimmed.substring(2),
        bullet: { level: 0 },
        indent: { left: 720 },
      }));
    } else if (trimmed === '---') {
      children.push(new Paragraph({
        text: '_________________________________________________________',
        spacing: { before: 200, after: 200 },
      }));
    } else if (trimmed !== '') {
      children.push(new Paragraph({
        children: [new TextRun({ text: trimmed, size: 22, line: 360 })],
        spacing: { after: 100 },
      }));
    }
  }

  // Footer
  children.push(new Paragraph({
    children: [new TextRun({
      text: '— ' + config.seoDefaults.author + ' | ' + config.seoDefaults.siteName,
      italics: true,
      color: '999999',
      size: 16,
    })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 400 },
  }));

  var doc = new Document({
    sections: [{ properties: {}, children: children }],
  });

  var buffer = await Packer.toBuffer(doc);
  var os = require('os');
  var tempFile = path.join(os.tmpdir(), dropboxFilename);
  fs.writeFileSync(tempFile, buffer);

  // Upload via Maton Dropbox gateway
  var MATON_API_KEY = process.env.MATON_API_KEY || 'v2.6IhUnYkmPVroYk8_B2KzsiDQDs2UMTry5AVoBdgLdltHG3jcKCH4WtLlXlVComlfoNQbUsHuJbMkvNY003a7QxX6eI4Sk5xbwq4GyuPV28-V9xnc_GqH3LzX';
  var DROPBOX_CONNECTION_ID = '0047d26c-609f-444d-ac51-074b49de5a21';

  var apiArg = JSON.stringify({
    path: dropboxPath,
    mode: 'add',
    autorename: true,
    mute: false,
  });

  var escapedArg = apiArg.replace(/'/g, "'\\''");

  var curlCmd = 'curl -s -X POST ' +
    "'https://gateway.maton.ai/dropbox/2/files/upload' " +
    "-H 'Authorization: Bearer " + MATON_API_KEY + "' " +
    "-H 'Maton-Connection: " + DROPBOX_CONNECTION_ID + "' " +
    "-H 'Content-Type: application/octet-stream' " +
    "-H 'Dropbox-API-Arg: " + escapedArg + "' " +
    "--data-binary @" + tempFile;

  try {
    console.log('\n☁️ Uploading to Dropbox: ' + dropboxPath);
    var result = execSync(curlCmd, { timeout: 30000, encoding: 'utf-8' });
    if (result.indexOf('path_display') !== -1) {
      console.log('✅ Saved to Dropbox: ' + dropboxPath);
      fs.unlinkSync(tempFile);
      return true;
    } else {
      console.log('⚠️ Dropbox response: ' + result.substring(0, 200));
      fs.unlinkSync(tempFile);
      return false;
    }
  } catch (e) {
    console.log('❌ Dropbox upload failed: ' + e.message.substring(0, 200));
    try { fs.unlinkSync(tempFile); } catch (e2) {}
    return false;
  }
}

// ============================================================
// STEP 7: Publish to Supabase CMS
// ============================================================

async function publishToSupabase() {
  var https = require('https');
  var API_SECRET = process.env.API_SECRET || process.env.ADMIN_SECRET || '';

  if (!API_SECRET) {
    console.log('\n⚠️ No API_SECRET in environment.');
    console.log('Set API_SECRET or ADMIN_SECRET to publish to the site.');
    return false;
  }

  var category = isBlog ? 'blog' : 'social';
  var wordCount = rawContent.split(/\s+/).length;

  var postData = {
    slug: slug,
    title: title,
    subtitle: isBlog ? (rawContent.split('\n').find(function(l) { return l.trim().startsWith('## '); }) || '').replace(/^##\s*/, '').substring(0, 200) : '',
    content: rawContent,
    content_html: rawContent,
    status: 'published',
    category: category,
    tags: [projectKey, isBlog ? 'blog' : 'social'],
    seo_title: title + ' | ' + config.seoDefaults.siteName,
    seo_description: rawContent.substring(0, 160).replace(/[^\w\s-]/g, '').trim(),
    author_name: config.seoDefaults.author,
    author_role: config.seoDefaults.authorRole,
    reading_time_minutes: Math.max(1, Math.ceil(wordCount / 200)),
  };

  var postBody = JSON.stringify(postData);
  var supabaseUrl = process.env.SUPABASE_URL;

  if (!supabaseUrl || supabaseUrl.indexOf('your-project') !== -1) {
    console.log('\n⚠️ SUPABASE_URL not configured.');
    console.log('Add your Supabase URL to .env to publish to CMS.');
    return false;
  }

  var apiUrl = supabaseUrl + '/rest/v1/posts';
  console.log('\n🚀 Publishing to Supabase...');

  try {
    var result = await new Promise(function(resolve) {
      var opts = {
        method: 'POST',
        hostname: new URL(apiUrl).hostname,
        path: new URL(apiUrl).pathname,
        headers: {
          'Content-Type': 'application/json',
          'apikey': API_SECRET,
          'Authorization': 'Bearer ' + API_SECRET,
          'Prefer': 'return=representation',
        },
      };

      var req = https.request(opts, function(res) {
        var body = '';
        res.on('data', function(chunk) { body += chunk; });
        res.on('end', function() { resolve({ statusCode: res.statusCode, body: body }); });
      });

      req.on('error', function(e) { resolve({ error: e.message }); });
      req.on('timeout', function() { req.destroy(); resolve({ error: 'timeout' }); });
      req.setTimeout(15000);
      req.write(postBody);
      req.end();
    });

    if ('error' in result) {
      if (result.error.indexOf('duplicate') !== -1) {
        console.log('ℹ️ Slug exists — updating post...');
        return updateSupabasePost();
      }
      console.log('❌ Supabase error: ' + result.error);
      return false;
    }

    if (result.statusCode >= 200 && result.statusCode < 300) {
      console.log('✅ Published to Supabase (HTTP ' + result.statusCode + ')');
      return true;
    }

    console.log('⚠️ Supabase response (' + result.statusCode + '): ' + result.body.substring(0, 200));
    return false;
  } catch (e) {
    console.log('❌ Supabase error: ' + e.message.substring(0, 200));
    return false;
  }
}

async function updateSupabasePost() {
  var https = require('https');
  var API_SECRET = process.env.API_SECRET || process.env.ADMIN_SECRET || '';
  if (!API_SECRET) return false;

  var supabaseUrl = process.env.SUPABASE_URL;
  var apiUrl = supabaseUrl + '/rest/v1/posts?slug=eq.' + encodeURIComponent(slug);

  try {
    var result = await new Promise(function(resolve) {
      var body = JSON.stringify({ content: rawContent, status: 'published' });
      var opts = {
        method: 'PATCH',
        hostname: new URL(apiUrl).hostname,
        path: new URL(apiUrl).pathname + new URL(apiUrl).search,
        headers: {
          'Content-Type': 'application/json',
          'apikey': API_SECRET,
          'Authorization': 'Bearer ' + API_SECRET,
          'Prefer': 'return=representation',
        },
      };

      var req = https.request(opts, function(res) {
        var data = '';
        res.on('data', function(c) { data += c; });
        res.on('end', function() { resolve({ statusCode: res.statusCode, body: data }); });
      });

      req.on('error', function(e) { resolve({ error: e.message }); });
      req.setTimeout(15000);
      req.write(body);
      req.end();
    });

    if ('error' in result) {
      console.log('❌ Update failed: ' + result.error);
      return false;
    }
    console.log('✅ Updated in Supabase (HTTP ' + result.statusCode + ')');
    return true;
  } catch (e) {
    console.log('❌ Update error: ' + e.message.substring(0, 200));
    return false;
  }
}

// ============================================================
// STEP 8: Update post-tracker.md
// ============================================================

function updateTracker() {
  var trackerPath = path.join(WORKSPACE, 'post-tracker.md');
  if (!fs.existsSync(trackerPath)) return;

  var tracker = fs.readFileSync(trackerPath, 'utf-8');
  var typeLabel = isBlog ? 'Blog Posts' : 'Social Posts';
  var projectLabel = projectKey === 'rinkstop' ? 'RinkStop' :
                     projectKey === 'sativaexchange' ? 'SativaExchange' : 'TopShelfToker';

  var projectSection = '### ' + projectLabel + '\n\n**Channel:** ' + config.channel + '\n\n### ' + typeLabel + ' (Approved)';
  var existingIdx = tracker.indexOf(projectSection);

  if (existingIdx === -1) {
    var channelLine = '**Channel:** ' + config.channel + '\n';
    var insertPoint = tracker.indexOf(channelLine);
    if (insertPoint !== -1) {
      var insertPos = insertPoint + channelLine.length;
      tracker = tracker.slice(0, insertPos) +
        '\n### ' + typeLabel + ' (Approved)\n\n| Title | Date | Reading Time |\n|-------|------|-------------|\n| ' +
        title + ' | ' + TODAY + ' | ~' + readTime + ' min |\n' +
        tracker.slice(insertPos);
    }
  } else {
    var sectionEnd = tracker.indexOf('\n\n###', existingIdx + 1);
    var insertPos = sectionEnd !== -1 ? sectionEnd : existingIdx + projectSection.length;
    tracker = tracker.slice(0, insertPos) +
      '\n| ' + title + ' | ' + TODAY + ' | ~' + readTime + ' min |' +
      tracker.slice(insertPos);
  }

  fs.writeFileSync(trackerPath, tracker);
  console.log('✅ Updated post-tracker.md');
}

// ============================================================
// MAIN
// ============================================================

(async function main() {
  try {
    // Step 5 already done
    await saveToDropbox();

    if (PUBLISH) {
      await publishToSupabase();
    } else {
      console.log('\n💡 To publish to site, re-run with --publish flag');
      console.log('   node approve-post.js ' + projectKey + ' ' +
        draftPath.replace(WORKSPACE + '/', '') + ' --' +
        (isBlog ? 'blog' : 'social') + ' --publish');
    }

    updateTracker();

    console.log('\n=== DONE ===');
    console.log('  Approved: ' + approvedPath.replace(WORKSPACE, '~'));
    console.log('  Dropbox:  ' + config.dropboxBaseDir + '/' + typeDir + '/' + TODAY + '-' + slug + '.docx');
    if (PUBLISH) console.log('  CMS:      Published to Supabase');
    console.log('');

  } catch (err) {
    console.error('❌ Error: ' + err.message);
    process.exit(1);
  }
})();