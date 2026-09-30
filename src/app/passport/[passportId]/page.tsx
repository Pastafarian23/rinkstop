/**
 * src/app/passport/[passportId]/page.tsx
 *
 * Workstream 2 — PR3: Public Hockey Passport page.
 *
 * What this is:
 *   - The destination page for /qr/[qrIdentifier] redirects.
 *   - Mobile-first, light-theme, read-only public surface for a single
 *     Hockey Passport.
 *   - Anyone with the URL can view. No auth required.
 *
 * Privacy model (locked with Arnel 2026-07-22):
 *   - Show the same identity-shaping fields as /profile/[slug] (display_name
 *     + avatar are already public there). No new opt-in gate.
 *   - Passport-scoped fields only: hide bio, location, account types,
 *     managed profiles, follower counts. Just the Passport card view.
 *   - NEVER expose internal Clerk user ID, QR identifier, or contact info.
 *   - Public visibility tracks /profile/[slug] by construction — same row.
 *
 * Status semantics (locked with Arnel 2026-07-22):
 *   - invalid format / not found / deactivated / flag off → 404
 *   - suspended → 200 + banner + minimal fields (no name, no avatar)
 *   - pending → 200 + "not yet activated" copy + minimal fields
 *   - active → 200 + full public card
 *
 * Feature flag:
 *   - Gated by PASSPORT_PUBLIC_LOOKUP via isPublicPassportLookupEnabled().
 *   - When off (production default), this route 404s. The /qr resolver
 *     also 404s when its flag is off. Both must be flipped to enable.
 *
 * Server-safe:
 *   - No 'use client'. No useState/useEffect/useRouter.
 *   - Mirrors WS2 PR1 architecture: server component, server queries only.
 *   - Next.js App Router handles 404 via notFound() from this file or the
 *     route-level not-found.tsx fallback below.
 */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import { getStripePaymentLink } from '@/lib/stripe-payment-links';
import ChallengesSection from '@/components/passport/ChallengesSection';
import {
  isPublicPassportLookupEnabled,
  passportLookupService,
  isStampsEnabled,
  stampService,
} from '@/lib/passport';
import type {
  PassportRecord,
  PassportStatus,
  VerificationLevel,
} from '@/lib/passport/types';

interface PageProps {
  params: Promise<{ passportId: string }>;
}

/**
 * ISR — cache the rendered page for 5 minutes at the edge.
 *
 * Passports don't change every second: name, avatar, verification level,
 * status, federations all shift on multi-day-to-multi-week cycles. A 5-min
 * stale window keeps the public route fast for phone scanners in poor
 * connectivity without showing meaningfully stale data. The dynamic
 * /qr/[uuid]→302 redirect bypasses this cache because it's a route handler.
 */
export const revalidate = 300;

interface HolderProfile {
  display_name: string | null;
  avatar_url: string | null;
  username: string | null;
}

/**
 * Fetch the public profile fields attached to the Passport holder.
 * Profile is keyed by `profiles.user_id`, which equals
 * `passports.internal_user_id`. No internal fields leak — we only select
 * the three columns we render.
 */
async function fetchHolderProfile(
  internalUserId: string
): Promise<HolderProfile | null> {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('display_name, avatar_url, username')
    .eq('user_id', internalUserId)
    .maybeSingle();

  if (error) {
    // Treat any error as "no profile row" — the public page still renders,
    // we just fall back to "Passport holder".
    return null;
  }
  return data ?? null;
}

/**
 * generateMetadata — server-side, runs before renderMetadata.
 * - If the Passport is missing/feature-flag-off: minimal metadata, no leak.
 * - If found and active: title + description mirror the card.
 * - Suspended/pending: muted metadata (no name exposed).
 *
 * We deliberately do NOT set OpenGraph image to the avatar here. Avatars
 * can be high-resolution and are owned by the user; surfacing them in
 * link previews to third parties (Slack, iMessage) without an explicit
 * share action is a privacy smell. Title + description only.
 */
export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { passportId } = await params;

  if (!isPublicPassportLookupEnabled()) {
    return {
      title: 'Hockey Passport — RinkStop',
      robots: { index: false, follow: false },
    };
  }

  const record = await passportLookupService.findByPassportId(passportId);
  if (!record || record.status === 'deactivated') {
    return {
      title: 'Passport not found — RinkStop',
      robots: { index: false, follow: false },
    };
  }

  // Suspended / pending — don't leak the holder name into previews.
  if (record.status !== 'active') {
    return {
      title: 'Hockey Passport — RinkStop',
      description:
        'A RinkStop Hockey Passport. Verification status and limited information shown.',
      robots: { index: false, follow: false },
    };
  }

  const profile = await fetchHolderProfile(record.internalUserId);
  const name = profile?.display_name?.trim() || 'Hockey Passport holder';
  const title = `${name} — Hockey Passport · RinkStop`;
  const description = `Verified Hockey Passport for ${name}. Issued ${formatPublicDate(record.issuedAt)}.`;

  return {
    title,
    description,
    robots: { index: true, follow: true },
    // No openGraph.images — see comment above.
  };
}

export default async function PublicPassportPage({ params }: PageProps) {
  const { passportId } = await params;

  // Hard gate: feature flag off → 404. This protects the entire route in
  // production where the flag defaults off per Workstream 1 Rule 5.
  if (!isPublicPassportLookupEnabled()) {
    notFound();
  }

  // Lookup service validates format and gates by flag. Null means either
  // invalid format, no row, or deactivated — all collapse to 404 per the
  // locked status semantics.
  const record = await passportLookupService.findByPassportId(passportId);
  if (!record || record.status === 'deactivated') {
    notFound();
  }

  // Suspended / pending → limited render with status banner.
  // Active → full card.
  if (record.status === 'suspended' || record.status === 'pending') {
    return <LimitedStatusPage record={record} />;
  }

  // Active → fetch holder profile, render full card.
  const profile = await fetchHolderProfile(record.internalUserId);
  return <ActivePassportCard record={record} profile={profile} />;
}

// ──────────────────────────────────────────────────────────────────────
// Page variants
// ──────────────────────────────────────────────────────────────────────

/**
 * Premium passport-aesthetic document — replaces the old flat card.
 *
 * Per Arnel 2026-09-30 directive: "looks too cheap for $24.99 pricing tier."
 * Dark navy field with gold accents + embossed double-border + monospace
 * document number. Photo slot. Federation seal area. Designed to feel like
 * a real international credential a coach/scout would want to see.
 *
 * Layout: see /passport/[id] live for the visual reference.
 */
async function ActivePassportCard({
  record,
  profile,
}: {
  record: PassportRecord;
  profile: HolderProfile | null;
}) {
  const name = profile?.display_name?.trim() || 'Hockey Passport holder';
  const username = profile?.username?.trim() || null;
  const avatarUrl = profile?.avatar_url?.trim() || null;

  // Federation names for the seal header.
  const federationNames = await fetchFederationNames(record.internalUserId);
  const primaryFederation = federationNames[0] ?? null;

  return (
    <main
      style={{
        minHeight: '100dvh',
        background:
          'linear-gradient(180deg, #0F172A 0%, #1E293B 60%, #0F172A 100%)',
        padding: '24px 16px 64px',
        fontFamily:
          "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif",
        color: '#F8FAFC',
      }}
    >
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        {/* Premium document card — passport-style aesthetic.
            Dark navy field with gold accents + embossed border. */}
        <PassportDocument
          name={name}
          avatarUrl={avatarUrl}
          passportId={record.passportId}
          status={record.status}
          verificationLevel={record.verificationLevel}
          issuedAt={record.issuedAt}
          createdAt={record.createdAt}
          federation={primaryFederation}
          username={username}
        />
        {/* Affiliations + attendance + challenges below the document. */}
        <div style={{ marginTop: 24 }}>
          <FederationAffiliationsSection internalUserId={record.internalUserId} />
          <AttendanceSection holderUserId={record.internalUserId} />
          <ChallengesSectionWrapper holderUserId={record.internalUserId} />
          <PassportFooter username={username} />
        </div>
      </div>
    </main>
  );
}

/**
 * Limited-status render for suspended and pending Passports.
 *
 * Per the locked semantics: 200 + banner, no name, no avatar, no team
 * counts. Just enough to tell the visitor what state the Passport is in
 * and what to do next. Suspended admins/parents can see why; public
 * scanners see the gate.
 */
function LimitedStatusPage({ record }: { record: PassportRecord }) {
  const isSuspended = record.status === 'suspended';
  const headline = isSuspended
    ? 'This Passport is currently suspended'
    : 'This Passport has not been activated yet';
  const body = isSuspended
    ? 'The holder or a RinkStop admin has paused this Passport. Verification status and Passport ID are shown for reference only. Contact the holder for current status.'
    : 'The holder has not finished activating this Passport. It exists in our system but is not publicly viewable in full yet.';

  return (
    <main
      style={{
        minHeight: '100dvh',
        background:
          'linear-gradient(180deg, #f8fafc 0%, #eef2f7 60%, #e2e8f0 100%)',
        padding: '24px 16px 64px',
        fontFamily:
          "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif",
        color: '#0f172a',
      }}
    >
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <PassportHeader name="Hockey Passport holder" avatarUrl={null} muted />
        <PassportIdBlock passportId={record.passportId} />

        <div
          role="status"
          aria-live="polite"
          style={{
            background: isSuspended ? '#FEF3C7' : '#E0E7FF',
            border: `1px solid ${isSuspended ? '#F59E0B' : '#6366F1'}`,
            borderRadius: 10,
            padding: '16px 18px',
            margin: '20px 0',
          }}
        >
          <p
            style={{
              fontWeight: 700,
              fontSize: 15,
              margin: 0,
              color: isSuspended ? '#92400E' : '#3730A3',
            }}
          >
            {headline}
          </p>
          <p
            style={{
              fontSize: 14,
              lineHeight: 1.5,
              margin: '8px 0 0',
              color: isSuspended ? '#78350F' : '#1E1B4B',
            }}
          >
            {body}
          </p>
        </div>

        <DataGrid
          rows={[
            {
              label: 'Verification',
              value: verificationLabel(record.verificationLevel),
            },
            { label: 'Status', value: statusLabel(record.status) },
          ]}
        />
        <PassportFooter username={null} />
      </div>
    </main>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Sub-components (kept inline because this is a single-route PR — no
// reuse yet. If /passport/* grows beyond one page, extract to
// src/components/passport/public/.)
// ──────────────────────────────────────────────────────────────────────

function PassportHeader({
  name,
  avatarUrl,
  muted = false,
}: {
  name: string;
  avatarUrl: string | null;
  muted?: boolean;
}) {
  const opacity = muted ? 0.55 : 1;
  const initials = (name?.[0] ?? '?').toUpperCase();

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '20px 0',
        opacity,
      }}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={`${name}'s Passport photo`}
          width={72}
          height={72}
          style={{
            borderRadius: '50%',
            objectFit: 'cover',
            border: '2px solid #FFB81C',
            flexShrink: 0,
            background: '#fff',
          }}
        />
      ) : (
        <div
          aria-hidden="true"
          style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: 'rgba(255, 184, 28, 0.12)',
            border: '2px solid rgba(255, 184, 28, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: 28,
            color: '#B45309',
            flexShrink: 0,
          }}
        >
          {initials}
        </div>
      )}
      <div style={{ minWidth: 0, flex: 1 }}>
        <p
          style={{
            fontFamily: "'Bebas Neue', Impact, sans-serif",
            fontSize: 12,
            letterSpacing: '0.14em',
            color: '#64748b',
            margin: 0,
            textTransform: 'uppercase',
          }}
        >
          RinkStop Hockey Passport
        </p>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 600,
            margin: '4px 0 0',
            color: '#C8102E',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {name}
        </h1>
      </div>
    </header>
  );
}

function PassportIdBlock({ passportId }: { passportId: string }) {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 12,
        padding: '14px 18px',
        margin: '12px 0 20px',
        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
      }}
    >
      <p
        style={{
          fontSize: 11,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: '#64748b',
          margin: 0,
          fontWeight: 600,
        }}
      >
        Passport ID
      </p>
      <p
        style={{
          fontFamily:
            "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
          fontSize: 18,
          letterSpacing: '0.04em',
          color: '#B45309',
          fontWeight: 600,
          margin: '6px 0 0',
          wordBreak: 'break-all',
        }}
      >
        {passportId}
      </p>
    </div>
  );
}

function StatusPills({
  status,
  verificationLevel,
}: {
  status: PassportStatus;
  verificationLevel: VerificationLevel;
}) {
  const statusColor = statusColorMap[status];
  const verifyColor = verificationColorMap[verificationLevel];

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 8,
        margin: '0 0 24px',
      }}
    >
      <Pill label={statusLabel(status)} bg={statusColor.bg} fg={statusColor.fg} />
      <Pill
        label={verificationLabel(verificationLevel)}
        bg={verifyColor.bg}
        fg={verifyColor.fg}
      />
    </div>
  );
}

function Pill({
  label,
  bg,
  fg,
}: {
  label: string;
  bg: string;
  fg: string;
}) {
  return (
    <span
      style={{
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        padding: '6px 10px',
        borderRadius: 999,
        background: bg,
        color: fg,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  );
}

function DataGrid({
  rows,
}: {
  rows: Array<{ label: string; value: string }>;
}) {
  return (
    <dl
      style={{
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 12,
        padding: '4px 18px',
        margin: '0 0 16px',
        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
      }}
    >
      {rows.map((row, i) => (
        <div
          key={row.label}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            gap: 12,
            padding: '14px 0',
            borderTop: i === 0 ? 'none' : '1px solid #f1f5f9',
          }}
        >
          <dt
            style={{
              fontSize: 12,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#64748b',
              fontWeight: 600,
              margin: 0,
            }}
          >
            {row.label}
          </dt>
          <dd
            style={{
              fontSize: 15,
              color: '#0f172a',
              fontWeight: 500,
              margin: 0,
              textAlign: 'right',
            }}
          >
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Federation affiliations — list of organization names. Federation names
 * are already public via the directory, so this is not a new leak surface.
 *
 * Data is read from existing federation tables via the unified view. For
 * PR3 we keep this scoped to org-name-only; counts-only was the alternative
 * per the PR3 plan but since names are already public, showing them gives
 * the visitor a clear "verified with X federation" signal.
 *
 * If federation_affiliations wiring is incomplete (returns empty array),
 * the section renders nothing — no empty state copy. Per WS2 priority 6
 * rule "no section ever says 'No data'", absence of data means absence of
 * section.
 */
async function FederationAffiliationsSection({
  internalUserId,
}: {
  internalUserId: string;
}) {
  const affiliations = await fetchFederationNames(internalUserId);

  if (affiliations.length === 0) return null;

  return (
    <section
      style={{
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 12,
        padding: '16px 18px',
        margin: '0 0 16px',
        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
      }}
    >
      <h2
        style={{
          fontSize: 12,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: '#64748b',
          fontWeight: 600,
          margin: '0 0 10px',
        }}
      >
        Registered federations
      </h2>
      <ul
        style={{
          listStyle: 'none',
          padding: 0,
          margin: 0,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        {affiliations.map((name) => (
          <li
            key={name}
            style={{
              fontSize: 14,
              padding: '6px 12px',
              background: '#f1f5f9',
              border: '1px solid #e2e8f0',
              borderRadius: 999,
              color: '#0f172a',
            }}
          >
            {name}
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Attendance section — WS3 PR3.
 *
 * Public surface of the holder's stamp history. Per WS3 plan:
 *   - Rink aggregate count + rink names (visited)
 *   - Event names + parent venue/rink (attended)
 *   - Venue-only stamps stay hidden (private aggregate only on dashboard)
 *   - Federation count derived from rinks.league
 *
 * Per locked rule 2026-07-22 (with Arnel): counts include stamps where
 * actor_user_id = holder OR subject_user_id = holder. That covers both
 * self-scans and coach→player scans.
 *
 * Only renders when stamps feature flag is on AND there is data to show.
 * Empty data → no section (per the "no empty state copy" rule used by
 * FederationAffiliationsSection above).
 */
/**
 * Wrapper around ChallengesSection — kept in this file so the page renders
 * the section inline with the existing Passport card layout instead of
 * having the consumer import a new component from elsewhere. Pure
 * pass-through to the challenges component.
 */
async function ChallengesSectionWrapper({
  holderUserId,
}: {
  holderUserId: string;
}): Promise<React.ReactElement | null> {
  return <ChallengesSection holderUserId={holderUserId} />;
}

async function AttendanceSection({
  holderUserId,
}: {
  holderUserId: string;
}) {
  if (!isStampsEnabled()) return null;

  const attendance = await stampService
    .getPublicAttendance(holderUserId)
    .catch((err: unknown): null => {
      console.error('[public-passport] getPublicAttendance failed:', err);
      return null;
    });

  if (!attendance) return null;

  const { rinkCount, eventCount, federationCount, events } = attendance;
  const totalCount = rinkCount + eventCount;
  if (totalCount === 0) return null;

  return (
    <section
      style={{
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 12,
        padding: '16px 18px',
        margin: '0 0 16px',
        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
      }}
    >
      <h2
        style={{
          fontSize: 12,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: '#64748b',
          fontWeight: 600,
          margin: '0 0 12px',
        }}
      >
        Attendance
      </h2>

      <dl
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 12,
          margin: '0 0 14px',
        }}
      >
        <StatCell label="Rinks visited" value={rinkCount} />
        <StatCell label="Events attended" value={eventCount} />
        <StatCell label="Federations" value={federationCount} />
      </dl>

      {events.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <p
            style={{
              fontSize: 11,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#64748b',
              fontWeight: 600,
              margin: '0 0 8px',
            }}
          >
            Recent events
          </p>
          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            {events.slice(0, 5).map((ev) => (
              <li
                key={ev.id}
                style={{
                  fontSize: 14,
                  color: '#0f172a',
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <span
                  style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {ev.name}
                </span>
                <span
                  style={{ color: '#64748b', fontSize: 12, flexShrink: 0 }}
                >
                  {formatPublicDate(ev.startsAt)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {events.length > 5 && (
        <p
          style={{
            fontSize: 12,
            color: '#64748b',
            margin: '8px 0 0',
          }}
        >
          +{events.length - 5} more
        </p>
      )}
    </section>
  );
}

function StatCell({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        background: '#f8fafc',
        borderRadius: 8,
        padding: '10px 8px',
        textAlign: 'center',
      }}
    >
      <dt
        style={{
          fontSize: 10,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: '#64748b',
          fontWeight: 600,
          margin: 0,
        }}
      >
        {label}
      </dt>
      <dd
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: '#C8102E',
          margin: '2px 0 0',
        }}
      >
        {value}
      </dd>
    </div>
  );
}

function PassportFooter({ username }: { username: string | null }) {
  return (
    <footer
      style={{
        marginTop: 32,
        paddingTop: 20,
        borderTop: '1px solid #e2e8f0',
        textAlign: 'center',
        color: '#64748b',
        fontSize: 13,
      }}
    >
      {username ? (
        <p style={{ margin: '0 0 8px' }}>
          <Link
            href={`/profile/${username}`}
            style={{
              color: '#1d4ed8',
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            View full profile →
          </Link>
        </p>
      ) : null}
      <p style={{ margin: 0 }}>
        Verified by{' '}
        <Link
          href="/"
          style={{
            color: '#1d4ed8',
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          RinkStop
        </Link>
      </p>
    </footer>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Data helpers
// ──────────────────────────────────────────────────────────────────────

/**
 * Federation affiliation lookup.
 *
 * Reads from the existing public.federations + linkage tables. The exact
 * join pattern depends on which linkage tables exist today. We do a
 * best-effort read: query players → hockey_player_federation_links → federations,
 * because the players table is keyed by user_id for the player side. If the
 * holder is not a player (e.g. coach-only Passport), the query returns
 * zero rows, which is correct.
 *
 * If this query throws (table missing, schema drift), we swallow and
 * return []. Per Workstream 1 Rule 6, Passport code never mutates and is
 * allowed to degrade gracefully on read failures of legacy tables.
 *
 * Logging: every degraded path emits a [public-passport] tagged message
 * with the specific failure (no player row / missing table / query error /
 * thrown). Tagged so Vercel runtime logs can grep it without false-positives
 * from other code paths.
 */
async function fetchFederationNames(internalUserId: string): Promise<string[]> {
  try {
    const { data: playerRows, error: playerErr } = await supabaseAdmin
      .from('players')
      .select('id')
      .eq('user_id', internalUserId);

    if (playerErr) {
      console.error('[public-passport] fetchFederationNames: player lookup failed', {
        internalUserId,
        code: playerErr.code,
        message: playerErr.message,
      });
      return [];
    }

    const playerIds = (playerRows ?? []).map((p: { id: string }) => p.id);
    if (playerIds.length === 0) {
      // Not a player — expected for coach-only / parent-only / fan Passports.
      return [];
    }

    // Try the federation affiliation link table. If it doesn't exist
    // (PostgREST returns 42P01 = undefined_table), degrade to empty.
    const { data: linkRows, error: linkErr } = await supabaseAdmin
      .from('hockey_player_federation_links')
      .select('federation_id')
      .in('player_id', playerIds);

    if (linkErr) {
      // Table missing is expected in early rollout — silent degrade.
      if (linkErr.code === '42P01' || linkErr.code === 'PGRST116') return [];
      // Any other error: log loudly so we notice.
      console.error('[public-passport] fetchFederationNames: link query failed', {
        internalUserId,
        code: linkErr.code,
        message: linkErr.message,
      });
      return [];
    }

    const federationIds = (linkRows ?? [])
      .map((l: { federation_id: string }) => l.federation_id)
      .filter(Boolean);
    if (federationIds.length === 0) return [];

    const { data: fedRows, error: fedErr } = await supabaseAdmin
      .from('federations')
      .select('id, name')
      .in('id', federationIds);

    if (fedErr) {
      console.error('[public-passport] fetchFederationNames: federation name query failed', {
        internalUserId,
        code: fedErr.code,
        message: fedErr.message,
      });
      return [];
    }

    return (fedRows ?? [])
      .map((f: { name: string | null }) => f.name)
      .filter((n): n is string => typeof n === 'string' && n.length > 0);
  } catch (err) {
    console.error('[public-passport] fetchFederationNames: unexpected throw', err);
    return [];
  }
}

// ──────────────────────────────────────────────────────────────────────
// Formatting / label maps (pure)
// ──────────────────────────────────────────────────────────────────────

function formatPublicDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function statusLabel(status: PassportStatus): string {
  switch (status) {
    case 'pending':
      return 'Pending';
    case 'active':
      return 'Active';
    case 'suspended':
      return 'Suspended';
    case 'deactivated':
      return 'Archived';
    default:
      return status;
  }
}

function verificationLabel(level: VerificationLevel): string {
  switch (level) {
    case 'none':
      return 'Unverified';
    case 'email_verified':
      return 'Email verified';
    case 'id_verified':
      return 'ID verified';
    case 'federation_verified':
      return 'Federation verified';
    default:
      return level;
  }
}

const statusColorMap: Record<
  PassportStatus,
  { bg: string; fg: string }
> = {
  pending: { bg: '#E0E7FF', fg: '#3730A3' },
  active: { bg: '#DCFCE7', fg: '#166534' },
  suspended: { bg: '#FEF3C7', fg: '#92400E' },
  deactivated: { bg: '#F1F5F9', fg: '#475569' },
};

const verificationColorMap: Record<
  VerificationLevel,
  { bg: string; fg: string }
> = {
  none: { bg: '#F1F5F9', fg: '#475569' },
  email_verified: { bg: '#DBEAFE', fg: '#1E40AF' },
  id_verified: { bg: '#DCFCE7', fg: '#166534' },
  federation_verified: { bg: '#FCE7F3', fg: '#9D174D' },
};
// ─────────────────────────────────────────────────────────────────────────
// Premium document (Arnel 2026-09-30 redesign) — kept inline for single-route PR.
// ─────────────────────────────────────────────────────────────────────────

const PASSPORT_GOLD = '#FFB81C';
const PASSPORT_NAVY = '#0B1E3F';
const PASSPORT_NAVY_DEEP = '#08152E';

function PassportDocument({
  name,
  avatarUrl,
  passportId,
  status,
  verificationLevel,
  issuedAt,
  createdAt,
  federation,
  username,
}: {
  name: string;
  avatarUrl: string | null;
  passportId: string;
  status: PassportStatus;
  verificationLevel: VerificationLevel;
  issuedAt: string | null;
  createdAt: string | null;
  federation: string | null;
  username: string | null;
}) {
  const initials = (name?.[0] ?? '?').toUpperCase();

  return (
    <article
      data-passport-document
      data-verification-level={verificationLevel}
      data-status={status}
      style={{
        position: 'relative',
        borderRadius: 18,
        background: `linear-gradient(160deg, ${PASSPORT_NAVY} 0%, ${PASSPORT_NAVY_DEEP} 100%)`,
        padding: '26px 22px 22px',
        boxShadow:
          '0 30px 60px -20px rgba(0,0,0,0.55), 0 12px 24px -12px rgba(15,23,42,0.6), inset 0 1px 0 rgba(255,184,28,0.18)',
        color: '#F8FAFC',
        overflow: 'hidden',
      }}
    >
      {/* Embossed gold double-border */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 8,
          border: '1px solid rgba(255, 184, 28, 0.45)',
          borderRadius: 12,
          pointerEvents: 'none',
        }}
      />
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 12,
          border: '1px solid rgba(255, 184, 28, 0.18)',
          borderRadius: 10,
          pointerEvents: 'none',
        }}
      />

      {/* Header band: HOCKEY PASSPORT title + status pill */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 18,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <div
            aria-hidden
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: `radial-gradient(circle at 30% 30%, #FFD66B 0%, ${PASSPORT_GOLD} 60%, #B45309 100%)`,
              border: '2px solid rgba(255,255,255,0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: "'Bebas Neue', Impact, sans-serif",
              fontWeight: 700,
              fontSize: 16,
              color: '#0B1E3F',
              letterSpacing: '0.05em',
              flexShrink: 0,
              boxShadow: '0 4px 10px rgba(0,0,0,0.35)',
            }}
          >
            RS
          </div>
          <p
            style={{
              fontFamily: "'Bebas Neue', Impact, sans-serif",
              fontSize: 13,
              letterSpacing: '0.18em',
              color: PASSPORT_GOLD,
              margin: 0,
              textTransform: 'uppercase',
            }}
          >
            Hockey Passport
          </p>
        </div>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 10px',
            borderRadius: 999,
            background: 'rgba(34,197,94,0.18)',
            border: '1px solid rgba(34,197,94,0.45)',
            color: '#86EFAC',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            flexShrink: 0,
          }}
        >
          <span
            aria-hidden
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: '#22C55E',
              boxShadow: '0 0 6px #22C55E',
            }}
          />
          {statusLabel(status)}
        </span>
      </header>

      {/* Gold divider */}
      <div
        aria-hidden
        style={{
          height: 1,
          background: `linear-gradient(90deg, transparent 0%, ${PASSPORT_GOLD} 50%, transparent 100%)`,
          margin: '0 0 18px',
          opacity: 0.55,
        }}
      />

      {/* Hero: photo/initial + name + handle + federation */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 18,
          marginBottom: 20,
        }}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={`${name}'s Passport photo`}
            width={84}
            height={84}
            style={{
              width: 84,
              height: 84,
              borderRadius: 14,
              objectFit: 'cover',
              border: `2px solid ${PASSPORT_GOLD}`,
              flexShrink: 0,
              background: '#fff',
              boxShadow: '0 6px 14px rgba(0,0,0,0.4)',
            }}
          />
        ) : (
          <div
            aria-hidden
            data-passport-photo-placeholder
            style={{
              width: 84,
              height: 84,
              borderRadius: 14,
              background: `linear-gradient(135deg, rgba(255,184,28,0.18) 0%, rgba(255,184,28,0.08) 100%)`,
              border: `2px dashed rgba(255,184,28,0.45)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: 32,
              color: PASSPORT_GOLD,
              flexShrink: 0,
            }}
          >
            {initials}
          </div>
        )}
        <div style={{ minWidth: 0, flex: 1 }}>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 700,
              margin: 0,
              color: '#FFFFFF',
              lineHeight: 1.15,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              textShadow: '0 1px 0 rgba(0,0,0,0.3)',
            }}
          >
            {name}
          </h1>
          {username && (
            <p
              style={{
                fontFamily: "'JetBrains Mono', 'SF Mono', Menlo, monospace",
                fontSize: 12,
                color: 'rgba(255,255,255,0.55)',
                margin: '4px 0 0',
              }}
            >
              @{username}
            </p>
          )}
          {federation && (
            <p
              style={{
                fontSize: 13,
                color: PASSPORT_GOLD,
                margin: '6px 0 0',
                fontWeight: 600,
                letterSpacing: '0.02em',
              }}
            >
              {federation}
            </p>
          )}
        </div>
      </div>

      {/* Document Number strip — monospace gold, like a real passport */}
      <div
        data-passport-id-strip
        style={{
          background: 'rgba(0,0,0,0.35)',
          border: '1px solid rgba(255,184,28,0.32)',
          borderRadius: 8,
          padding: '10px 14px',
          marginBottom: 16,
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <span
          style={{
            fontSize: 10,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.5)',
            fontWeight: 600,
          }}
        >
          Document No.
        </span>
        <span
          style={{
            fontFamily: "'JetBrains Mono', 'SF Mono', Menlo, monospace",
            fontSize: 16,
            fontWeight: 700,
            color: PASSPORT_GOLD,
            letterSpacing: '0.06em',
          }}
        >
          {passportId}
        </span>
      </div>

      {/* Key data row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 14,
          marginBottom: 4,
        }}
      >
        <DocField label="Issued" value={formatPublicDate(issuedAt)} />
        <DocField label="Member Since" value={formatPublicDate(createdAt)} />
        <DocField label="Verification" value={verificationLabel(verificationLevel)} accent />
      </div>

      {/* Bottom gold divider */}
      <div
        aria-hidden
        style={{
          height: 1,
          background: `linear-gradient(90deg, transparent 0%, ${PASSPORT_GOLD} 50%, transparent 100%)`,
          margin: '20px 0 16px',
          opacity: 0.45,
        }}
      />

      {/* Inline footer inside the document */}
      <footer
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        <p
          style={{
            fontSize: 11,
            color: 'rgba(255,255,255,0.5)',
            margin: 0,
            letterSpacing: '0.04em',
          }}
        >
          Issued by RinkStop.com — Verify at{' '}
          <span
            style={{
              fontFamily: "'JetBrains Mono', 'SF Mono', Menlo, monospace",
              color: PASSPORT_GOLD,
            }}
          >
            rinkstop.com/passport/{passportId}
          </span>
        </p>
        {username && (
          <Link
            href={`/profile/${username}`}
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: PASSPORT_GOLD,
              textDecoration: 'none',
              borderBottom: `1px solid rgba(255,184,28,0.4)`,
              flexShrink: 0,
            }}
          >
            View profile →
          </Link>
        )}
      </footer>

      {/* CTA — anyone viewing a public passport sees the buy button.
          Direct Stripe payment link, no Clerk auth required upfront.
          Stripe collects the email + payment; success URL is /dashboard/welcome
          which prompts sign-in. Visitor sees the value prop on the credential
          above and can convert immediately. */}
      <aside
        data-passport-cta
        style={{
          marginTop: 18,
          background:
            'linear-gradient(135deg, rgba(255,184,28,0.18) 0%, rgba(255,184,28,0.06) 100%)',
          border: '1px solid rgba(255,184,28,0.45)',
          borderRadius: 14,
          padding: '16px 18px',
          color: '#F8FAFC',
          textAlign: 'center',
        }}
      >
        <p
          style={{
            fontFamily: "'Bebas Neue', Impact, sans-serif",
            fontSize: 14,
            letterSpacing: '0.16em',
            color: PASSPORT_GOLD,
            margin: 0,
            textTransform: 'uppercase',
          }}
        >
          Get Your Hockey Passport
        </p>
        <p
          style={{
            fontSize: 13,
            color: 'rgba(255,255,255,0.7)',
            margin: '8px 0 12px',
            lineHeight: 1.45,
          }}
        >
          The same credential this holder carries. Stamps at every rink you visit, challenges tailored to your country + level, federation-verifiable.
        </p>
        <a
          href={getStripePaymentLink('verified_identity')}
          data-passport-buy-link
          rel="noopener"
          style={{
            display: 'inline-block',
            fontSize: 14,
            fontWeight: 700,
            color: '#0B1E3F',
            textDecoration: 'none',
            background: PASSPORT_GOLD,
            borderRadius: 10,
            padding: '12px 22px',
            boxShadow: '0 6px 18px rgba(255,184,28,0.4)',
          }}
        >
          $24.99 / year →
        </a>
      </aside>
    </article>
  );
}

function DocField({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div>
      <p
        style={{
          fontSize: 10,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.5)',
          margin: 0,
          fontWeight: 600,
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontSize: 14,
          fontWeight: accent ? 700 : 500,
          color: accent ? PASSPORT_GOLD : '#F8FAFC',
          margin: '4px 0 0',
        }}
      >
        {value}
      </p>
    </div>
  );
}
