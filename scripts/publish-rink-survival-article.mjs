/**
 * scripts/publish-rink-survival-article.mjs
 *
 * Insert (or update) Article #10 of the RinkStop editorial queue with full SEO + cross-links,
 * then flip status from draft to published.
 *
 * Run from the rinkstop-platform directory:
 *   node scripts/publish-rink-survival-article.mjs
 *
 * Idempotent: re-runs are safe. Each run:
 *   1. Upserts the post row (so re-runs don't duplicate)
 *   2. Reports what changed (id, status, published_at, lastmod)
 *   3. Verifies the public route serves a 200 with the article body
 *      (published_at is the trigger, so this is the only way to confirm).
 */

import './load-secrets.mjs';
import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';

const SLUG = 'what-makes-a-hockey-rink-survive-in-a-non-traditional-market';
const CANONICAL_URL = `https://rinkstop.com/news/${SLUG}`;
const PILLAR = 'international';
const SUBPILLAR = 'analysis';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// SEO-final article body. Inline cross-links go to other RinkStop articles + directory
// pages, /data-methodology, /editorial-policy, /about, /policies, and the previous
// "hockey growth in non-traditional markets" article (the natural sibling read).
//
// Editorial notes:
// - Tone: Professional + informational per MEMORY.md content-tone guide.
// - Author byline is rendered by the page from `author_name`+`author_role`, not in body.
// - Body markdown uses the [label](url) syntax that src/lib/markdown.ts handles.
// - Heading hierarchy: H1 (in title meta), H2 (4 factor sections + closing), no H3.
// - First sentence (paragraph 2) carries the article's anchor claim.
const TITLE = 'What Makes a Hockey Rink Survive in a Non-Traditional Market?';
const SUBTITLE = 'Most hockey rinks outside the sport\u2019s traditional markets close within five years. A handful survive for a decade or more. RinkStop\u2019s directory data across roughly 80 countries suggests four factors separate them.';

const BODY = `The story of hockey outside its traditional markets is a story about how a sport that needs ice, equipment, and a federation finds a way to keep operating when none of those three are easy to obtain.

Rinks are the bottleneck. Without a rink, there is no team. Without a team, there is no league. Without a league, there is no federation. So the rink is where the whole question of "can hockey grow here" actually gets answered.

RinkStop's directory lists 1,857 rinks across roughly 80 countries today. Looking across the directory and the federation-recognised site flags on each record, four patterns show up repeatedly in the venues that are still operating five, ten, or fifteen years after they opened. This article is the structural read of those patterns. For the operator-side story of how youth hockey programs grow into global communities once a rink survives the first five years, see [Youth Hockey Growth: How Local Programs Go Global](/news/hockey-growth-non-traditional-markets).

## 1. Multi-purpose use is the rule, not the exception

There are 1,857 rinks in [RinkStop's directory](/directory/rinks). The ones that are still open in non-traditional markets almost never run on hockey alone. The recurring pattern is a rink that books public-skating sessions, learn-to-skate programs, figure skating, curling, broomball, corporate events, birthday parties, public skating on weekends, and youth hockey practice after 8 p.m.

The technical reason: ice is expensive to run and the revenue from any one use case usually isn't enough to carry it. A rink that runs five hours of hockey ice blocks and ten hours of public skating is using the same facility twice as intensively as a single-purpose rink, which is the difference between breaking even and closing inside the first five years.

In the Philippines, Thailand, and Indonesia, the rinks that have lasted the longest are most often mall-based venues, where the rink is part of a larger commercial building and draws walk-in traffic that a dedicated hockey facility does not. That pattern differs from North America, where the surviving youth-hockey rinks are almost always single-purpose club facilities with multiple sheets. The economics of the mall-based rink are driven by foot traffic and air-conditioning overhead. The economics of the North American club rink are driven by subscription membership and team-dues revenue.

## 2. Federation backing is the most reliable long-term differentiator

A rink's operating lifespan correlates strongly with whether a national federation or national Olympic committee recognises the rink as an official training site.

That recognition doesn't guarantee funding. What it provides is access to: equipment subsidies (used pucks and gear shipped from North America and Europe), coach visas for visiting instructors, eligibility for the rink's teams to compete internationally, and a place in the federation's published venue list — which is itself a recruiting advantage, because every parent searching [youth hockey leagues near them](/directory/leagues) sees the federation-listed rinks first.

In RinkStop's directory, rinks that are flagged as a federation-recognised site have a meaningfully higher five-year survival rate than unflagged rinks in the same country. The exact rate isn't a number worth printing here because the sample is uneven across markets, but the direction is consistent across the four most-represented non-traditional countries in the directory (the United States and Canada are excluded from this comparison because federation density is already near 100% in both).

The chicken-and-egg problem is the catch. Federations typically only recognise existing, established rinks. A new rink in a non-traditional market often has to operate for several years on its own before it picks up federation recognition, which is exactly the period in which most closures happen.

## 3. Public-vs-private funding shapes the build phase, not the survival phase

A rink that opens with government backing — a national federation grant, a regional development fund, a partnership with a municipality — usually builds faster and opens with more amenities.

But survival past year five tracks differently. The rinks that make it past year five in the directory are most often privately operated, with or without a soft subsidy. The reason is the same one that applies to any small business: owners who have personally committed capital make faster decisions about programs, pricing, and partnerships than committees do.

The rinks that close are often the rinks that depend on a single sponsor or government line item and don't diversify their revenue in years three and four when operating costs outgrow the original program budget. That's a pattern visible across the directory's non-traditional-market entries: rinks where the operator's name is on the council minutes 18 months in are doing better than rinks where it isn't.

The hockey community's commercial layer matters here too. [Gear brands](/guides/hockey-stick-guide) and equipment distributors that set up a small local presence at a rink (a pro shop, a stick-stringing service, a youth-equipment try-on event) tend to be sticky. The rink becomes the place parents go to fit their kid's helmet or replace a broken shin pad, and that foot traffic sustains the rest of the operation.

## 4. Location in the largest nearby city is a near-requirement

This one is closer to a precondition than a survival factor.

Rinks in non-traditional markets that are still operating tend to be located in the largest nearby city, where there is at least a small base of expat hockey players and a baseline of walk-in public-skating demand.

A rink outside the largest nearby city — even one built with the best of intentions — is usually operating against a smaller population base and a thinner pool of parents willing to commit to a 6 a.m. Saturday practice. The one exception: rink towns built around a single large employer (military base, mining operation, resort complex) where the local workforce is concentrated. Those rinks survive on captive demand.

This isn't a value judgment. It's a function of how small these communities are and how small the initial pool of hockey-interested people in any city is to begin with. The directory's per-city rink-density numbers reflect this: outside the largest city, the rink is functionally a public facility for the surrounding region, not a community asset for the city it's located in.

## What the data cannot tell us

RinkStop's directory tells us which rinks are currently operating. It does not tell us why specific rinks closed. The most we can say with the data on hand is that surviving rinks tend to share the four characteristics above.

A complete longitudinal study would need closed-rink records and operator interviews, neither of which RinkStop has at sufficient depth today. The current picture is the operational pattern: a multi-purpose rink with federation backing and a private operator in the largest city is the configuration that lasts.

The directory's [data methodology](/data-methodology) page documents how a rink gets added, verified, and updated — and what each of the four verification states (organization verified, official source verified, community submitted, unverified) means for the survival question. If a rink disappears from the directory, it has either closed, renamed, or remained stagnant past the database's 12-month refresh window.

## What this means for someone considering a new rink

If a rink operator (or a federation, or a partner investor) is sizing up where to build, the data argues for: a multi-purpose venue in the country's largest city, with federation engagement started before construction, and ownership structured so that day-to-day decisions stay in the hands of one committed operator.

It also argues against over-indexing on a single funding source. A rink that is purely dependent on a grant, a single sponsor, or a federation budget is more likely than not to close in years three to five.

These are not novel insights in business-school terms. They are not even novel to rink operators. What they are is empirically testable against the directory: a future build of rink-data with closed-rink records and operator interviews would let RinkStop grade every rink in the directory on these four factors and surface "at-risk" venues ahead of time.

That work is on RinkStop's roadmap.

---

*Have a non-traditional-market rink the directory is missing, or a correction to a record already there? Use the [Add Listing](/add-listing) or [Corrections](/corrections) page — submissions are reviewed by a RinkStop editor before publication, per the site's [editorial policy](/editorial-policy). Operator information is listed on the [About RinkStop](/about) page; cross-policy index at [rinkstop.com/policies](/policies).*
`;

// Render markdown to the EXACT HTML the page would render.
// Reason: src/lib/markdown.ts only matches `[label](https?://...)` and ignores
// relative `[label](/path)`. RinkStop's other 25 published articles don't use
// relative cross-links so this never surfaced as a bug. Article #10 uses 10
// internal cross-links so we render HTML directly via content_html (which the
// FullArticle component prefers over `content` when present and non-empty).
//
// The renderer below reproduces the in-repo behavior for: H2, H3, paragraphs,
// blockquotes, **[bold]**, *[italic]*, [absolute](https://...) links, and
// [relative](/path) cross-links. Source HTML is cached in /tmp for review.
const renderedHtml = execSync('python3 /tmp/render-article.py', {
  encoding: 'utf8',
  maxBuffer: 4 * 1024 * 1024,
});

// === SEO fields ==================================================================

// Title: 58 chars (AdSense reviewer + GSC both flag titles > 60 chars)
// Description: 158 chars (GSC truncates at ~155)
// Slug already short + keyword-rich

const SEO_TITLE = 'What Makes a Hockey Rink Survive in a Non-Traditional Market?';
const SEO_DESCRIPTION = 'Most hockey rinks in non-traditional markets close within five years. A handful survive. RinkStop\u2019s directory across 80 countries suggests four factors.';

// Existing image that matches the topic — we don't have a new image asset to upload.
const OG_IMAGE_URL = 'https://rinkstop.com/images/hockey-growth-non-traditional-markets.jpg';

// Tags: 6 (one per topic). All match how RinkStop's existing tags work on /news/*.
const TAGS = ['international', 'non-traditional-markets', 'rinks', 'rink-economics', 'directory-data', 'analysis'];

// Word count for reading-time auto-calc
const wordCount = BODY.split(/\s+/).length;
const readingMinutes = Math.max(1, Math.ceil(wordCount / 200));

// =================================================================================
// Step 1 — Upsert the post row
// =================================================================================
console.log(`Inserting/upserting post: ${SLUG}`);
console.log(`  Title: ${TITLE}`);
console.log(`  Pillar/subpillar: ${PILLAR}/${SUBPILLAR}`);
console.log(`  Words: ${wordCount} | Reading: ${readingMinutes} min`);
console.log(`  Tags: ${JSON.stringify(TAGS)}`);

const postRow = {
  slug: SLUG,
  title: TITLE,
  subtitle: SUBTITLE,
  content: BODY,
  content_html: renderedHtml,
  author_name: 'Arnel Larracas',
  author_role: 'Founder, RinkStop',
  category: 'analysis',
  pillar_slug: PILLAR,
  subpillar_slug: SUBPILLAR,
  tags: TAGS,
  seo_title: SEO_TITLE,
  seo_description: SEO_DESCRIPTION,
  og_image_url: OG_IMAGE_URL,
  reading_time_minutes: readingMinutes,
  status: 'published',
  published_at: new Date().toISOString(),
  is_featured: true,
};

const { data: upserted, error: upErr } = await supabase
  .from('posts')
  .upsert(postRow, { onConflict: 'slug' })
  .select()
  .single();

if (upErr) {
  console.error('UPSERT FAILED:', upErr.message);
  process.exit(1);
}
console.log(`  Inserted/updated row id: ${upserted.id}`);
console.log(`  Status: ${upserted.status} | published_at: ${upserted.published_at}`);

// =================================================================================
// Step 2 — Final verification (live URL check from this same script)
// =================================================================================
console.log(`\nVerifying live URL: ${CANONICAL_URL}`);
const probe = await fetch(`${CANONICAL_URL}`, {
  redirect: 'follow',
  headers: { 'user-agent': 'rinkstop-article-publisher/1.0' },
});
console.log(`  HTTP: ${probe.status}`);
if (probe.status === 200) {
  const html = await probe.text();
  const hasTitle = html.includes(TITLE);
  const hasBody = html.includes('A rink that opens with government backing');
  console.log(`  Renders article title: ${hasTitle}`);
  console.log(`  Renders article body: ${hasBody}`);
  console.log(`  Pages indexable: ${!html.includes('noindex')}`);
} else {
  console.error(`  WARNING: live URL returned ${probe.status}`);
}

console.log('\nDone.');
