const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const cred = JSON.parse(
  fs.readFileSync(path.join(os.homedir(), '.openclaw/credentials/vercel.json'), 'utf8'),
);

const ID = process.argv[2];
const WAIT = Number(process.argv[3] || 300);

async function main() {
  const deadline = Date.now() + WAIT * 1000;
  while (Date.now() < deadline) {
    const res = await fetch(`https://api.vercel.com/v13/deployments/${ID}`, {
      headers: { Authorization: `Bearer ${cred.token}` },
    });
    const d = await res.json();
    console.log(new Date().toISOString(), d.readyState, d.readySubstate ?? '-', d.target ?? '-');
    if (d.readyState === 'READY' || d.readyState === 'ERROR' || d.readyState === 'CANCELED') {
      console.log('FINAL:', d.readyState, d.readySubstate ?? '-');
      console.log('url:', d.url);
      if (d.error) console.log('error:', JSON.stringify(d.error).slice(0, 600));
      process.exit(d.readyState === 'READY' ? 0 : 1);
    }
    await new Promise((r) => setTimeout(r, 15000));
  }
  console.log('TIMEOUT waiting for deployment');
  process.exit(2);
}
main();
