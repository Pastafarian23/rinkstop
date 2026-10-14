/**
 * scripts/_ingest-guard.cjs
 *
 * 2026-10-14: Shared guard for fixture-ingest scripts. Required reading
 * before running any script that calls `from('fixtures').insert(...)`.
 *
 * The 2026-10-14 duplicate-game-card bug happened because an ingest
 * script (backfill-nhl-highlightly.js) wrote fixture rows for
 * historical franchise names (Atlanta Flames, Minnesota North Stars)
 * without resolving them to the modern team_id. The result was:
 *
 *   1. The ingest saw "Atlanta Flames" vs "Anaheim Ducks" in HL data
 *      and didn't recognize "Atlanta Flames" as a real team.
 *   2. It constructed a fake team_id by zero-padding HL's numeric
 *      away_id into a UUID-shaped string: "a0000013-0000-..."
 *   3. It inserted a new `teams` row for "Atlanta Flames" and a
 *      fixture row referencing that fake team.
 *   4. The franchise-name-lookup normalized "Atlanta Flames" to
 *      "Calgary Flames" for display, so the user saw two cards for
 *      "Calgary Flames @ Anaheim Ducks" with two different scores.
 *
 * This module provides a `safeInsertFixture` wrapper that:
 *
 *   1. Refuses to insert a fixture whose team_id is in the
 *      FORBIDDEN_TEAM_IDS list (the "a000*" fabricated range).
 *   2. Refuses to insert if a row already exists at the same
 *      scheduled_at + league_id + modern team_id combo (true
 *      natural-key dedup).
 *   3. Refuses to insert if there is a CONFLICTING row at the same
 *      scheduled_at with a DIFFERENT team_id (the signature of a
 *      ghost row from the previous bug). Logs the conflict so the
 *      operator can investigate.
 *   4. Logs every insert and every skip with a clear reason.
 *
 * Usage:
 *   const { safeInsertFixture, FORBIDDEN_TEAM_IDS } = require('./_ingest-guard.cjs');
 *   const result = await safeInsertFixture(supabase, fixture);
 *   if (result.status === 'inserted') { ... }
 *   if (result.status === 'skipped') { console.log('Skipped:', result.reason); }
 */

const FORBIDDEN_TEAM_ID_PATTERNS = [
  /^a000[0-9a-f]{4}-0000-0000-0000-00000000[0-9a-f]{4}$/i, // the HL-numeric fake-uuid range
  /^0{8}-0{4}-0{4}-0{4}-0{12}$/i,                              // all-zero UUID (placeholder)
];

/**
 * Returns true if the given UUID looks like a fabricated placeholder
 * (zero-padded numeric, all zeros, or other known-bad ranges). All
 * such IDs should be REJECTED, not silently coerced.
 */
function isForbiddenTeamId(id) {
  if (!id || typeof id !== 'string') return true;
  for (const re of FORBIDDEN_TEAM_ID_PATTERNS) {
    if (re.test(id)) return true;
  }
  return false;
}

/**
 * Safe wrapper around `supabase.from('fixtures').insert(...)`. Checks
 * for ghost-row conflicts and forbidden team_ids before writing.
 * Returns { status, reason, conflictId? }.
 */
async function safeInsertFixture(supabase, fixture) {
  // Reject forbidden team_ids (the bug case: a000* fabricated IDs)
  if (isForbiddenTeamId(fixture.home_team_id)) {
    return { status: 'skipped', reason: `home_team_id ${fixture.home_team_id} is a forbidden/fabricated id` };
  }
  if (isForbiddenTeamId(fixture.away_team_id)) {
    return { status: 'skipped', reason: `away_team_id ${fixture.away_team_id} is a forbidden/fabricated id` };
  }

  // Reject if home == away
  if (fixture.home_team_id === fixture.away_team_id) {
    return { status: 'skipped', reason: 'home_team_id == away_team_id' };
  }

  // Dedup: natural key is (league_id, scheduled_at, home_team_id, away_team_id)
  const { data: existing } = await supabase
    .from('fixtures')
    .select('id')
    .eq('league_id', fixture.league_id)
    .eq('scheduled_at', fixture.scheduled_at)
    .eq('home_team_id', fixture.home_team_id)
    .eq('away_team_id', fixture.away_team_id)
    .limit(1);

  if (existing && existing.length > 0) {
    return { status: 'skipped', reason: 'duplicate (natural key collision)', existingId: existing[0].id };
  }

  // Ghost-row check: if a row exists at the same (scheduled_at, league_id)
  // with EITHER team matching but with a DIFFERENT pair, that's the
  // signature of the historical-name bug. Refuse to insert; let the
  // operator clean up the ghost row first.
  const { data: sameSlot } = await supabase
    .from('fixtures')
    .select('id, home_team_id, away_team_id')
    .eq('league_id', fixture.league_id)
    .eq('scheduled_at', fixture.scheduled_at)
    .or(`home_team_id.in.(${fixture.home_team_id},${fixture.away_team_id}),away_team_id.in.(${fixture.home_team_id},${fixture.away_team_id})`)
    .limit(5);

  const ghostRows = (sameSlot || []).filter(r =>
    r.home_team_id !== fixture.home_team_id || r.away_team_id !== fixture.away_team_id
  );
  if (ghostRows.length > 0) {
    return {
      status: 'skipped',
      reason: `ghost-row conflict at this slot: ${ghostRows.length} existing rows with different team_ids`,
      conflictId: ghostRows[0].id,
    };
  }

  // Safe to insert
  const { data, error } = await supabase.from('fixtures').insert(fixture).select('id').single();
  if (error) {
    return { status: 'error', reason: error.message };
  }
  return { status: 'inserted', id: data?.id };
}

module.exports = {
  FORBIDDEN_TEAM_ID_PATTERNS,
  isForbiddenTeamId,
  safeInsertFixture,
};
