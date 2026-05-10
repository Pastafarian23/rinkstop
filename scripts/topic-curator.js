#!/usr/bin/env node
/**
 * topic-curator.js — Fetch top topics from RSS feeds across all projects
 * 
 * Usage: 
 *   node topic-curator.js              # Show all topics, pick interactively
 *   node topic-curator.js --project sativaexchange   # Filter by project
 *   node topic-curator.js --limit 5    # Show top N per project
 *   node topic-curator.js --save       # Save selections to topics file
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const TODAY = new Date().toISOString().split('T')[0];
const WORKSPACE = '/root/.openclaw/workspace';

// ============================================================
// FEED DEFINITIONS (from our pipeline RSS files)
// ============================================================

const FEEDS = {
  sativaexchange: {
    Crypto: [
      'https://www.coindesk.com/arc/outboundfeeds/rss/',
      'https://cointelegraph.com/rss',
    ],
    GreenTech: [
      'https://cleantechnica.com/feed/',
      'https://electrek.co/feed/',
    ],
    Energy: [
      'https://oilprice.com/rss/main',
    ],
    Finance: [
      'https://www.marketwatch.com/rss/topstories',
    ],
    Agriculture: [
      'https://www.agweb.com/rss',
    ],
    Cannabis: [
      'https://www.leafly.com/news/feed',
    ]
  },
  rinkstop: {
    ProHockey: [
      'https://news.google.com/rss/search?q=NHL+hockey&hl=en-US&gl=US&ceid=US:en',
      'https://news.google.com/rss/search?q=IIHF+hockey+championship&hl=en-US&gl=US&ceid=US:en',
    ],
    Coaching: [
      'https://news.google.com/rss/search?q=youth+hockey+coaching+tips&hl=en-US&gl=US&ceid=US:en',
      'https://news.google.com/rss/search?q=hockey+drills+training+practice&hl=en-US&gl=US&ceid=US:en',
    ],
    LocalScenes: [
      'https://news.google.com/rss/search?q=Philippines+ice+hockey&hl=en-US&gl=US&ceid=US:en',
      'https://news.google.com/rss/search?q=Canada+hockey+junior+nationals&hl=en-US&gl=US&ceid=US:en',
      'https://news.google.com/rss/search?q=USA+hockey+national+team+development&hl=en-US&gl=US&ceid=US:en',
      'https://news.google.com/rss/search?q=Southeast+Asia+hockey+growing&hl=en-US&gl=US&ceid=US:en',
    ],
    Industry: [
      'https://news.google.com/rss/search?q=hockey+business+revenue+NHL&hl=en-US&gl=US&ceid=US:en',
      'https://news.google.com/rss/search?q=hockey+technology+analytics+AI&hl=en-US&gl=US&ceid=US:en',
    ],
  },
  topshelftoker: {
    Industry: [
      'https://www.leafly.com/news/feed',
      'https://www.marijuanamoment.net/feed/',
    ],
    Culture: [
      'https://hightimes.com/feed',
      'https://merryjane.com/feed',
    ],
    Design: [
      'https://www.printful.com/blog/rss',
    ],
    Business: [
      'https://www.shopify.com/blog/rss',
    ]
  }
};

// ============================================================
// ARGUMENT PARSING
// ============================================================

const args = process.argv.slice(2);
const PROJECT_FILTER = (() => {
  const p = args.find(a => a.startsWith('--project='));
  return p ? p.split('=')[1] : null;
})();
const LIMIT = parseInt((() => {
  const l = args.find(a => a.startsWith('--limit='));
  return l ? l.split('=')[1] : 5;
})()) || 5;
const SAVE_MODE = args.includes('--save');

// ============================================================
// RSS FETCHER (no external deps — plain HTTP + regex parsing)
// ============================================================

function fetchRSS(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const timeout = setTimeout(() => {
      reject(new Error('timeout'));
    }, 10000);

    lib.get(url, (res) => {
      clearTimeout(timeout);
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function parseRSS(xml) {
  const items = [];
  // Parse RSS items using regex — lightweight, no deps needed
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const item = match[1];
    const titleMatch = item.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const linkMatch = item.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
    const descMatch = item.match(/<description[^>]*>([\s\S]*?)<\/description>/i);
    const pubDateMatch = item.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i);

    if (titleMatch) {
      let title = titleMatch[1]
        .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .trim();

      let link = linkMatch ? linkMatch[1].trim() : '';
      let description = descMatch ? descMatch[1]
        .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
        .replace(/<[^>]*>/g, '')
        .substring(0, 200)
        .trim() : '';

      let pubDate = pubDateMatch ? pubDateMatch[1].trim() : '';

      // Skip duplicate/garbage titles
      if (title.length > 5 && title.length < 200) {
        items.push({ title, link, description, pubDate });
      }
    }
  }

  return items;
}

// ============================================================
// MAIN EXECUTION
// ============================================================

async function runCurator() {
  console.log('\n📰 TOPIC CURATOR — Fetching today\'s headlines\n');

  const projectKeys = PROJECT_FILTER
    ? [PROJECT_FILTER]
    : Object.keys(FEEDS);

  let allTopics = [];

  for (const projectKey of projectKeys) {
    const categories = FEEDS[projectKey];
    console.log(`\n📂 ${projectKey.toUpperCase()}`);
    console.log('─'.repeat(50));

    for (const [category, urls] of Object.entries(categories)) {
      let items = [];
      for (const feedUrl of urls) {
        try {
          const xml = await fetchRSS(feedUrl);
          const parsed = parseRSS(xml);
          items.push(...parsed);
        } catch (e) {
          // Silently skip failed feeds
        }
      }

      // Deduplicate by title
      const seen = new Set();
      items = items.filter(i => {
        if (seen.has(i.title)) return false;
        seen.add(i.title);
        return true;
      });

      // Sort by date if available, take latest
      items = items.slice(0, LIMIT);

      if (items.length > 0) {
        console.log(`\n  📋 ${category} (${items.length} items):`);
        for (const item of items) {
          const id = allTopics.length + 1;
          allTopics.push({
            id,
            project: projectKey,
            category,
            title: item.title,
            link: item.link,
            description: item.description
          });
          console.log(`    ${String(id).padStart(3)}. ${item.title}`);
          console.log(`       ${item.link}`);
        }
      } else {
        console.log(`  ⚠️  ${category}: no items fetched`);
      }
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(50));
  console.log(`📊 Found ${allTopics.length} topics across ${projectKeys.length} project(s)`);

  if (SAVE_MODE && allTopics.length > 0) {
    // Save all to a file for reference
    const outPath = path.join(WORKSPACE, 'drafts', `topic-curation-${TODAY}.json`);
    fs.writeFileSync(outPath, JSON.stringify(allTopics, null, 2));
    console.log(`💾 Saved to: ${outPath}`);

    // Also save a simple text version for quick review
    const textPath = path.join(WORKSPACE, 'drafts', `topic-curation-${TODAY}.txt`);
    let textOut = `# Topic Curation — ${TODAY}\n\n`;
    let currentProject = '';
    for (const t of allTopics) {
      if (t.project !== currentProject) {
        currentProject = t.project;
        textOut += `\n## ${currentProject.toUpperCase()}\n\n`;
      }
      textOut += `${t.id}. [${t.category}] ${t.title}\n   ${t.link}\n\n`;
    }
    fs.writeFileSync(textPath, textOut);
    console.log(`📝 Text version: ${textPath}`);
  }

  console.log('\n💡 To generate drafts from these topics:');
  console.log('   Edit the topic-curation file to mark which ones to use');
  console.log('   Then run: node scripts/daily-content-gen.js --from-topics');
  console.log('');

  return allTopics;
}

runCurator().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});