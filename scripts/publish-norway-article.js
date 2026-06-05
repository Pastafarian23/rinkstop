#!/usr/bin/env node
// Publish Norway World Championship bronze article to Supabase with backdate to 2026-05-31
// Also injects cross-references to the Finland gold-medal article (already published)
const fs = require('fs');
const https = require('https');
const envFile = fs.readFileSync('/root/.openclaw/workspace/rinkstop-platform/.env', 'utf8');
for (const line of envFile.split('\n')) {
  const m = line.match(/^([A-Z_]+)\s*=\s*(.+)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}

const SUPABASE_URL = 'https://yszheonqyyskkjoxoexk.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const FINLAND_URL = 'https://rinkstop.com/blog/finland-defeats-switzerland-in-overtime-to-capture-2026-world-championship-gold';

let content = `Norwegian hockey reached a historic milestone on Sunday in Zurich.

Noah Steen scored 3:32 into overtime as Norway shocked Canada 3-2 in the bronze medal game at the 2026 IIHF World Championship, securing the country's first-ever medal in the tournament and producing one of the greatest upsets in international hockey history.

For decades, Norway had fought to earn respect among hockey's traditional powers. On the final day of the 2026 championship, the nation achieved something it had never done before.

It defeated Canada on one of the sport's biggest stages.

The victory completed an unforgettable tournament for the Norwegians, whose previous best finish at the World Championship came in 1951 when they placed fourth. Seventy-five years later, they finally climbed onto the podium.

The result appeared unlikely from the very beginning.

Canada entered the bronze medal game loaded with NHL talent, including captain Macklin Celebrini, veteran stars Sidney Crosby, Ryan O'Reilly, John Tavares, and Mark Scheifele. Despite being upset by Finland in the semifinals, Canada remained the heavy favorite entering the third-place game.

Norway had different plans.

The underdogs struck first midway through the opening period when Emilio Pettersen capitalized on an opportunity and beat Canadian goaltender Jet Greaves to give Norway a surprising 1-0 lead. The goal energized the Norwegian bench and immediately increased the pressure on Canada.

Canada controlled much of the puck possession throughout the game and finished with a commanding edge in shots, but Norwegian goaltender Henrik Haukeland delivered the performance of his life.

Time after time, Haukeland denied Canadian scorers from dangerous areas. Whether facing odd-man rushes, point-blank opportunities, or heavy pressure around the crease, he remained calm and composed. By game's end, he had turned aside 44 shots and established himself as one of the heroes of Norway's historic run.

The Norwegians extended their lead in the second period when Stian Solberg's shot found its way past Greaves, making it 2-0 and sending shockwaves through the arena. Suddenly, the possibility of a historic upset felt very real.

Yet Canada was not finished.

With time slipping away and a medal disappearing from reach, the Canadians mounted a desperate late push.

After pulling Greaves for an extra attacker, Robert Thomas finally broke through with 1:16 remaining in regulation to cut the deficit to one. The goal injected life into the Canadian bench and set the stage for a dramatic finish.

Then, with just eight seconds left on the clock, Thomas struck again.

A last-second sequence involving Macklin Celebrini and Ryan O'Reilly resulted in Thomas burying the equalizer to force overtime and complete one of the most dramatic comebacks of the tournament.

For many teams, surrendering a two-goal lead in the final moments would have been devastating.

Norway responded differently.

Instead of collapsing emotionally, the Norwegians regrouped and entered overtime determined to finish the job.

Just 3:32 into the extra session, Steen raced into the offensive zone on a two-on-one rush. With confidence, he fired a shot past Greaves to end the game and send Norway into celebration. Players spilled onto the ice as the realization set in that Norwegian hockey history had been made.

Steen's overtime winner became the most important goal ever scored by Norway at the men's World Championship.

The significance of the victory extended far beyond a bronze medal.

For years, Norway has worked to grow hockey within a nation traditionally overshadowed by larger international powers. While the country has produced NHL players and competitive international teams, it had never broken through to reach the medal podium.

That barrier is now gone.

The 2026 bronze medal represents a defining achievement for Norwegian hockey and could serve as a catalyst for future growth across the country. Young players now have a historic moment to look toward as proof that success on the world stage is possible.

For Canada, the defeat marked another disappointing finish at a tournament where expectations remain extraordinarily high. Despite a roster filled with NHL talent and a perfect group-stage record, Canada left Zurich without a medal — the first time the Canadians have been shut out of the podium at a World Championship since 2017.

## A Day of Overtime Drama in Zurich

Norway's bronze medal was one of two overtime finishes on the final day of the 2026 IIHF World Championship.

Earlier that same Sunday, [Finland captured gold with a 1-0 overtime win over Switzerland](${FINLAND_URL}), as Konsta Helenius scored 10:42 into OT to deliver the Finns their fifth world title. Roman Josi of Switzerland earned tournament MVP honors.

The two games capped a tournament that delivered drama, upsets, and historic moments from the opening day to the final whistle. The 2027 IIHF World Championship returns to Europe, with venues and dates to be announced in the coming months.

## Norway's Place in the World Championship

Norway's bronze medal adds the country to an expanding group of nations making their mark on international hockey. With Switzerland (silver), Finland (gold), and now Norway (bronze) on the podium, the 2026 tournament reflected the global spread of competitive hockey beyond the traditional powerhouses of Canada, Russia, Sweden, the United States, and the Czech Republic.

For Norwegian hockey fans, the next test comes in the spring of 2027 — but the legacy of Zurich 2026 is already secure.

---

*[Read the full recap of the gold-medal game: Finland Defeats Switzerland in Overtime to Capture 2026 World Championship Gold](${FINLAND_URL})*

*Follow RinkStop for coverage of international hockey, the NHL, and the IIHF World Championship throughout the year.*`;

// Calculate reading time
const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;
const readingTime = Math.max(1, Math.round(wordCount / 200));

// Slug
const slug = 'norway-stuns-canada-in-overtime-to-win-first-ever-world-championship-medal';

const post = {
  slug,
  title: 'Norway Stuns Canada in Overtime to Win First-Ever World Championship Medal',
  subtitle: 'Noah Steen scores 3:32 into OT as Norway beats Canada 3-2 in the 2026 bronze-medal game — the country\'s first medal in 75 years',
  content,
  content_html: null,
  author_name: 'Arnel',
  author_role: 'Founder, RinkStop',
  status: 'published',
  published_at: '2026-05-31T22:00:00+00:00',  // Bronze game ended ~22:00 UTC, after the gold medal (~20:30 UTC)
  seo_title: 'Norway Stuns Canada in OT to Win First-Ever World Championship Medal | RinkStop',
  seo_description: 'Noah Steen scored 3:32 into overtime as Norway shocked Canada 3-2 in the 2026 IIHF World Championship bronze-medal game, securing the country\'s first-ever medal in 75 years. Full recap of the historic upset in Zurich.',
  og_image_url: null,
  tags: ['rinkstop', 'blog', 'iihf', 'world-championship', 'norway', 'canada', 'international-hockey', 'bronze-medal', 'upsets'],
  category: 'blog',
  reading_time_minutes: readingTime,
  view_count: 0,
  is_featured: false,
  country: null,
  country_slug: null,
};

console.log('Article to publish:');
console.log(`  Title: ${post.title}`);
console.log(`  Slug: ${slug}`);
console.log(`  Reading time: ${readingTime} min (${wordCount} words)`);
console.log(`  Backdate (published_at): ${post.published_at}`);
console.log(`  Cross-references Finland article: ${FINLAND_URL}`);
console.log();

const body = JSON.stringify(post);
const req = https.request(`${SUPABASE_URL}/rest/v1/posts`, {
  method: 'POST',
  headers: {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
  },
}, (res) => {
  let data = '';
  res.on('data', (c) => (data += c));
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    if (res.statusCode >= 400) {
      console.error('Error:', data);
      process.exit(1);
    }
    const result = JSON.parse(data);
    console.log('\n✅ Published. Post id:', result[0]?.id);
    console.log('   Slug:', result[0]?.slug);
    console.log('   Live URL: https://rinkstop.com/blog/' + result[0]?.slug);
  });
});
req.on('error', (e) => {
  console.error('Request error:', e);
  process.exit(1);
});
req.write(body);
req.end();
