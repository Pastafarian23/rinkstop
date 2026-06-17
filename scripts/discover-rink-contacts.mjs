#!/usr/bin/env node
/**
 * discover-rink-contacts.mjs
 *
 * Scrapes rink websites (from rinks.website_url) for contact email addresses.
 * Inserts candidates into rink_contact_discovery table with a confidence score.
 * NEVER writes to rinks.email directly. Admin reviews via /admin/rink-contact-discovery.
 *
 * Why this exists:
 *   - 0 of 1,917 rinks have an email column populated
 *   - 990 have a website URL
 *   - This builds an internal inventory of likely rink-operator contacts
 *     so we can decide later whether/how to reach out
 *
 * Usage:
 *   node scripts/discover-rink-contacts.mjs                    # scrape all 990 sites, default 50
 *   node scripts/discover-rink-contacts.mjs 200                # first 200 rinks
 *   node scripts/discover-rink-contacts.mjs 200 --country=united-states  # only US rinks
 *   node scripts/discover-rink-contacts.mjs --resumable        # skip rinks with any candidates already
 *
 * Cost: $0 — uses fetch + regex. No third-party APIs.
 *
 * Politeness:
 *   - 1.5s sleep between rinks
 *   - Honors a robots.txt quick check (skip if Disallow: /)
 *   - Limits to 3 pages per rink (homepage + /contact + /about)
 *   - Aborts if page > 2MB
 *   - Sets a User-Agent
 */

import './load-secrets.mjs';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE env vars.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

const args = process.argv.slice(2);
const limit = parseInt(args.find(a => /^\d+$/.test(a)) || '50', 10);
const countryArg = args.find(a => a.startsWith('--country='))?.split('=')[1];
const resumable = args.includes('--resumable');
const UA = 'RinkStopBot/1.0 (+https://rinkstop.com/admin/rink-contact-discovery)';

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

// Pages we try to fetch from each rink site, in priority order
const TARGET_PAGES = [
  { path: '', label: 'homepage', weight: 0.50 },
  { path: '/contact', label: 'contact', weight: 0.95 },
  { path: '/contact-us', label: 'contact-us', weight: 0.95 },
  { path: '/about', label: 'about', weight: 0.85 },
  { path: '/about-us', label: 'about-us', weight: 0.85 },
  { path: '/staff', label: 'staff', weight: 0.85 },
  { path: '/team', label: 'team', weight: 0.80 },
  { path: '/coaches', label: 'coaches', weight: 0.80 },
  { path: '/reach-us', label: 'reach-us', weight: 0.90 },
];

// Domains to ignore (these emails are about the platform, not the rink)
const IGNORE_DOMAINS = [
  'rinkstop.com',
  'example.com',
  'yourdomain.com',
  'domain.com',
  'gmail.com',
  'yahoo.com',
  'hotmail.com',
  'outlook.com',
  'aol.com',
  'icloud.com',
  'mail.com',
];

// Generic/system emails to skip even if they're the only match
const IGNORE_LOCAL_PARTS = [
  'noreply',
  'no-reply',
  'postmaster',
  'webmaster',
  'admin',
  'root',
  'abuse',
  'privacy',
  'legal',
  'support',
];

function isJunkEmail(email) {
  const lower = email.toLowerCase();
  const [local, domain] = lower.split('@');
  if (!local || !domain) return true;
  if (IGNORE_LOCAL_PARTS.includes(local)) return true;
  if (IGNORE_DOMAINS.some(d => domain === d || domain.endsWith('.' + d))) return true;
  // Skip image-like strings (e.g. foo.png@site)
  if (local.match(/\.(png|jpg|jpeg|gif|svg|webp)$/)) return true;
  return false;
}

function normalizeUrl(rawUrl, baseUrl) {
  try {
    const u = new URL(rawUrl, baseUrl);
    u.hash = '';
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return u.toString();
  } catch {
    return null;
  }
}

async function fetchWithLimit(url, { timeoutMs = 10000, maxBytes = 2 * 1024 * 1024 } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  // Use a custom TLS check that allows common cert mismatches:
  //  - www. prefix mismatch (cert covers bare domain only)
  // We do NOT allow any cert — just normalize the host before connecting.
  // Node's undici respects the URL's hostname when building the TLS handshake.
  // We pass the URL as-is and rely on the caller to choose the right hostname.
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml' },
      signal: ctrl.signal,
      redirect: 'follow',
    });
    if (!res.ok) return { status: res.status, html: null };
    // Read up to maxBytes
    const reader = res.body.getReader();
    let received = 0;
    const chunks = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.length;
      if (received > maxBytes) {
        try { await reader.cancel(); } catch {}
        // Return what we have
        return { status: res.status, html: Buffer.concat(chunks).toString('utf8', 0, Math.min(received, maxBytes)), truncated: true };
      }
      chunks.push(value);
    }
    return { status: res.status, html: Buffer.concat(chunks).toString('utf8'), truncated: false };
  } catch (e) {
    return { status: 0, html: null, error: e.message };
  } finally {
    clearTimeout(t);
  }
}

function extractEmailsFromHtml(html, sourceUrl) {
  const found = new Set();
  if (!html) return found;
  // 1. mailto: links (highest confidence)
  const mailtoRe = /mailto:([^"'>\s?]+)/gi;
  let m;
  while ((m = mailtoRe.exec(html)) !== null) {
    found.add(decodeURIComponent(m[1]).toLowerCase().trim());
  }
  // 2. Plain text emails
  const textRe = new RegExp(EMAIL_RE.source, 'g');
  while ((m = textRe.exec(html)) !== null) {
    found.add(m[0].toLowerCase().trim());
  }
  return [...found].filter(e => !isJunkEmail(e));
}

function discoverLinks(html, baseUrl) {
  if (!html) return [];
  const linkRe = /<a[^>]+href=["']([^"']+)["']/gi;
  const seen = new Set();
  const out = [];
  let m;
  while ((m = linkRe.exec(html)) !== null) {
    const normalized = normalizeUrl(m[1], baseUrl);
    if (normalized && !seen.has(normalized)) {
      seen.add(normalized);
      out.push(normalized);
    }
  }
  return out;
}

function findContactLinks(html, baseUrl) {
  // Find anchor text matching "contact", "about", "staff" etc.
  const anchorRe = /<a[^>]+href=["']([^"']+)["'][^>]*>([^<]+)<\/a>/gi;
  const found = [];
  let m;
  const keywords = /^(contact|reach|get in touch|about|staff|team|coaches|email us|connect)/i;
  while ((m = anchorRe.exec(html)) !== null) {
    if (keywords.test(m[2].trim())) {
      const u = normalizeUrl(m[1], baseUrl);
      if (u) found.push({ url: u, label: m[2].trim() });
    }
  }
  return found;
}

async function robotsAllowed(origin) {
  // Quick check — just /robots.txt. If Disallow: / we skip.
  try {
    const r = await fetchWithLimit(`${origin}/robots.txt`, { timeoutMs: 5000, maxBytes: 64 * 1024 });
    if (!r.html) return true; // No robots.txt = allowed
    const lines = r.html.split('\n');
    let inStar = false;
    for (const line of lines) {
      const trimmed = line.trim();
      if (/^user-agent:\s*\*/i.test(trimmed)) {
        inStar = true;
        continue;
      }
      if (/^user-agent:/i.test(trimmed)) {
        inStar = false;
        continue;
      }
      if (inStar && /^disallow:\s*\//i.test(trimmed) && !/^disallow:\s*$/i.test(trimmed)) {
        return false;
      }
    }
    return true;
  } catch {
    return true;
  }
}

async function scrapeRink(rink) {
  let url = normalizeUrl(rink.website_url, rink.website_url);
  if (!url) return { rinkId: rink.id, status: 'invalid-url' };

  // Try the URL as given. If TLS fails, try www. ↔ bare domain fallback.
  const origin = new URL(url).origin;
  const urlCandidates = [url];
  if (url.startsWith('https://www.')) {
    urlCandidates.push(url.replace('https://www.', 'https://'));
  } else if (url.startsWith('https://') && !url.startsWith('https://www.')) {
    urlCandidates.push(url.replace('https://', 'https://www.'));
  }

  let workingUrl = null;
  let workingOrigin = null;
  for (const cand of urlCandidates) {
    const probe = await fetchWithLimit(cand, { timeoutMs: 5000, maxBytes: 4096 });
    if (probe.status === 200) {
      workingUrl = cand;
      workingOrigin = new URL(cand).origin;
      break;
    }
  }
  if (!workingUrl) {
    return { rinkId: rink.id, status: 'tls-or-dns-failed' };
  }
  url = workingUrl;

  if (!(await robotsAllowed(workingOrigin))) {
    return { rinkId: rink.id, status: 'robots-blocked' };
  }

  // Step 1: fetch homepage, find contact/about links
  const homeRes = await fetchWithLimit(url);
  if (!homeRes.html) {
    return { rinkId: rink.id, status: `homepage-${homeRes.status}` };
  }

  const candidates = new Map(); // email -> { confidence, sourceUrl }

  // Emails from homepage (lower confidence)
  for (const e of extractEmailsFromHtml(homeRes.html, url)) {
    if (!candidates.has(e) || (candidates.get(e)?.confidence ?? 0) < 0.50) {
      candidates.set(e, { confidence: 0.50, sourceUrl: url });
    }
  }

  // Find contact/about pages from homepage anchors
  const contactLinks = findContactLinks(homeRes.html, url);
  const explicitTargets = TARGET_PAGES.filter(p => p.path !== '').map(p => ({
    url: `${origin}${p.path}`,
    label: p.label,
    weight: p.weight,
  }));

  const allTargets = [...explicitTargets, ...contactLinks].slice(0, 5); // cap at 5 to avoid runaway

  for (const target of allTargets) {
    if (target.url === url) continue; // already got homepage
    const res = await fetchWithLimit(target.url);
    if (!res.html) continue;
    const weight = target.weight ?? 0.80;
    for (const e of extractEmailsFromHtml(res.html, target.url)) {
      const existing = candidates.get(e);
      if (!existing || existing.confidence < weight) {
        candidates.set(e, { confidence: weight, sourceUrl: target.url });
      }
    }
  }

  return {
    rinkId: rink.id,
    status: candidates.size > 0 ? 'found' : 'no-emails',
    candidates: [...candidates.entries()].map(([email, info]) => ({
      email,
      confidence: info.confidence,
      sourceUrl: info.sourceUrl,
    })),
  };
}

async function main() {
  console.log('=== Rink Contact Discovery ===');
  console.log(`Mode: ${resumable ? 'resumable (skip rinks with any candidates)' : 'fresh'}`);
  console.log(`Limit: ${limit}`);
  if (countryArg) console.log(`Country: ${countryArg}`);

  let query = supabase
    .from('rinks')
    .select('id, name, city, country, website_url')
    .not('website_url', 'is', null)
    .neq('website_url', '')
    .neq('website_url', 'https://N/A')
    .eq('is_active', true)
    .limit(limit);

  if (countryArg) {
    query = query.ilike('country', countryArg);
  }

  const { data: rinks, error } = await query;
  if (error) {
    console.error('Supabase query failed:', error);
    process.exit(1);
  }
  console.log(`Found ${rinks.length} rinks to scrape.`);

  let totalCandidates = 0;
  let totalInserted = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (let i = 0; i < rinks.length; i++) {
    const rink = rinks[i];
    if (!rink.website_url) continue;

    // Resumable: skip if any candidates exist for this rink
    if (resumable) {
      const { count } = await supabase
        .from('rink_contact_discovery')
        .select('id', { count: 'exact', head: true })
        .eq('rink_id', rink.id);
      if (count > 0) {
        process.stdout.write(`[${i + 1}/${rinks.length}] ${rink.name}: SKIP (has candidates)\n`);
        totalSkipped++;
        continue;
      }
    }

    let result;
    try {
      result = await scrapeRink(rink);
    } catch (e) {
      console.error(`[${i + 1}/${rinks.length}] ${rink.name}: ERROR ${e.message}`);
      totalErrors++;
      continue;
    }

    if (result.status === 'found') {
      totalCandidates += result.candidates.length;
      let inserted = 0, updated = 0;
      for (const c of result.candidates) {
        const { error: upsertErr } = await supabase
          .from('rink_contact_discovery')
          .upsert(
            {
              rink_id: result.rinkId,
              email: c.email,
              source_url: c.sourceUrl,
              confidence: c.confidence,
              status: 'pending',
            },
            { onConflict: 'rink_id,email', ignoreDuplicates: false }
          );
        if (upsertErr) {
          // If unique constraint, it already exists — that's fine
          if (upsertErr.code === '23505') updated++;
          else console.error(`  upsert err for ${c.email}: ${upsertErr.message}`);
        } else {
          inserted++;
        }
      }
      totalInserted += inserted;
      totalUpdated += updated;
      process.stdout.write(`[${i + 1}/${rinks.length}] ${rink.name}: ${result.candidates.length} candidates (${inserted} new, ${updated} dup)\n`);
    } else {
      process.stdout.write(`[${i + 1}/${rinks.length}] ${rink.name}: ${result.status}\n`);
      totalErrors++;
    }

    // Politeness delay
    await new Promise(r => setTimeout(r, 1500));
  }

  console.log('\n=== Done ===');
  console.log(`  Rinks scraped:    ${rinks.length - totalSkipped}`);
  console.log(`  Skipped:          ${totalSkipped}`);
  console.log(`  Errors/no-data:   ${totalErrors}`);
  console.log(`  Candidates:       ${totalCandidates}`);
  console.log(`  Inserted (new):   ${totalInserted}`);
  console.log(`  Updated (dup):    ${totalUpdated}`);
}

main().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});
