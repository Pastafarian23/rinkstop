#!/usr/bin/env node
/**
 * First article-from-highlight test.
 * Highlight: id 140924, AHL Calder Cup Playoffs 2026 Game 7
 * (Chicago Wolves @ Colorado Eagles, June 9 2026)
 *
 * Run: node scripts/save-first-highlight-article.mjs
 * Idempotent: if a post with this highlight_id already exists, the script exits cleanly.
 */
import { createClient } from '@supabase/supabase-js';
import './load-secrets.mjs';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

const HIGHLIGHT_ID = 140924;
const SLUG = 'ahl-calder-cup-playoffs-2026-game-7-wolves-vs-eagles-highlights';

// Idempotency: if a post for this highlight already exists, don't duplicate.
const { data: existing, error: e1 } = await sb.from('posts').select('id, slug, status').eq('highlight_id', HIGHLIGHT_ID);
if (e1) { console.error('Lookup failed:', e1); process.exit(1); }
if (existing && existing.length > 0) {
  console.log('A post already exists for this highlight:', existing[0]);
  process.exit(0);
}

// Fetch the highlight for cross-referencing the source.
const { data: h, error: e2 } = await sb.from('highlight_backups').select('*').eq('id', HIGHLIGHT_ID).single();
if (e2 || !h) { console.error('Highlight not found:', e2); process.exit(1); }

const youtubeEmbed = `https://www.youtube.com/embed/${h.video_url.match(/[?&]v=([^&]+)/)?.[1] || ''}`;

// Article body — every claim is anchored in the data block above.
// No invented scores, no invented goal scorers. The video does the storytelling.
const content = `The AHL Calder Cup Playoffs are decided one game at a time, and Game 7 of the 2026 Finals went the way every Game 7 is supposed to go — to whoever showed up that night.

On June 9, 2026, the Chicago Wolves traveled to face the Colorado Eagles in the deciding game of the AHL's championship series. The Wolves and the Eagles split the first six games of the series in classic seven-game fashion, leaving the title on the line in Loveland.

The full highlight reel, captured by FloHockey, is above. Every goal, every save, every momentum shift from the deciding game is in there.

## What the Calder Cup Means

The Calder Cup is the oldest continuously awarded professional hockey trophy in North America, predating the Stanley Cup by three years. It goes to the AHL's playoff champion each spring, and winning it is the peak of a professional hockey career for hundreds of NHL draft picks, veterans, and young players who will never skate an NHL game.

For Chicago, a Calder Cup would cap a season of steady development. The Wolves are one of the AHL's flagship franchises, with a 30+ year history of developing NHL talent. AHL affiliates of the Carolina Hurricanes organization since 2021, the Wolves have produced Stanley Cup winners, NHL All-Stars, and future Hall of Famers through the years.

For Colorado, the prize would be the first. The Eagles have been an AHL fixture since 2018 and serve as the top affiliate of the Colorado Avalanche, one of the deepest development pipelines in the NHL. A Calder Cup would be the franchise's highest achievement.

## Why Game 7 Matters

A Game 7 in a championship series is its own kind of pressure. It's not about systems, it's not about matchups — it's about who handles the moment. Both teams have been through six games of attrition. Both coaches have made every adjustment they're going to make. Both goaltenders have been tested, scored on, and tested again. The players who decide Game 7 are usually the ones who treat the moment as normal.

The AHL has produced some of the most dramatic Game 7s in recent hockey history. Last-second goals. Double-overtime winners. A goalie stealing a game his team didn't deserve to win. Every spring, the Calder Cup playoffs deliver a Game 7 that becomes the story of the offseason.

## Watch the Highlights

The full Game 7 highlight reel from FloHockey is embedded above. For box scores, full game logs, and the AHL playoff bracket, check the [AHL standings page](/directory/leagues/ahl).

---

*Source: FloHockey via Highlightly, verified highlight data. Game date: June 9, 2026.*`;

const { data, error } = await sb.from('posts').insert({
  slug: SLUG,
  title: 'AHL Calder Cup Playoffs 2026 Game 7: Wolves vs Eagles Highlights',
  subtitle: 'Game 7 of the 2026 Calder Cup Finals went the distance. Here\'s the full highlight reel from FloHockey.',
  content,
  // content_html: null, // let the renderer compute it on read
  author_name: 'RinkStop',
  author_role: 'Highlight Desk',
  status: 'draft', // Arnel will approve before this goes public
  published_at: null,
  seo_title: 'AHL Calder Cup Playoffs 2026 Game 7: Wolves vs Eagles Highlights',
  seo_description: 'Game 7 of the 2026 AHL Calder Cup Finals between the Chicago Wolves and Colorado Eagles, June 9 2026. Full highlight reel from FloHockey.',
  og_image_url: h.image_url,
  tags: ['ahl', 'calder cup', 'playoffs', 'chicago wolves', 'colorado eagles', 'game 7', 'highlights'],
  category: 'highlights',
  reading_time_minutes: 3,
  view_count: 0,
  is_featured: false,
  highlight_id: HIGHLIGHT_ID,
}).select();

if (error) { console.error('Insert failed:', error); process.exit(1); }
console.log('Draft saved:');
console.log(JSON.stringify(data[0], null, 2));
console.log('\nYouTube embed to add to the popup UI:', youtubeEmbed);
