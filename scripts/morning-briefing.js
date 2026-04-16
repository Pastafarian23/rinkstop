#!/usr/bin/env node

/**
 * Morning Briefing Script
 * Runs daily at 9 AM to report on all project statuses
 */

const https = require('https');

const PROJECTS = [
  { name: 'Confidential', url: 'https://jobs.sativaexchange.com', channel: '-5283458613' },
  { name: 'SativaExchange', url: 'https://sativaexchange.com', channel: '-5167418353' },
  { name: 'RinkStop', url: 'https://rinkstop.com', channel: '-5043773858' },
  { name: 'Kevlar Data', url: 'https://kevlardata.com', channel: '-5132774377' },
  { name: 'Top Shelf Toker', url: 'https://topshelftoker.com', channel: '-5164369379' }
];

function checkSite(url) {
  return new Promise((resolve) => {
    const start = Date.now();
    https.get(url, (res) => {
      const time = Date.now() - start;
      resolve({ status: res.statusCode, time, ok: res.statusCode === 200 });
    }).on('error', () => {
      resolve({ status: 0, time: 0, ok: false });
    });
  });
}

async function runBriefing() {
  console.log('Running morning briefing...');
  
  let report = '📊 *MORNING BRIEFING*\n\n';
  
  for (const project of PROJECTS) {
    console.log(`Checking ${project.name}...`);
    const result = await checkSite(project.url);
    const status = result.ok ? '✅' : '❌';
    report += `${status} *${project.name}*: ${result.ok ? 'UP' : 'DOWN'} (${result.status})`;
    if (result.time) report += ` - ${result.time}ms`;
    report += '\n';
  }
  
  report += '\n📝 Full details: Check status.md files\n';
  
  console.log('\n' + report);
  console.log('\nBriefing complete!');
}

runBriefing().catch(console.error);