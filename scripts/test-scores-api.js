/**
 * API regression test: hit every chip+dropdown combo on /api/scores
 * and fail if "Home vs Away" or other null-team-id indicators appear.
 *
 * Use as a Vercel pre-deploy hook to block broken deploys.
 *
 * Run: node scripts/test-scores-api.js [--api=https://rinkstop.com]
 */
const SITE = (process.argv.find(a => a.startsWith('--api='))?.split('=')[1]) || 'https://rinkstop.com';

const LEAGUE_CHIPS = ['nhl', 'ahl', 'pwhl', 'khl', 'whl', 'ohl', 'qmjhl', 'intl', 'ncaa', 'junior'];
const TIME_CHIPS = ['current', 'today', 'yesterday', 'upcoming', 'past7', 'past30', 'historical'];

const ISSUES = [];

async function test(name, params) {
  const url = `${SITE}/api/scores?${new URLSearchParams(params)}`;
  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'rinkstop-regression-test/1.0' } });
    const text = await r.text();
    let j = null;
    try { j = JSON.parse(text); } catch { /* not JSON */ }
    
    const checks = [];
    if (!r.ok) checks.push(`HTTP ${r.status}`);
    if (j?.error) checks.push(`error: ${j.error}`);
    if (Array.isArray(j?.data)) {
      // Check for "Home vs Away" placeholder (indicates missing team data)
      const home = j.data.filter(g => /home/i.test(g.home_team?.name || '') && /home/i.test(g.away_team?.name || '')).length;
      if (home > 0) checks.push(`${home} "Home vs Away" placeholders`);
      
      // Check for null home_team_id or away_team_id on completed games
      const nullTeams = j.data.filter(g => g.status === 'completed' && (!g.home_team?.id || !g.away_team?.id)).length;
      if (nullTeams > 0) checks.push(`${nullTeams} completed games with null team_ids`);
      
      // Check for 0-0 on past games
      const pastZeroZero = j.data.filter(g => {
        const sched = new Date(g.scheduled_at);
        return sched < new Date() && g.status === 'scheduled' && g.home_score === 0 && g.away_score === 0;
      }).length;
      if (pastZeroZero > 0) checks.push(`${pastZeroZero} past games with 0-0 scheduled`);
    } else if (j && !Array.isArray(j.data)) {
      checks.push('response missing data array');
    }
    
    if (checks.length === 0) {
      console.log(`  ✓ ${name} (${Array.isArray(j?.data) ? j.data.length : 'no games'})`);
    } else {
      console.log(`  ✗ ${name}: ${checks.join(', ')}`);
      ISSUES.push({ name, params, checks });
    }
  } catch (e) {
    console.log(`  ✗ ${name}: fetch error ${e.message}`);
    ISSUES.push({ name, params, checks: [e.message] });
  }
}

async function testTeams(league) {
  const url = `${SITE}/api/scores/teams?league=${league}`;
  try {
    const r = await fetch(url);
    const j = await r.json();
    if (!Array.isArray(j?.data)) {
      console.log(`  ✗ teams?league=${league}: not an array`);
      ISSUES.push({ name: `teams?league=${league}`, checks: ['not array'] });
      return;
    }
    const noId = j.data.filter(t => !t.id).length;
    if (noId > 0) {
      console.log(`  ✗ teams?league=${league}: ${noId} teams with null id`);
      ISSUES.push({ name: `teams?league=${league}`, checks: [`${noId} null ids`] });
      return;
    }
    console.log(`  ✓ teams?league=${league} (${j.data.length} teams)`);
  } catch (e) {
    console.log(`  ✗ teams?league=${league}: ${e.message}`);
    ISSUES.push({ name: `teams?league=${league}`, checks: [e.message] });
  }
}

async function main() {
  console.log(`\n🧪 Scores API Regression Test`);
  console.log(`Site: ${SITE}\n`);
  
  console.log('── League chip × Time filter combinations ──');
  for (const league of LEAGUE_CHIPS) {
    for (const time of TIME_CHIPS) {
      await test(`${league} / ${time}`, { league, time });
    }
  }
  
  console.log('\n── /api/scores/teams by league ──');
  for (const league of LEAGUE_CHIPS) {
    await testTeams(league);
  }
  
  console.log('\n' + '─'.repeat(50));
  if (ISSUES.length === 0) {
    console.log('✅ All API tests passed');
    process.exit(0);
  } else {
    console.log(`❌ ${ISSUES.length} issues found:`);
    for (const i of ISSUES) {
      console.log(`  - ${i.name}: ${i.checks.join(', ')}`);
    }
    process.exit(1);
  }
}

main().catch(e => { console.error('Fatal:', e); process.exit(2); });
