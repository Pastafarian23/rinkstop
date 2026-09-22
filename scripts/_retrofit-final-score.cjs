#!/usr/bin/env node
// 2026-09-21: Retroactively fix existing draft articles that are missing
// the orchestrator-injected structured "Final Score" line.
// These articles were generated BEFORE the orchestrator cleanup fix,
// so they have LLM-written "Final Score: <prose>" lines that break
// audit verification.
//
// Strategy:
//   1. For each draft post:
//      a. Look up the fixture row (via game_date + team FKs OR slug)
//      b. If found, append "**Final Score:** <Home> <N>, <Away> <M>." 
//         to the content (replace any existing prose-style Final Score line)
//      c. Save back to posts table
//
//   2. Run audit + auto-publish afterwards.
//
// Idempotent: re-running produces same result.

require('./load-secrets.cjs');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

(async () => {
  // Get all draft posts with team FKs stamped
  const { data: posts, error } = await supabase
    .from('posts')
    .select('id, slug, title, content, team_home_id, team_away_id, league_id, game_date')
    .eq('status', 'draft')
    .not('team_home_id', 'is', null)
    .not('team_away_id', 'is', null)
    .not('game_date', 'is', null);

  if (error) {
    console.error('Error fetching drafts:', error);
    return;
  }
  console.log(`Found ${posts.length} drafts to retrofit`);

  // Cache team names
  const teamNames = {};
  async function getTeamName(id) {
    if (!id) return null;
    if (teamNames[id]) return teamNames[id];
    const { data } = await supabase.from('teams').select('name').eq('id', id).single();
    if (data) teamNames[id] = data.name;
    return data?.name || null;
  }

  let fixed = 0;
  let skipped = 0;
  for (const p of posts) {
    // Look up fixture row for this game (scheduled_at is timestamp with tz)
    const dayStart = p.game_date + 'T00:00:00Z';
    const dayEnd = new Date(new Date(dayStart).getTime() + 86400000).toISOString();
    let { data: fx } = await supabase
      .from('fixtures')
      .select('home_score, away_score')
      .eq('league_id', p.league_id)
      .eq('home_team_id', p.team_home_id)
      .eq('away_team_id', p.team_away_id)
      .gte('scheduled_at', dayStart)
      .lt('scheduled_at', dayEnd)
      .maybeSingle();

    if (!fx) {
      // Try ±1 day
      const baseD = new Date(dayStart);
      for (const offset of [1, -1]) {
        const altStart = new Date(baseD.getTime() + offset * 86400000).toISOString();
        const altEnd = new Date(baseD.getTime() + (offset + 1) * 86400000).toISOString();
        const r = await supabase.from('fixtures').select('home_score, away_score')
          .eq('league_id', p.league_id).eq('home_team_id', p.team_home_id).eq('away_team_id', p.team_away_id)
          .gte('scheduled_at', altStart).lt('scheduled_at', altEnd).maybeSingle();
        if (r.data) { fx = r.data; break; }
      }
    }

    if (!fx) { skipped++; continue; }
    if (typeof fx.home_score !== 'number' || typeof fx.away_score !== 'number') { skipped++; continue; }

    const homeName = fx.home_team_name || await getTeamName(p.team_home_id) || 'Home';
    const awayName = fx.away_team_name || await getTeamName(p.team_away_id) || 'Away';

    // Strip any existing Final Score: lines and rebuild
    let content = p.content
      .replace(/^\*?Final Score:[^\n]*\n+/gim, '')
      .replace(/\n*\*Source:.*\*\s*$/m, '')
      .trim();

    const finalLine = `\n\n**Final Score:** ${homeName} ${fx.home_score}, ${awayName} ${fx.away_score}.`;
    content = content + finalLine + `\n\n*Source: Highlightly match API*`;

    const { error: updErr } = await supabase.from('posts').update({ content }).eq('id', p.id);
    if (updErr) {
      console.error(`  ✗ ${p.slug}: ${updErr.message}`);
    } else {
      console.log(`  ✓ ${p.slug}: ${homeName} ${fx.home_score}, ${awayName} ${fx.away_score}`);
      fixed++;
    }
  }
  console.log(`\nDone. Fixed: ${fixed} | Skipped (no fixture): ${skipped}`);
})();
