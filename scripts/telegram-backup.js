#!/usr/bin/env node
/**
 * Telegram Conversation Backup Script
 * 
 * Two modes:
 *  1. Live capture — fetches all updates since bot last ran, saves them
 *  2. Parse export — parses Telegram's HTML/JSON export files
 * 
 * Usage:
 *   node telegram-backup.js              # Live capture from bot updates
 *   node telegram-backup.js --export DIR  # Parse Telegram export directory
 */

const BOT_TOKEN = '7574311811:AAFV7RiYG8SFEE2P7UxFQw_ZxYn9lqFpntI';
const BACKUP_DIR = '/root/.openclaw/workspace/telegram-backup';
const fs = require('fs');
const path = require('path');
const https = require('https');
const STATE_FILE = path.join(BACKUP_DIR, '.last_update_id');

if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

function telegramRequest(method, params = {}) {
  return new Promise((resolve, reject) => {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/${method}`;
    const postData = JSON.stringify(params);
    
    const req = https.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 30000
    });
    
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.on('error', reject);
    
    let body = '';
    req.on('response', (res) => {
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); } 
        catch (e) { reject(new Error('Parse error')); }
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
  if (msg.text) {
    content = msg.text;
  } else if (msg.caption) {
    content = `[${msg.photo ? '📷 Photo' : msg.document ? '📄 Document' : msg.video ? '🎥 Video' : '📎 Media'}] ${msg.caption || ''}`;
  } else if (msg.sticker) {
    content = `[STICKER: ${msg.sticker.emoji || ''} ${msg.sticker.set_name || ''}]`;
  } else if (msg.new_chat_members?.length) {
    content = `[👥 NEW: ${msg.new_chat_members.map(m => m.first_name).join(', ')}]`;
  } else if (msg.left_chat_member) {
    content = `[🚪 LEFT: ${msg.left_chat_member.first_name}]`;
  } else if (msg.pinned_message) {
    content = `[📌 PINNED]`;
  } else if (msg.voice) {
    content = `[🎤 Voice message: ${msg.voice.duration}s]`;
  } else {
    const extra = Object.keys(msg).filter(k => !['message_id','date','chat','from','new_chat_members','left_chat_member','pinned_message'].includes(k));
    content = `[TYPE: ${extra.join(',')}]`;
  }
  
  return { date, from, content: content.replace(/\n/g, '\\n') };
}

async function liveCapture() {
  console.log('🤖 Live Telegram capture starting...\n');
  
  // Load last update ID
  let lastId = 0;
  if (fs.existsSync(STATE_FILE)) {
    try { lastId = parseInt(fs.readFileSync(STATE_FILE, 'utf8')); } catch(e) {}
  }
  
  console.log(`📌 Resuming from update ID: ${lastId}\n`);
  
  let conversations = new Map();
  let totalNew = 0;
  let maxIterations = 50; // Safety limit
  
  while (maxIterations-- > 0) {
    const result = await telegramRequest('getUpdates', {
      offset: lastId + 1,
      limit: 100,
      timeout: 0
    });
    
    if (!result.ok) {
      console.error('API error:', result.description);
      break;
    }
    
    const updates = result.result;
    if (updates.length === 0) break;
    
    for (const update of updates) {
      lastId = Math.max(lastId, update.update_id);
      
      if (update.message) {
        const chat = update.message.chat;
        const chatId = chat.id;
        
        if (!conversations.has(chatId)) {
          conversations.set(chatId, {
            id: chatId,
            type: chat.type,
            title: chat.title || `${chat.first_name || ''} ${chat.last_name || ''}`,
            username: chat.username,
            messages: []
          });
        }
        conversations.get(chatId).messages.push(update.message);
        totalNew++;
      }
      
      if (update.channel_post) {
        const chat = update.channel_post.chat;
        const chatId = chat.id;
        if (!conversations.has(chatId)) {
          conversations.set(chatId, {
            id: chatId,
            type: chat.type,
            title: chat.title || chat.channel_chat_created?.title || 'Channel',
            username: chat.username,
            messages: []
          });
        }
        conversations.get(chatId).messages.push(update.channel_post);
        totalNew++;
      }
    }
    
    // Save state
    fs.writeFileSync(STATE_FILE, lastId.toString());
    
    if (updates.length < 100) break;
    await new Promise(r => setTimeout(r, 500));
  }
  
  console.log(`📡 Captured ${totalNew} new messages from ${conversations.size} conversations\n`);
  
  // Save each conversation
  for (const [chatId, conv] of conversations) {
    conv.messages.sort((a, b) => a.date - b.date);
    const formatted = conv.messages.map(formatMessage);
    
    const safeName = conv.title.replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 50);
    
    // Append to existing file or create new
    const jsonFile = path.join(BACKUP_DIR, `chat_${chatId}_${safeName}.json`);
    const mdFile = path.join(BACKUP_DIR, `chat_${chatId}_${safeName}.md`);
    
    // Merge with existing if present
    let existingMessages = [];
    if (fs.existsSync(jsonFile)) {
      try {
        const existing = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
        existingMessages = existing.messages || [];
      } catch(e) {}
    }
    
    const allMessages = [...new Map([...existingMessages, ...conv.messages].map(m => [m.message_id, m])).values()];
    allMessages.sort((a, b) => a.date - b.date);
    
    const chatData = {
      chatId,
      type: conv.type,
      title: conv.title,
      username: conv.username,
      lastBackup: new Date().toISOString(),
      messageCount: allMessages.length,
      messages: allMessages
    };
    
    fs.writeFileSync(jsonFile, JSON.stringify(chatData, null, 2));
    
    // Regenerate summary markdown
    const allFormatted = allMessages.map(formatMessage);
    let md = `# ${conv.title}\n\n`;
    md += `**Chat ID:** ${chatId} | **Type:** ${conv.type}\n`;
    md += `**Last backup:** ${new Date().toISOString()}\n`;
    md += `**Total messages:** ${allMessages.length}\n\n`;
    md += `---\n\n`;
    
    allFormatted.forEach(m => {
      md += `[${m.date}] **${m.from}**:\n`;
      md += `${m.content.replace(/\\n/g, '\n')}\n\n`;
    });
    
    fs.writeFileSync(mdFile, md);
    console.log(`  ✅ ${conv.title}: ${conv.messages.length} new (${allMessages.length} total)`);
  }
  
  // Update index
  const index = [];
  for (const f of fs.readdirSync(BACKUP_DIR)) {
    if (f.includes('_summary.md') || (f.includes('.md') && !f.includes('INDEX'))) {
      index.push(f);
    }
  }
  
  let indexMd = '# Telegram Backup Index\n\n';
  indexMd += `**Last updated:** ${new Date().toISOString()}\n`;
  indexMd += `**Conversations:** ${conversations.size} active\n\n`;
  indexMd += `| Conversation | Messages | Updated |\n`;
  indexMd += `|-------------|----------|--------|\n`;
  
  for (const f of fs.readdirSync(BACKUP_DIR)) {
    if (f.startsWith('chat_') && f.includes('.json')) {
      const data = JSON.parse(fs.readFileSync(path.join(BACKUP_DIR, f), 'utf8'));
      const name = f.replace(/chat_/, '').replace(/\.json/, '').replace(/_/g, ' ');
      indexMd += `| ${name} | ${data.messageCount} | ${data.lastBackup} |\n`;
    }
  }
  
  fs.writeFileSync(path.join(BACKUP_DIR, 'INDEX.md'), indexMd);
  
  console.log(`\n✅ Backup complete! ${totalNew} new messages saved.`);
  console.log(`   Location: ${BACKUP_DIR}/`);
}

// Parse Telegram export (HTML files from Settings → Export)
async function parseExport(exportDir) {
  console.log(`📂 Parsing Telegram export from: ${exportDir}\n`);
  
  if (!fs.existsSync(exportDir)) {
    console.error('Export directory not found!');
    return;
  }
  
  const files = fs.readdirSync(exportDir).filter(f => f.endsWith('.json'));
  
  for (const file of files) {
    const filePath = path.join(exportDir, file);
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      if (data.messages && Array.isArray(data.messages)) {
        const chatName = data.name || file.replace('.json', '');
        console.log(`  📁 ${chatName}: ${data.messages.length} messages`);
        
        const parsed = data.messages.map(m => ({
          date: m.date,
          from: m.from || 'Unknown',
          fromId: m.from_id || '',
          text: m.text || '[media/other]'
        }));
        
        const outFile = path.join(BACKUP_DIR, `export_${file}`);
        fs.writeFileSync(outFile, JSON.stringify({
          source: 'telegram_export',
          chatName,
          exportDate: new Date().toISOString(),
          messageCount: parsed.length,
          messages: parsed
        }, null, 2));
        
        console.log(`    ✅ Saved to ${outFile}`);
      }
    } catch(e) {
      console.log(`    ⚠️ Could not parse ${file}: ${e.message}`);
    }
  }
  
  console.log('\n✅ Export parsing complete!');
}

// Main
const exportIdx = process.argv.indexOf('--export');
if (exportIdx !== -1) {
  const exportDir = process.argv[exportIdx + 1];
  parseExport(exportDir).catch(e => { console.error(e); process.exit(1); });
} else {
  liveCapture().catch(e => { console.error(e); process.exit(1); });
}