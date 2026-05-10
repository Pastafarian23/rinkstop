#!/usr/local/bin/node
/**
 * daily-content-gen.js — Automated Content Pipeline Runner
 * 
 * Runs daily at 7:00 AM Manila via cron.
 * Scans RSS feeds, generates drafts using the pipeline, saves to drafts/
 * 
 * Usage: node daily-content-gen.js [--dry-run] [--project sativaexchange|rinkstop|topshelftoker]
 */

const fs = require('fs');
const path = require('path');

const TODAY = new Date().toISOString().split('T')[0];
const WORKSPACE = '/root/.openclaw/workspace';
const DRAFTS_DIR = path.join(WORKSPACE, 'drafts');
const APPROVED_DIR = path.join(WORKSPACE, 'approved');

// Parse args
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const PROJECT_FILTER = args.find(a => a.startsWith('--project='))?.split('=')[1];

console.log(`\n📰 Daily Content Generator — ${TODAY}`);
if (DRY_RUN) console.log('🔍 DRY RUN — no files will be written');
if (PROJECT_FILTER) console.log(`🎯 Filter: ${PROJECT_FILTER}`);
console.log('');

// ============================================================
// PROJECT CONFIGURATIONS
// ============================================================

const PROJECTS = {
  sativaexchange: {
    name: 'SativaExchange',
    pipelineDir: path.join(WORKSPACE, 'content-pipeline'),
    draftDir: path.join(DRAFTS_DIR, 'sativaexchange'),
    approvedDir: path.join(APPROVED_DIR, 'sativaexchange'),
    approvedSubdirs: ['Blog Posts', 'Social Media'],
    content: {
      blog: {
        label: 'Blog Post',
        filename: (i) => `${TODAY}-sativa-blog-${i}.md`,
        template: 'Template 1 — Blog from RSS',
        targetDir: 'Blog Posts'
      },
      social: {
        label: 'Social Post',
        filename: (i) => `${TODAY}-sativa-social-${i}.md`,
        template: 'Template 2 — Social Post',
        targetDir: 'Social Media'
      }
    },
    targets: {
      blog: 1,   // 1 blog post
      social: 3  // 3 social posts
    }
  },
  rinkstop: {
    name: 'RinkStop',
    pipelineDir: path.join(WORKSPACE, 'content-pipeline', 'rinkstop'),
    draftDir: path.join(DRAFTS_DIR, 'rinkstop'),
    approvedDir: path.join(APPROVED_DIR, 'rinkstop'),
    approvedSubdirs: ['Blog Posts', 'Social Media'],
    content: {
      blog: {
        label: 'Blog Post',
        filename: (i) => `${TODAY}-rinkstop-blog-${i}.md`,
        template: 'Template 2 — Coaching Tips',
        targetDir: 'Blog Posts'
      },
      social: {
        label: 'Social Post',
        filename: (i) => `${TODAY}-rinkstop-social-${i}.md`,
        template: 'Template 1 — Hockey News',
        targetDir: 'Social Media'
      }
    },
    targets: {
      blog: 1,
      social: 2
    }
  },
  topshelftoker: {
    name: 'TopShelfToker',
    pipelineDir: path.join(WORKSPACE, 'content-pipeline', 'topshelftoker'),
    draftDir: path.join(DRAFTS_DIR, 'topshelftoker'),
    approvedDir: path.join(APPROVED_DIR, 'topshelftoker'),
    approvedSubdirs: ['Blog Posts', 'Social Media'],
    content: {
      blog: {
        label: 'Blog Post',
        filename: (i) => `${TODAY}-tst-blog-${i}.md`,
        template: 'Template 3 — Cannabis Education',
        targetDir: 'Blog Posts'
      },
      social: {
        label: 'Social Post',
        filename: (i) => `${TODAY}-tst-social-${i}.md`,
        template: 'Template 1 — Culture/Industry News',
        targetDir: 'Social Media'
      }
    },
    targets: {
      blog: 1,
      social: 2
    }
  }
};

// ============================================================
// RSS FEED SIMULATOR (placeholder — replace with real feed reader)
// ============================================================

/**
 * In production, this feeds into:
 * - Feedly API / Inoreader API
 * - Or a custom RSS parser (xml2js + fetch)
 * 
 * For now, returns placeholder topics based on the pipeline's RSS lists.
 */
const TOPIC_POOL = {
  sativaexchange: [
    { title: 'Fed signals prolonged higher rates, crypto and energy react', niche: 'finance', type: 'blog' },
    { title: 'Bitcoin volatility spike — cross-market implications', niche: 'crypto', type: 'social' },
    { title: 'Green tech investment surges in Southeast Asia', niche: 'green-tech', type: 'social' },
    { title: 'Lithium prices rally as EV demand accelerates', niche: 'energy', type: 'social' },
    { title: 'Cannabis regulatory update: three new state bills', niche: 'cannabis', type: 'blog' },
    { title: 'Commodity markets: wheat futures hit 8-month high', niche: 'agriculture', type: 'social' },
  ],
  rinkstop: [
    { title: 'NHL playoff intensity rises — coaching adjustments underway', niche: 'pro', type: 'blog' },
    { title: 'USA Hockey expands youth coaching certification program', niche: 'youth', type: 'blog' },
    { title: 'New community rink opens in local city', niche: 'local', type: 'social' },
    { title: 'IIHF announces 2027 World Championship host', niche: 'international', type: 'social' },
    { title: 'SportTechie: AI-powered analytics reach youth hockey', niche: 'tech', type: 'social' },
    { title: 'Scoresheet.pro update: new penalty tracking features', niche: 'product', type: 'social' },
  ],
  topshelftoker: [
    { title: 'Cannabis culture and streetwear: the convergence continues', niche: 'culture', type: 'blog' },
    { title: 'New design drop: psychedelic sunset series', niche: 'design', type: 'social' },
    { title: 'California launches new cannabis packaging regulations', niche: 'compliance', type: 'social' },
    { title: 'The history of cannabis in music — from jazz to hip-hop', niche: 'culture', type: 'blog' },
    { title: 'Print-on-demand trends: why artists choose POD in 2026', niche: 'business', type: 'social' },
    { title: 'Top 5 rolling papers of 2026 — community picks', niche: 'lifestyle', type: 'social' },
  ]
};

// ============================================================
// FUNCTION: Ensure directories exist
// ============================================================

function ensureDirs() {
  for (const [key, proj] of Object.entries(PROJECTS)) {
    if (!fs.existsSync(proj.draftDir)) fs.mkdirSync(proj.draftDir, { recursive: true });
    if (!fs.existsSync(proj.approvedDir)) fs.mkdirSync(proj.approvedDir, { recursive: true });
    for (const subdir of proj.approvedSubdirs) {
      const subdirPath = path.join(proj.approvedDir, subdir);
      if (!fs.existsSync(subdirPath)) fs.mkdirSync(subdirPath, { recursive: true });
    }
  }
}

// ============================================================
// FUNCTION: Generate draft skeleton using pipeline template
// ============================================================

function generateDraft(projectKey, topic, contentType) {
  const proj = PROJECTS[projectKey];
  const contentConfig = proj.content[contentType];

  // Build the draft using the voice guide's Story → Insight → Takeaway structure
  let draft = '';

  switch (projectKey) {
    case 'sativaexchange':
      draft = generateSativaExchangeDraft(topic, contentType);
      break;
    case 'rinkstop':
      draft = generateRinkStopDraft(topic, contentType);
      break;
    case 'topshelftoker':
      draft = generateTopShelfTokerDraft(topic, contentType);
      break;
  }

  return draft;
}

// ============================================================
// DRAFT GENERATORS — Each follows the pipeline voice guide
// ============================================================

function generateSativaExchangeDraft(topic, type) {
  let draft = '';

  if (type === 'blog') {
    draft = `# ${topic.title}

*[DRAFT — ${TODAY} | Pipeline: SativaExchange Blog Template 1]*
*[Status: NEEDS HUMAN REVIEW — AI draft, edit in Arnel's voice before publishing]*

---

<!-- VOICE GUIDE: content-pipeline/voice-guide.md -->
<!-- TEMPLATE: content-pipeline/prompt-templates.md — Template 1 -->
<!-- DISCLAIMER REQUIRED for finance content -->

## Hook
<!-- Start with a specific moment, memory, or bold statement. NOT "In today's..." -->

[DRAFT HOOK — Replace with personal story or bold opening]

## Context
<!-- 2-3 sentences max. What happened, what the data shows. -->

[Insert analysis of ${topic.title}. Keep it tight. Data as supporting evidence, not the main character.]

## Insight
<!-- Arnel's take. This is where YOUR perspective lives. -->
<!-- Connect to personal experience, trading mentor's wisdom, or SativaExchange lessons learned. -->
<!-- Trading mentor framing: "a former CBOT pit trader" or "my trading mentor" — NEVER by name -->

[Add Arnel's perspective. Reference the trading mentor's floor experience where relevant.]

## Takeaway
<!-- One clear, actionable, or reflective point. -->

[What should the reader do or think about?]

---

*For informational purposes only, not financial advice.*

---
*Published by [SativaExchange.com](https://sativaexchange.com) — Live Market Intelligence*
`;
  } else {
    // Social post
    draft = `<!-- SOCIAL POST — ${topic.niche.toUpperCase()} -->
<!-- Platform: [Twitter/X / LinkedIn / Facebook / Instagram] -->
<!-- Template: content-pipeline/prompt-templates.md — Template 2 -->

${topic.title}

[1-2 sentence personal take — Arnel's voice, first person]

[Data or insight as supporting evidence]

[CTA — visit link, check dashboard, share perspective]

#SativaExchange #${topic.niche.charAt(0).toUpperCase() + topic.niche.slice(1)} #EmergingMarkets
`;
  }

  return draft;
}

function generateRinkStopDraft(topic, type) {
  let draft = '';

  if (type === 'blog') {
    draft = `# ${topic.title}

*[DRAFT — ${TODAY} | Pipeline: RinkStop Blog Template 2]*
*[Status: NEEDS HUMAN REVIEW]*

---

<!-- VOICE GUIDE: content-pipeline/rinkstop/voice-guide.md -->
<!-- TEMPLATE: content-pipeline/rinkstop/prompt-templates.md — Template 2 -->

## Hook
<!-- A real game scenario, coaching challenge, or bold hockey statement -->

[DRAFT HOOK — Make it vivid, coach-to-coach energy]

## The Concept
<!-- Explain the coaching concept clearly. Assume mixed audience. -->

[Break down the topic for coaches at all levels]

## CoachBoard Drill
<!-- Describe a specific CoachBoard drill to practice this -->

[Drill visualization description — this is RinkStop's differentiator]

## Practical Tips
<!-- Things the coach can use at next practice -->

- [Tip 1]
- [Tip 2]
- [Tip 3]

## CTA
<!-- Link back to RinkStop tools -->

Create this drill on [CoachBoard](https://rinkstop.com) | Find rinks near you in the [RinkStop Directory](https://rinkstop.com)

---
*Be the coach who keeps learning. 🏒*
`;
  } else {
    draft = `<!-- SOCIAL POST — HOCKEY ${topic.niche.toUpperCase()} -->
<!-- Template: content-pipeline/rinkstop/prompt-templates.md — Template 1 -->

🏒 ${topic.title}

[Sharp insight or community angle — 2-3 sentences max]

[CTA or community question]

🏟️ Find your rink → rinkstop.com

#Hockey #YouthHockey${topic.niche === 'local' ? ' #LocalHockey' : ''} #RinkStop
`;
  }

  return draft;
}

function generateTopShelfTokerDraft(topic, type) {
  let draft = '';

  if (type === 'blog') {
    draft = `# ${topic.title}

*[DRAFT — ${TODAY} | Pipeline: TopShelfToker Blog Template 3]*
*[Status: NEEDS HUMAN REVIEW]*

---

<!-- VOICE GUIDE: content-pipeline/topshelftoker/voice-guide.md -->
<!-- TEMPLATE: content-pipeline/topshelftoker/prompt-templates.md — Template 3 -->
<!-- ⚠️ COMPLIANCE: No medical claims. No therapeutic language. 21+ audience. -->

## Hook
<!-- Something surprising, cultural, or counterintuitive about the topic -->

[Grab attention — don't start with "In today's..."]

## The Culture
<!-- Explain the topic through the lens of cannabis culture and lifestyle -->

[Make it educational and entertaining. Frame as experience, not medicine.]

## Design Pairing
<!-- Connect to a specific TopShelfToker design -->

[Which design fits this topic? Describe it and link to the store]

## Community Angle
<!-- Feature the community or invite engagement -->

[End with a question, CTA, or cultural observation]

---
*Elevating the experience. 🌿*

*Shop the collection → [topshelftoker.com](https://topshelftoker.com)*
`;
  } else {
    draft = `<!-- SOCIAL POST — CANNABIS ${topic.niche.toUpperCase()} -->
<!-- Template: content-pipeline/topshelftoker/prompt-templates.md — Template 1 -->
<!-- ⚠️ COMPLIANCE CHECK: No medical claims, no minor targeting -->

🌿 ${topic.title}

[Authentic, cultural take — 2-3 sentences]

[CTA: Shop the look → link in bio / topshelftoker.com]

#CannabisCulture #${topic.niche.charAt(0).toUpperCase() + topic.niche.slice(1)} #TopShelfToker #ElevatedLiving
`;
  }

  return draft;
}

// ============================================================
// MAIN EXECUTION
// ============================================================

function runPipeline() {
  console.log('🚀 Starting daily content pipeline...\n');

  ensureDirs();

  const projects = PROJECT_FILTER
    ? { [PROJECT_FILTER]: PROJECTS[PROJECT_FILTER] }
    : PROJECTS;

  let totalDrafts = 0;
  let summary = [];

  for (const [key, proj] of Object.entries(projects)) {
    console.log(`\n📂 ${proj.name}`);
    console.log('─'.repeat(40));

    const topics = TOPIC_POOL[key] || [];
    const blogTopics = topics.filter(t => t.type === 'blog');
    const socialTopics = topics.filter(t => t.type === 'social');

    // Generate blog posts
    const blogCount = Math.min(proj.targets.blog, blogTopics.length);
    for (let i = 0; i < blogCount; i++) {
      const contentCfg = proj.content.blog;
      const filename = contentCfg.filename(i + 1);
      const draft = generateDraft(key, blogTopics[i], 'blog');
      const filePath = path.join(proj.draftDir, filename);

      summary.push({ project: proj.name, type: 'Blog', file: filename, topic: blogTopics[i].title });

      if (DRY_RUN) {
        console.log(`  📝 [DRY RUN] Blog: ${filename}`);
      } else {
        fs.writeFileSync(filePath, draft);
        console.log(`  ✅ Blog: ${filename}`);
      }
      totalDrafts++;
    }

    // Generate social posts
    const socialCount = Math.min(proj.targets.social, socialTopics.length);
    for (let i = 0; i < socialCount; i++) {
      const contentCfg = proj.content.social;
      const filename = contentCfg.filename(i + 1);
      const draft = generateDraft(key, socialTopics[i], 'social');
      const filePath = path.join(proj.draftDir, filename);

      summary.push({ project: proj.name, type: 'Social', file: filename, topic: socialTopics[i].title });

      if (DRY_RUN) {
        console.log(`  📝 [DRY RUN] Social: ${filename}`);
      } else {
        fs.writeFileSync(filePath, draft);
        console.log(`  ✅ Social: ${filename}`);
      }
      totalDrafts++;
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(50));
  console.log(`📊 SUMMARY — ${TODAY}`);
  console.log('='.repeat(50));
  console.log(`Total drafts: ${totalDrafts}`);
  console.log('');

  for (const item of summary) {
    console.log(`  ${item.project.padEnd(16)} | ${item.type.padEnd(7)} | ${item.topic}`);
  }

  console.log('\n📁 Drafts saved to: /root/.openclaw/workspace/drafts/');
  console.log('⚠️  All drafts need human review before publishing.');
  console.log('🔄 Next step: Move approved drafts to approved/ folder\n');

  return totalDrafts;
}

// Run it
const count = runPipeline();
process.exit(0);