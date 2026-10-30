import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSubmissionStatusByToken } from '@/lib/submission-status';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Your Listing Status | RinkStop',
  description:
    'Track the status of a listing you submitted to RinkStop — pending, approved and live, or not published.',
  robots: { index: false, follow: false },
};

const TYPE_LABEL: Record<string, string> = {
  rink: 'Ice rink',
  team: 'Team or club',
  league: 'League',
  tournament: 'Tournament or event',
  player: 'Player',
};

function label(type: string) {
  return TYPE_LABEL[type?.toLowerCase()] || type || 'Listing';
}

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default async function ListingStatusPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const view = await getSubmissionStatusByToken(token);

  if (!view) notFound();

  const submittedOn = formatDate(view.submitted_at);
  const reviewedOn = formatDate(view.reviewed_at);

  // One visual state per status. Colour is never the only signal — every
  // state also has an icon and a plain-language headline.
  const state =
    view.status === 'approved'
      ? {
          icon: '✅',
          badge: 'Approved',
          badgeStyle: {
            background: 'rgba(20,184,166,0.12)',
            color: '#14B8A6',
            border: '1px solid rgba(20,184,166,0.4)',
          },
          headline: 'Your listing is live',
          body:
            view.live_url
              ? 'We published your listing. Take a look, and if you would like to add your own details, photos or contact information, you can claim it — it is free and takes a couple of minutes.'
              : 'We approved your listing and it is being published now. You will get the link by email shortly.',
        }
      : view.status === 'rejected'
        ? {
            icon: '❌',
            badge: 'Not published',
            badgeStyle: {
              background: 'rgba(200,16,46,0.12)',
              color: '#FF6B7A',
              border: '1px solid rgba(200,16,46,0.4)',
            },
            headline: 'We were not able to publish this one',
            body:
              'Sorry about that. It is usually because the details were not enough for us to verify the listing. Reply to the email we sent you and we will tell you exactly what we need, or fix it for you.',
          }
        : {
            icon: '⏳',
            badge: 'In review',
            badgeStyle: {
              background: 'rgba(255,184,28,0.12)',
              color: '#FFB81C',
              border: '1px solid rgba(255,184,28,0.4)',
            },
            headline: 'We have your submission',
            body:
              'We review every submission by hand, usually within 3 business days. You can bookmark this page and check back — it updates automatically.',
          };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0D1117',
        padding: '2rem 1rem 4rem',
      }}
    >
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>
        <nav style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '1rem' }}>
          <Link href="/" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Home
          </Link>
          <span style={{ margin: '0 0.4rem' }}>›</span>
          <span style={{ color: 'rgba(255,255,255,0.6)' }}>Listing status</span>
        </nav>

        <div
          style={{
            background: '#0f0f0f',
            border: '1px solid #1e1e1e',
            borderRadius: '12px',
            padding: '2rem 1.5rem',
          }}
        >
          <div
            style={{
              display: 'inline-block',
              fontSize: '0.625rem',
              fontWeight: 800,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              padding: '0.25rem 0.65rem',
              borderRadius: '999px',
              marginBottom: '1rem',
              ...state.badgeStyle,
            }}
          >
            {state.badge}
          </div>

          <h1
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 'clamp(1.75rem, 5vw, 2.5rem)',
              color: '#fff',
              letterSpacing: '0.03em',
              lineHeight: 1.05,
              margin: '0 0 0.75rem',
            }}
          >
            {state.headline.toUpperCase()}
          </h1>

          <div
            style={{
              fontSize: '2.25rem',
              lineHeight: 1,
              marginBottom: '1rem',
            }}
          >
            {state.icon}
          </div>

          <p
            style={{
              color: 'rgba(255,255,255,0.6)',
              fontSize: '0.9375rem',
              lineHeight: 1.65,
              margin: '0 0 1.5rem',
            }}
          >
            {state.body}
          </p>

          {/* What they submitted */}
          <div
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '8px',
              padding: '1.1rem 1.25rem',
              marginBottom: '1.5rem',
            }}
          >
            <dl style={{ margin: 0, display: 'grid', gap: '0.75rem' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '140px 1fr',
                  gap: '0.75rem',
                  alignItems: 'baseline',
                }}
              >
                <dt
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: 'rgba(255,255,255,0.45)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  Listing
                </dt>
                <dd style={{ margin: 0, color: '#fff', fontSize: '0.9375rem', fontWeight: 600 }}>
                  {view.name}
                </dd>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '140px 1fr',
                  gap: '0.75rem',
                  alignItems: 'baseline',
                }}
              >
                <dt
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: 'rgba(255,255,255,0.45)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  Type
                </dt>
                <dd style={{ margin: 0, color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem' }}>
                  {label(view.listing_type)}
                </dd>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '140px 1fr',
                  gap: '0.75rem',
                  alignItems: 'baseline',
                }}
              >
                <dt
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: 'rgba(255,255,255,0.45)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  Submitted
                </dt>
                <dd style={{ margin: 0, color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem' }}>
                  {submittedOn} ({view.age_label} ago)
                </dd>
              </div>
              {reviewedOn ? (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '140px 1fr',
                    gap: '0.75rem',
                    alignItems: 'baseline',
                  }}
                >
                  <dt
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: 'rgba(255,255,255,0.45)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                    }}
                  >
                    Reviewed
                  </dt>
                  <dd style={{ margin: 0, color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem' }}>
                    {reviewedOn}
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>

          {/* If we are running late, say so plainly rather than pretending. */}
          {view.overdue ? (
            <div
              style={{
                background: 'rgba(255,184,28,0.08)',
                border: '1px solid rgba(255,184,28,0.3)',
                borderRadius: '8px',
                padding: '0.9rem 1.1rem',
                marginBottom: '1.5rem',
              }}
            >
              <p
                style={{
                  margin: 0,
                  color: 'rgba(255,255,255,0.75)',
                  fontSize: '0.875rem',
                  lineHeight: 1.6,
                }}
              >
                This one is taking longer than we said it would — that is on us, not on
                you. It is in the queue and will be picked up. If you need it live sooner,
                just reply to the email we sent and we will prioritise it.
              </p>
            </div>
          ) : null}

          {/* Primary actions */}
          <div
            style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.5rem' }}
          >
            {view.live_url ? (
              <a
                href={view.live_url}
                style={{
                  display: 'inline-block',
                  background: '#C8102E',
                  color: '#fff',
                  padding: '0.7rem 1.4rem',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                }}
              >
                View your listing →
              </a>
            ) : null}
            {view.claim_url ? (
              <a
                href={view.claim_url}
                style={{
                  display: 'inline-block',
                  background: 'transparent',
                  color: '#FFB81C',
                  border: '1px solid #FFB81C',
                  padding: '0.7rem 1.4rem',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                }}
              >
                Claim and edit it
              </a>
            ) : null}
          </div>

          <p
            style={{
              color: 'rgba(255,255,255,0.45)',
              fontSize: '0.8125rem',
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            Need to change something, or something is wrong?{' '}
            <a
              href="mailto:support@rinkstop.com"
              style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'underline' }}
            >
              Reply to our email
            </a>{' '}
            and we will sort it out. Bookmark this page — it updates on its own.
          </p>
        </div>

        <p
          style={{
            color: 'rgba(255,255,255,0.3)',
            fontSize: '0.75rem',
            textAlign: 'center',
            marginTop: '1.5rem',
          }}
        >
          <Link href="/add-listing" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Submit another listing
          </Link>
        </p>
      </div>
    </div>
  );
}
