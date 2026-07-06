'use client';

/**
 * FamilySetupWizard
 *
 * Phase 1a (Consumer-First Growth) — prep doc §3.2.
 * Approved by Arnel 2026-07-05 18:23 CDT.
 *
 * Renders a 6-step wizard card on /dashboard for parents on identity_plus+
 * (or business_listing+) who have not yet dismissed it. Hidden once
 * `profiles.family_setup_completed_at` is set.
 *
 * Steps:
 *   1. Complete your Hockey Identity (Didit verification at /dashboard/identity)
 *   2. Add your children (FamilySearch at /dashboard/family)
 *   3. Upload important hockey documents (1b-1 placeholder)
 *   4. Create your first Hockey Passport (/dashboard/profile)
 *   5. Import your existing schedule (1b-1 placeholder)
 *   6. Invite your team or organization (Phase 2 — for 1a, browse directory)
 *
 * Dismiss behavior: POST /api/family/setup-state with {action: 'dismiss'}.
 * Sets profiles.family_setup_completed_at = NOW() server-side. The wizard
 * will not render again until the user clicks "Resume Hockey Passport setup"
 * on /dashboard/family, which POSTs {action: 'resume'} to clear the column.
 *
 * Why client-side: the dismiss/resume action needs a button click handler
 * and a fetch to the API. The actual gating logic (whether to render at
 * all) is server-side in the dashboard page (see src/app/dashboard/page.tsx).
 */

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

export interface FamilySetupWizardState {
  /** Identity verified via Didit (per isIdentityVerified helper) */
  identityVerified: boolean;
  /** User has at least one linked child via managed_profiles */
  hasChildren: boolean;
  /** User has an avatar set */
  hasAvatar: boolean;
  /** User has at least one team_member row */
  hasTeamMembership: boolean;
  /** User has at least one active player_document for any linked child (Phase 1b-1) */
  hasDocuments: boolean;
}

interface FamilySetupWizardProps {
  state: FamilySetupWizardState;
  /** First name for the greeting line (optional) */
  firstName?: string | null;
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

export default function FamilySetupWizard({ state, firstName }: FamilySetupWizardProps) {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);
  const [pending, startTransition] = useTransition();

  const steps: Step[] = [
    {
      number: 1,
      title: 'Complete your Hockey Identity',
      description: state.identityVerified
        ? 'Verified — your Hockey Identity is live.'
        : 'Verify your identity (60 seconds) to earn the check on RinkStop.',
      cta: { label: state.identityVerified ? 'View verification' : 'Verify now', href: '/dashboard/identity' },
      done: state.identityVerified,
    },
    {
      number: 2,
      title: 'Add your children',
      description: state.hasChildren
        ? 'Your kids are linked — your Family Hub is alive.'
        : 'Link your first child to start your Family Hub.',
      cta: { label: 'Add a child', href: '/dashboard/family' },
      done: state.hasChildren,
    },
    {
      number: 3,
      title: 'Upload important hockey documents',
      description: state.hasDocuments
        ? 'Your child\u2019s documents are uploaded and ready.'
        : 'Upload a birth certificate, waiver, or medical form to start your child\u2019s Hockey Passport.',
      cta: { label: state.hasDocuments ? 'Manage documents' : 'Upload a document', href: '/dashboard/family' },
      done: state.hasDocuments,
    },
    {
      number: 4,
      title: 'Create your first Hockey Passport',
      description: 'Your Hockey Passport is the permanent record of your child\u2019s hockey career — verified identity, photo, achievements, and team history.',
      cta: { label: 'View your passport', href: '/dashboard/profile' },
      done: state.hasAvatar && state.identityVerified,
    },
    {
      number: 5,
      title: 'Import your existing schedule (optional)',
      description: 'Calendar import ships in Phase 1b. We will let you bring games, practices, and tournaments from any calendar app.',
      cta: { label: 'Coming next', href: '#' },
      done: false,
      comingNext: true,
    },
    {
      number: 6,
      title: 'Invite your team or organization',
      description: 'Find your club, coach, or league. (Family-initiated invitations ship in Phase 2 — for now, you can browse the directory.)',
      cta: { label: 'Browse the directory', href: '/directory/teams' },
      done: state.hasTeamMembership,
    },
  ];

  const completedCount = steps.filter((s) => s.done).length;
  const progressPct = Math.round((completedCount / steps.length) * 100);

  async function dismiss() {
    startTransition(async () => {
      try {
        const res = await fetch('/api/family/setup-state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'dismiss' }),
        });
        if (!res.ok) {
          // Don't hide the wizard on a server error — user should retry.
          console.error('[FamilySetupWizard] dismiss failed:', res.status, await res.text().catch(() => ''));
          return;
        }
        setDismissed(true);
        router.refresh();
      } catch (e) {
        console.error('[FamilySetupWizard] dismiss error:', e);
      }
    });
  }

  if (dismissed) {
    // Soft-hide after dismiss so the user gets immediate feedback.
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
            {firstName ? `${firstName}, your ` : 'Your '}
            family&rsquo;s Hockey Identity lives here. Six steps, ten minutes, yours forever.
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

      {/* Dismiss row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        flexWrap: 'wrap',
        paddingTop: '0.5rem',
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}>
        <span style={{
          color: 'rgba(255,255,255,0.45)',
          fontSize: '0.75rem',
        }}>
          You can come back anytime from the Family Hub.
        </span>
        <button
          type="button"
          onClick={dismiss}
          disabled={pending}
          data-testid="wizard-dismiss"
          style={{
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.15)',
            color: 'rgba(255,255,255,0.7)',
            padding: '0.4rem 0.85rem',
            borderRadius: 6,
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: pending ? 'wait' : 'pointer',
            opacity: pending ? 0.6 : 1,
          }}
        >
          {pending ? 'Saving\u2026' : 'Dismiss for now'}
        </button>
      </div>
    </div>
  );
}
