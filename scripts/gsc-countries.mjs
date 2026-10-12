// scripts/gsc-countries.mjs
//
// Reusable GSC query for RinkStop top-performing markets.
// Pulls 28-day country breakdown and writes a dated report to
// reports/gsc-countries-YYYY-MM-DD.md.
//
// Usage: node scripts/gsc-countries.mjs [--days=28] [--out=reports/]
//
// Requires: /root/.openclaw/credentials/gsc.json (service account)
//
// Per Arnel 2026-10-12 10:52 CDT directive: "we need our site to load
// fast in our best performing markets, with monetization potential."
// Re-run quarterly to detect regional shifts.

import { google } from 'googleapis';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const args = Object.fromEntries(process.argv.slice(2).map(a => a.replace(/^--/, '').split('=')));
const DAYS = parseInt(args.days || '28', 10);
const OUT_DIR = args.out || 'reports';

const endDate = new Date().toISOString().slice(0, 10);
const startDate = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

const creds = JSON.parse(readFileSync('/root/.openclaw/credentials/gsc.json', 'utf-8'));
const auth = new google.auth.GoogleAuth({ credentials: creds, scopes: ['https://www.googleapis.com/auth/webmasters.readonly'] });
const searchconsole = google.searchconsole({ version: 'v1', auth });

const res = await searchconsole.searchanalytics.query({
  siteUrl: 'sc-domain:rinkstop.com',
  requestBody: { startDate, endDate, dimensions: ['country'], rowLimit: 250 },
});

const NAMES = {
  usa:'United States', can:'Canada', gbr:'United Kingdom', aus:'Australia', nzl:'New Zealand',
  phl:'Philippines', sgp:'Singapore', mys:'Malaysia', tha:'Thailand', idn:'Indonesia',
  vnm:'Vietnam', hkg:'Hong Kong', twn:'Taiwan', jpn:'Japan', kor:'South Korea',
  chn:'China', ind:'India', deu:'Germany', fra:'France', nld:'Netherlands',
  swe:'Sweden', nor:'Norway', fin:'Finland', dnk:'Denmark', cze:'Czech Republic',
  che:'Switzerland', aut:'Austria', ita:'Italy', esp:'Spain', prt:'Portugal',
  irl:'Ireland', pol:'Poland', rus:'Russia', ukr:'Ukraine', bra:'Brazil',
  mex:'Mexico', arg:'Argentina', zaf:'South Africa', egy:'Egypt', are:'UAE',
  isr:'Israel', sau:'Saudi Arabia', tur:'Turkey', col:'Colombia', chl:'Chile',
  per:'Peru', ven:'Venezuela', ecu:'Ecuador', est:'Estonia', aze:'Azerbaijan',
  lbn:'Lebanon', geo:'Georgia', hun:'Hungary', bel:'Belgium', isl:'Iceland',
};

const rows = (res.data.rows || [])
  .map(r => ({ country: r.keys[0], clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position }))
  .filter(r => r.clicks > 0);
const totalClicks = rows.reduce((s, r) => s + r.clicks, 0);
const totalImpressions = rows.reduce((s, r) => s + r.impressions, 0);

const out = [];
out.push(`# GSC Countries — ${startDate} to ${endDate}`);
out.push('');
out.push(`**Total clicks (${DAYS}d):** ${totalClicks.toLocaleString()}`);
out.push(`**Total impressions (${DAYS}d):** ${totalImpressions.toLocaleString()}`);
out.push(`**Countries with clicks:** ${rows.length}`);
out.push('');
out.push('## Top 30 countries by clicks');
out.push('');
out.push('| Country | Clicks | Impressions | CTR | Avg Pos | % share |');
out.push('|---|---:|---:|---:|---:|---:|');
rows.sort((a, b) => b.clicks - a.clicks).slice(0, 30).forEach(r => {
  const name = NAMES[r.country] || r.country;
  const ctr = (r.ctr * 100).toFixed(2) + '%';
  const pos = r.position.toFixed(1);
  const share = ((r.clicks / totalClicks) * 100).toFixed(1) + '%';
  out.push(`| ${name} | ${r.clicks} | ${r.impressions.toLocaleString()} | ${ctr} | ${pos} | ${share} |`);
});
const find = (code) => rows.find(r => r.country === code)?.clicks || 0;
const us = find('usa');
const ca = find('can');
const eu = ['gbr','deu','fra','swe','fin','cze','nor','dnk','nld','che','aut','ita','esp','prt','pol','irl','isl','bel'].reduce((s, c) => s + find(c), 0);
const sea = ['phl','sgp','mys','tha','idn','vnm','hkg','twn','jpn','kor','aus','nzl'].reduce((s, c) => s + find(c), 0);
out.push('');
out.push('## Regional grouping');
out.push('');
out.push('| Region | Clicks | % share |');
out.push('|---|---:|---:|');
out.push(`| USA | ${us} | ${((us/totalClicks)*100).toFixed(1)}% |`);
out.push(`| Canada | ${ca} | ${((ca/totalClicks)*100).toFixed(1)}% |`);
out.push(`| EU (UK+DE+FR+SE+FI+CZ+NO+DK+NL+CH+AT+IT+ES+PT+PL+IE+IS+BE) | ${eu} | ${((eu/totalClicks)*100).toFixed(1)}% |`);
out.push(`| SEA+AU+NZ+JP | ${sea} | ${((sea/totalClicks)*100).toFixed(1)}% |`);
out.push(`| └─ Philippines | ${find('phl')} | ${((find('phl')/totalClicks)*100).toFixed(1)}% |`);
out.push(`| Top 3 (USA+CAN+UK) | ${rows.slice(0,3).reduce((s,r)=>s+r.clicks,0)} | ${((rows.slice(0,3).reduce((s,r)=>s+r.clicks,0)/totalClicks)*100).toFixed(1)}% |`);
out.push(`| Top 5 | ${rows.slice(0,5).reduce((s,r)=>s+r.clicks,0)} | ${((rows.slice(0,5).reduce((s,r)=>s+r.clicks,0)/totalClicks)*100).toFixed(1)}% |`);

mkdirSync(OUT_DIR, { recursive: true });
const today = new Date().toISOString().slice(0, 10);
const reportPath = `${OUT_DIR}/gsc-countries-${today}.md`;
writeFileSync(reportPath, out.join('\n') + '\n', 'utf-8');
console.log(`Wrote ${reportPath}`);
console.log(`Top: ${NAMES[rows[0].country]} ${rows[0].clicks} (${((rows[0].clicks/totalClicks)*100).toFixed(1)}%)`);
console.log(`Total: ${totalClicks} clicks, ${totalImpressions} impressions, ${rows.length} countries`);
