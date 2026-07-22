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
 * Active Passport — the happy path.
 *
 * Layout (mobile-first, single column, max-width 560px):
 *   - Header: avatar (or initial), holder name, "Hockey Passport" label
 *   - Passport ID (monospace, FFB81C accent per design system)
 *   - Status + Verification pills
 *   - Two-column key/value grid: Issue date, Member since, Hockey teams count,
 *     Federation affiliations (names only — already public via directory)
 *   - Footer: small RinkStop attribution + "View full profile" link to
 *     /profile/[username] when username is available
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
        <PassportHeader name={name} avatarUrl={avatarUrl} />
        <PassportIdBlock passportId={record.passportId} />
        <StatusPills
          status={record.status}
          verificationLevel={record.verificationLevel}
        />
        <DataGrid
          rows={[
            { label: 'Issue date', value: formatPublicDate(record.issuedAt) },
            {
              label: 'Member since',
              value: formatPublicDate(record.createdAt),
            },
            { label: 'Verification', value: verificationLabel(record.verificationLevel) },
          ]}
        />
        <FederationAffiliationsSection internalUserId={record.internalUserId} />
        <AttendanceSection holderUserId={record.internalUserId} />
        <PassportFooter username={username} />
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
            color: '#041E42',
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
          color: '#041E42',
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