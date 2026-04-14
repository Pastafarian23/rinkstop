#!/usr/bin/env node
/**
 * Buffer API Post Script
 * Usage: node buffer-post.js <profile_id> "<text>"
 */

const BUFFER_TOKEN = 'uTFWRu1dsl0UczDWS5NlUPGNZJyzh7wHquMVhSW9Zz_';

async function postUpdate(profileId, text) {
  const response = await fetch('https://api.buffer.com/1/updates/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${BUFFER_TOKEN}`
    },
    body: JSON.stringify({
      profile_ids: [profileId],
      text: text,
      scheduled_at: null // Post immediately
    })
  });

  const data = await response.json();
  return data;
}

async function getProfiles() {
  const response = await fetch(`https://api.buffer.com/1/profiles.json?access_token=${BUFFER_TOKEN}`);
  const data = await response.json();
  return data;
}

// CLI handler
const args = process.argv.slice(2);
if (args[0] === 'profiles') {
  getProfiles().then(d => console.log(JSON.stringify(d, null, 2)));
} else if (args[0] && args[1]) {
  postUpdate(args[0], args[1]).then(d => console.log(JSON.stringify(d, null, 2)));
} else {
  console.log('Usage:');
  console.log('  node buffer-post.js profiles          # List connected profiles');
  console.log('  node buffer-post.js <profile_id> "<text>"  # Post update');
}