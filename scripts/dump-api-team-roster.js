const fs = require('fs');
for (const line of fs.readFileSync('.env', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}
const KEY = process.env.HIGHLIGHTLY_API_KEY;

// Look at the sync-nhl-highantly.js to see what endpoints it actually called
const code = fs.readFileSync('scripts/sync-nhl-highantly.js', 'utf8');
console.log('=== sync-nhl-highantly.js endpoint calls ===');
const calls = code.match(/https?:\/\/[^`'"\s]+/g) || [];
console.log([...new Set(calls)].join('\n'));
console.log('');
console.log('=== Response parsing logic ===');
const lines = code.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].match(/position|jersey|height|weight|birth/i)) {
    console.log(`L${i+1}: ${lines[i]}`);
  }
}
