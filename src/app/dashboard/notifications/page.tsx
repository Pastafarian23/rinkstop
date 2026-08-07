/**
 * /dashboard/notifications
 *
 * WS3.5 PR4 — Inbox page for consumer_notifications. Linked from
 * ConsumerCards.tsx (the dashboard "Notifications" card). Renders the
 * user's most recent inbox rows with kind-specific copy and a link to
 * the relevant queue / dashboard / public page.
 *
 * Supports the WS3.5 dispute notification kinds:
 *   - stamp_disputed        (operator inbox — links to the dispute queue)
 *   - dispute_upheld        (stamper inbox — links to /dashboard/passport)
 *   - dispute_overturned    (stamper inbox — links to /dashboard/passport)
 *   - stamp_received        (existing WS3 — links to /dashboard/passport)
 *   - document_expiring_*, document_expired, identity_renewal_due,
 *     achievement_added     (existing Phase 1b-4 — context link from metadata)
 *
 * Auth: caller must be signed in. Free users see the inbox (read-only);
 * the inbox is always available per the API route's design.
 */

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

interface InboxRow {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  metadata: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
}

const KIND_LABEL: Record<string, string> = {
  stamp_disputed: 'Dispute filed',
  dispute_upheld: 'Stamp removed',
  dispute_overturned: 'Stamp restored',
  stamp_received: 'Stamp received',
  document_expiring_30d: 'Document expiring soon',
  document_expiring_7d: 'Document expiring',
  document_expiring_1d: 'Document expires tomorrow',
  document_expired: 'Document expired',
  identity_renewal_due: 'Identity renewal due',
  achievement_added: 'Achievement unlocked',
  signup_welcome: 'Welcome to RinkStop',
  identity_verify_recommended: 'Verify your identity',
  wizard_incomplete: 'Finish setup',
  claim_paid_tier_unlocked: 'Claim approved',
  profile_first_visitor: 'Profile visitor',
};

/**
 * Group notification kinds into topic buckets for the inbox view.
 *
 * Why group: flat lists make it hard to scan ("which of these are about
 * disputes vs documents vs onboarding?"). Grouping by topic gives users
 * a single visual handle per category — "3 from Documents" — so they
 * can scan-and-skip without reading every line.
 *
 * Order matters: groups render top-to-bottom in this array's order.
 * Most-urgent (subscription/id) at top, lowest-friction (achievements)
 * at bottom. Within a group, rows sort by created_at desc.
 */
type NotificationGroupId =
  | 'subscription'
  | 'identity'
  | 'documents'
  | 'stamps_disputes'
  | 'achievements'
  | 'profile'
  | 'onboarding';

const GROUP_ORDER: NotificationGroupId[] = [
  'subscription',
  'identity',
  'documents',
  'stamps_disputes',
  'achievements',
  'profile',
  'onboarding',
];

const GROUP_META: Record<NotificationGroupId, { label: string; icon: string }> = {
  subscription: { label: 'Subscription', icon: '💳' },
  identity: { label: 'Identity', icon: '🪪' },
  documents: { label: 'Documents', icon: '📄' },
  stamps_disputes: { label: 'Stamps & Disputes', icon: '🏅' },
  achievements: { label: 'Achievements', icon: '🏆' },
  profile: { label: 'Profile', icon: '👤' },
  onboarding: { label: 'Getting Started', icon: '✨' },
};

function groupForKind(kind: string): NotificationGroupId {
  switch (kind) {
    case 'claim_paid_tier_unlocked':
      return 'subscription';
    case 'identity_renewal_due':
    case 'identity_verify_recommended':
      return 'identity';
    case 'document_expiring_30d':
    case 'document_expiring_7d':
    case 'document_expiring_1d':
    case 'document_expired':
      return 'documents';
    case 'stamp_disputed':
    case 'dispute_upheld':
    case 'dispute_overturned':
    case 'stamp_received':
      return 'stamps_disputes';
    case 'achievement_added':
      return 'achievements';
    case 'profile_first_visitor':
      return 'profile';
    case 'signup_welcome':
    case 'wizard_incomplete':
      return 'onboarding';
    default:
      // Unknown kind — fall back to onboarding so it still shows up.
      return 'onboarding';
  }
}

interface NotificationGroup {
  id: NotificationGroupId;
  label: string;
  icon: string;
  rows: InboxRow[];
  unreadCount: number;
}

function buildGroups(rows: InboxRow[]): NotificationGroup[] {
  const buckets: Record<NotificationGroupId, InboxRow[]> = {
    subscription: [],
    identity: [],
    documents: [],
    stamps_disputes: [],
    achievements: [],
    profile: [],
    onboarding: [],
  };
  for (const row of rows) buckets[groupForKind(row.kind)].push(row);

  const out: NotificationGroup[] = [];
  for (const id of GROUP_ORDER) {
    const bucket = buckets[id];
    if (bucket.length === 0) continue;
    // Newest first within a group.
    bucket.sort((a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0));
    out.push({
      id,
      label: GROUP_META[id].label,
      icon: GROUP_META[id].icon,
      rows: bucket,
      unreadCount: bucket.filter((r) => !r.read_at).length,
    });
  }
  return out;
}

function relativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const seconds = Math.max(0, Math.floor((now - then) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(months / 12);
  return `${years}y ago`;
}

/**
 * Resolve the link target for a notification row. The shape varies by
 * kind — dispute queue links for operators, Passport dashboard for
 * stampers, etc. Returns null if we can't determine a sensible target.
 */
function resolveLink(row: InboxRow): { href: string; cta: string } | null {
  const meta = (row.metadata ?? {}) as Record<string, unknown>;
  switch (row.kind) {
    case 'stamp_disputed': {
      const queueUrl = typeof meta.queue_url === 'string' ? meta.queue_url : null;
      if (queueUrl) return { href: queueUrl, cta: 'Review dispute queue' };
      return { href: '/dashboard', cta: 'Open dashboard' };
    }
    case 'dispute_upheld':
    case 'dispute_overturned':
    case 'stamp_received':
      return { href: '/dashboard/passport', cta: 'View Passport' };
    case 'document_expiring_30d':
    case 'document_expiring_7d':
    case 'document_expiring_1d':
    case 'document_expired':
    case 'identity_renewal_due':
      return { href: '/dashboard/passport', cta: 'Update documents' };
    case 'achievement_added':
      return { href: '/dashboard/passport', cta: 'View achievements' };
    default:
      return null;
  }
}

export default async function NotificationsPage() {
  const session = await auth();
  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress ?? '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);
  if (!session.userId) redirect('/login');
  if (!userId) redirect('/login');

  const { data, error } = await supabaseAdmin
    .from('consumer_notifications')
    .select('id, kind, title, body, metadata, read_at, snooze_until, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100);

  const rows: InboxRow[] = (data ?? []) as InboxRow[];
  const unreadCount = rows.filter((r) => !r.read_at).length;

  return (
    <main
      style={{
        padding: '24px 16px 64px',
        fontFamily: '-apple-system, system-ui, sans-serif',
        color: '#0f172a',
        maxWidth: 920,
        margin: '0 auto',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: '0.75rem',
          marginBottom: '1.5rem',
        }}
      >
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Notifications</h1>
        {unreadCount > 0 && (
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              background: unreadCount > 0 ? '#dc2626' : '#94a3b8',
              color: '#fff',
              padding: '0.2rem 0.5rem',
              borderRadius: 999,
            }}
          >
            {unreadCount} unread
          </span>
        )}
      </div>

      {error && (
        <div
          style={{
            background: '#fee2e2',
            border: '1px solid #fca5a5',
            color: '#991b1b',
            padding: '0.75rem 1rem',
            borderRadius: 8,
            fontSize: '0.9rem',
            marginBottom: '1rem',
          }}
        >
          Failed to load inbox: {error.message}
        </div>
      )}

      {rows.length === 0 ? (
        <div
          style={{
            background: '#f1f5f9',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: '2rem',
            textAlign: 'center',
            color: '#64748b',
          }}
        >
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔔</div>
          <div style={{ fontWeight: 600, color: '#0f172a' }}>No notifications yet</div>
          <div style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
            Dispute alerts and Passport updates will appear here.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {buildGroups(rows).map((group) => (
            <section key={group.id} aria-label={`${group.label} notifications`}>
              <h2
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: '#475569',
                  margin: '0 0 0.5rem',
                  padding: '0 0.25rem',
                }}
              >
                <span aria-hidden="true">{group.icon}</span>
                <span>{group.label}</span>
                <span
                  style={{
                    color: '#94a3b8',
                    fontWeight: 500,
                    letterSpacing: 0,
                    textTransform: 'none',
                  }}
                >
                  {group.rows.length} {group.rows.length === 1 ? 'notification' : 'notifications'}
                </span>
                {group.unreadCount > 0 ? (
                  <span
                    style={{
                      background: '#0f172a',
                      color: '#fff',
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      padding: '0.15rem 0.5rem',
                      borderRadius: 999,
                      marginLeft: 4,
                    }}
                    aria-label={`${group.unreadCount} unread in ${group.label}`}
                  >
                    {group.unreadCount} unread
                  </span>
                ) : null}
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {group.rows.map((row) => {
            const link = resolveLink(row);
            const kindLabel = KIND_LABEL[row.kind] ?? row.kind;
            const isUnread = !row.read_at;
            return (
              <div
                key={row.id}
                style={{
                  background: '#fff',
                  border: `1px solid ${isUnread ? '#0f172a' : '#e2e8f0'}`,
                  borderRadius: 10,
                  padding: '1rem 1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  boxShadow: isUnread ? '0 1px 2px rgba(0,0,0,0.04)' : 'none',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    flexWrap: 'wrap',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      padding: '0.15rem 0.5rem',
                      borderRadius: 4,
                      background: isUnread ? '#0f172a' : '#e2e8f0',
                      color: isUnread ? '#fff' : '#475569',
                    }}
                  >
                    {kindLabel}
                  </span>
                  {isUnread && (
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 999,
                        background: '#0ea5e9',
                      }}
                      aria-label="Unread"
                    />
                  )}
                  <span
                    style={{
                      color: '#64748b',
                      fontSize: '0.75rem',
                      marginLeft: 'auto',
                    }}
                  >
                    {relativeTime(row.created_at)}
                  </span>
                </div>
                <div
                  style={{
                    fontWeight: isUnread ? 700 : 500,
                    color: '#0f172a',
                    fontSize: '0.95rem',
                  }}
                >
                  {row.title}
                </div>
                {row.body && (
                  <div
                    style={{
                      color: '#475569',
                      fontSize: '0.85rem',
                      lineHeight: 1.5,
                    }}
                  >
                    {row.body}
                  </div>
                )}
                {link && (
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <Link
                      href={link.href}
                      style={{
                        display: 'inline-block',
                        padding: '0.4rem 0.85rem',
                        background: '#0f172a',
                        color: '#fff',
                        borderRadius: 6,
                        textDecoration: 'none',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                      }}
                    >
                      {link.cta} →
                    </Link>
                    {!row.read_at && (
                      <Link
                        href={`/api/consumer-notifications/${row.id}/dismiss`}
                        style={{
                          display: 'inline-block',
                          padding: '0.4rem 0.85rem',
                          background: 'transparent',
                          color: '#475569',
                          border: '1px solid #cbd5e1',
                          borderRadius: 6,
                          textDecoration: 'none',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                        }}
                      >
                        Dismiss
                      </Link>
                    )}
                  </div>
                )}
              </div>
            );
          })}
              </div>
            </section>
          ))}
        </div>
      )}

      <div style={{ marginTop: '2rem', textAlign: 'center' }}>
        <Link
          href="/dashboard"
          style={{
            color: '#0f172a',
            fontSize: '0.85rem',
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          ← Back to dashboard
        </Link>
      </div>
    </main>
  );
}