import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import {
  partnerActivityService,
  PartnerActivityForbiddenError,
  PartnerActivityNotFoundError,
} from '@/lib/passport/16-partner-activity-service';
import { supabaseAdmin } from '@/lib/supabase';

// ─── Config ────────────────────────────────────────────────

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const { data } = await supabaseAdmin
    .from('listings')
    .select('business_name')
    .eq('id', id)
    .maybeSingle();
  return {
    title: data ? `Passport activity · ${data.business_name} · RinkStop` : 'Passport activity · RinkStop',
  };
}

// ─── Page ──────────────────────────────────────────────────

export default async function PartnerPassportActivityPage({ params }: PageProps) {
  const { id } = await params;

  const { userId } = await auth();
  if (!userId) {
    // Owner-only page. Bounce unauthenticated visitors to sign-in with
    // a returnTo so they come back here after auth.
    redirect(`/sign-in?returnTo=/partners/${id}/passport`);
  }

  let activity;
  try {
    activity = await partnerActivityService.getForListing({
      listingId: id,
      clerkUserId: userId,
      rangeDays: 30,
    });
  } catch (err) {
    if (err instanceof PartnerActivityForbiddenError) {
      // Caller is signed in but doesn't own this listing. Don't leak
      // existence — render a generic 404.
      notFound();
    }
    if (err instanceof PartnerActivityNotFoundError) {
      notFound();
    }
    throw err;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: 1100, margin: '0 auto' }}>
      <Link
        href={`/partners/${id}`}
        style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none', fontSize: '0.85rem' }}
      >
        ← Back to {activity.listingName}
      </Link>

      <header
        style={{
          background: 'linear-gradient(135deg, #041E42 0%, #0a0a0a 100%)',
          border: '1px solid #1e1e1e', borderRadius: 12, padding: '1.75rem',
          display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap',
        }}
      >
        <div style={{ fontSize: '2.5rem' }}>📔</div>
        <div style={{ flex: 1, minWidth: 240 }}>
          <h1
            style={{
              fontFamily: "'Bebas Neue', Impact, sans-serif",
              fontSize: '1.75rem', color: '#fff', letterSpacing: '0.05em', margin: '0 0 0.25rem',
            }}
          >
            PASSPORT ACTIVITY
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', margin: 0, maxWidth: 560 }}>
            Stamps issued at {activity.listingName}&apos;s venues in the last {activity.rangeDays} days.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <KPI label="Venues" value={activity.venueCount} />
          <KPI label="Stamps" value={activity.totalStamps} />
          <KPI label="Scans" value={activity.totalScans} />
        </div>
      </header>

      {activity.empty ? (
        <EmptyState listingId={id} />
      ) : (
        <>
          <section
            style={{ background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: 12, padding: '1.5rem' }}
          >
            <h2
              style={{
                fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '1rem',
                color: '#888', letterSpacing: '0.06em', margin: '0 0 0.75rem',
              }}
            >
              VENUES
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
              {activity.venues.map((v) => (
                <div
                  key={v.venueId}
                  style={{
                    background: '#0a0a0a', border: '1px solid #1e1e1e', borderRadius: 8,
                    padding: '0.85rem 1rem',
                  }}
                >
                  <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.95rem' }}>{v.venueName}</div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', marginTop: 4 }}>
                    {v.stampCount} stamp{v.stampCount === 1 ? '' : 's'}
                    {v.lastStampedAt ? ` · last ${formatRelative(v.lastStampedAt)}` : ' · no stamps yet'}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section
            style={{ background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: 12, padding: '1.5rem' }}
          >
            <h2
              style={{
                fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '1rem',
                color: '#888', letterSpacing: '0.06em', margin: '0 0 0.75rem',
              }}
            >
              RECENT STAMPS
            </h2>
            {activity.recentStamps.length === 0 ? (
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>
                No stamps in the last {activity.rangeDays} days.
              </div>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {activity.recentStamps.map((s) => (
                  <li
                    key={s.id}
                    style={{
                      display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
                      padding: '0.6rem 0.75rem', background: '#0a0a0a',
                      border: '1px solid #1e1e1e', borderRadius: 6,
                      fontSize: '0.85rem',
                    }}
                  >
                    <span style={{ color: '#fff' }}>
                      {s.venueName ?? s.eventName ?? 'Unknown target'}
                    </span>
                    <span style={{ color: 'rgba(255,255,255,0.5)' }}>
                      {s.actorType}{s.context ? ` · ${s.context}` : ''} · {formatRelative(s.stampedAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <div
        style={{
          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
          borderRadius: 8, padding: '0.75rem 1rem', fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)',
          textAlign: 'center',
        }}
      >
        Passport activity is read-only here.
      </div>
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────

function KPI({ label, value, subtle }: { label: string; value: number; subtle?: string }) {
  return (
    <div
      style={{
        background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 8, padding: '0.6rem 1rem', minWidth: 90, textAlign: 'center',
      }}
    >
      <div style={{ color: '#14B8A6', fontSize: '1.5rem', fontWeight: 700 }}>{value}</div>
      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}{subtle ? ` · ${subtle}` : ''}
      </div>
    </div>
  );
}

function EmptyState({ listingId }: { listingId: string }) {
  return (
    <section
      style={{ background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: 12, padding: '2rem', textAlign: 'center' }}
    >
      <div style={{ fontSize: '2rem', marginBottom: 8 }}>🏒</div>
      <div style={{ color: '#fff', fontSize: '1rem', fontWeight: 600, marginBottom: 4 }}>
        No venues linked yet
      </div>
      <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.85rem', maxWidth: 480, margin: '0 auto 1rem' }}>
        Link a venue to this listing to start tracking passport stamp activity at your locations.
      </div>
      <Link
        href={`/dashboard/listings/${listingId}/venues`}
        style={{
          display: 'inline-block', padding: '0.5rem 1rem', background: '#14B8A6', color: '#0a0a0a',
          borderRadius: 6, textDecoration: 'none', fontSize: '0.85rem', fontWeight: 700,
        }}
      >
        Manage venues
      </Link>
    </section>
  );
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const sec = Math.max(0, Math.round((now - then) / 1000));
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day}d ago`;
  return new Date(iso).toLocaleDateString();
}
