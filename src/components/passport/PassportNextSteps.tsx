/**
 * src/components/passport/PassportNextSteps.tsx
 *
 * Context-aware "Next Steps" navigation (Passport Dashboard).
 *
 * Workstream 2 rule: navigation links only. NOT new functionality.
 * Each link points to existing routes the user can already reach.
 */

import Link from 'next/link';
import type { PassportUnifiedView } from '@/lib/passport/types';

interface PassportNextStepsProps {
  view: PassportUnifiedView | null;
  hasPlayerProfile: boolean;
}

interface Step {
  id: string;
  label: string;
  href: string;
  done: boolean;
}

export function PassportNextSteps({ view, hasPlayerProfile }: PassportNextStepsProps) {
  // If we couldn't build the unified view (profile row missing), render an empty
  // pending list rather than crashing on `view.*` reads.
  if (!view) {
    return (
      <section aria-label="Passport Next Steps" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem' }}>
        Complete your profile to see next steps.
      </section>
    );
  }
  const steps: Step[] = [
    {
      id: 'claim',
      label: 'Claim your player profile',
      href: '/claim-your-listing',
      done: hasPlayerProfile || view.isPlayer,
    },
    {
      id: 'verify',
      label: 'Verify your identity',
      href: '/dashboard/identity',
      done: view.verificationLevel !== 'none',
    },
    {
      id: 'team',
      label: 'Join or create a team',
      href: '/dashboard/listings',
      done: view.hockeyTeamCount > 0,
    },
    {
      id: 'family',
      label: 'Connect family members',
      href: '/dashboard/family',
      done: view.managedProfileCount > 0,
    },
    {
      id: 'photo',
      label: 'Upload a profile photo',
      href: '/dashboard/profile',
      done: !!view.avatarUrl,
    },
    {
      id: 'bio',
      label: 'Complete your biography',
      href: '/dashboard/profile',
      done: view.hasHockeyHistory,
    },
  ];

  const pending = steps.filter((s) => !s.done);
  const completed = steps.filter((s) => s.done);

  const wrapperStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: '1.25rem 1.5rem',
    color: '#fff',
  };

  const headerStyle: React.CSSProperties = {
    fontFamily: "'Bebas Neue', Impact, sans-serif",
    fontSize: '0.875rem',
    letterSpacing: '0.1em',
    color: 'rgba(255,255,255,0.7)',
    margin: '0 0 1rem',
  };

  const stepStyle = (done: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '0.75rem',
    padding: '0.625rem 0.875rem',
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 8,
    textDecoration: 'none',
    color: '#fff',
    opacity: done ? 0.55 : 1,
  });

  return (
    <section aria-label="Passport Next Steps" style={wrapperStyle}>
      <h3 style={headerStyle}>NEXT STEPS</h3>
      <div style={{ display: 'grid', gap: '0.5rem' }}>
        {pending.map((s) => (
          <Link key={s.id} href={s.href} style={stepStyle(false)}>
            <span style={{ fontSize: '0.875rem' }}>{s.label}</span>
            <span aria-hidden="true" style={{ color: 'rgba(255,255,255,0.4)' }}>→</span>
          </Link>
        ))}
        {completed.length > 0 && (
          <details style={{ marginTop: '0.5rem' }}>
            <summary style={{
              fontSize: '0.75rem',
              color: 'rgba(255,255,255,0.4)',
              cursor: 'pointer',
              listStyle: 'none',
              padding: '0.25rem 0',
            }}>
              {completed.length} completed
            </summary>
            <div style={{ display: 'grid', gap: '0.5rem', marginTop: '0.5rem' }}>
              {completed.map((s) => (
                <Link key={s.id} href={s.href} style={stepStyle(true)}>
                  <span style={{ fontSize: '0.875rem', textDecoration: 'line-through' }}>{s.label}</span>
                  <span aria-hidden="true" style={{ color: 'rgba(255,184,28,0.6)' }}>✓</span>
                </Link>
              ))}
            </div>
          </details>
        )}
      </div>
    </section>
  );
}