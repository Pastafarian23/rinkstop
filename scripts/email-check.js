#!/usr/bin/env node
/**
 * Email Check - Only reports NEW emails since last check
 * Usage: 
 *   node email-check.js new       → Report new emails (summary + draft)
 *   node email-check.js pending  → Report pending list (condensed)
 */

const MATON_API_KEY = process.env.MATON_API_KEY;
const ACCOUNT_ID = '2958661000000008002';
const FOLDER_ID = '2958661000000008014'; // Inbox
const SEEN_FILE = '/root/.openclaw/workspace/.last-email-check.json';
const MAX_EMAILS = 20;

const fs = require('fs');

function loadSeen() {
  try {
    if (fs.existsSync(SEEN_FILE)) {
      return JSON.parse(fs.readFileSync(SEEN_FILE, 'utf8'));
    }
  } catch (e) {}
  return { seen: [], lastCheck: null };
}

function saveSeen(seen) {
  fs.writeFileSync(SEEN_FILE, JSON.stringify(seen, null, 2));
}

function getTimeWaiting(receivedTime) {
  const receivedMs = parseInt(receivedTime);
  const now = Date.now();
  const diffMs = now - receivedMs;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffDays > 0) return `${diffDays}d`;
  if (diffHours > 0) return `${diffHours}h`;
  if (diffMins > 0) return `${diffMins}m`;
  return '<1m';
}

async function fetchEmails() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout

  try {
    const response = await fetch(
      `https://api.maton.ai/zoho-mail/api/accounts/${ACCOUNT_ID}/messages/view?folderId=${FOLDER_ID}&limit=${MAX_EMAILS}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${MATON_API_KEY}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      }
    );
    clearTimeout(timeout);
    const data = await response.json();
    return data.data || [];
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') {
      console.error('Error: Request timed out (>15s). Maton/Zoho API may be unreachable.');
    } else {
      console.error('Error fetching emails:', err.message);
    }
    return [];
  }
}

async function reportNewEmails(emails, seen) {
  // Find truly NEW emails (not in seen list)
  const newEmails = emails.filter(e => 
    e.status === 0 && !seen.seen.includes(e.messageId)
  );
  
  if (newEmails.length === 0) {
    // Silent - no output means no announcement
    return;
  }
  
  console.log(`📧 ${newEmails.length} NEW email(s):\n`);
  
  newEmails.forEach((email, i) => {
    console.log(`--- ${i + 1}. ${email.subject} ---`);
    console.log(`From: ${email.sender || email.fromAddress}`);
    console.log(`Summary: ${email.summary}`);
    console.log('');
  });
  
  // Update seen list
  const currentIds = emails.filter(e => e.status === 0).map(e => e.messageId);
  const updatedSeen = [...new Set([...seen.seen, ...currentIds])];
  saveSeen({ seen: updatedSeen, lastCheck: new Date().toISOString() });
}

async function reportPending(emails) {
  const pending = emails.filter(e => e.status === 0);
  
  if (pending.length === 0) {
    console.log('No pending emails');
    return;
  }
  
  console.log('PENDING_EMAILS:');
  pending.forEach((email, i) => {
    const sender = email.sender || email.fromAddress.split('@')[0];
    console.log(`${i + 1}. ${sender} | ${email.subject} | ${getTimeWaiting(email.receivedTime)}`);
  });
}

async function main() {
  const mode = process.argv[2] || 'new';
  const seen = loadSeen();
  const emails = await fetchEmails();
  
  if (mode === 'pending') {
    await reportPending(emails);
  } else {
    await reportNewEmails(emails, seen);
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});