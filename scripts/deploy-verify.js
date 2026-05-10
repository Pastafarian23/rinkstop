#!/usr/bin/env node
/**
 * deploy-verify.js — Pre-deployment checklist for RinkStop blog
 * Run this AFTER deploying to Vercel to verify everything connects.
 */

const https = require('https');

const SITE_URL = process.env.SITE_URL || 'https://rinkstop.com';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const API_SECRET = process.env.API_SECRET || '';

console.log('\n=== RinkStop Deploy Verification ===\n');

// Test 1: Frontend is live
console.log('Test 1: Frontend reachable...');
https.get(SITE_URL, (res) => {
  console.log(`  Frontend: ${res.statusCode === 200 ? '✅ LIVE' : '❌ ' + res.statusCode}`);

  // Test 2: API works
  https.get(`${SITE_URL}/api/blog/posts?status=published&limit=5`, (apiRes) => {
    let body = '';
    apiRes.on('data', (c) => body += c);
    apiRes.on('end', () => {
      console.log(`  Blog API: ${apiRes.statusCode === 200 ? '✅ OK' : '❌ ' + apiRes.statusCode}`);

      // Test 3: Supabase direct
      https.get(`${SUPABASE_URL}/rest/v1/posts?status=eq.published&limit=1`, {
        headers: { 'apikey': API_SECRET, 'Authorization': 'Bearer ' + API_SECRET }
      }, (supaRes) => {
        console.log(`  Supabase: ${supaRes.statusCode === 200 ? '✅ Connected' : '❌ ' + supaRes.statusCode}`);

        let supaBody = '';
        supaRes.on('data', (c) => supaBody += c);
        supaRes.on('end', () => {
          try {
            const data = JSON.parse(supaBody);
            console.log(`  Posts: ${Array.isArray(data) ? data.length : 0} published`);
          } catch { console.log('  Posts: ⚠️ Could not parse response'); }

          console.log('\n=== Ready to approve posts ===');
          console.log('Run: node scripts/approve-post.js rinkstop <draft> --blog --publish\n');
        });
      }).on('error', (e) => {
        console.log(`  Supabase: ❌ ${e.message}`);
      });
    });
  }).on('error', (e) => {
    console.log(`  Blog API: ❌ ${e.message}`);
  });
}).on('error', (e) => {
  console.log(`  Frontend: ❌ ${e.message}`);
});