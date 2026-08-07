#!/usr/bin/env node
// scripts/cron-wizard-nudge.mjs
// WS14 PR2 — wizard step granularity.
//
// Emits a `wizard_incomplete` consumer notification for any user whose
// family_setup_completed_at IS NULL and who hasn't had a nudge in the
// last 7 days. Uses real wizard progress (persona-aware step count +
// persona-aware body copy) instead of the previous hardcoded "2 of 5".
//
// Design choices:
//   - Skip if the user already has an unread wizard_incomplete row
//     (no stacking; the cron stays idempotent).
//   - Skip if the most-recent wizard_incomplete row was created within
//     the snooze window (default 7d). This is the "don't re-pester"
//     gate; the inbox has a Dismiss action that clears snooze for the
//     user — cron honours that.
//   - Uses loadWizardProgress() equivalent logic (inline JS copy of the
//     PersonaCopy steps logic from FamilySetupWizard.tsx).
//
// Idempotency:
//   - Source key = `wizard_incomplete:nightly`. Re-runs see the existing
//     unread row and skip (no double-insert).
//   - The snooze window means at most 1 row per 7d per user.

import './load-secrets.mjs';
import { createClient } from '@supabase/supabase-js';

const SNOOZE_WINDOW_DAYS = 7;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// ---------------------------------------------------------------------------
// Persona-aware nudge copy — mirrors wizardIncompleteBody() in wizardState.ts.
// Keep in sync with the TypeScript version.
// ---------------------------------------------------------------------------
function wizardIncompleteBody(persona, stepCount, totalSteps) {
  const prefix = `You're ${stepCount} of ${totalSteps} steps in.`;
  switch (persona) {
    case 'parent':
      return `${prefix} The wizard helps you link your kids, claim home rinks, and build their Hockey Passports.`;
    case 'coach':
      return `${prefix} The wizard helps you link your team and set up your coaching credentials.`;
    case 'player':
      return `${prefix} The wizard helps you join a team and start your Hockey Passport.`;
    case 'official':
      return `${prefix} The wizard helps you register as an official and add your certification.`;
    case 'operator':
      return `${prefix} The wizard helps you link your organization and invite your coaches and players.`;
    case 'generic':
    default:
      return `${prefix} The wizard helps you build out your Hockey Passport.`;
  }
}

// ---------------------------------------------------------------------------
// Wizard progress — inline equivalent of loadWizardProgress() from wizardState.ts.
// Counts reachable (non-comingNext) steps where done=true.
// Mirrors PERSONA_COPY logic from FamilySetupWizard.tsx.
// ---------------------------------------------------------------------------

// Returns { persona, stepCount, totalSteps } for a given user.
async function loadWizardProgress(userId) {
  // Load account types to derive persona.
  const { data: accountTypes } = await supabase
    .from('profile_account_types')
    .select('account_type, is_primary')
    .eq('user_id', userId)
    .limit(10);

  let persona = 'generic';
  if (accountTypes && accountTypes.length > 0) {
    const primary = accountTypes.find((r) => r.is_primary) ?? accountTypes[0];
    persona = accountTypeToPersona(primary.account_type);
  }

  // Load wizard state booleans.
  const [
    childrenRes,
    teamRes,
    childIdsRes,
    coachRes,
    orgRes,
    refereeRes,
    countryRes,
  ] = await Promise.all([
    supabase
      .from('managed_profiles')
      .select('id', { count: 'exact', head: true })
      .eq('manager_user_id', userId),
    supabase
      .from('team_members')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('left_at', null),
    supabase
      .from('managed_profiles')
      .select('profile_id')
      .eq('manager_user_id', userId)
      .eq('profile_type', 'player'),
    supabase
      .from('coaches')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
    supabase
      .from('organization_members')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
    supabase
      .from('referees')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
    supabase
      .from('profile_country_context')
      .select('user_id', { count: 'exact', head: true })
      .eq('user_id', userId),
  ]);

  const state = {
    hasChildren: (childrenRes.count ?? 0) > 0,
    hasTeamMembership: (teamRes.count ?? 0) > 0,
    hasDocuments: false, // documents step only relevant for parent; conservatively false
    hasCoachProfile: (coachRes.count ?? 0) > 0,
    hasOrgMembership: (orgRes.count ?? 0) > 0,
    hasOfficialRegistration: (refereeRes.count ?? 0) > 0,
    hasCountry: (countryRes.count ?? 0) > 0,
  };

  // Count reachable steps (non-comingNext) for this persona.
  const steps = buildSteps(persona, state, false);
  const reachable = steps.filter((s) => !s.comingNext);
  const completed = reachable.filter((s) => s.done);

  return {
    persona,
    stepCount: completed.length,
    totalSteps: reachable.length,
  };
}

// Maps AccountType string -> WizardPersona.
// Mirrors accountTypeToPersona() in FamilySetupWizard.tsx.
function accountTypeToPersona(accountType) {
  switch (accountType) {
    case 'parent': return 'parent';
    case 'coach':
    case 'scout': return 'coach';
    case 'player': return 'player';
    case 'referee': return 'official';
    case 'team_admin':
    case 'league_admin':
    case 'rink_operator': return 'operator';
    default: return 'generic';
  }
}

// Build the steps array for a given persona + state.
// Mirrors PERSONA_COPY[persona].steps() from FamilySetupWizard.tsx.
// Total steps = 7 across all personas (PR #115 country step).
function buildSteps(persona, s, identityVerified) {
  const countryDone = s.hasCountry;
  const steps = [
    { number: 1, title: 'Complete your Hockey Identity', done: identityVerified },
    { number: 2, title: 'Set your country', done: countryDone },
  ];

  switch (persona) {
    case 'parent':
      steps.push(
        { number: 3, title: 'Add your children', done: s.hasChildren },
        { number: 4, title: 'Upload important hockey documents', done: s.hasDocuments },
        { number: 5, title: 'Create your first Hockey Passport', done: false, comingNext: true },
        { number: 6, title: 'Import your existing schedule (optional)', done: false, comingNext: true },
        { number: 7, title: 'Invite your team or organization', done: s.hasTeamMembership },
      );
      break;
    case 'coach':
      steps.push(
        { number: 3, title: 'Link your team', done: s.hasCoachProfile },
        { number: 4, title: 'Set your coaching credentials', done: s.hasCoachProfile },
        { number: 5, title: 'Create your Hockey Passport', done: identityVerified },
        { number: 6, title: 'Import your existing schedule (optional)', done: false, comingNext: true },
        { number: 7, title: 'Invite your team or organization', done: s.hasTeamMembership },
      );
      break;
    case 'player':
      steps.push(
        { number: 3, title: 'Add your player profile', done: false, comingNext: true },
        { number: 4, title: 'Upload your hockey documents', done: false, comingNext: true },
        { number: 5, title: 'Create your Hockey Passport', done: identityVerified },
        { number: 6, title: 'Import your existing schedule (optional)', done: false, comingNext: true },
        { number: 7, title: 'Find your team or league', done: s.hasTeamMembership },
      );
      break;
    case 'official':
      steps.push(
        { number: 3, title: 'Add your official profile', done: s.hasOfficialRegistration },
        { number: 4, title: 'Upload your certification documents', done: s.hasOfficialRegistration },
        { number: 5, title: 'Create your Hockey Passport', done: identityVerified },
        { number: 6, title: 'Import your existing schedule (optional)', done: false, comingNext: true },
        { number: 7, title: 'Connect with leagues and rinks', done: s.hasTeamMembership },
      );
      break;
    case 'operator':
      steps.push(
        { number: 3, title: 'Add your organization', done: s.hasOrgMembership },
        { number: 4, title: 'Set up your facility profile', done: false, comingNext: true },
        { number: 5, title: 'Create your Hockey Passport', done: identityVerified },
        { number: 6, title: 'Import your existing schedule (optional)', done: false, comingNext: true },
        { number: 7, title: 'Invite your coaches and players', done: s.hasTeamMembership },
      );
      break;
    default: // generic
      steps.push(
        { number: 3, title: 'Set up your profile', done: false, comingNext: true },
        { number: 4, title: 'Add your hockey roles', done: false, comingNext: true },
        { number: 5, title: 'Create your Hockey Passport', done: identityVerified },
        { number: 6, title: 'Import your existing schedule (optional)', done: false, comingNext: true },
        { number: 7, title: 'Connect with teams and leagues', done: s.hasTeamMembership },
      );
  }
  return steps;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('[cron:wizard-nudge] starting at', new Date().toISOString());

  // Find candidates: any user with family_setup_completed_at IS NULL.
  // Previously filtered on account_type='parent' (workaround for parent-flavored
  // copy). Persona-aware copy now handles all personas — filter dropped.
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('user_id, created_at, family_setup_completed_at')
    .is('family_setup_completed_at', null)
    .limit(1000);

  if (error) {
    console.error('[cron:wizard-nudge] profiles read failed:', error);
    process.exit(1);
  }

  if (!profiles || profiles.length === 0) {
    console.log('[cron:wizard-nudge] no incomplete-wizard profiles; done.');
    return;
  }

  console.log(`[cron:wizard-nudge] ${profiles.length} users with wizard incomplete`);

  // Filter to users whose most-recent wizard_incomplete row is outside the snooze window.
  const userIds = profiles.map((p) => p.user_id);
  const snoozeCutoff = new Date(
    Date.now() - SNOOZE_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data: recent, error: recentErr } = await supabase
    .from('consumer_notifications')
    .select('user_id, created_at')
    .eq('kind', 'wizard_incomplete')
    .in('user_id', userIds)
    .gt('created_at', snoozeCutoff)
    .is('snooze_until', null);

  if (recentErr) {
    console.error('[cron:wizard-nudge] recent rows read failed:', recentErr);
    process.exit(1);
  }

  const recentlyNudged = new Set((recent || []).map((r) => r.user_id));
  const candidates = profiles.filter((p) => !recentlyNudged.has(p.user_id));
  console.log(`[cron:wizard-nudge] ${candidates.length} candidates after snooze filter`);

  if (candidates.length === 0) {
    console.log('[cron:wizard-nudge] nothing to do; done.');
    return;
  }

  let inserted = 0;
  let skipped = 0;
  let failed = 0;

  for (const p of candidates) {
    try {
      // Check for existing unread row.
      const { data: existing } = await supabase
        .from('consumer_notifications')
        .select('id, read_at')
        .eq('user_id', p.user_id)
        .eq('kind', 'wizard_incomplete')
        .eq('source_key', 'wizard_incomplete:nightly')
        .maybeSingle();

      if (existing && !existing.read_at) {
        skipped++;
        continue;
      }

      // Load real wizard progress (persona + step count).
      const progress = await loadWizardProgress(p.user_id);

      const { error: insErr } = await supabase.from('consumer_notifications').insert({
        user_id: p.user_id,
        kind: 'wizard_incomplete',
        source_key: 'wizard_incomplete:nightly',
        player_id: null,
        title: 'Finish your Hockey Passport setup',
        body: wizardIncompleteBody(progress.persona, progress.stepCount, progress.totalSteps),
        metadata: {
          action_url: '/dashboard',
          action_label: 'Resume wizard',
          step_count: progress.stepCount,
          total_steps: progress.totalSteps,
        },
        snooze_until: null,
      });

      if (insErr) {
        if (insErr.code === '23505') {
          skipped++;
          continue;
        }
        console.error(`[cron:wizard-nudge] insert failed for ${p.user_id}:`, insErr);
        failed++;
        continue;
      }
      inserted++;
    } catch (err) {
      console.error(`[cron:wizard-nudge] unexpected error for ${p.user_id}:`, err);
      failed++;
    }
  }

  console.log('[cron:wizard-nudge] summary:', JSON.stringify({
    candidates: candidates.length,
    inserted,
    skipped,
    failed,
  }, null, 2));
  console.log('[cron:wizard-nudge] done at', new Date().toISOString());
}

main().catch((err) => {
  console.error('[cron:wizard-nudge] fatal:', err);
  process.exit(2);
});
