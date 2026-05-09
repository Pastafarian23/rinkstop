#!/usr/bin/env node
/**
 * Fetch emails from Zoho Mail with timestamps
 * Usage: node fetch-emails.js [accountId] [folderId]
 * Output: Sender | Subject | Time waiting (min/h/d)
 */

const MATON_API_KEY = 'v2.6IhUnYkmPVroYk8_B2KzsiDQDs2UMTry5AVoBdgLdltHG3jcKCH4WtLlXlVComlfoNQbUsHuJbMkvNY003a7QxX6eI4Sk5xbwq4GyuPV28-V9xnc_GqH3LzX';
const ACCOUNT_ID = '2958661000000008002';
const FOLDER_ID = '2958661000000008014'; // Inbox
const LIMIT = 20;

async function fetchEmails() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout

  try {
    const response = await fetch(
      `https://api.maton.ai/zoho-mail/api/accounts/${ACCOUNT_ID}/messages/view?folderId=${FOLDER_ID}&limit=${LIMIT}`,
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

    if (!data.data || !Array.isArray(data.data)) {
      console.log('No pending emails');
      return;
    }

    const now = Date.now();
    const emails = data.data
      .filter(msg => msg.status === '0') // Only unread (status 0)
      .map(msg => {
        const receivedMs = parseInt(msg.receivedTime);
        const diffMs = now - receivedMs;
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);

        let timeWaiting;
        if (diffDays > 0) {
          timeWaiting = `${diffDays}d`;
        } else if (diffHours > 0) {
          timeWaiting = `${diffHours}h`;
        } else if (diffMins > 0) {
          timeWaiting = `${diffMins}m`;
        } else {
          timeWaiting = '<1m';
        }

        return {
          sender: msg.sender || msg.fromAddress.split('@')[0],
          subject: msg.subject,
          timeWaiting
        };
      });

    if (emails.length === 0) {
      console.log('No pending emails');
      return;
    }

    emails.forEach((email, i) => {
      console.log(`${i + 1}. ${email.sender} | ${email.subject} | ${email.timeWaiting}`);
    });

  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') {
      console.error('Error: Request timed out (>15s). Maton/Zoho API may be unreachable.');
    } else {
      console.error('Error fetching emails:', err.message);
    }
  }
}

fetchEmails().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});