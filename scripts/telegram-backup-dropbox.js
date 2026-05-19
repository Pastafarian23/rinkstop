#!/usr/local/bin/node
/**
 * Telegram Backup → Dropbox
 * Runs daily to capture all Telegram activity and save to Dropbox
 * Scheduled: 11pm daily (Asia/Manila) via openclaw cron
 */

const BOT_TOKEN = '7574311811:AAFV7RiYG8SFEE2P7UxFQw_ZxYn9lqFpntI';
const BACKUP_DIR = '/root/.openclaw/workspace/telegram-backup';
const MATON_API_KEY = process.env.MATON_API_KEY;
const DROPBOX_CONN_ID = '0047d26c-609f-444d-ac51-074b49de5a21';
const DROPBOX_UPLOAD_URL = 'https://gateway.maton.ai/dropbox/2/files/upload';
const DROPBOX_FOLDER = '/Ron Memory';

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

const STATE_FILE = path.join(BACKUP_DIR, '.last_update_id');

function telegramRequest(method, params = {}) {
  return new Promise((resolve, reject) => {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/${method}`;
    const postData = JSON.stringify(params);
    const req = https.request(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) }, timeout: 30000 });
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.on('error', reject);
    let body = '';
    req.on('response', (res) => {
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); } catch (e) { reject(new Error('Parse error')); }
      });
    });
    req.write(postData);
    req.end();
  });
}

function formatDate(ts) {
  return new Date(ts * 1000).toISOString().replace('T', ' ').substring(0, 19);
}

function formatMessage(msg) {
  const date = formatDate(msg.date);
  const from = msg.from ? `${msg.from.first_name || ''} ${msg.from.last_name || ''} (@${msg.from.username || 'unknown'}) [${msg.from.id}]` : 'Unknown';
  let content = '';
  if (msg.text) content = msg.text;
  else if (msg.caption) content = `[${msg.photo ? '📷 Photo' : msg.document ? '📄 Document' : msg.video ? '🎥 Video' : '📎 Media'}] ${msg.caption || ''}`;
  else if (msg.sticker) content = `[STICKER: ${msg.sticker.emoji || ''}]`;
  else if (msg.new_chat_members?.length) content = `[👥 NEW: ${msg.new_chat_members.map(m => m.first_name).join(', ')}]`;
  else if (msg.left_chat_member) content = `[🚪 LEFT: ${msg.left_chat_member.first_name}]`;
  else if (msg.pinned_message) content = `[📌 PINNED]`;
  else if (msg.voice) content = `[🎤 Voice: ${msg.voice.duration}s]`;
  else content = `[MESSAGE TYPE]`;
  return { date, from, content: content.replace(/\n/g, '\\n') };
}

async function liveCapture() {
  console.log(`[${formatDate(Date.now()/1000 | 0)}] 🔄 Starting Telegram backup...`);

  let lastId = 0;
  if (fs.existsSync(STATE_FILE)) {
    try { lastId = parseInt(fs.readFileSync(STATE_FILE, 'utf8')); } catch(e) {}
  }

  let conversations = new Map();
  let totalNew = 0;
  let iterations = 0;

  while (iterations < 50) {
    iterations++;
    const result = await telegramRequest('getUpdates', { offset: lastId + 1, limit: 100, timeout: 0 });
    if (!result.ok) break;
    const updates = result.result;
    if (updates.length === 0) break;

    for (const update of updates) {
      lastId = Math.max(lastId, update.update_id);
      const msg = update.message || update.channel_post;
      if (!msg) continue;
      const chat = msg.chat;
      const chatId = chat.id;
      if (!conversations.has(chatId)) {
        conversations.set(chatId, { id: chatId, type: chat.type, title: chat.title || `${chat.first_name || ''} ${chat.last_name || ''}`, username: chat.username, messages: [] });
      }
      conversations.get(chatId).messages.push(msg);
      totalNew++;
    }

    fs.writeFileSync(STATE_FILE, lastId.toString());
    if (updates.length < 100) break;
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`  Captured ${totalNew} new messages from ${conversations.size} conversations`);

  // Save each conversation
  for (const [chatId, conv] of conversations) {
    conv.messages.sort((a, b) => a.date - b.date);
    const safeName = conv.title.replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 50);
    const jsonFile = path.join(BACKUP_DIR, `chat_${chatId}_${safeName}.json`);

    let existingMessages = [];
    if (fs.existsSync(jsonFile)) {
      try { existingMessages = (JSON.parse(fs.readFileSync(jsonFile, 'utf8'))).messages || []; } catch(e) {}
    }

    const allMessages = [...new Map([...existingMessages, ...conv.messages].map(m => [m.message_id, m])).values()];
    allMessages.sort((a, b) => a.date - b.date);

    const chatData = {
      chatId, type: conv.type, title: conv.title, username: conv.username,
      lastBackup: new Date().toISOString(), messageCount: allMessages.length, messages: allMessages
    };
    fs.writeFileSync(jsonFile, JSON.stringify(chatData, null, 2));
    console.log(`  ✅ ${conv.title}: ${conv.messages.length} new (${allMessages.length} total)`);
  }

  // Upload to Dropbox
  for (const [chatId, conv] of conversations) {
    const safeName = conv.title.replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 50);
    const jsonFile = path.join(BACKUP_DIR, `chat_${chatId}_${safeName}.json`);

    if (!fs.existsSync(jsonFile)) continue;

    const dropboxPath = `${DROPBOX_FOLDER}/${safeName}_${chatId}.json`;
    const today = new Date().toISOString().split('T')[0];
    const backupPath = `${DROPBOX_FOLDER}/${today}/${safeName}_${chatId}.json`;

    try {
      const fileContent = fs.readFileSync(jsonFile);
      const apiArg = JSON.stringify({ path: backupPath, mode: 'add', autorename: true, mute: false });

      const result = execSync(`curl -s -o /dev/null -w "%{http_code}" -X POST "${DROPBOX_UPLOAD_URL}" \
        -H "Authorization: Bearer ${MATON_API_KEY}" \
        -H "Maton-Connection: ${DROPBOX_CONN_ID}" \
        -H "Content-Type: application/octet-stream" \
        -H "Dropbox-API-Arg: ${apiArg}" \
        --data-binary @${jsonFile}`, { encoding: 'utf-8', timeout: 30000 });

      if (result.trim() === '200') {
        console.log(`  ☁️ Uploaded: ${backupPath}`);
      } else {
        console.log(`  ⚠️ Upload failed (HTTP ${result.trim()}) for ${backupPath}`);
      }
    } catch (e) {
      console.log(`  ⚠️ Upload error for ${safeName}: ${e.message}`);
    }
  }

  console.log(`✅ Backup complete at ${new Date().toISOString()}\n`);
}

liveCapture().catch(err => { console.error('Backup failed:', err.message); process.exit(1); });