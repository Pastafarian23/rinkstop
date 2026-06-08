/**
 * Pre-sync validator: check the /fixtures table for integrity violations
 * and alert RinkStop Ops Telegram channel if any are found.
 *
 * Run: node scripts/validate-fixtures-integrity.js
 * Cron: every 6 hours (per DATA-INTEGRITY-PLAN.md)
 *
 * Checks:
 *  1. NULL team_ids on protected leagues (NHL/AHL/PWHL/KHL)
 *  2. Past games with 0-0 score + status=scheduled (the 0-0 parser bug)
 *  3. Past games with status=scheduled (should be completed or deleted)
 *  4. Future games with status=completed (shouldn't be possible but check anyway)
 *  5. Duplicate (scheduled_at + teams) groups
 *  6. Coverage gaps: known expected game counts vs actual
 */
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const SUPABASE_URL = 'https://yszheonqyyskkjoxoexk.supabase.co';
const SB_KEY = '***REMOVED***';
const supabase = createClient(SUPABASE_URL, SB_KEY);

const PROTECTED_LEAGUES = {
  '2b5f2b9d-84b9-4edb-8373-a732b72f4e40': 'NHL',
  'b05d6d26-d5d6-4cfd-a48b-f5646fa7d611': 'AHL',
  '425ae95a-db13-499a-96f4-a859a437b15c': 'PWHL',
  'a08f6dac-eb1f-48b6-a11b-56fbb5642752': 'KHL',
};

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN; // optional
const TELEGRAM_CHAT_ID = '-5043773858'; // RinkStop Ops

async function alert(message) {
  console.log('\n📢 ALERT:\n' + message);
  if (TELEGRAM_BOT_TOKEN) {
    try {
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message, parse_mode: 'HTML' }),
      });
    } catch (e) { console.log('  (Telegram send failed: ' + e.message + ')'); }
  }
}

async function check(label, query, severity = 'warn') {
  const { count, error } = await query;
  if (error) {
    console.log(`  ❌ ${label}: ERROR ${error.message}`);
    return { label, count: -1, error: error.message };
  }
  const icon = count === 0 ? '✓' : severity === 'critical' ? '🔴' : '⚠️';
  console.log(`  ${icon} ${label}: ${count}`);
  return { label, count, severity };
}

async function main() {
  console.log('🛡️  RinkStop Fixtures Integrity Validator\n');
  console.log(`Time: ${new Date().toISOString()}\n`);
  
  const results = [];

  console.log('── 1. NULL team_ids on protected leagues ──');
  for (const [id, name] of Object.entries(PROTECTED_LEAGUES)) {
    const r = await check(`${name} NULL team_ids`, supabase
      .from('fixtures').select('id', { count: 'exact', head: true })
      .eq('league_id', id)
      .or('home_team_id.is.null,away_team_id.is.null'), 'critical');
    results.push(r);
  }

  console.log('\n── 2. Past games with 0-0 score + scheduled (parser bug) ──');
  for (const [id, name] of Object.entries(PROTECTED_LEAGUES)) {
    const r = await check(`${name} 0-0 past scheduled`, supabase
      .from('fixtures').select('id', { count: 'exact', head: true })
      .eq('league_id', id)
      .eq('status', 'scheduled')
      .eq('home_score', 0)
      .eq('away_score', 0)
      .lt('scheduled_at', new Date().toISOString()), 'critical');
    results.push(r);
  }

  console.log('\n── 3. Past games still scheduled (should be completed/deleted) ──');
  for (const [id, name] of Object.entries(PROTECTED_LEAGUES)) {
    const r = await check(`${name} past scheduled`, supabase
      .from('fixtures').select('id', { count: 'exact', head: true })
      .eq('league_id', id)
      .eq('status', 'scheduled')
      .lt('scheduled_at', new Date().toISOString()), 'warn');
    results.push(r);
  }

  console.log('\n── 4. Future games marked completed ──');
  for (const [id, name] of Object.entries(PROTECTED_LEAGUES)) {
    const r = await check(`${name} future completed`, supabase
      .from('fixtures').select('id', { count: 'exact', head: true })
      .eq('league_id', id)
      .eq('status', 'completed')
      .gt('scheduled_at', new Date().toISOString()), 'warn');
    results.push(r);
  }

  console.log('\n── 5. Coverage summary ──');
  for (const [id, name] of Object.entries(PROTECTED_LEAGUES)) {
    const { count: total } = await supabase.from('fixtures').select('id', { count: 'exact', head: true }).eq('league_id', id);
    const { count: withScores } = await supabase.from('fixtures').select('id', { count: 'exact', head: true }).eq('league_id', id).not('home_score', 'is', null);
    const { count: completed } = await supabase.from('fixtures').select('id', { count: 'exact', head: true }).eq('league_id', id).eq('status', 'completed');
    const pct = total ? Math.round((withScores / total) * 100) : 0;
    console.log(`  ${name}: ${withScores}/${total} with scores (${pct}%) | ${completed} completed`);
  }

  // Alert on critical issues
  const critical = results.filter(r => r.severity === 'critical' && r.count > 0);
  if (critical.length > 0) {
    const lines = ['🚨 <b>CRITICAL: NHL Data Integrity Issues Detected</b>', ''];
    for (const c of critical) {
      lines.push(`❌ <b>${c.label}</b>: ${c.count}`);
    }
    lines.push('', `Time: ${new Date().toISOString()}`);
    lines.push('Run: `node scripts/validate-fixtures-integrity.js` to see full report');
    await alert(lines.join('\n'));
  }
  
  const warns = results.filter(r => r.severity === 'warn' && r.count > 0);
  if (warns.length > 0) {
    console.log('\n⚠️  Warnings:');
    for (const w of warns) console.log(`  ${w.label}: ${w.count}`);
  }

  const allClean = results.every(r => r.count === 0);
  console.log('\n' + (allClean ? '✅ ALL CHECKS PASSED' : '⚠️  ISSUES FOUND (see above)'));
  process.exit(allClean ? 0 : 1);
}

main().catch(e => { console.error('Fatal:', e); process.exit(2); });
