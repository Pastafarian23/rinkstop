// Sample WHL/OHL/QMJHL games to see what's in game_data
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://yszheonqyyskkjoxoexk.supabase.co', '***REMOVED***');

(async () => {
  for (const slug of ['whl', 'ohl', 'qmjhl']) {
    const { data: l } = await supabase.from('leagues').select('id, slug').eq('slug', slug).single();
    const { data } = await supabase
      .from('fixtures')
      .select('id, scheduled_at, status, home_score, away_score, game_data')
      .eq('league_id', l.id)
      .lt('scheduled_at', '2025-01-01T00:00:00+00:00')
      .order('scheduled_at', { ascending: true })
      .limit(3);
    console.log(`\n=== ${slug} (early 2024-25 season) ===`);
    for (const f of (data || [])) {
      console.log(`  ${f.scheduled_at} status=${f.status} scores=${f.home_score}-${f.away_score}`);
      if (f.game_data) {
        console.log(`    game_data keys: ${Object.keys(f.game_data).join(', ')}`);
        if (f.game_data.home_score !== undefined) console.log(`    game_data.home_score: ${f.game_data.home_score}`);
        if (f.game_data.away_score !== undefined) console.log(`    game_data.away_score: ${f.game_data.away_score}`);
        if (f.game_data.status) console.log(`    game_data.status: ${f.game_data.status}`);
      }
    }
  }
})();
