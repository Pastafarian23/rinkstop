/**
 * Batch convert MD to DOCX and upload to Dropbox
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');
const { Document, Packer, Paragraph, TextRun, HeadingLevel } = require('docx');

const MATON_API_KEY = process.env.MATON_API_KEY;
const DROPBOX_CONNECTION_ID = '0047d26c-609f-444d-ac51-074b49de5a21';

const projects = {
  rinkstop: 'RinkStop',
  sativaexchange: 'SativaExchange',
  topshelftoker: 'TopShelfToker',
  kevlar: 'Kevlar'
};

const typeMap = {
  'nhl-youth-hockey': 'Blog',
  'youth-hockey-rise': 'Blog',
  'emerging-markets': 'Blog',
  'cannabis-trends': 'Blog',
  'cook-county-property-data': 'Blog',
  'social-facebook': 'Facebook',
  'social-twitter': 'Twitter',
  'social-linkedin': 'LinkedIn',
  'social-instagram': 'Instagram',
  'social-posts': 'Social'
};

function mdToDocx(markdownContent, title) {
  const lines = markdownContent.split('\n');
  const children = [];

  lines.forEach((line) => {
    const trimmed = line.trim();

    if (trimmed.startsWith('# ')) {
      children.push(new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun({ text: trimmed.substring(2), bold: true })]
      }));
    } else if (trimmed.startsWith('## ')) {
      children.push(new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: trimmed.substring(3), bold: true })]
      }));
    } else if (trimmed.startsWith('### ')) {
      children.push(new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun({ text: trimmed.substring(4), bold: true })]
      }));
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      children.push(new Paragraph({
        text: trimmed.substring(2),
        bullet: { level: 0 }
      }));
    } else if (trimmed === '') {
      children.push(new Paragraph({ text: '' }));
    } else {
      children.push(new Paragraph({
        children: [new TextRun({ text: trimmed })]
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

async function uploadToDropbox(buffer, filename) {
  const tempFile = path.join(os.tmpdir(), filename);
  fs.writeFileSync(tempFile, buffer);

  const cmd = `curl -s -X POST "https://gateway.maton.ai/dropbox/files/upload" \
    -H "Authorization: Bearer ${MATON_API_KEY}" \
    -H "Content-Type: application/octet-stream" \
    -F "path=/Arnel/Output/${filename}" \
    -F "contents=@${tempFile}"`;

  try {
    execSync(cmd);
    return true;
  } catch (e) {
    console.log(`Error: ${e.message}`);
    return false;
  }
}

async function processAll() {
  let count = 0;

  for (const [projDir, projName] of Object.entries(projects)) {
    const dir = `/root/.openclaw/workspace/drafts/${projDir}/rewritten`;
    if (!fs.existsSync(dir)) continue;

    const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));

    for (const f of files) {
      const content = fs.readFileSync(path.join(dir, f), 'utf8');
      const baseName = f.replace('.md', '');

      let type = 'Document';
      for (const [key, val] of Object.entries(typeMap)) {
        if (baseName.includes(key)) {
          type = val;
          break;
        }
      }

      const filename = `${projName}_${type}_${baseName}_2026-04-22.docx`;

      console.log(`Converting: ${filename}...`);

      const docxBuffer = mdToDocx(content, baseName);
      const success = await uploadToDropbox(docxBuffer, filename);

      if (success) {
        console.log(`✅ Uploaded: ${filename}`);
        count++;
      } else {
        console.log(`❌ Failed: ${filename}`);
      }
    }
  }

  console.log(`\n=== Done: ${count} files uploaded ===`);
}

processAll();