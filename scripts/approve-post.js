#!/usr/bin/env node
/**
 * approve-post.js - Approval + Dropbox Save + CMS Publish pipeline
 *
 * Usage:
 *   node approve-post.js <project> <draft-file> [--blog|--social] [--publish]
 *
 * Examples:
 *   node approve-post.js rinkstop drafts/rinkstop/2026-05-10-rinkstop-social-1.md --blog
 *   node approve-post.js rinkstop drafts/rinkstop/2026-05-10-rinkstop-social-1.md --social --publish
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const WORKSPACE = '/root/.openclaw/workspace';
const TODAY = new Date().toISOString().split('T')[0];

// ============================================================
// CONFIG
// ============================================================

const PROJECT_CONFIG = {
  rinkstop: {
    approvedDir: path.join(WORKSPACE, 'approved', 'rinkstop'),
    blogDir: 'Blog Posts',
    socialDir: 'Social Media',
    dropboxBaseDir: 'RinkStop',
    channel: '-5043773858',
    url: 'https://rinkstop.com'
  },
  sativaexchange: {
    approvedDir: path.join(WORKSPACE, 'approved', 'sativaexchange'),
    blogDir: 'Blog Posts',
    socialDir: 'Social Media',
    dropboxBaseDir: 'SativaExchange',
    channel: '-5167418353',
    url: 'https://sativaexchange.com'
  },
  topshelftoker: {
    approvedDir: path.join(WORKSPACE, 'approved', 'topshelftoker'),
    blogDir: 'Blog Posts',
    socialDir: 'Social Media',
    dropboxBaseDir: 'TopShelfToker',
    channel: '-5164369379',
    url: 'https://topshelftoker.com'
  }
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
  console.error('  node approve-post.js rinkstop drafts/rinkstop/my-post.md --blog');
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
// STEP 1: Validate draft exists
// ============================================================

if (!fs.existsSync(draftPath)) {
  console.error('Draft not found: ' + draftPath);
  console.error('Use topic-curator.js to generate topics first, then daily-content-gen.js to create drafts.');
  process.exit(1);
}

const rawContent = fs.readFileSync(draftPath, 'utf-8');
console.log('\n=== Approval Pipeline ===');
console.log('Project:  ' + projectKey);
console.log('Draft:    ' + path.basename(draftPath));
console.log('Type:     ' + (isBlog ? 'Blog Post' : 'Social Post'));
console.log('Publish:  ' + (PUBLISH ? 'YES' : 'NO (Dropbox save only)'));

// ============================================================
// STEP 2: Extract title from draft
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
// STEP 3: Check compliance (primarily for TopShelfToker)
// ============================================================

const COMPLIANCE_WARNINGS = [];
if (projectKey === 'topshelftoker') {
  const medicalTerms = ['treats', 'cures', 'relieves', 'heals', 'medicinal', 'therapeutic', 'remedy', 'health benefits'];
  for (var t = 0; t < medicalTerms.length; t++) {
    var term = medicalTerms[t];
    if (rawContent.toLowerCase().indexOf(term) !== -1) {
      COMPLIANCE_WARNINGS.push('Possible medical claim detected: "' + term + '"');
    }
  }
}

if (COMPLIANCE_WARNINGS.length > 0) {
  console.log('\nCOMPLIANCE WARNINGS:');
  COMPLIANCE_WARNINGS.forEach(function(w) { console.log('  ' + w); });
  console.log('  Review these before publishing!');
} else {
  console.log('\nCompliance check passed');
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
// STEP 5: Save to approved folder
// ============================================================

var approvedDir = path.dirname(approvedPath);
if (!fs.existsSync(approvedDir)) {
  fs.mkdirSync(approvedDir, { recursive: true });
}

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
  '---',
  ''
].join('\n');

fs.writeFileSync(approvedPath, approvalHeader + rawContent);
console.log('\nApproved: ' + approvedPath.replace(WORKSPACE + '/', ''));

// ============================================================
// STEP 6: Save to Dropbox
// ============================================================

async function saveToDropbox() {
  // Lazy-load docx to avoid import issues at startup
  const docx = require('docx');
  var Document = docx.Document;
  var Packer = docx.Packer;
  var Paragraph = docx.Paragraph;
  var TextRun = docx.TextRun;
  var HeadingLevel = docx.HeadingLevel;

  var dropboxDir = '/' + config.dropboxBaseDir + '/' + typeDir;
  var dropboxFilename = TODAY + '-' + slug + '.docx';
  var dropboxPath = dropboxDir + '/' + dropboxFilename;

  // Convert markdown lines to docx paragraphs
  var lines = rawContent.split('\n');
  var children = [];

  // Title
  children.push(new Paragraph({
    children: [new TextRun({ text: title, bold: true, size: 32 })],
    spacing: { after: 200 }
  }));
  children.push(new Paragraph({ text: '' }));

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    var trimmed = line.trim();

    if (trimmed.indexOf('## ') === 0 || trimmed.indexOf('### ') === 0) {
      children.push(new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: trimmed.replace(/^#{2,3}\s/, ''), bold: true, size: 28 })]
      }));
    } else if (trimmed.indexOf('- ') === 0) {
      children.push(new Paragraph({
        text: trimmed.substring(2),
        bullet: { level: 0 },
        indent: { left: 720 }
      }));
    } else if (trimmed !== '' && trimmed.indexOf('<!--') !== 0 && trimmed.indexOf('[DRAFT') !== 0) {
      children.push(new Paragraph({
        children: [new TextRun({ text: trimmed, size: 22 })]
      }));
    }
  }

  var doc = new Document({
    sections: [{ properties: {}, children: children }]
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
    mute: false
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
    console.log('\nUploading to Dropbox: ' + dropboxPath);
    var result = execSync(curlCmd, { timeout: 30000, encoding: 'utf-8' });
    if (result.indexOf('path_display') !== -1) {
      console.log('Saved to Dropbox: ' + dropboxPath);
      fs.unlinkSync(tempFile);
      return true;
    } else {
      console.log('Dropbox response: ' + result.substring(0, 200));
      fs.unlinkSync(tempFile);
      return false;
    }
  } catch (e) {
    console.log('Dropbox upload failed: ' + e.message.substring(0, 200));
    try { fs.unlinkSync(tempFile); } catch (e2) {}
    return false;
  }
}

// ============================================================
// STEP 7: CMS Publish (when site is live)
// ============================================================

async function publishToCMS() {
  var siteUrl = config.url;
  var https = require('https');

  var siteLive = await new Promise(function(resolve) {
    var req = https.get(siteUrl, function(res) {
      resolve(res.statusCode === 200);
    });
    req.on('error', function() { resolve(false); });
    req.on('timeout', function() { req.destroy(); resolve(false); });
    req.setTimeout(5000);
  });

  if (!siteLive) {
    console.log('\nSite not live yet: ' + siteUrl);
    console.log('CMS publish skipped. Re-run with --publish when site is live.');
    console.log('Command: node approve-post.js ' + projectKey + ' ' + draftPath.replace(WORKSPACE + '/', '') + ' --' + (isBlog ? 'blog' : 'social') + ' --publish');

    // Save publish command for later
    var cmdFile = path.join(config.approvedDir, typeDir, 'PUBLISH_WHEN_LIVE_' + TODAY + '-' + slug + '.sh');
    fs.writeFileSync(cmdFile, '#!/bin/bash\n# Run when ' + siteUrl + ' is live:\nnode ' + path.join(WORKSPACE, 'scripts/approve-post.js') + ' ' + projectKey + ' ' + draftPath + ' --' + (isBlog ? 'blog' : 'social') + ' --publish\n');
    fs.chmodSync(cmdFile, '0755');
    return false;
  }

  console.log('\nSite is live! Publishing to ' + siteUrl);
  // TODO: Implement CMS-specific publishing:
  // - WordPress: POST to /wp-json/wp/v2/posts
  // - Ghost: POST to /ghost/api/v3/admin/posts/
  // - Static: Copy markdown to content folder + rebuild
  // - Custom: Use Make.com / Zapier webhook
  console.log('CMS publish integration not yet configured for ' + projectKey);
  console.log('Configure when site platform is confirmed (WordPress/Ghost/Static/etc.)');
  return false;
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
    // Find the channel line and insert after it
    var channelLine = '**Channel:** ' + config.channel + '\n';
    var insertPoint = tracker.indexOf(channelLine);
    if (insertPoint !== -1) {
      var insertPos = insertPoint + channelLine.length;
      tracker = tracker.slice(0, insertPos) +
        '\n### ' + typeLabel + ' (Approved)\n\n| Title | Date |\n|-------|------|\n| ' + title + ' | ' + TODAY + ' |\n' +
        tracker.slice(insertPos);
    }
  } else {
    // Add row to existing table
    var sectionEnd = tracker.indexOf('\n\n###', existingIdx + 1);
    var insertPos = sectionEnd !== -1 ? sectionEnd : existingIdx + projectSection.length;
    tracker = tracker.slice(0, insertPos) + '\n| ' + title + ' | ' + TODAY + ' |' + tracker.slice(insertPos);
  }

  fs.writeFileSync(trackerPath, tracker);
  console.log('\nUpdated post-tracker.md');
}

// ============================================================
// RUN
// ============================================================

(async function main() {
  try {
    await saveToDropbox();

    if (PUBLISH) {
      await publishToCMS();
    }

    updateTracker();

    console.log('\n=== DONE ===');
    console.log('Post approved and saved.');
    console.log('  Approved file: ' + approvedPath.replace(WORKSPACE, '~'));
    console.log('  Dropbox: ' + config.dropboxBaseDir + '/' + typeDir + '/' + TODAY + '-' + slug + '.docx');
    if (PUBLISH) console.log('  CMS publish: attempted');
    console.log('');

  } catch (err) {
    console.error('Error: ' + err.message);
    process.exit(1);
  }
})();