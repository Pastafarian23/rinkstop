/**
 * Dropbox Folder Creator + File Uploader
 * Creates Workspace/Setup folder structure and uploads .docx files
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const MATON_API_KEY = process.env.MATON_API_KEY || 'rg-pGjppBethn9aAD-Cz8p4Nwllrqnllsu9EZPAuJjNHZ2v8XQeyxmHvXSUWyqJlNjSYiTAmHx6rY1et8_vxKoNLBUXpobnPmKc';
const DROPBOX_CONNECTION_ID = '0047d26c-609f-444d-ac51-074b49de5a21';

const sourceDir = '/root/.openclaw/workspace/dropbox-docx';

// Function to create folder using Dropbox API
function createFolder(folderPath) {
  const pythonScript = `
import urllib.request
import json

url = 'https://gateway.maton.ai/dropbox/2/files/create_folder_v2'

api_arg = json.dumps({
    'path': '${folderPath}',
    'autorename': False
})

req = urllib.request.Request(url, data=b'', method='POST')
req.add_header('Authorization', 'Bearer ${MATON_API_KEY}')
req.add_header('Content-Type', 'application/octet-stream')
req.add_header('Dropbox-API-Arg', api_arg)
req.add_header('Maton-Connection', '${DROPBOX_CONNECTION_ID}')

try:
    response = urllib.request.urlopen(req)
    result = json.loads(response.read().decode())
    print('SUCCESS')
except urllib.error.HTTPError as e:
    error_body = e.read().decode()
    if 'path/conflict' in error_body:
        print('EXISTS')
    else:
        print('ERROR:', e.code, error_body)
`;

  const result = execSync(`python3 -c "${pythonScript.replace(/"/g, '\\"')}"`, { encoding: 'utf-8' });
  return result;
}

// Function to upload file
function uploadFile(localPath, dropboxPath) {
  const pythonScript = `
import urllib.request
import json
import base64

file_path = '${localPath}'
dropbox_path = '${dropboxPath}'

with open(file_path, 'rb') as f:
    file_content = f.read()

api_arg = json.dumps({
    'path': dropbox_path,
    'mode': 'add',
    'autorename': False,
    'mute': False
})

req = urllib.request.Request('https://gateway.maton.ai/dropbox/2/files/upload', data=file_content, method='POST')
req.add_header('Authorization', 'Bearer ${MATON_API_KEY}')
req.add_header('Content-Type', 'application/octet-stream')
req.add_header('Dropbox-API-Arg', api_arg)
req.add_header('Maton-Connection', '${DROPBOX_CONNECTION_ID}')

try:
    response = urllib.request.urlopen(req)
    result = json.loads(response.read().decode())
    print('SUCCESS')
except urllib.error.HTTPError as e:
    error_body = e.read().decode()
    print('ERROR:', e.code, error_body)
`;

  const result = execSync(`python3 -c "${pythonScript.replace(/"/g, '\\"')}"`, { encoding: 'utf-8' });
  return result;
}

async function main() {
  // Step 1: Create main folders
  console.log('Creating Dropbox folders...');
  
  const folders = [
    '/Workspace',
    '/Workspace/Setup',
    '/Workspace/Confidential'
  ];
  
  for (const folder of folders) {
    console.log(`Creating ${folder}...`);
    const result = createFolder(folder);
    if (result.includes('SUCCESS')) {
      console.log(`  ✓ Created`);
    } else if (result.includes('EXISTS')) {
      console.log(`  ✓ Already exists`);
    } else {
      console.log(`  ✗ ${result}`);
    }
  }
  
  // Step 2: Upload files to Workspace/Setup
  console.log('\nUploading files to Workspace/Setup...');
  
  function walkDir(dir, prefix = '') {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const destPath = prefix ? `${prefix}/${item}` : item;
      
      if (fs.statSync(fullPath).isDirectory()) {
        walkDir(fullPath, `/Workspace/Setup${destPath}`);
      } else if (item.endsWith('.docx')) {
        console.log(`Uploading ${destPath}...`);
        const result = uploadFile(fullPath, `/Workspace/Setup${destPath}`);
        if (result.includes('SUCCESS')) {
          console.log(`  ✓ Uploaded`);
        } else {
          console.log(`  ✗ ${result}`);
        }
      }
    }
  }
  
  walkDir(sourceDir);
  
  // Step 3: Upload Confidential files to Workspace/Confidential
  console.log('\nUploading files to Workspace/Confidential...');
  
  const confidentialDir = path.join(sourceDir, 'Confidential');
  if (fs.existsSync(confidentialDir)) {
    const files = fs.readdirSync(confidentialDir);
    for (const file of files) {
      const fullPath = path.join(confidentialDir, file);
      console.log(`Uploading Confidential/${file}...`);
      const result = uploadFile(fullPath, `/Workspace/Confidential/${file}`);
      if (result.includes('SUCCESS')) {
        console.log(`  ✓ Uploaded`);
      } else {
        console.log(`  ✗ ${result}`);
      }
    }
  }
  
  console.log('\nDone!');
}

main().catch(console.error);