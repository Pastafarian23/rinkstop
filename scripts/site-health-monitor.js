#!/usr/bin/env node

/**
 * Site Health Monitor
 * Runs every 15 minutes to check all project sites
 */

const https = require('https');
const { execSync } = require('child_process');

const PROJECTS = [
  { name: 'Confidential', url: 'https://jobs.sativaexchange.com', expectedStatus: [200, 301, 302] },
  { name: 'SativaExchange', url: 'https://sativaexchange.com', expectedStatus: [200] },
  { name: 'RinkStop', url: 'https://rinkstop.com', expectedStatus: [200] },
  { name: 'Kevlar Data', url: 'https://kevlardata.com', expectedStatus: [200] },
  { name: 'Top Shelf Toker', url: 'https://topshelftoker.com', expectedStatus: [200, 301, 302] }
];

const C_SUITE_CHAT = '-4990884833';

function checkSite(url) {
  return new Promise((resolve) => {
    const start = Date.now();
    const req = https.get(url, { timeout: 10000 }, (res) => {
      const time = Date.now() - start;
      resolve({ status: res.statusCode, time, ok: true });
    });
    req.on('error', () => resolve({ status: 0, time: 0, ok: false }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 0, time: 0, ok: false }); });
  });
}

function sendAlert(message) {
  const script = `
import urllib.request
import json

url = 'https://gateway.maton.ai/telegram/sendMessage'

payload = json.dumps({
    'chat_id': '${C_SUITE_CHAT}',
    'text': ${JSON.stringify(message)}
})

req = urllib.request.Request(url, data=payload.encode(), method='POST')
req.add_header('Content-Type', 'application/json')
urllib.request.urlopen(req)
`;
  try {
    execSync(`python3 -c "${script.replace(/"/g, '\\"')}"`, { timeout: 10000 });
  } catch (e) {}
}

async function runMonitor() {
  const issues = [];
  
  for (const project of PROJECTS) {
    const result = await checkSite(project.url);
    const expected = project.expectedStatus.includes(result.status);
    
    if (!expected || !result.ok) {
      issues.push(`❌ ${project.name}: ${result.status || 'DOWN'}`);
    }
  }
  
  if (issues.length > 0) {
    const alert = '🚨 *SITE ALERT*\n\n' + issues.join('\n') + '\n\nAction required!';
    console.log(alert);
    sendAlert(alert);
  } else {
    console.log('All sites OK');
  }
}

runMonitor().catch(console.error);