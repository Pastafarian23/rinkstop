/**
 * dropbox-save-post.js - PROPER FORMATTING VERSION
 * 
 * Saves approved posts to Dropbox in .docx format with proper formatting
 * (headers, bullets, paragraphs preserved)
 * 
 * Updated: 2026-04-22 - Uses direct upload method to preserve formatting
 */

const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = require('docx');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const MATON_API_KEY = process.env.MATON_API_KEY || 'v2.6IhUnYkmPVroYk8_B2KzsiDQDs2UMTry5AVoBdgLdltHG3jcKCH4WtLlXlVComlfoNQbUsHuJbMkvNY003a7QxX6eI4Sk5xbwq4GyuPV28-V9xnc_GqH3LzX';
const DROPBOX_CONNECTION_ID = '0047d26c-609f-444d-ac51-074b49de5a21';

const today = new Date().toISOString().split('T')[0];

/**
 * Convert markdown content to properly formatted Word document
 * Uses docx library to create: H1, H2, H3, bullets, paragraphs
 */
async function createFormattedDocx(markdownContent, title) {
  const lines = markdownContent.split('\n');
  const children = [];

  lines.forEach((line) => {
    const trimmed = line.trim();
    
    if (trimmed.startsWith('# ')) {
      // H1 - Main Title
      children.push(new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun({ text: trimmed.substring(2), bold: true, size: 44 })]
      }));
    } else if (trimmed.startsWith('## ')) {
      // H2 - Section
      children.push(new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: trimmed.substring(3), bold: true, size: 32 })]
      }));
    } else if (trimmed.startsWith('### ')) {
      // H3 - Subsection
      children.push(new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun({ text: trimmed.substring(4), bold: true, size: 28 })]
      }));
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      // Bullet point
      children.push(new Paragraph({
        text: trimmed.substring(2),
        bullet: { level: 0 },
        indent: { left: 720 }
      }));
    } else if (trimmed === '---') {
      // Horizontal line
      children.push(new Paragraph({ 
        text: '________________________________', 
        spacing: { before: 200, after: 200 } 
      }));
    } else if (trimmed !== '') {
      // Regular paragraph
      children.push(new Paragraph({
        children: [new TextRun({ text: trimmed, size: 22 })]
      }));
    }
  });

  const doc = new Document({
    sections: [{
      properties: {},
      children: children
    }]
  });

  return Packer.toBuffer(doc);
}

/**
 * Upload file to Dropbox using direct API (not the broken script method)
 */
async function uploadToDropboxDirect(fileBuffer, dropboxPath) {
  const url = 'https://gateway.maton.ai/dropbox/2/files/upload';
  
  const apiArg = JSON.stringify({
    path: dropboxPath,
    mode: 'add',
    autorename: false,
    mute: false
  });

  const proc = require('child_process').spawn('curl', [
    '-X', 'POST',
    url,
    '-H', `Authorization: Bearer ${MATON_API_KEY}`,
    '-H', `Maton-Connection: ${DROPBOX_CONNECTION_ID}`,
    '-H', 'Content-Type: application/octet-stream',
    '-H', `Dropbox-API-Arg: ${apiArg}`,
    '--data-binary', '@-'
  ]);

  return new Promise((resolve, reject) => {
    let output = '';
    proc.stdout.on('data', (data) => output += data);
    proc.stderr.on('data', (data) => output += data);
    proc.on('close', (code) => {
      if (code === 0 && output.includes('path_display')) {
        resolve(output);
      } else {
        reject(new Error(output));
      }
    });
    proc.stdin.write(fileBuffer);
    proc.stdin.end();
  });
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  if (args.length < 4) {
    console.error('Usage: node dropbox-save-post-formatted.js <project> <type> <title> "<content>"');
    process.exit(1);
  }

  const [project, type, title, ...contentParts] = args;
  const content = contentParts.join(' ');

  console.log(`📝 Creating properly formatted Word document: ${title}`);

  // Create formatted docx
  const docxBuffer = await createFormattedDocx(content, title);
  
  // Save to temp file
  const tempFile = path.join(os.tmpdir(), `${today}-${title.replace(/[^a-z0-9]/gi, '-')}.docx`);
  fs.writeFileSync(tempFile, docxBuffer);
  console.log(`✅ Document created: ${tempFile}`);

  // Upload to Dropbox
  const folderMap = {
    'SativaExchange': 'SativaExchange',
    'RinkStop': 'RinkStop', 
    'TopShelfToker': 'TopShelfToker',
    'KevlarData': 'KevlarData'
  };
  
  const typeFolder = type === 'Blog Posts' ? 'Blog Posts' : 'Social Media';
  const dropboxPath = `/${folderMap[project] || project}/${typeFolder}/${title}-${today}.docx`;
  
  console.log(`☁️ Uploading to Dropbox: ${dropboxPath}`);
  
  try {
    await uploadToDropboxDirect(docxBuffer, dropboxPath);
    console.log(`✅ Uploaded successfully!`);
    console.log(`📁 Location: Dropbox ${dropboxPath}`);
  } catch (e) {
    console.log(`⚠️ Upload response: ${e.message}`);
  }
}

main().catch(console.error);