/**
 * dropbox-save-post.js
 * 
 * Saves approved posts to Dropbox in .docx format
 * 
 * Usage:
 *   node scripts/dropbox-save-post.js <project> <type> <title> "<content>"
 * 
 * Examples:
 *   node scripts/dropbox-save-post.js RinkStop "Blog Posts" "Hockey Directory Launch" "Content here..."
 *   node scripts/dropbox-save-post.js SativaExchange "Social Media" "Market Update" "Post content..."
 * 
 * Project: SativaExchange, RinkStop, TopShelfToker, KevlarData
 * Type: Blog Posts, Social Media, Reports
 */

const { Document, Packer, Paragraph, TextRun } = require('docx');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

// Configuration
const MATON_API_KEY = process.env.MATON_API_KEY || 'v2.6IhUnYkmPVroYk8_B2KzsiDQDs2UMTry5AVoBdgLdltHG3jcKCH4WtLlXlVComlfoNQbUsHuJbMkvNY003a7QxX6eI4Sk5xbwq4GyuPV28-V9xnc_GqH3LzX';
const DROPBOX_CONNECTION_ID = '0047d26c-609f-444d-ac51-074b49de5a21';

// Get today's date in YYYY-MM-DD format
const today = new Date().toISOString().split('T')[0];

// Validate arguments
const args = process.argv.slice(2);
if (args.length < 4) {
  console.error('Usage: node dropbox-save-post.js <project> <type> <title> "<content>"');
  console.error('Example: node dropbox-save-post.js RinkStop "Blog Posts" "Hockey Directory Launch" "Content here..."');
  process.exit(1);
}

const [project, type, title, ...contentParts] = args;
const content = contentParts.join(' ');

// Validate project
const validProjects = ['SativaExchange', 'RinkStop', 'TopShelfToker', 'KevlarData', 'CasaAzul', 'CasaAzuldeCebu', 'HomeGarden', 'HomeGardenCenterPH', 'Confidential', 'ArnelsFarm'];
if (!validProjects.includes(project)) {
  console.error(`Invalid project. Choose from: ${validProjects.join(', ')}`);
  process.exit(1);
}

// Map project aliases to folder names
const projectFolders = {
  'CasaAzul': 'Casa Azul de Cebu',
  'CasaAzuldeCebu': 'Casa Azul de Cebu',
  'HomeGarden': 'Home and Garden Center PH',
  'HomeGardenCenterPH': 'Home and Garden Center PH',
  'Confidential': 'Confidential',
  'ArnelsFarm': "Arnel's Farm"
};

// Validate type
const validTypes = ['Blog Posts', 'Social Media', 'Reports'];
if (!validTypes.includes(type)) {
  console.error(`Invalid type. Choose from: ${validTypes.join(', ')}`);
  process.exit(1);
}

// Create filename (slugify title)
const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const filename = `${today}-${slug}.docx`;

// Temp file path
const tempFile = path.join(os.tmpdir(), filename);

async function createDocx() {
  // Create a simple Word document
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text: title,
              bold: true,
              size: 32, // 32 half-points = 16pt
            }),
          ],
        }),
        new Paragraph({
          text: "", // empty line
        }),
        new Paragraph({
          text: content,
        }),
      ],
    }],
  });

  // Generate buffer
  const buffer = await Packer.toBuffer(doc);
  
  // Save to temp file
  fs.writeFileSync(tempFile, buffer);
  
  return buffer;
}

async function uploadToDropbox(fileBuffer, dropboxPath) {
  // Use Python to upload since we need binary upload
  const pythonScript = `
import urllib.request
import os
import json
import base64

file_path = '${tempFile}'
dropbox_path = '${dropboxPath}'

# Read the docx file
with open(file_path, 'rb') as f:
    file_content = f.read()

# Encode content
content_b64 = base64.b64encode(file_content).decode('utf-8')

# Dropbox API: upload by chunking or using content endpoint
url = 'https://gateway.maton.ai/dropbox/2/files/upload'

api_arg = json.dumps({
    'path': dropbox_path,
    'mode': 'add',
    'autorename': False,
    'mute': False
})

data = file_content

req = urllib.request.Request(url, data=data, method='POST')
req.add_header('Authorization', 'Bearer ${MATON_API_KEY}')
req.add_header('Content-Type', 'application/octet-stream')
req.add_header('Dropbox-API-Arg', api_arg)
req.add_header('Maton-Connection', '${DROPBOX_CONNECTION_ID}')

try:
    response = urllib.request.urlopen(req)
    result = json.loads(response.read().decode())
    print('SUCCESS')
    print(json.dumps(result))
except urllib.error.HTTPError as e:
    error_body = e.read().decode()
    print('ERROR')
    print(f'Status: {e.code}')
    print(error_body)
`;

  const result = execSync(`MATON_API_KEY="${MATON_API_KEY}" python3 -c "${pythonScript.replace(/"/g, '\\"')}"`, {
    encoding: 'utf-8'
  });
  
  return result;
}

async function main() {
  try {
    console.log(`📝 Creating Word document: ${filename}`);
    
    // Create the .docx file
    await createDocx();
    console.log('✅ Document created');
    
    // Dropbox path - use mapped folder name if available
    const folderName = projectFolders[project] || project;
    const dropboxPath = `/${folderName}/${type}/${filename}`;
    console.log(`☁️ Uploading to Dropbox: ${dropboxPath}`);
    
    // Upload
    const result = await uploadToDropbox(null, dropboxPath);
    
    if (result.includes('SUCCESS')) {
      console.log('✅ Uploaded successfully!');
      console.log(`📁 Location: Dropbox ${dropboxPath}`);
    } else {
      console.log('⚠️ Upload response:', result);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    // Cleanup temp file
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
  }
}

main();