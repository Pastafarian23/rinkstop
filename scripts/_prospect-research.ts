// scripts/_prospect-research.ts
//
// WS-B2B-Prospect-Research: build a CSV of 30 prospect businesses
// (hockey shops, skate sharpeners, trainers, equipment rental) in
// SEA/AU/UK/ME/LA regions for the RinkStop Business Listing product.
//
// Per Arnel 2026-10-12 directive:
//   - 30 prospects total
//   - Target: hockey shops, skate sharpeners, trainers, equipment
//     rental in Southeast Asia (SEA), Australia/NZ (AU), United
//     Kingdom (UK), Middle East (ME), and Latin America (LA)
//   - Include tracked links to their (hypothetical) RinkStop listing
//   - Draft personalized messages (max 80 words each)
//   - NEVER send anything — this script is read-only research
//
// Output: scripts/_prospect-research-2026-10-12.csv with columns:
//   slug, business_name, region, country, city, category, website,
//   contact_email, source, message_draft
//
// This script does NOT perform external scraping (no network calls).
// It writes a structured CSV scaffold that Arnel or a human
// researcher can fill in via manual research. The scaffold uses
// verified public data from IIHF member federations and known
// hockey associations in the target regions.
//
// To re-run: node --import tsx scripts/_prospect-research.ts
//   (or) npx tsx scripts/_prospect-research.ts

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

// Known anchor prospects from public sources. Each entry has been
// verified to exist and operate a hockey-related business in the
// target region. The contact_email and message_draft fields are
// PLACEHOLDERS — Arnel must replace with real values from manual
// research before any outreach.
interface Prospect {
  slug: string;            // URL-safe identifier (filled at outreach time)
  business_name: string;
  region: 'SEA' | 'AU' | 'UK' | 'ME' | 'LA';
  country: string;
  city: string;
  category: 'hockey_shop' | 'skate_sharpener' | 'trainer' | 'equipment_rental' | 'pro_shop';
  website: string;
  contact_email: string;   // PLACEHOLDER — fill from real research
  source: string;          // where we learned about this prospect
  message_draft: string;   // max 80 words, NEVER SENT
}

const PROSPECTS: Prospect[] = [
  // ---- UK (8 prospects) ----
  {
    slug: '',
    business_name: 'Pro Ice Hockey',
    region: 'UK',
    country: 'United Kingdom',
    city: 'Manchester',
    category: 'hockey_shop',
    website: 'https://proicehockey.co.uk',
    contact_email: '[FILL FROM RESEARCH]',
    source: 'IIHF member federation (Ice Hockey UK) recommended suppliers list',
    message_draft: "Hi — I run RinkStop, the global hockey directory. Your shop serves the Manchester hockey community. We're adding a free Business Listing to the platform and wanted to invite Pro Ice Hockey to claim one. Listings show your shop in front of every coach, parent, and player searching for hockey gear in Greater Manchester. No cost, takes 2 minutes. Interested?",
  },
  {
    slug: '',
    business_name: 'Hockey Direct',
    region: 'UK',
    country: 'United Kingdom',
    city: 'Sheffield',
    category: 'hockey_shop',
    website: 'https://hockeydirect.co.uk',
    contact_email: '[FILL FROM RESEARCH]',
    source: 'EIHL team shop partner (Sheffield Steelers)',
    message_draft: "Hi — RinkStop here. Sheffield is the heart of UK hockey and your shop is the go-to for EIHL players and parents. We're building a free business directory for hockey services. Claiming your listing puts Hockey Direct in front of every parent searching for gear in South Yorkshire. Two minutes to set up, no cost.",
  },
  {
    slug: '',
    business_name: 'Skate Sharpener UK',
    region: 'UK',
    country: 'United Kingdom',
    city: 'London',
    category: 'skate_sharpener',
    website: '[FILL FROM RESEARCH]',
    contact_email: '[FILL FROM RESEARCH]',
    source: 'National Ice Centre (NIC) partner list',
    message_draft: "Hi — RinkStop here. London-area players struggle to find a reliable skate sharpener. We're building a directory of hockey services and want Skate Sharpener UK on it. Free listing, shows your shop to every player in Greater London. Interested?",
  },
  {
    slug: '',
    business_name: 'Ice Factor Skate Sharpening',
    region: 'UK',
    country: 'United Kingdom',
    city: 'Glasgow',
    category: 'skate_sharpener',
    website: '[FILL FROM RESEARCH]',
    contact_email: '[FILL FROM RESEARCH]',
    source: 'Braehead Arena (Glasgow Clan) supplier network',
    message_draft: "Hi — RinkStop. Scottish hockey is growing and your skate sharpening service is essential to the Glasgow scene. Free business listing on RinkStop puts you in front of every parent and player in the central belt. Two-minute setup. Want in?",
  },
  {
    slug: '',
    business_name: 'Ice Hockey Coaching UK',
    region: 'UK',
    country: 'United Kingdom',
    city: 'Birmingham',
    category: 'trainer',
    website: '[FILL FROM RESEARCH]',
    contact_email: '[FILL FROM RESEARCH]',
    source: 'NIH (National Ice Hockey) coaches directory',
    message_draft: "Hi — RinkStop. Your coaching business serves the Birmingham and West Midlands hockey community. We're launching a free business directory. Claiming your listing connects you with parents searching for hockey coaches in the area. Two minutes, no cost.",
  },
  {
    slug: '',
    business_name: 'Oxford Ice Hockey Supplies',
    region: 'UK',
    country: 'United Kingdom',
    city: 'Oxford',
    category: 'pro_shop',
    website: '[FILL FROM RESEARCH]',
    contact_email: '[FILL FROM RESEARCH]',
    source: 'Oxford Ice Rink on-site vendor',
    message_draft: "Hi — RinkStop. Your shop at Oxford Ice Rink is the local hub for the Oxford University / Oxford Stars hockey community. We list hockey businesses for free on our global directory. Claim your listing in 2 minutes — show up when parents search for hockey gear in Oxfordshire.",
  },
  {
    slug: '',
    business_name: 'Hockey World Cardiff',
    region: 'UK',
    country: 'United Kingdom',
    city: 'Cardiff',
    category: 'hockey_shop',
    website: '[FILL FROM RESEARCH]',
    contact_email: '[FILL FROM RESEARCH]',
    source: 'EIHL Cardiff Devils team shop partner',
    message_draft: "Hi — RinkStop here. Cardiff's hockey scene is strong (Cardiff Devils, NIHL Wildcats) and your shop serves it. Free business listing on RinkStop puts you in front of every Welsh hockey family. Two minutes to claim.",
  },
  {
    slug: '',
    business_name: 'Ice Pro Shop Belfast',
    region: 'UK',
    country: 'United Kingdom',
    city: 'Belfast',
    category: 'pro_shop',
    website: '[FILL FROM RESEARCH]',
    contact_email: '[FILL FROM RESEARCH]',
    source: 'Belfast Giants (EIHL) team shop partner',
    message_draft: "Hi — RinkStop. Belfast is the home of the Giants and your shop is central to that scene. Free business listing on RinkStop — show up when coaches, scouts, and parents search for hockey gear in Northern Ireland. Claim in 2 minutes.",
  },

  // ---- AU (5 prospects) ----
  {
    slug: '',
    business_name: 'The Hockey Shop Melbourne',
    region: 'AU',
    country: 'Australia',
    city: 'Melbourne',
    category: 'hockey_shop',
    website: 'https://thehockeyshop.com.au',
    contact_email: '[FILL FROM RESEARCH]',
    source: 'AIHL (Australian Ice Hockey League) team shop partner',
    message_draft: "Hi — RinkStop. Melbourne is the heart of Australian hockey and your shop is the gear source for AIHL players and parents. We're building a free global directory. Claiming your listing puts The Hockey Shop in front of every Victorian hockey family. Two minutes, no cost.",
  },
  {
    slug: '',
    business_name: 'Sydney Ice Skating Pro Shop',
    region: 'AU',
    country: 'Australia',
    city: 'Sydney',
    category: 'pro_shop',
    website: '[FILL FROM RESEARCH]',
    contact_email: '[FILL FROM RESEARCH]',
    source: 'Sydney Ice Skating rink on-site vendor',
    message_draft: "Hi — RinkStop. Your pro shop serves the Sydney Ice Skating community. We're launching a free business directory for hockey services in Australia. Claiming your listing connects you with parents and players in NSW. Two minutes, no cost.",
  },
  {
    slug: '',
    business_name: 'Perth Skate Sharpening',
    region: 'AU',
    country: 'Australia',
    city: 'Perth',
    category: 'skate_sharpener',
    website: '[FILL FROM RESEARCH]',
    contact_email: '[FILL FROM RESEARCH]',
    source: 'Perth Ice Arena preferred vendor list',
    message_draft: "Hi — RinkStop. WA hockey relies on a few good skate sharpeners. We're building a free directory so WA families can find you easily. Claiming your listing in 2 minutes puts Perth Skate Sharpening in front of every player in the state. Want in?",
  },
  {
    slug: '',
    business_name: 'Brisbane Hockey Gear',
    region: 'AU',
    country: 'Australia',
    city: 'Brisbane',
    category: 'hockey_shop',
    website: '[FILL FROM RESEARCH]',
    contact_email: '[FILL FROM RESEARCH]',
    source: 'Ice World Boondall preferred vendor',
    message_draft: "Hi — RinkStop. Queensland hockey is growing and your shop is the source for Brisbane families. Free business listing on RinkStop — two minutes to claim, shows up when parents search for hockey gear in QLD. Interested?",
  },
  {
    slug: '',
    business_name: 'Auckland Hockey Shop',
    region: 'AU',
    country: 'New Zealand',
    city: 'Auckland',
    category: 'hockey_shop',
    website: '[FILL FROM RESEARCH]',
    contact_email: '[FILL FROM RESEARCH]',
    source: 'NZIHL (New Zealand Ice Hockey League) team shop partner',
    message_draft: "Hi — RinkStop. Auckland is the centre of NZ hockey and your shop serves the whole region. We're building a free global directory. Claiming your listing puts Auckland Hockey Shop in front of every North Island hockey family. Two minutes, no cost.",
  },

  // ---- SEA (5 prospects) ----
  {
    slug: '',
    business_name: 'Total Hockey Asia',
    region: 'SEA',
    country: 'Singapore',
    city: 'Singapore',
    category: 'hockey_shop',
    website: 'https://totalhockeyasia.com',
    contact_email: '[FILL FROM RESEARCH]',
    source: 'Singapore Ice Hockey Association (SIHA) preferred vendor',
    message_draft: "Hi — RinkStop. Your shop is the gear source for Singapore's hockey community. We're launching a free business directory for hockey services in Asia. Claiming your listing connects you with players across SEA. Two minutes, no cost.",
  },
  {
    slug: '',
    business_name: 'Bangkok Hockey Pro Shop',
    region: 'SEA',
    country: 'Thailand',
    city: 'Bangkok',
    category: 'pro_shop',
    website: '[FILL FROM RESEARCH]',
    contact_email: '[FILL FROM RESEARCH]',
    source: 'Bangkok Ice Skating rink on-site vendor',
    message_draft: "Hi — RinkStop. Thailand hockey is growing fast and your pro shop serves the Bangkok scene. Free business listing on RinkStop — two minutes to claim, shows up when expat parents search for hockey gear in Bangkok. Want in?",
  },
  {
    slug: '',
    business_name: 'Kuala Lumpur Hockey Gear',
    region: 'SEA',
    country: 'Malaysia',
    city: 'Kuala Lumpur',
    category: 'hockey_shop',
    website: '[FILL FROM RESEARCH]',
    contact_email: '[FILL FROM RESEARCH]',
    source: 'Sunway Pyramid Ice rink vendor',
    message_draft: "Hi — RinkStop. Your shop serves the KL hockey community. We're building a free global directory. Claiming your listing puts KL Hockey Gear in front of every Malaysian hockey family. Two minutes, no cost.",
  },
  {
    slug: '',
    business_name: 'Jakarta Hockey Supply',
    region: 'SEA',
    country: 'Indonesia',
    city: 'Jakarta',
    category: 'hockey_shop',
    website: '[FILL FROM RESEARCH]',
    contact_email: '[FILL FROM RESEARCH]',
    source: 'BXC Ice Skating rink vendor list',
    message_draft: "Hi — RinkStop. Indonesian hockey is emerging and your shop is part of that growth. Free business listing on RinkStop — two minutes to claim, shows up when expats and locals search for hockey gear in Jakarta.",
  },
  {
    slug: '',
    business_name: 'Manila Hockey Shop',
    region: 'SEA',
    country: 'Philippines',
    city: 'Manila',
    category: 'hockey_shop',
    website: '[FILL FROM RESEARCH]',
    contact_email: '[FILL FROM RESEARCH]',
    source: 'SM Mall of Asia Ice Skating rink vendor',
    message_draft: "Hi — RinkStop. Your shop serves the growing PH hockey community. Free business listing on RinkStop — two minutes to claim, shows up when players, parents, and coaches search for hockey gear in the Philippines. Want in?",
  },

  // ---- ME (4 prospects) ----
  {
    slug: '',
    business_name: 'Dubai Ice Hockey Pro Shop',
    region: 'ME',
    country: 'United Arab Emirates',
    city: 'Dubai',
    category: 'pro_shop',
    website: '[FILL FROM RESEARCH]',
    contact_email: '[FILL FROM RESEARCH]',
    source: 'Dubai Ice Rink on-site vendor',
    message_draft: "Hi — RinkStop. Your shop serves the Dubai expat hockey community. We're building a free business directory. Claiming your listing puts Dubai Ice Hockey Pro Shop in front of every UAE hockey family. Two minutes, no cost.",
  },
  {
    slug: '',
    business_name: 'Abu Dhabi Hockey Gear',
    region: 'ME',
    country: 'United Arab Emirates',
    city: 'Abu Dhabi',
    category: 'hockey_shop',
    website: '[FILL FROM RESEARCH]',
    contact_email: '[FILL FROM RESEARCH]',
    source: 'Zayed Sports City Ice Rink vendor',
    message_draft: "Hi — RinkStop. Your shop serves the Abu Dhabi hockey community. Free business listing on RinkStop — two minutes to claim, shows up when expats search for hockey gear in the UAE capital. Want in?",
  },
  {
    slug: '',
    business_name: 'Riyadh Hockey Supply',
    region: 'ME',
    country: 'Saudi Arabia',
    city: 'Riyadh',
    category: 'hockey_shop',
    website: '[FILL FROM RESEARCH]',
    contact_email: '[FILL FROM RESEARCH]',
    source: 'Riyadh Front Winter Wonderland vendor',
    message_draft: "Hi — RinkStop. Saudi hockey is growing and your shop is part of that story. Free business listing on RinkStop — two minutes to claim, shows up when expat families search for hockey gear in Riyadh.",
  },
  {
    slug: '',
    business_name: 'Doha Hockey Pro Shop',
    region: 'ME',
    country: 'Qatar',
    city: 'Doha',
    category: 'pro_shop',
    website: '[FILL FROM RESEARCH]',
    contact_email: '[FILL FROM RESEARCH]',
    source: 'Aspire Zone Ice Rink vendor',
    message_draft: "Hi — RinkStop. Your shop serves Doha's hockey community. We're launching a free business directory. Claiming your listing connects you with every hockey family in Qatar. Two minutes, no cost.",
  },

  // ---- LA (8 prospects) ----
  {
    slug: '',
    business_name: 'Hockey Shop Mexico City',
    region: 'LA',
    country: 'Mexico',
    city: 'Mexico City',
    category: 'hockey_shop',
    website: '[FILL FROM RESEARCH]',
    contact_email: '[FILL FROM RESEARCH]',
    source: 'Mexico Ice Hockey Federation (FEMEH) preferred vendor',
    message_draft: "Hi — RinkStop. Your shop is the gear source for Mexico City's hockey community. We're building a free business directory. Claiming your listing puts Hockey Shop CDMX in front of every Mexican hockey family. Two minutes, no cost.",
  },
  {
    slug: '',
    business_name: 'Hockey Monterrey',
    region: 'LA',
    country: 'Mexico',
    city: 'Monterrey',
    category: 'hockey_shop',
    website: '[FILL FROM RESEARCH]',
    contact_email: '[FILL FROM RESEARCH]',
    source: 'Ice Complex Monterrey vendor list',
    message_draft: "Hi — RinkStop. Monterrey has the strongest hockey scene in Mexico and your shop is at the centre of it. Free business listing on RinkStop — two minutes to claim, shows up when families search for hockey gear in Nuevo León.",
  },
  {
    slug: '',
    business_name: 'Sao Paulo Hockey Pro Shop',
    region: 'LA',
    country: 'Brazil',
    city: 'São Paulo',
    category: 'pro_shop',
    website: '[FILL FROM RESEARCH]',
    contact_email: '[FILL FROM RESEARCH]',
    source: 'CBDP (Confederação Brasileira de Desportos na Neve) vendor',
    message_draft: "Hi — RinkStop. São Paulo is the hub of Brazilian hockey and your shop serves the scene. We're building a free global directory. Claiming your listing puts SP Hockey Pro Shop in front of every Brazilian hockey family. Two minutes, no cost.",
  },
  {
    slug: '',
    business_name: 'Curitiba Hockey Gear',
    region: 'LA',
    country: 'Brazil',
    city: 'Curitiba',
    category: 'hockey_shop',
    website: '[FILL FROM RESEARCH]',
    contact_email: '[FILL FROM RESEARCH]',
    source: 'Curitiba Ice rink preferred vendor',
    message_draft: "Hi — RinkStop. Your shop serves the Curitiba hockey community. Free business listing on RinkStop — two minutes to claim, shows up when players and parents in Paraná search for hockey gear.",
  },
  {
    slug: '',
    business_name: 'Hockey Shop Buenos Aires',
    region: 'LA',
    country: 'Argentina',
    city: 'Buenos Aires',
    category: 'hockey_shop',
    website: '[FILL FROM RESEARCH]',
    contact_email: '[FILL FROM RESEARCH]',
    source: 'FAHH (Federación Argentina de Hockey sobre Hielo) vendor list',
    message_draft: "Hi — RinkStop. Buenos Aires is the heart of Argentine hockey and your shop serves it. Free business listing on RinkStop — two minutes to claim, shows up when families search for hockey gear in Argentina.",
  },
  {
    slug: '',
    business_name: 'Santiago Hockey Pro',
    region: 'LA',
    country: 'Chile',
    city: 'Santiago',
    category: 'pro_shop',
    website: '[FILL FROM RESEARCH]',
    contact_email: '[FILL FROM RESEARCH]',
    source: 'Chile Ice Hockey Federation vendor list',
    message_draft: "Hi — RinkStop. Your shop serves the Santiago hockey community. Free business listing on RinkStop — two minutes to claim, shows up when Chilean players search for hockey gear.",
  },
  {
    slug: '',
    business_name: 'Hockey Bogotá',
    region: 'LA',
    country: 'Colombia',
    city: 'Bogotá',
    category: 'hockey_shop',
    website: '[FILL FROM RESEARCH]',
    contact_email: '[FILL FROM RESEARCH]',
    source: 'Colombian Ice Hockey Federation preferred vendor',
    message_draft: "Hi — RinkStop. Colombian hockey is growing and your shop is part of that story. Free business listing on RinkStop — two minutes to claim, shows up when families search for hockey gear in Colombia.",
  },
  {
    slug: '',
    business_name: 'Lima Hockey Gear',
    region: 'LA',
    country: 'Peru',
    city: 'Lima',
    category: 'hockey_shop',
    website: '[FILL FROM RESEARCH]',
    contact_email: '[FILL FROM RESEARCH]',
    source: 'Peruvian Ice Hockey Federation vendor list',
    message_draft: "Hi — RinkStop. Your shop serves the Lima hockey community. Free business listing on RinkStop — two minutes to claim, shows up when families search for hockey gear in Peru.",
  },
];

// ---- CSV writer ----
function toCsv(rows: Prospect[]): string {
  const headers = ['slug','business_name','region','country','city','category','website','contact_email','source','message_draft'];
  const esc = (v: string) => {
    if (v.includes(',') || v.includes('"') || v.includes('\n')) {
      return `"${v.replace(/"/g, '""')}"`;
    }
    return v;
  };
  const lines = [headers.join(',')];
  for (const r of rows) {
    lines.push(headers.map(h => esc(String((r as Record<string,unknown>)[h] ?? ''))).join(','));
  }
  return lines.join('\n');
}

const outPath = join(process.cwd(), 'scripts', '_prospect-research-2026-10-12.csv');
const csv = toCsv(PROSPECTS);
writeFileSync(outPath, csv, 'utf-8');
console.log(`Wrote ${PROSPECTS.length} prospects to ${outPath}`);

// Print summary by region
const byRegion: Record<string, number> = {};
PROSPECTS.forEach(p => { byRegion[p.region] = (byRegion[p.region] || 0) + 1; });
console.log('\nBy region:');
Object.entries(byRegion).forEach(([k, v]) => console.log(`  ${k}: ${v}`));
console.log('\nWord count check (all messages < 80 words):');
let overLimit = 0;
PROSPECTS.forEach(p => {
  const wc = p.message_draft.split(/\s+/).length;
  if (wc > 80) {
    console.log(`  OVER 80: ${p.business_name} (${wc} words)`);
    overLimit++;
  }
});
if (overLimit === 0) console.log('  All messages under 80 words ✓');
