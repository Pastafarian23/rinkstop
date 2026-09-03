import { readFileSync } from 'fs';

const urls = readFileSync('/tmp/all_urls2.txt', 'utf8').split('\n').filter(Boolean);

// URL length analysis
const lengths = urls.map(u => u.length).sort((a, b) => a - b);
const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length;
const over75 = urls.filter(u => u.length > 75).length;
const over100 = urls.filter(u => u.length > 100).length;
const over150 = urls.filter(u => u.length > 150).length;

console.log('=== URL Length Distribution ===');
console.log(`Total URLs: ${urls.length}`);
console.log(`Average: ${avg.toFixed(1)} chars`);
console.log(`Median: ${lengths[Math.floor(lengths.length / 2)]} chars`);
console.log(`>75 chars: ${over75} (${(over75/urls.length*100).toFixed(1)}%)`);
console.log(`>100 chars: ${over100} (${(over100/urls.length*100).toFixed(1)}%)`);
console.log(`>150 chars: ${over150} (${(over150/urls.length*100).toFixed(1)}%)`);
console.log(`Max: ${lengths[lengths.length-1]} chars`);

// Show the longest 10
const sorted = [...urls].sort((a, b) => b.length - a.length);
console.log('\n=== Longest 10 URLs ===');
for (const u of sorted.slice(0, 10)) {
  console.log(`  ${u.length} chars: ${u.replace('https://rinkstop.com', '')}`);
}

// Pattern issues
console.log('\n=== URL Pattern Issues ===');
const issues = {
  'has numeric ID at end (game ID pattern)': urls.filter(u => /-\d{10,}$/.test(u)).length,
  'has hex hash at end': urls.filter(u => /-[a-f0-9]{6,}$/.test(u)).length,
  'has uppercase letters': urls.filter(u => u !== u.toLowerCase()).length,
  'has year+date pattern (news URLs)': urls.filter(u => /\d{4}-\d{2}-\d{2}/.test(u)).length,
  'has score pattern (X-Y sports)': urls.filter(u => /-\d+-\d+-\d{4}-\d{2}-\d{2}-/.test(u)).length,
  'has unicode chars': urls.filter(u => /[^\x00-\x7F]/.test(u)).length,
  'under 30 chars (might be too short)': urls.filter(u => u.length < 30).length,
};
for (const [issue, count] of Object.entries(issues)) {
  if (count > 0) {
    console.log(`  ${count.toString().padStart(4)} URLs: ${issue}`);
  }
}

// Show some examples of each issue
console.log('\n=== Example URLs with issues ===');
for (const [issue, regex] of Object.entries({
  'numeric game ID': /-\d{10,}$/,
  'hex hash': /-[a-f0-9]{6,}$/,
  'score pattern': /-\d+-\d+-\d{4}-\d{2}-\d{2}-/,
})) {
  const examples = urls.filter(u => regex.test(u)).slice(0, 3);
  if (examples.length > 0) {
    console.log(`\n${issue}:`);
    for (const u of examples) {
      console.log(`  ${u.replace('https://rinkstop.com', '')}`);
    }
  }
}
