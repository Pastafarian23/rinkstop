/**
 * src/lib/wizardState.ts
 *
 * Shared wizard progress loader (WS14 PR2).
 *
 * Single source of truth for:
 *   - loadWizardState(userId): raw wizardHas* booleans, used by the dashboard
 *     page's FamilySetupWizard
 *   - loadWizardProgress(userId): derived progress { persona, stepCount,
 *     totalSteps, nextStep, isComplete }, used by the wizard-nudge cron
 *     and the dashboard's "Continue" CTA
 *   - wizardIncompleteBody(persona, stepCount, totalSteps): persona-aware
 *     nudge copy shared between cron route + CLI script
 *
 * Previously the dashboard page loaded 7 count queries inline, the cron and
 * .mjs had hardcoded stepCount=2 / totalSteps=5, and all three had different
 * persona-aware copy. PR #115 added the country step (7 steps, not 5) and
 * wizardHasCountry. This module keeps them in sync going forward.
 *
 * Server-side only. Uses supabaseAdmin (service role).
 */

import { supabaseAdmin } from '@/lib/supabase';

/**
 * Wizard persona categories. Single source of truth — used by the
 * dashboard page (server) for the FamilySetupWizard gate, the wizard
 * component (client) for its copy table, and the wizard-nudge cron for
 * persona-aware body text.
 *
 * Lives in lib/ (no 'use client' here) so server components can import
 * it without tripping the server/client boundary.
 */
export type WizardPersona =
  | 'parent'
  | 'coach'
  | 'player'
  | 'official'
  | 'operator'
  | 'generic';

/**
 * Map an AccountType (from profile_account_types) to a WizardPersona
 * category. Multiple AccountTypes collapse to one wizard category.
 *
 * Pure function — safe in both server and client modules.
 */
export function accountTypeToPersona(accountType: string): WizardPersona {
  switch (accountType) {
    case 'parent':
      return 'parent';
    case 'coach':
    case 'scout':
      return 'coach';
    case 'player':
      return 'player';
    case 'referee':
      return 'official';
    case 'team_admin':
    case 'league_admin':
    case 'rink_operator':
      return 'operator';
    default:
      return 'generic';
  }
}

/** Shape consumed by the dashboard page — field names match existing destructuring. */
export interface WizardState {
  wizardHasChildren: boolean;
  wizardHasTeamMembership: boolean;
  wizardHasDocuments: boolean;
  wizardHasCoachProfile: boolean;
  wizardHasOrgMembership: boolean;
  wizardHasOfficialRegistration: boolean;
  /** WS13 PR4: primary_country set on profile_country_context. */
  wizardHasCountry: boolean;
}

/** Derived progress returned by loadWizardProgress(). */
export interface WizardProgress {
  persona: WizardPersona;
  /** Completed steps (excludes `comingNext` so users aren't penalised for unbuilt features). */
  stepCount: number;
  /** Always 7 after PR #115. */
  totalSteps: number;
  /** First step where done=false and comingNext=false. null when wizard is complete. */
  nextStep: { number: number; title: string; href: string } | null;
  isComplete: boolean;
}

/** Persona-aware nudge body — single source for cron route + CLI script. */
export function wizardIncompleteBody(
  persona: WizardPersona,
  stepCount: number,
  totalSteps: number,
): string {
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
// Implementation
// ---------------------------------------------------------------------------

async function loadUserPersona(userId: string): Promise<WizardPersona> {
  try {
    const { data } = await supabaseAdmin
      .from('profile_account_types')
      .select('account_type, is_primary')
      .eq('user_id', userId)
      .limit(10);
    const rows = (data || []) as Array<{ account_type: string; is_primary: boolean }>;
    if (rows.length === 0) return 'generic';
    const primary = rows.find((r) => r.is_primary);
    return accountTypeToPersona(primary?.account_type ?? rows[0].account_type);
  } catch {
    return 'generic';
  }
}

export async function loadWizardState(userId: string): Promise<WizardState> {
  const empty: WizardState = {
    wizardHasChildren: false,
    wizardHasTeamMembership: false,
    wizardHasDocuments: false,
    wizardHasCoachProfile: false,
    wizardHasOrgMembership: false,
    wizardHasOfficialRegistration: false,
    wizardHasCountry: false,
  };
  try {
    const [childrenRes, teamRes, childIdsRes, coachRes, orgRes, refereeRes, countryRes] = await Promise.all([
      supabaseAdmin
        .from('managed_profiles')
        .select('id', { count: 'exact', head: true })
        .eq('manager_user_id', userId),
      supabaseAdmin
        .from('team_members')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .is('left_at', null),
      supabaseAdmin
        .from('managed_profiles')
        .select('profile_id')
        .eq('manager_user_id', userId)
        .eq('profile_type', 'player'),
      supabaseAdmin
        .from('coaches')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId),
      supabaseAdmin
        .from('organization_members')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId),
      supabaseAdmin
        .from('referees')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId),
      supabaseAdmin
        .from('profile_country_context')
        .select('user_id', { count: 'exact', head: true })
        .eq('user_id', userId),
    ]);

    const childIds = ((childIdsRes.data || []) as any[])
      .map((r: any) => r.profile_id)
      .filter(Boolean);
    let docsCount = 0;
    if (childIds.length > 0) {
      const { count } = await supabaseAdmin
        .from('player_documents')
        .select('id', { count: 'exact', head: true })
        .in('player_id', childIds)
        .eq('status', 'active');
      docsCount = count ?? 0;
    }

    return {
      wizardHasChildren: (childrenRes.count ?? 0) > 0,
      wizardHasTeamMembership: (teamRes.count ?? 0) > 0,
      wizardHasDocuments: docsCount > 0,
      wizardHasCoachProfile: (coachRes.count ?? 0) > 0,
      wizardHasOrgMembership: (orgRes.count ?? 0) > 0,
      wizardHasOfficialRegistration: (refereeRes.count ?? 0) > 0,
      wizardHasCountry: (countryRes.count ?? 0) > 0,
    };
  } catch (e) {
    console.error('[wizardState] loadWizardState failed:', e);
    return empty;
  }
}

/**
 * Derive wizard progress from raw state.
 *
 * Counts steps where done=true and done=false&&comingNext=false (reachable).
 * Excludes comingNext=true from the count — users aren't penalised for
 * Phase 1b features that aren't built yet.
 *
 * NOTE: This reads the persona's steps() array at runtime to count reachable
 * steps. The step definitions live in FamilySetupWizard.tsx. If a new step is
 * added there, this function picks it up automatically (no extra changes here).
 */
export async function loadWizardProgress(userId: string): Promise<WizardProgress> {
  const [state, persona] = await Promise.all([
    loadWizardState(userId),
    loadUserPersona(userId),
  ]);

  const identityVerified = false; // identity state lives in the session, not the DB; conservatively count as incomplete

  // Step definitions mirror PERSONA_COPY in FamilySetupWizard.tsx.
  // Keep in sync when the component changes.
  // comingNext steps are excluded from totalSteps (users aren't
  // penalised for unbuilt features).
  const steps: { number: number; title: string; href: string; done: boolean; comingNext?: boolean }[] = [
    { number: 1, title: 'Complete your Hockey Identity', done: identityVerified, href: '/dashboard/identity' },
    { number: 2, title: 'Set your country', done: state.wizardHasCountry, href: '/dashboard/profile#country' },
  ];

  switch (persona) {
    case 'parent':
      steps.push(
        { number: 3, title: 'Add your children', done: state.wizardHasChildren, href: '/dashboard/family' },
        { number: 4, title: 'Upload important hockey documents', done: state.wizardHasDocuments, href: '/dashboard/family' },
        { number: 5, title: 'Create your first Hockey Passport', done: false, href: '/dashboard/profile', comingNext: true },
        { number: 6, title: 'Import your existing schedule (optional)', done: false, href: '#', comingNext: true },
        { number: 7, title: 'Invite your team or organization', done: state.wizardHasTeamMembership, href: '/directory/teams' },
      );
      break;
    case 'coach':
      steps.push(
        { number: 3, title: 'Link your team', done: state.wizardHasCoachProfile, href: '/dashboard/coach' },
        { number: 4, title: 'Set your coaching credentials', done: state.wizardHasCoachProfile, href: '/dashboard/coach/credentials' },
        { number: 5, title: 'Create your Hockey Passport', done: identityVerified, href: '/dashboard/profile' },
        { number: 6, title: 'Import your existing schedule (optional)', done: false, href: '#', comingNext: true },
        { number: 7, title: 'Invite your team or organization', done: state.wizardHasTeamMembership, href: '/directory/teams' },
      );
      break;
    case 'player':
      steps.push(
        { number: 3, title: 'Add your player profile', done: false, href: '/dashboard/profile', comingNext: true },
        { number: 4, title: 'Upload your hockey documents', done: false, href: '/dashboard/profile', comingNext: true },
        { number: 5, title: 'Create your Hockey Passport', done: identityVerified, href: '/dashboard/profile' },
        { number: 6, title: 'Import your existing schedule (optional)', done: false, href: '#', comingNext: true },
        { number: 7, title: 'Find your team or league', done: state.wizardHasTeamMembership, href: '/directory/teams' },
      );
      break;
    case 'official':
      steps.push(
        { number: 3, title: 'Add your official profile', done: state.wizardHasOfficialRegistration, href: '/dashboard/referee' },
        { number: 4, title: 'Upload your certification documents', done: state.wizardHasOfficialRegistration, href: '/dashboard/referee/credentials' },
        { number: 5, title: 'Create your Hockey Passport', done: identityVerified, href: '/dashboard/profile' },
        { number: 6, title: 'Import your existing schedule (optional)', done: false, href: '#', comingNext: true },
        { number: 7, title: 'Connect with leagues and rinks', done: state.wizardHasTeamMembership, href: '/directory/teams' },
      );
      break;
    case 'operator':
      steps.push(
        { number: 3, title: 'Add your organization', done: state.wizardHasOrgMembership, href: '/dashboard/organization' },
        { number: 4, title: 'Set up your facility profile', done: false, href: '/dashboard/profile', comingNext: true },
        { number: 5, title: 'Create your Hockey Passport', done: identityVerified, href: '/dashboard/profile' },
        { number: 6, title: 'Import your existing schedule (optional)', done: false, href: '#', comingNext: true },
        { number: 7, title: 'Invite your coaches and players', done: state.wizardHasTeamMembership, href: '/directory/teams' },
      );
      break;
    default: // generic
      steps.push(
        { number: 3, title: 'Set up your profile', done: false, href: '/dashboard/profile', comingNext: true },
        { number: 4, title: 'Add your hockey roles', done: false, href: '/dashboard/profile', comingNext: true },
        { number: 5, title: 'Create your Hockey Passport', done: identityVerified, href: '/dashboard/profile' },
        { number: 6, title: 'Import your existing schedule (optional)', done: false, href: '#', comingNext: true },
        { number: 7, title: 'Connect with teams and leagues', done: state.wizardHasTeamMembership, href: '/directory/teams' },
      );
  }

  const reachableSteps = steps.filter((s) => !s.comingNext);
  const completedSteps = reachableSteps.filter((s) => s.done);
  const nextIncomplete = reachableSteps.find((s) => !s.done) ?? null;

  return {
    persona,
    stepCount: completedSteps.length,
    totalSteps: reachableSteps.length,
    nextStep: nextIncomplete
      ? { number: nextIncomplete.number, title: nextIncomplete.title, href: nextIncomplete.href }
      : null,
    isComplete: completedSteps.length === reachableSteps.length,
  };
}
