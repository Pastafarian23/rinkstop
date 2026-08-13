'use client';

/**
 * FamilySetupWizard
 *
 * Phase 1a (Consumer-First Growth) — prep doc §3.2.
 * Approved by Arnel 2026-07-05 18:23 CDT.
 *
 * 2026-07-21: Persona-aware refactor (Arnel-flagged "setup is too parent-
 * centric, optimize based on the user"). Now branches steps + copy on the
 * user's primary persona. Personas are derived from `profile_account_types`
 * in the dashboard, where `primary` wins, else the first entry in the
 * array, else 'generic'. Categories:
 *   - parent: current 6-step flow (unchanged)
 *   - coach: identity → link team → credentials → passport → schedule → connect
 *   - player: identity → join team → player profile → passport → schedule → connect
 *   - official: identity → credentials → register league → passport → schedule → connect
 *   - operator: identity → link org → invite coaches → org passport → schedule → set rosters
 *   - generic (multi-persona or unrecognized): identity → profile → community → passport → schedule → connect
 *
 * File name kept as `FamilySetupWizard.tsx` for git history continuity; the
 * `family` directory is now misleading and a future rename can land
 * separately. The wizard is the same component, just with a `persona` prop.
 *
 * Per Arnel 2026-07-22: the wizard is now MANDATORY — no dismiss option.
 * The wizard stays visible until the user has actually completed every
 * available step. Steps marked `comingNext: true` (features not yet
 * built) are auto-counted as acknowledged for completion purposes — the
 * user has seen them and that's enough; we don't block the wizard on
 * missing features.
 *
 * The completion marker (profiles.family_setup_completed_at) is written
 * automatically via an effect once every step is `done || comingNext`.
 * The user no longer needs to take any explicit action to close the
 * wizard — it just hides itself when all reachable steps are done.
 *
 * Why client-side: the completion fetch needs a useEffect to fire.
 * The actual gating logic (whether to render at all) is server-side in
 * the dashboard page (see src/app/dashboard/page.tsx).
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  type WizardPersona,
  accountTypeToPersona,
} from '@/lib/wizardState';

export interface FamilySetupWizardState {
  /** Identity verified via Didit (per isIdentityVerified helper) */
  identityVerified: boolean;
  /** User has a primary country set on profile_country_context (WS13 PR4).
   *  Drives federation dropdown scoping via v_user_visible_certifications. */
  hasCountry: boolean;
  /** User has at least one linked child via managed_profiles (parent-only) */
  hasChildren: boolean;
  /** User has an avatar set */
  hasAvatar: boolean;
  /** User has at least one team_member row (player: joined a team) */
  hasTeamMembership: boolean;
  /** User has at least one active player_document for any linked child (parent-only) */
  hasDocuments: boolean;
  /** User has at least one row in `coaches` for them (coach: profile created) */
  hasCoachProfile: boolean;
  /** User has at least one row in `organization_members` for them (operator: org linked) */
  hasOrgMembership: boolean;
  /** User has a referee/official profile — used as a proxy for step-2 done for official persona */
  hasOfficialRegistration: boolean;
}

interface FamilySetupWizardProps {
  state: FamilySetupWizardState;
  /** First name for the greeting line (optional) */
  firstName?: string | null;
  /** Persona selected by the server-side gate; drives copy + steps */
  persona: WizardPersona;
}

interface Step {
  number: number;
  title: string;
  description: string;
  cta: { label: string; href: string };
  done: boolean;
  /** When true, the CTA is a "coming next" disabled button (Phase 1b surface) */
  comingNext?: boolean;
}

/**
 * Persona-specific copy bundle. Header line + the
 * 7-step template. Step 1 (identity) + step 4 (passport) + step 5
 * (schedule, comingNext) are universal; the country step (WS13 PR4) is
 * universal too; steps 3, 6, 7 vary by persona.
 */
interface PersonaCopy {
  /** Substring shown in the header paragraph (e.g. "your family's Hockey Identity") */
  identityNoun: string;
  steps: (
    state: FamilySetupWizardState,
    identityVerified: boolean
  ) => Step[];
}

/**
 * Universal country step (WS13 PR4). Same shape + copy across personas —
 * country is foundational metadata, not persona-specific. Placed at step 2
 * (right after identity verification) because it gates federation dropdown
 * scoping (v_user_visible_certifications) which is referenced in the
 * persona-specific credential steps below.
 */
const COUNTRY_STEP = (s: FamilySetupWizardState): Step => ({
  number: 2,
  title: 'Set your country',
  description: s.hasCountry
    ? 'Your country is on file — federation dropdowns are scoped to your region.'
    : 'Pick your country so we can show the right hockey federations (e.g. USA Hockey, Hockey Canada, IIHF) on your Hockey Passport.',
  cta: {
    label: s.hasCountry ? 'Edit country' : 'Pick country',
    href: '/dashboard/profile#country',
  },
  done: s.hasCountry,
});

const PERSONA_COPY: Record<WizardPersona, PersonaCopy> = {
  parent: {
    identityNoun: 'your family’s Hockey Identity',
    steps: (s, identityVerified) => [
      {
        number: 1,
        title: 'Complete your Hockey Identity',
        description: identityVerified
          ? 'Verified — your Hockey Identity is live.'
          : 'Verify your identity (60 seconds) to earn the check on RinkStop.',
        cta: { label: identityVerified ? 'View verification' : 'Verify now', href: '/dashboard/identity' },
        done: identityVerified,
      },
      COUNTRY_STEP(s),
      {
        number: 3,
        title: 'Add your children',
        description: s.hasChildren
          ? 'Your kids are linked — your Family Hub is alive.'
          : 'Link your first child to start your Family Hub.',
        cta: { label: 'Add a child', href: '/dashboard/family' },
        done: s.hasChildren,
      },
      {
        number: 4,
        title: 'Upload important hockey documents',
        description: s.hasDocuments
          ? 'Your child’s documents are uploaded and ready.'
          : 'Upload a birth certificate, waiver, or medical form to start your child’s Hockey Passport.',
        cta: { label: s.hasDocuments ? 'Manage documents' : 'Upload a document', href: '/dashboard/family' },
        done: s.hasDocuments,
      },
      {
        number: 5,
        title: 'Create your first Hockey Passport',
        description: 'Your Hockey Passport is the permanent record of your child’s hockey career — verified identity, photo, achievements, and team history.',
        cta: { label: 'View your passport', href: '/dashboard/profile' },
        done: s.hasAvatar && identityVerified,
      },
      {
        number: 6,
        title: 'Import your existing schedule (optional)',
        description: 'Calendar import ships in Phase 1b. We will let you bring games, practices, and tournaments from any calendar app.',
        cta: { label: 'Coming next', href: '#' },
        done: false,
        comingNext: true,
      },
      {
        number: 7,
        title: 'Invite your team or organization',
        description: 'Find your club, coach, or league. (Family-initiated invitations ship in Phase 2 — for now, you can browse the directory.)',
        cta: { label: 'Browse the directory', href: '/directory/teams' },
        done: s.hasTeamMembership,
      },
    ],
  },

  coach: {
    identityNoun: 'your Hockey Identity as a coach',
    steps: (s, identityVerified) => [
      {
        number: 1,
        title: 'Complete your Hockey Identity',
        description: identityVerified
          ? 'Verified — your Hockey Identity is live.'
          : 'Verify your identity (60 seconds) to earn the check on RinkStop.',
        cta: { label: identityVerified ? 'View verification' : 'Verify now', href: '/dashboard/identity' },
        done: identityVerified,
      },
      COUNTRY_STEP(s),
      {
        number: 3,
        title: 'Link your team',
        description: s.hasCoachProfile
          ? 'Your team is linked to your coach profile.'
          : 'Link your first team to start receiving roster and schedule updates.',
        cta: { label: s.hasCoachProfile ? 'Manage teams' : 'Link a team', href: '/dashboard/coach' },
        done: s.hasCoachProfile,
      },
      {
        number: 4,
        title: 'Set your coaching credentials',
        description: 'Add your certification, league affiliation, and coaching history to earn the coach check.',
        cta: { label: 'Add credentials', href: '/dashboard/coach' },
        done: false,
      },
      {
        number: 5,
        title: 'Create your Hockey Passport',
        description: 'Your Hockey Passport is the permanent record of your hockey career — verified identity, photo, teams you’ve coached, and credentials.',
        cta: { label: 'View your passport', href: '/dashboard/profile' },
        done: s.hasAvatar && identityVerified,
      },
      {
        number: 6,
        title: 'Import your existing schedule (optional)',
        description: 'Calendar import ships in Phase 1b. We will let you bring games, practices, and tournaments from any calendar app.',
        cta: { label: 'Coming next', href: '#' },
        done: false,
        comingNext: true,
      },
      {
        number: 7,
        title: 'Connect with players and organizations',
        description: 'Discover players and organizations to coach, mentor, or recruit.',
        cta: { label: 'Browse the directory', href: '/directory/teams' },
        done: s.hasTeamMembership,
      },
    ],
  },

  player: {
    identityNoun: 'your Hockey Identity as a player',
    steps: (s, identityVerified) => [
      {
        number: 1,
        title: 'Complete your Hockey Identity',
        description: identityVerified
          ? 'Verified — your Hockey Identity is live.'
          : 'Verify your identity (60 seconds) to earn the check on RinkStop.',
        cta: { label: identityVerified ? 'View verification' : 'Verify now', href: '/dashboard/identity' },
        done: identityVerified,
      },
      COUNTRY_STEP(s),
      {
        number: 3,
        title: 'Join your first team',
        description: s.hasTeamMembership
          ? 'You’re on a team — your roster is live.'
          : 'Join your first team to start your Hockey Passport.',
        cta: { label: s.hasTeamMembership ? 'View teams' : 'Find a team', href: '/directory/teams' },
        done: s.hasTeamMembership,
      },
      {
        number: 4,
        title: 'Set up your player profile',
        description: 'Add your number, position, handedness, and equipment preferences.',
        cta: { label: 'Edit player profile', href: '/dashboard/profile' },
        done: s.hasAvatar,
      },
      {
        number: 5,
        title: 'Create your Hockey Passport',
        description: 'Your Hockey Passport is the permanent record of your hockey career — verified identity, photo, team history, and achievements.',
        cta: { label: 'View your passport', href: '/dashboard/profile' },
        done: s.hasAvatar && identityVerified,
      },
      {
        number: 6,
        title: 'Import your existing schedule (optional)',
        description: 'Calendar import ships in Phase 1b. We will let you bring games, practices, and tournaments from any calendar app.',
        cta: { label: 'Coming next', href: '#' },
        done: false,
        comingNext: true,
      },
      {
        number: 7,
        title: 'Connect with coaches and teams',
        description: 'Find coaches in your area and teams that match your level.',
        cta: { label: 'Browse the directory', href: '/directory/teams' },
        done: false,
      },
    ],
  },

  official: {
    identityNoun: 'your Hockey Identity as an official',
    steps: (s, identityVerified) => [
      {
        number: 1,
        title: 'Complete your Hockey Identity',
        description: identityVerified
          ? 'Verified — your Hockey Identity is live.'
          : 'Verify your identity (60 seconds) to earn the check on RinkStop.',
        cta: { label: identityVerified ? 'View verification' : 'Verify now', href: '/dashboard/identity' },
        done: identityVerified,
      },
      COUNTRY_STEP(s),
      {
        number: 3,
        title: 'Register as an official',
        description: s.hasOfficialRegistration
          ? 'Your official registration is on file.'
          : 'Add your officiating level, certification, and the leagues you work.',
        cta: { label: s.hasOfficialRegistration ? 'View registration' : 'Register', href: '/dashboard/referee' },
        done: s.hasOfficialRegistration,
      },
      {
        number: 4,
        title: 'Add your certification',
        description: 'Upload your certification documents to earn the official check on RinkStop.',
        cta: { label: 'Add certification', href: '/dashboard/referee' },
        done: false,
      },
      {
        number: 5,
        title: 'Create your Hockey Passport',
        description: 'Your Hockey Passport is the permanent record of your officiating career — verified identity, certification, and games worked.',
        cta: { label: 'View your passport', href: '/dashboard/profile' },
        done: s.hasAvatar && identityVerified,
      },
      {
        number: 6,
        title: 'Import your existing schedule (optional)',
        description: 'Calendar import ships in Phase 1b. We will let you bring games and assignments from any calendar app.',
        cta: { label: 'Coming next', href: '#' },
        done: false,
        comingNext: true,
      },
      {
        number: 7,
        title: 'Connect with leagues and assignors',
        description: 'Find leagues and assignors who need officials at your level.',
        cta: { label: 'Browse the directory', href: '/directory/teams' },
        done: false,
      },
    ],
  },

  operator: {
    identityNoun: 'your organization’s Hockey Identity',
    steps: (s, identityVerified) => [
      {
        number: 1,
        title: 'Complete your Hockey Identity',
        description: identityVerified
          ? 'Verified — your Hockey Identity is live.'
          : 'Verify your identity (60 seconds) to earn the check on RinkStop.',
        cta: { label: identityVerified ? 'View verification' : 'Verify now', href: '/dashboard/identity' },
        done: identityVerified,
      },
      COUNTRY_STEP(s),
      {
        number: 3,
        title: 'Link your organization',
        description: s.hasOrgMembership
          ? 'Your organization is linked — your admin dashboard is live.'
          : 'Link your organization (rink, club, league, or association) to unlock admin tools.',
        cta: { label: s.hasOrgMembership ? 'Manage organization' : 'Link an org', href: '/dashboard/manage' },
        done: s.hasOrgMembership,
      },
      {
        number: 4,
        title: 'Invite coaches and players',
        description: 'Send invites to your coaches and players so they can claim profiles and join your org.',
        cta: { label: 'Send invites', href: '/dashboard/coach-feed' },
        done: false,
      },
      {
        number: 5,
        title: 'Create your organization’s passport',
        description: 'Your organization’s Hockey Passport is the public profile for your club, rink, or league — verified identity, teams, and history.',
        cta: { label: 'View your passport', href: '/dashboard/profile' },
        done: s.hasAvatar && identityVerified,
      },
      {
        number: 6,
        title: 'Import your existing schedule (optional)',
        description: 'Calendar import ships in Phase 1b. We will let you bring games and events from any calendar app.',
        cta: { label: 'Coming next', href: '#' },
        done: false,
        comingNext: true,
      },
      {
        number: 7,
        title: 'Set your team rosters',
        description: 'Add teams, assign coaches, and manage rosters from one place.',
        cta: { label: 'Manage rosters', href: '/directory/teams' },
        done: false,
      },
    ],
  },

  generic: {
    identityNoun: 'your Hockey Identity',
    steps: (s, identityVerified) => [
      {
        number: 1,
        title: 'Complete your Hockey Identity',
        description: identityVerified
          ? 'Verified — your Hockey Identity is live.'
          : 'Verify your identity (60 seconds) to earn the check on RinkStop.',
        cta: { label: identityVerified ? 'View verification' : 'Verify now', href: '/dashboard/identity' },
        done: identityVerified,
      },
      COUNTRY_STEP(s),
      {
        number: 3,
        title: 'Build out your profile',
        description: 'Add the details that make your Hockey Passport yours — display name, avatar, bio, location.',
        cta: { label: 'Edit profile', href: '/dashboard/profile' },
        done: s.hasAvatar,
      },
      {
        number: 4,
        title: 'Connect with the hockey community',
        description: 'Find teams, coaches, and organizations that match what you do.',
        cta: { label: 'Browse the directory', href: '/directory/teams' },
        done: s.hasTeamMembership,
      },
      {
        number: 5,
        title: 'Create your Hockey Passport',
        description: 'Your Hockey Passport is the permanent record of your hockey identity — verified, public, and yours forever.',
        cta: { label: 'View your passport', href: '/dashboard/profile' },
        done: s.hasAvatar && identityVerified,
      },
      {
        number: 6,
        title: 'Import your existing schedule (optional)',
        description: 'Calendar import ships in Phase 1b. We will let you bring games, practices, and tournaments from any calendar app.',
        cta: { label: 'Coming next', href: '#' },
        done: false,
        comingNext: true,
      },
      {
        number: 7,
        title: 'Connect with teams and organizations',
        description: 'Discover what’s around you — rinks, leagues, clubs, and tournaments.',
        cta: { label: 'Browse the directory', href: '/directory/teams' },
        done: false,
      },
    ],
  },
};

/**
 * Re-exported from '@/lib/wizardState' so existing imports
 * (`import { accountTypeToPersona } from '@/components/family/FamilySetupWizard'`)
 * continue to work. New code should import from the lib path directly.
 */
export { accountTypeToPersona } from '@/lib/wizardState';

export default function FamilySetupWizard({ state, firstName, persona }: FamilySetupWizardProps) {
  const router = useRouter();

  const copy = PERSONA_COPY[persona] ?? PERSONA_COPY.generic;
  const steps = copy.steps(state, state.identityVerified);

  const completedCount = steps.filter((s) => s.done).length;
  const progressPct = Math.round((completedCount / steps.length) * 100);

  // 2026-07-22 (Arnel): wizard is mandatory. Auto-mark complete when every
  // reachable step is done OR acknowledged (comingNext). The fetch is
  // idempotent — the server's `mark_complete` action only writes the
  // completion timestamp once (or re-stamps if missing).
  //
  // Steps with `comingNext: true` are features not yet built. We don't
  // block completion on them — the user has seen them, the wizard can
  // close, and the actual feature will land later.
  const allReachableDone = steps.every((s) => s.done || s.comingNext);
  useEffect(() => {
    if (!allReachableDone) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/family/setup-state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'mark_complete' }),
        });
        if (!res.ok) {
          console.error('[FamilySetupWizard] mark_complete failed:', res.status, await res.text().catch(() => ''));
          return;
        }
        if (!cancelled) router.refresh();
      } catch (e) {
        console.error('[FamilySetupWizard] mark_complete error:', e);
      }
    })();
    return () => { cancelled = true; };
  }, [allReachableDone, router]);

  if (allReachableDone) {
    // Soft-hide after the server confirms completion (via the refresh above
    // flipping the gate). Until then we still show the wizard so the user
    // sees the progress bar fill to 100% before it disappears.
    return null;
  }

  return (
    <div
      data-testid="family-setup-wizard"
      style={{
        background: 'linear-gradient(180deg, #0f0f0f 0%, #0a0f1a 100%)',
        border: '1px solid rgba(20,184,166,0.4)',
        borderRadius: 12,
        padding: '1.5rem 1.75rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        boxShadow: '0 0 0 1px rgba(20,184,166,0.08) inset',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div style={{ fontSize: '1.5rem' }} aria-hidden>🏒</div>
        <div style={{ flex: '1 1 280px', minWidth: 240 }}>
          <h2 style={{
            fontFamily: "'Bebas Neue', Impact, sans-serif",
            fontSize: '1.5rem',
            color: '#fff',
            letterSpacing: '0.05em',
            margin: 0,
          }}>
            SET UP YOUR HOCKEY PASSPORT
          </h2>
          <p style={{
            color: 'rgba(255,255,255,0.65)',
            fontSize: '0.875rem',
            margin: '0.25rem 0 0',
            lineHeight: 1.5,
          }}>
            {firstName ? `${firstName}, ` : ''}
            {copy.identityNoun} lives here. Seven steps, ten minutes, yours forever.
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <span style={{
            color: '#14B8A6',
            fontSize: '0.875rem',
            fontWeight: 700,
            letterSpacing: '0.05em',
          }}>
            {completedCount} / {steps.length}
          </span>
          <div
            data-testid="wizard-progress-bar"
            style={{
              width: 120,
              height: 4,
              background: 'rgba(255,255,255,0.08)',
              borderRadius: 999,
              overflow: 'hidden',
            }}
          >
            <div style={{
              width: `${progressPct}%`,
              height: '100%',
              background: '#14B8A6',
              transition: 'width 0.3s ease',
            }} />
          </div>
        </div>
      </div>

      {/* Steps grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '0.75rem',
      }}>
        {steps.map((step) => (
          <div
            key={step.number}
            data-testid={`wizard-step-${step.number}`}
            data-step-state={step.done ? 'done' : step.comingNext ? 'coming-next' : 'pending'}
            style={{
              background: step.done ? 'rgba(20,184,166,0.06)' : '#0a0a0a',
              border: step.done
                ? '1px solid rgba(20,184,166,0.4)'
                : '1px solid #1e1e1e',
              borderRadius: 10,
              padding: '0.875rem 1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 999,
                  background: step.done ? '#14B8A6' : 'rgba(255,255,255,0.1)',
                  color: step.done ? '#0a0a0a' : '#fff',
                  fontSize: 11,
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
                aria-hidden
              >
                {step.done ? '\u2713' : step.number}
              </span>
              <span style={{
                color: '#fff',
                fontSize: '0.875rem',
                fontWeight: 600,
                flex: 1,
                minWidth: 0,
              }}>
                {step.title}
              </span>
            </div>
            <p style={{
              color: 'rgba(255,255,255,0.55)',
              fontSize: '0.75rem',
              margin: 0,
              lineHeight: 1.45,
            }}>
              {step.description}
            </p>
            <a
              href={step.comingNext ? undefined : step.cta.href}
              onClick={(e) => { if (step.comingNext) e.preventDefault(); }}
              aria-disabled={step.comingNext}
              style={{
                alignSelf: 'flex-start',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '0.4rem 0.75rem',
                borderRadius: 6,
                fontSize: '0.75rem',
                fontWeight: 700,
                textDecoration: 'none',
                letterSpacing: '0.02em',
                background: step.comingNext
                  ? 'rgba(255,255,255,0.04)'
                  : step.done
                    ? 'rgba(20,184,166,0.12)'
                    : '#14B8A6',
                color: step.comingNext
                  ? 'rgba(255,255,255,0.4)'
                  : step.done
                    ? '#14B8A6'
                    : '#0a0a0a',
                border: step.comingNext
                  ? '1px dashed rgba(255,255,255,0.15)'
                  : step.done
                    ? '1px solid rgba(20,184,166,0.4)'
                    : '1px solid transparent',
                cursor: step.comingNext ? 'not-allowed' : 'pointer',
                marginTop: 'auto',
              }}
            >
              {step.cta.label}
              {!step.comingNext && <span aria-hidden>→</span>}
            </a>
          </div>
        ))}
      </div>

      {/*
        2026-07-22 (Arnel): the dismiss row is gone. The wizard is mandatory
        and stays visible until every reachable step is complete. When the
        user finishes all steps, the useEffect above auto-calls the API to
        mark it complete and the wizard disappears on next refresh.
      */}
    </div>
  );
}