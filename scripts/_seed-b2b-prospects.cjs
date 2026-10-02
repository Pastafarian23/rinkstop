#!/usr/bin/env node
/**
 * scripts/_seed-b2b-prospects.cjs
 *
 * Phase 8 of conversion overhaul. Reads unclaimed rinks from rinkstop DB
 * that have a public website URL (the strongest signal of an actual
 * business still operating), inserts/upserts into b2b_prospects for human
 * review. Does NOT send any outreach.
 *
 * Re-runnable, idempotent (unique on (kind, rink_id) when rink_id set).
 *
 * Usage:
 *   node scripts/_seed-b2b-prospects.cjs                # default 500
 *   node scripts/_seed-b2b-prospects.cjs --limit=200
 *   node scripts/_seed-b2b-prospects.cjs --dry-run
 *
 * Ranking signals used:
 *   + 30  has_website
 *   + 15  has_contact_email
 *   + 10  has_city_country
 *   + 20  has multiple programs (rink_activities surface suggests... 3+)
 *   + 15  listed in major league circuit (NHL/KHL/SHL/OHL/etc.)
 *   + 10  has updated_at within 90 days (data freshness)
 *
 * Threshold to insert: priority_score >= 40
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const args = process.argv.slice(2);
const limit = (() => {
  const a = args.find((a) => a.startsWith('--limit='));
  return a ? parseInt(a.split('=')[1], 10) : 500;
})();
const dryRun = args.includes('--dry-run');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
  auth: { persistSession: false },
});

const MAJOR_LEAGUES = new Set([
  'nhl',
  'ahl',
  'ohl',
  'whl',
  'qmjhl',
  'khl',
  'shl',
  'del',
  'liiga',
  'echl',
  'ushl',
  'nahl',
  'pwhl',
]);

async function fetchUnclaimedRinksWithWebsites() {
  // Strategy: rinks that look real (have a website) and are not yet linked
  // to a b2b_prospect record. We do NOT enforce "unclaimed on rinkstop"
  // here because the seed includes both claimed and unclaimed for the
  // admin to triage — being claimed on rinkstop doesn't mean the
  // prospect pipeline should ignore the listing.

  const { data, error } = await supabase
    .from('rinks')
    .select('id, name, city, country, state_province, website, contact_email, status, updated_at')
    .not('website', 'is', null)
    .neq('website', '')
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

async function fetchActivitiesForRink(rinkId) {
  const { data, error } = await supabase
    .from('rink_activities')
    .select('id')
    .eq('rink_id', rinkId);
  if (error) return [];
  return data || [];
}

async function fetchTeamsByRink(rinkId) {
  const { data, error } = await supabase
    .from('teams')
    .select('id, league_id')
    .eq('home_rink_id', rinkId)
    .limit(50);
  if (error) return [];
  return data || [];
}

async function fetchLeagueSlugs(leagueIds) {
  if (!leagueIds || leagueIds.length === 0) return new Set();
  const { data, error } = await supabase
    .from('leagues')
    .select('id, slug')
    .in('id', leagueIds);
  if (error) return new Set();
  return new Set((data || []).map((l) => (l.slug || '').toLowerCase()));
}

async function findExistingProspect(rinkId) {
  const { data, error } = await supabase
    .from('b2b_prospects')
    .select('id, priority_score, outreach_status, updated_at')
    .eq('rink_id', rinkId)
    .maybeSingle();
  if (error) return null;
  return data;
}

function scoreRink(rink, programCount, leagueSlugs) {
  let score = 0;
  const signals = {};

  if (rink.website) {
    score += 30;
    signals.has_website = true;
  }
  if (rink.contact_email) {
    score += 15;
    signals.has_contact_email = true;
  }
  if (rink.city && rink.country) {
    score += 10;
    signals.has_city_country = true;
  }
  if (programCount >= 3) {
    score += 20;
    signals.has_programs = programCount;
  } else if (programCount >= 1) {
    score += 10;
    signals.has_programs = programCount;
  }
  const hasMajorLeague = [...leagueSlugs].some((slug) => MAJOR_LEAGUES.has(slug));
  if (hasMajorLeague) {
    score += 15;
    signals.has_major_league = [...leagueSlugs].filter((s) => MAJOR_LEAGUES.has(s));
  }
  if (rink.updated_at) {
    const ageDays = (Date.now() - new Date(rink.updated_at).getTime()) / (24 * 3600 * 1000);
    if (ageDays <= 90) {
      score += 10;
      signals.updated_recently = Math.round(ageDays) + 'd';
    }
  }
  if (score > 100) score = 100;

  return { score, signals };
}

async function main() {
  console.log(`[seed-b2b-prospects] limit=${limit} dryRun=${dryRun}`);
  const rinks = await fetchUnclaimedRinksWithWebsites();
  console.log(`[seed-b2b-prospects] fetched ${rinks.length} rinks with websites`);

  const stats = { inserted: 0, updated: 0, skipped: 0, dry_run_inserted: 0 };
  const errors = [];

  for (const rink of rinks) {
    try {
      const [activities, teams] = await Promise.all([
        fetchActivitiesForRink(rink.id),
        fetchTeamsByRink(rink.id),
      ]);

      const leagueIds = teams.map((t) => t.league_id).filter(Boolean);
      const leagueSlugs = await fetchLeagueSlugs(leagueIds);

      const { score, signals } = scoreRink(rink, activities.length, leagueSlugs);

      // Threshold: only insert worth-following prospects.
      if (score < 40) {
        stats.skipped += 1;
        continue;
      }

      const existing = await findExistingProspect(rink.id);

      const baseRow = {
          kind: 'rink',
          display_name: rink.name,
          city: rink.city,
          region: rink.state_province,
          country: rink.country,
          website: rink.website,
          contact_email: rink.contact_email || null,
          source: 'auto:unclaimed_rink',
          rink_id: rink.id,
          priority_score: score,
          priority_signals: signals,
          outreach_status: existing?.outreach_status || 'new',
        };

      if (existing) {
        // Update priority + signals only if new score is higher OR status
        // is still 'new' (don't override human-set priorities).
        const newPriority = score > (existing.priority_score || 0) ? score : existing.priority_score;
        const updateRow = { ...baseRow, priority_score: newPriority };
        if (!dryRun) {
          const { error: uErr } = await supabase
            .from('b2b_prospects')
            .update(updateRow)
            .eq('id', existing.id);
          if (uErr) {
            errors.push(`update ${rink.id}: ${uErr.message}`);
            continue;
          }
        }
        stats.updated += 1;
      } else {
        if (!dryRun) {
          const { error: iErr } = await supabase.from('b2b_prospects').insert(baseRow);
          if (iErr) {
            errors.push(`insert ${rink.id}: ${iErr.message}`);
            continue;
          }
        }
        stats.dry_run_inserted += 1;
        stats.inserted += 1;
      }
    } catch (err) {
      errors.push(`rink ${rink.id}: ${err.message}`);
    }
  }

  console.log('[seed-b2b-prospects] stats', stats);
  if (errors.length > 0) {
    console.log('[seed-b2b-prospects] errors:');
    for (const e of errors.slice(0, 10)) console.log('  ', e);
  }
}

main().catch((err) => {
  console.error('[seed-b2b-prospects] fatal', err);
  process.exit(1);
});