import Link from 'next/link';

interface Counts {
  drafts: number;
  upcomingEvents: number;
  openInvites: number;
  pendingPayments: number;
}

interface Props {
  teamSlug: string;
  counts: Counts;
}

interface QuickAction {
  href: string;
  icon: string;
  label: string;
  hint: string;
  badge?: number;
  accent: 'gold' | 'teal' | 'navy' | 'red';
}

export function AdminQuickActions({ teamSlug, counts }: Props) {
  const actions: QuickAction[] = [
    {
      href: `/dashboard/team/${teamSlug}#admin-posts`,
      icon: '📰',
      label: 'Post news',
      hint: 'Share an update with the team + your public profile',
      accent: 'teal',
    },
    {
      href: `/dashboard/team/${teamSlug}#admin-posts`,
      icon: '🏒',
      label: 'Log a result',
      hint: 'Record a game score (W/L/T + opponent)',
      accent: 'teal',
    },
    {
      href: `/dashboard/team/${teamSlug}#admin-posts`,
      icon: '📅',
      label: 'Add to schedule',
      hint: 'Game, practice, tournament, or meeting',
      accent: 'teal',
    },
    {
      href: `/dashboard/team/${teamSlug}/payments`,
      icon: '💰',
      label: 'Payments',
      hint: counts.pendingPayments > 0 ? `${counts.pendingPayments} to verify` : 'All caught up',
      badge: counts.pendingPayments > 0 ? counts.pendingPayments : undefined,
      accent: counts.pendingPayments > 0 ? 'red' : 'navy',
    },
    {
      href: `/dashboard/team/${teamSlug}#invites`,
      icon: '🎟️',
      label: 'Manage invites',
      hint: counts.openInvites > 0 ? `${counts.openInvites} open` : 'Create invite codes',
      badge: counts.openInvites > 0 ? counts.openInvites : undefined,
      accent: 'navy',
    },
    {
      href: `/directory/teams/${teamSlug}`,
      icon: '👁️',
      label: 'View public profile',
      hint: 'See what visitors see when they look you up',
      accent: 'gold',
    },
  ];

  return (
    <section
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12,
        padding: '1.25rem 1.5rem',
      }}
    >
      <div style={{ marginBottom: '0.85rem' }}>
        <h2
          style={{
            fontFamily: "'Bebas Neue', Impact, sans-serif",
            fontSize: '1.25rem',
            color: '#fff',
            letterSpacing: '0.05em',
            margin: 0,
          }}
        >
          Quick actions
        </h2>
        <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
          The things admins do most. Click to jump straight in.
        </p>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: '0.6rem',
        }}
      >
        {actions.map((a) => (
          <Link
            key={a.label}
            href={a.href}
            style={{
              position: 'relative',
              background: accentBg(a.accent),
              border: `1px solid ${accentBorder(a.accent)}`,
              borderRadius: 8,
              padding: '0.85rem 1rem',
              textDecoration: 'none',
              color: '#fff',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem',
              transition: 'transform 0.1s',
            }}
          >
            {a.badge !== undefined && (
              <span
                style={{
                  position: 'absolute',
                  top: 6,
                  right: 8,
                  background: '#C8102E',
                  color: '#fff',
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  borderRadius: 10,
                  padding: '0.1rem 0.45rem',
                  lineHeight: 1.3,
                }}
              >
                {a.badge}
              </span>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.05rem' }}>{a.icon}</span>
              <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>{a.label}</span>
            </div>
            <p style={{ margin: 0, fontSize: '0.72rem', color: 'rgba(255,255,255,0.55)' }}>{a.hint}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

function accentBg(a: QuickAction['accent']): string {
  switch (a) {
    case 'gold': return 'rgba(255,184,28,0.10)';
    case 'teal': return 'rgba(20,184,166,0.10)';
    case 'red': return 'rgba(200,16,46,0.10)';
    case 'navy':
    default: return 'rgba(255,255,255,0.04)';
  }
}

function accentBorder(a: QuickAction['accent']): string {
  switch (a) {
    case 'gold': return 'rgba(255,184,28,0.35)';
    case 'teal': return 'rgba(20,184,166,0.35)';
    case 'red': return 'rgba(200,16,46,0.35)';
    case 'navy':
    default: return 'rgba(255,255,255,0.1)';
  }
}
