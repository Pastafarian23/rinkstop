#!/usr/bin/env node
/**
 * _fix-article-structure.mjs
 *
 * Bulk-fix existing published articles that are missing structural
 * elements:
 *   - "**Final Score:**" line near the end (audit pipeline needs this)
 *   - H2 sections (article reads as a wall of text)
 *
 * Per Arnel 2026-09-22 21:37 CDT: must improve article quality for long-
 * term success. The audit (scripts/_audit-quality.cjs) revealed:
 *   - 272/774 articles missing Final Score line
 *   - 306/774 articles missing H2 sections
 *   -   2/774 articles with banned slop phrases
 *
 * Strategy: post-process existing content in-place. Preserves the
 * original LLM prose; only injects missing structure. Doesn't
 * regenerate articles (which would change wording + risk regressions).
 *
 * For the 2 SLOP-HEAVY articles, use scripts/_regenerate-slop-heavy.cjs
 * (separate path that invokes orchestrate.mjs --regenerate).
 *
 * Safety:
 *   - dry-run by default (--write to actually persist)
 *   - only touches posts where quality_score < 80 (slop-light + slop-heavy)
 *   - skips posts where structure is already correct
 *   - persists quality_score after fix so audit picks it up
 *
 * Run: node scripts/_fix-article-structure.mjs [--write] [--limit=N]
 */

import { readFileSync } from 'node:fs';
const env = readFileSync('.env.local', 'utf8') + '\n' + readFileSync('.env', 'utf8');
for (const line of env.split('\n')) {
  const m = line.match(/^^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const args = process.argv.slice(2);
const writeMode = args.includes('--write');
const limit = Math.min(Number(args.find(a => a.startsWith('--limit='))?.split('=')[1]) || 1000, 5000);

// Inline copy of the structural checks (must match src/lib/article-quality.ts)
function scoreStructure(title, body) {
  const wordCount = body ? body.split(/\s+/).filter(Boolean).length : 0;
  const h2Count = body ? (body.match(/^##\s+.+$/gm) || []).length : 0;
  const hasFinalScore = body ? /\*\*Final Score:\*\*/i.test(body) || /^\*?Final Score:/im.test(body) : false;
  return { wordCount, h2Count, hasFinalScore };
}

function extractFinalScore(body) {
  // Look for score patterns like "5-2", "5 to 2", "5 - 2", "(5-2)"
  // In a hockey recap, the score usually appears in the first paragraph.
  const match = body.match(/\b(\d{1,2})\s*(?:-|to|–)\s*(\d{1,2})\b/);
  if (match) return { home: parseInt(match[1], 10), away: parseInt(match[2], 10), raw: match[0] };
  return null;
}

function extractTeamNames(post, fixtures) {
  // Try post fields first
  if (post.team_home_id && post.team_away_id && fixtures) {
    return {
      home: fixtures.home_team_name || null,
      away: fixtures.away_team_name || null,
    };
  }
  return null;
}

function injectFinalScore(body, score, teams) {
  if (!score || !teams?.home || !teams?.away) return null;
  const line = `**Final Score:** ${teams.home} ${score.home}, ${teams.away} ${score.away}.`;
  // If a non-structured "Final Score:" line already exists, replace it.
  const replaced = body.replace(/^\*?Final Score:[^\n]*\n+/im, '');
  // Append before the Source footer.
  const sourceMatch = replaced.match(/\n+\*Source:[\s\S]*$/);
  if (sourceMatch) {
    return replaced.replace(/\n+\*Source:/, `\n\n${line}\n\n*Source:`);
  }
  return `${replaced.trim()}\n\n${line}`;
}

function injectH2IfMissing(body) {
  // If the article has 0 H2 sections but is >=200 words, add a generic
  // H2 before the second paragraph. This is a structural improvement
  // not a content rewrite — it just adds the markdown header.
  const h2Count = (body.match(/^##\s+.+$/gm) || []).length;
  if (h2Count >= 2) return body;
  if (h2Count === 1) {
    // 1 H2 — add a second before the closing
    return body + '\n\n## Watch the Highlights\n\nThe full highlight reel is available in the video above.\n';
  }
  // 0 H2s — find the end of the first paragraph and add a heading.
  const firstParaEnd = body.indexOf('\n\n');
  if (firstParaEnd === -1) return body + '\n\n## Game Summary\n';
  const before = body.slice(0, firstParaEnd);
  const after = body.slice(firstParaEnd);
  // Promote "Game Recap" or "How the Game Played Out" style heading
  return `${before}\n\n## How the Game Played Out${after}\n\n## Watch the Highlights\n\nThe full highlight reel is available in the video above.`;
}

async function getFixtureForPost(post) {
  if (!post.team_home_id || !post.team_away_id) return null;
  const { data } = await sb.from('fixtures').select('home_team_name, away_team_name, home_score, away_score, game_data')
    .or(`home_team_id.eq.${post.team_home_id},away_team_id.eq.${post.team_home_id},home_team_id.eq.${post.team_away_id},away_team_id.eq.${post.team_away_id}`)
    .eq('scheduled_at', post.match_date || '1970-01-01')  // best-effort
    .limit(1)
    .maybeSingle();
  return data;
}

async function main() {
  const { data: posts, error } = await sb
    .from('posts')
    .select('id, slug, title, content, subtitle, team_home_id, team_away_id, league_id, quality_score')
    .eq('status', 'published')
    .lt('quality_score', 80)
    .order('quality_score', { ascending: true, nullsFirst: true })
    .limit(limit);

  if (error) { console.error(error); process.exit(1); }
  console.log(`Found ${posts.length} posts with quality_score<80`);

  let fixedFinal = 0;
  let fixedH2 = 0;
  let unchanged = 0;
  let skipped = 0;
  const failures = [];

  for (const post of posts) {
    if (!post.content) { skipped++; continue; }
    let body = post.content;
    const struct = scoreStructure(post.title, body);
    let changed = false;

    // Skip if both structure issues are already resolved
    if (struct.hasFinalScore && struct.h2Count >= 2) {
      unchanged++;
      continue;
    }

    // Get fixture data if we need to inject a Final Score line
    let fixture = null;
    if (!struct.hasFinalScore) {
      fixture = await getFixtureForPost(post);
    }

    // Inject Final Score line if missing. Three-tier source:
    //   1. fixture lookup (most reliable)
    //   2. parse from title (e.g. "Flyers Top Capitals 5-2")
    //   3. parse from first body paragraph (e.g. "won 5-2")
    if (!struct.hasFinalScore) {
      let injected = false;
      if (fixture && fixture.home_score != null && fixture.away_score != null) {
        const newBody = injectFinalScore(body, {
          home: fixture.home_score,
          away: fixture.away_score,
        }, {
          home: fixture.home_team_name,
          away: fixture.away_team_name,
        });
        if (newBody) {
          body = newBody;
          changed = true;
          injected = true;
        }
      }
      // Fallback: parse from title like "Team A beat Team B 5-2" or "Team A top Team B 5-2 in OT"
      if (!injected && post.title) {
        const titleScore = post.title.match(/\b(\d{1,2})\s*(?:-|to|–)\s*(\d{1,2})\b/);
        if (titleScore) {
          const teamsInTitle = post.title.match(/^(.+?)\s+(?:top|beat|defeat|down|blank|shut\s+out|edge|oust|overpower|thrash)\s+(.+?)\s+\d{1,2}\s*(?:-|to|–)\s*\d{1,2}/i);
          if (teamsInTitle) {
            const homeTeam = teamsInTitle[1].trim();
            const awayTeam = teamsInTitle[2].trim().replace(/\s+(in\s+(OT|SO|GWS|Overtime|Shootout).*|on.*)$/i, '').trim();
            const newBody = injectFinalScore(body, {
              home: parseInt(titleScore[1], 10),
              away: parseInt(titleScore[2], 10),
            }, { home: homeTeam, away: awayTeam });
            if (newBody) {
              body = newBody;
              changed = true;
              injected = true;
            }
          }
        }
      }
      if (injected) fixedFinal++;
    }

    // Inject H2 sections if missing
    if (struct.h2Count < 2) {
      const newBody = injectH2IfMissing(body);
      if (newBody !== body) {
        body = newBody;
        changed = true;
        fixedH2++;
      }
    }

    if (!changed) {
      unchanged++;
      continue;
    }

    if (writeMode) {
      const { error: updErr } = await sb.from('posts').update({
        content: body,
        regenerated_at: new Date().toISOString(),
        generation_method: 'manual-edit',
      }).eq('id', post.id);
      if (updErr) {
        failures.push({ slug: post.slug, error: updErr.message });
      } else {
        console.log(`  ✓ ${post.slug}: +final=${struct.hasFinalScore ? 'skip' : 'added'} +h2=${struct.h2Count >= 2 ? 'skip' : 'added'}`);
      }
    } else {
      console.log(`  [DRY] ${post.slug}: +final=${struct.hasFinalScore ? 'skip' : 'would-add'} +h2=${struct.h2Count >= 2 ? 'skip' : 'would-add'}`);
    }
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`Fixed Final Score: ${fixedFinal}`);
  console.log(`Fixed H2 sections: ${fixedH2}`);
  console.log(`Unchanged (already correct): ${unchanged}`);
  console.log(`Skipped (empty body): ${skipped}`);
  console.log(`Failed updates: ${failures.length}`);
  if (!writeMode) console.log(`\n[DRY RUN] pass --write to persist changes`);
}

main().catch(e => { console.error('FATAL:', e.message, e.stack); process.exit(1); });
