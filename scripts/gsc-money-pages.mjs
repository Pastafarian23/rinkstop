#!/usr/bin/env node
/**
 * Query the live Google Search Console API for the RinkStop money pages:
 * impressions, clicks, CTR, position, and the actual search queries each page
 * surfaces for.
 *
 * Usage: node scripts/gsc-money-pages.mjs [days] [--page=/dataset-license]
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import os from 'node:os';

const SITE = 'sc-domain:rinkstop.com';
const CREDS = '/root/.openclaw/credentials/gsc.json';

function b64url(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function getToken(creds) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })));
  const claims = b64url(
    Buffer.from(
      JSON.stringify({
        iss: creds.client_email,
        scope: 'https://www.googleapis.com/auth/webmasters.readonly',
        aud: creds.token_uri,
        iat: now,
        exp: now + 3600,
      }),
    ),
  );
  const sig = crypto.sign('RSA-SHA256', Buffer.from(`${header}.${claims}`), creds.private_key);
  return { header, claims, sig: b64url(sig) };
}

function sign(creds) {
  const { header, claims, sig } = getToken(creds);
  return `${header}.${claims}.${sig}`;
}

async function accessToken(creds) {
  const assertion = sign(creds);
  const res = await fetch(creds.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  const j = await res.json();
  if (!j.access_token) throw new Error(`token error: ${JSON.stringify(j).slice(0, 200)}`);
  return j.access_token;
}

const days = Number(process.argv[2]) || 90;
const pageArg = process.argv.find((a) => a.startsWith('--page='));
const focusPage = pageArg ? pageArg.split('=')[1] : null;

const creds = JSON.parse(fs.readFileSync(CREDS, 'utf8'));
const token = await accessToken(creds);

async function gsc(body) {
  const res = await fetch(
    `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE)}/searchAnalytics/query`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );
  const j = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(j).slice(0, 300));
  return j.rows || [];
}

const endDate = new Date();
const startDate = new Date(Date.now() - days * 86400000);
const fmt = (d) => d.toISOString().slice(0, 10);

console.log(`=== GSC ${fmt(startDate)} → ${fmt(endDate)} (${days}d) ===\n`);

console.log('--- MONEY PAGES: clicks / impressions / CTR / position ---');
const pages = await gsc({
  startDate: fmt(startDate),
  endDate: fmt(endDate),
  dimensions: ['page'],
  dimensionFilterGroups: [
    {
      filters: [
        { dimension: 'page', operator: 'contains', expression: 'dataset-license' },
        { dimension: 'page', operator: 'contains', expression: 'hockey-database' },
        { dimension: 'page', operator: 'contains', expression: 'pricing' },
        { dimension: 'page', operator: 'contains', expression: 'advertise' },
        { dimension: 'page', operator: 'contains', expression: 'partner-with-us' },
        { dimension: 'page', operator: 'contains', expression: 'add-listing' },
      ],
    },
  ],
});
pages
  .sort((a, b) => b.impressions - a.impressions)
  .forEach((r) => {
    const ctr = r.impressions ? ((r.clicks / r.impressions) * 100).toFixed(1) : '0.0';
    console.log(
      `  ${r.keys[0].replace('https://rinkstop.com', '').padEnd(24)} impr=${String(r.impressions).padStart(5)} clicks=${String(r.clicks).padStart(4)} CTR=${ctr.padStart(5)}% pos=${r.position.toFixed(1)}`,
    );
  });

if (focusPage) {
  console.log(`\n--- QUERIES for ${focusPage} ---`);
  const q = await gsc({
    startDate: fmt(startDate),
    endDate: fmt(endDate),
    dimensions: ['query'],
    dimensionFilterGroups: [
      { filters: [{ dimension: 'page', operator: 'contains', expression: focusPage }] },
    ],
    rowLimit: 50,
  });
  if (!q.length) {
    console.log('  (no query rows — the page is not being surfaced for any meaningful term)');
  } else {
    q
      .sort((a, b) => b.impressions - a.impressions)
      .forEach((r) => {
        const ctr = r.impressions ? ((r.clicks / r.impressions) * 100).toFixed(1) : '0.0';
        console.log(
          `  "${r.keys[0]}"`.padEnd(56) + `impr=${String(r.impressions).padStart(4)} clicks=${String(r.clicks).padStart(3)} CTR=${ctr.padStart(5)}% pos=${r.position.toFixed(1)}`,
        );
      });
  }
}

console.log('\n--- SITE-WIDE top queries (for positioning context) ---');
const topQ = await gsc({
  startDate: fmt(startDate),
  endDate: fmt(endDate),
  dimensions: ['query'],
  rowLimit: 25,
});
topQ
  .sort((a, b) => b.impressions - a.impressions)
  .forEach((r) => {
    const ctr = r.impressions ? ((r.clicks / r.impressions) * 100).toFixed(1) : '0.0';
    console.log(
      `  "${r.keys[0]}`.padEnd(48) + `impr=${String(r.impressions).padStart(5)} clicks=${String(r.clicks).padStart(4)} CTR=${ctr.padStart(5)}% pos=${r.position.toFixed(1)}`,
    );
  });
