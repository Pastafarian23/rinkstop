import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import { TierBadge } from '@/components/TierBadge';
import { tierAtLeast } from '@/lib/connections';

export const dynamic = 'force-dynamic';

const LEAD_CAPABLE_TYPES = new Set([
  'coach',
  'team_admin',
  'league_admin',
  'rink_operator',
  'business',
]);

interface ListingInquiry {
  id: string;
  listing_type: string;
  listing_id: string;
  listing_name: string | null;
  submitter_name: string | null;
  email: string | null;
  submitter_phone: string | null;
  message: string | null;
  status: string | null;
  created_at: string | null;
  read_at: string | null;
}

interface MessageThread {
  id: string;
  connection_id: string;
  context_profile_type: string | null;
  context_profile_id: string | null;
  last_message_at: string | null;
  last_message_preview: string | null;
  otherUser: {
    user_id: string;
    display_name: string | null;
    avatar_url: string | null;
    tier: string;
  };
  unreadCount: number;
}

async function loadListingInquiries(userId: string) {
  let inquiries: ListingInquiry[] = [];
  let tier = 'free';
  let queryError: string | null = null;

  try {
    const { data, error } = await supabaseAdmin
      .from('leads')
      .select('id, listing_type, listing_id, listing_name, submitter_name, email, submitter_phone, message, status, created_at, read_at')
      .eq('claimant_user_id', userId)
      .in('source', ['listing_inquiry_rink', 'listing_inquiry_team'])
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) {
      queryError = error.message;
    } else {
      inquiries = data || [];
    }
  } catch (e: any) {
    queryError = e?.message || 'Failed to load listing inquiries';
  }

  try {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('tier')
      .eq('user_id', userId)
      .maybeSingle();
    tier = profile?.tier || 'free';
  } catch {
    tier = 'free';
  }

  return {
    inquiries,
    tier,
    unreadCount: inquiries.filter((i) => !i.read_at).length,
    queryError,
  };
}

async function loadLeadCapability(userId: string) {
  try {
    const { data: accountTypes } = await supabaseAdmin
      .from('profile_account_types')
      .select('account_type')
      .eq('user_id', userId);

    if (accountTypes?.some((t: any) => LEAD_CAPABLE_TYPES.has(t.account_type))) {
      return true;
    }
  } catch {
    // Best effort. If we can't read account types, fall through to profile.role.
  }

  try {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();
    return LEAD_CAPABLE_TYPES.has(profile?.role || '');
  } catch {
    return false;
  }
}

async function loadMessageThreads(userId: string): Promise<{ threads: MessageThread[]; unreadCount: number; queryError: string | null }> {
  try {
    const { data: connections } = await supabaseAdmin
      .from('connections')
      .select('id, user_low, user_high')
      .or(`user_low.eq.${userId},user_high.eq.${userId}`)
      .eq('status', 'accepted');

    if (!connections?.length) {
      return { threads: [], unreadCount: 0, queryError: null };
    }

    const otherUserIdByConnId: Record<string, string> = {};
    const otherUserIds = new Set<string>();
    for (const c of connections) {
      const other = c.user_low === userId ? c.user_high : c.user_low;
      otherUserIdByConnId[c.id] = other;
      otherUserIds.add(other);
    }

    const { data: threads } = await supabaseAdmin
      .from('threads')
      .select('id, connection_id, last_message_at, last_message_preview, context_profile_type, context_profile_id')
      .in('connection_id', connections.map((c: any) => c.id))
      .order('last_message_at', { ascending: false })
      .limit(20);

    if (!threads?.length) {
      return { threads: [], unreadCount: 0, queryError: null };
    }

    const threadIds = threads.map((t: any) => t.id);
    const { data: messages } = await supabaseAdmin
      .from('messages')
      .select('thread_id, sender_id, read_at')
      .in('thread_id', threadIds)
      .is('read_at', null)
      .neq('sender_id', userId);

    const unreadByThread: Record<string, number> = {};
    let totalUnread = 0;
    for (const m of messages || []) {
      totalUnread += 1;
      unreadByThread[m.thread_id] = (unreadByThread[m.thread_id] || 0) + 1;
    }

    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('user_id, display_name, avatar_url, tier, username')
      .in('user_id', Array.from(otherUserIds));

    const profilesById = new Map((profiles || []).map((p: any) => [p.user_id, p]));

    const hydrated = threads.map((t: any) => {
      const otherUserId = otherUserIdByConnId[t.connection_id];
      const profile = profilesById.get(otherUserId);
      return {
        id: t.id,
        connection_id: t.connection_id,
        context_profile_type: t.context_profile_type,
        context_profile_id: t.context_profile_id,
        last_message_at: t.last_message_at,
        last_message_preview: t.last_message_preview,
        otherUser: {
          user_id: otherUserId,
          display_name: profile?.display_name ?? null,
          avatar_url: profile?.avatar_url ?? null,
          tier: profile?.tier || 'free',
        },
        unreadCount: unreadByThread[t.id] || 0,
      };
    });

    return { threads: hydrated, unreadCount: totalUnread, queryError: null };
  } catch (e: any) {
    return { threads: [], unreadCount: 0, queryError: e?.message || 'Failed to load messages' };
  }
}

export default async function InboxPage() {
  const session = await auth();
  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);
  if (!session.userId) redirect('/login');

  const [listing, hasLeadAccess, messages] = await Promise.all([
    loadListingInquiries(userId),
    loadLeadCapability(userId),
    loadMessageThreads(userId),
  ]);

  const totalUnread = listing.unreadCount + messages.unreadCount;

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '2rem', color: '#fff', letterSpacing: '0.05em', margin: 0 }}>
            INBOX
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.9rem', margin: '0.25rem 0 0' }}>
            Messages and listing inquiries in one place.
          </p>
        </div>
        {totalUnread > 0 && (
          <div style={{ background: 'rgba(200,16,46,0.15)', border: '1px solid rgba(200,16,46,0.4)', color: '#FF6B7A', padding: '0.4rem 0.85rem', borderRadius: 999, fontSize: '0.8rem', fontWeight: 700 }}>
            {totalUnread} unread
          </div>
        )}
      </div>

      {messages.queryError ? (
        <div style={{ background: 'rgba(200,16,46,0.08)', border: '1px solid rgba(200,16,46,0.3)', borderRadius: 12, padding: '1rem 1.25rem', color: '#FF6B7A', marginBottom: '1rem', fontSize: '0.875rem' }}>
          Couldn&apos;t load messages: {messages.queryError}
        </div>
      ) : (
        <section style={{ background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: 12, padding: '1.25rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <div>
              <h2 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '1.2rem', color: '#fff', letterSpacing: '0.04em', margin: 0 }}>
                MESSAGES
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', margin: '0.25rem 0 0' }}>
                Direct messages with your connections.
              </p>
            </div>
            <Link href="/dashboard/connections" style={{ color: '#FFB81C', fontSize: '0.8rem', textDecoration: 'none', fontWeight: 700 }}>
              View connections
            </Link>
          </div>

          {messages.threads.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'rgba(255,255,255,0.55)' }}>
              <p style={{ margin: 0, fontWeight: 600, color: 'rgba(255,255,255,0.75)' }}>No conversations yet</p>
              <p style={{ margin: '0.35rem 0 0', fontSize: '0.85rem' }}>Start a conversation by connecting with someone on their profile.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {messages.threads.map((t) => {
                const name = t.otherUser.display_name || 'RinkStop Member';
                return (
                  <Link
                    key={t.id}
                    href={`/dashboard/messages/${t.id}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '0.75rem 1rem',
                      background: t.unreadCount > 0 ? 'rgba(20,184,166,0.05)' : '#0f0f0f',
                      border: t.unreadCount > 0 ? '1px solid rgba(20,184,166,0.3)' : '1px solid #1e1e1e',
                      borderRadius: 8,
                      textDecoration: 'none',
                      color: '#fff',
                    }}
                  >
                    {t.otherUser.avatar_url ? (
                      <img src={t.otherUser.avatar_url} alt={name} style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#041E42', color: '#FFB81C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700 }}>
                        {name[0]?.toUpperCase()}
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                        <div style={{ fontWeight: 600, fontSize: 15 }}>{name}</div>
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                          {t.last_message_at ? new Date(t.last_message_at).toLocaleDateString([], { month: 'short', day: 'numeric' }) : ''}
                        </div>
                      </div>
                      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.last_message_preview || <em>No messages yet</em>}
                      </div>
                    </div>
                    {t.unreadCount > 0 && (
                      <span style={{ background: '#C8102E', color: '#fff', borderRadius: 999, fontSize: 11, fontWeight: 700, padding: '0.1rem 0.5rem', minWidth: 20, textAlign: 'center' }}>
                        {t.unreadCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      )}

      {hasLeadAccess ? (
        <section style={{ background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: 12, padding: '1.25rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <div>
              <h2 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '1.2rem', color: '#fff', letterSpacing: '0.04em', margin: 0 }}>
                LISTING INQUIRIES
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', margin: '0.25rem 0 0' }}>
                Form submissions from people interested in your rinks and teams.
              </p>
            </div>
            {listing.unreadCount > 0 && (
              <div style={{ background: 'rgba(20,184,166,0.12)', border: '1px solid rgba(20,184,166,0.3)', color: '#14B8A6', padding: '0.4rem 0.85rem', borderRadius: 999, fontSize: '0.8rem', fontWeight: 700 }}>
                {listing.unreadCount} new
              </div>
            )}
          </div>

          {listing.queryError && (
            <div style={{ background: 'rgba(200,16,46,0.08)', border: '1px solid rgba(200,16,46,0.3)', borderRadius: 8, padding: '1rem 1.25rem', color: '#FF6B7A', marginBottom: '1rem', fontSize: '0.875rem' }}>
              Couldn&apos;t load listing inquiries: {listing.queryError}
            </div>
          )}

          {/* Show upgrade nudge to anyone below Business Plus. tierAtLeast handles legacy aliases. */}
          {!tierAtLeast(listing.tier, 'business_plus') && (
            <div style={{ background: 'linear-gradient(135deg, rgba(200,16,46,0.12), rgba(255,184,28,0.08))', border: '1px solid rgba(200,16,46,0.3)', borderRadius: 12, padding: '1.25rem 1.5rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
              <div>
                <p style={{ color: '#fff', fontWeight: 700, fontSize: '0.95rem', margin: '0 0 0.25rem' }}>
                  Want featured placement + more listings?
                </p>
                <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.85rem', margin: 0 }}>
                  You&apos;re on the <TierBadge tier={listing.tier as any} size="sm" /> plan. Upgrade to Pro for featured placement in your city and up to 25 claims.
                </p>
              </div>
              <Link href="/pricing" style={{ background: '#C8102E', color: '#fff', padding: '0.65rem 1.1rem', borderRadius: 6, fontSize: '0.85rem', fontWeight: 700, textDecoration: 'none', letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>
                SEE PLANS →
              </Link>
            </div>
          )}

          {listing.inquiries.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'rgba(255,255,255,0.55)' }}>
              <p style={{ margin: 0, fontWeight: 600, color: 'rgba(255,255,255,0.75)' }}>No listing inquiries yet</p>
              <p style={{ margin: '0.35rem 0 0', fontSize: '0.85rem' }}>When someone contacts you through a listing, it will appear here.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {listing.inquiries.map((inq) => (
                <ListingInquiryCard key={inq.id} inquiry={inq} />
              ))}
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}

function ListingInquiryCard({ inquiry }: { inquiry: ListingInquiry }) {
  const created = inquiry.created_at ? new Date(inquiry.created_at) : null;
  const isUnread = !inquiry.read_at;
  const listingHref =
    inquiry.listing_type === 'rink'
      ? `/directory/rinks/${inquiry.listing_id}`
      : inquiry.listing_type === 'team'
        ? `/directory/teams/${inquiry.listing_id}`
        : '#';

  return (
    <div
      style={{
        background: isUnread ? 'rgba(20,184,166,0.04)' : 'rgba(255,255,255,0.03)',
        border: isUnread ? '1px solid rgba(20,184,166,0.3)' : '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12,
        padding: '1.25rem 1.5rem',
        transition: 'border-color 0.15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: '1rem' }}>
              {inquiry.submitter_name || 'Unknown sender'}
            </span>
            {isUnread && (
              <span style={{ background: '#14B8A6', color: '#fff', fontSize: '0.65rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: 999, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                NEW
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', color: 'rgba(255,255,255,0.55)', fontSize: '0.85rem' }}>
            {inquiry.email && <a href={`mailto:${inquiry.email}`} style={{ color: '#38bdf8', textDecoration: 'none' }}>{inquiry.email}</a>}
            {inquiry.submitter_phone && <a href={`tel:${inquiry.submitter_phone}`} style={{ color: '#38bdf8', textDecoration: 'none' }}>{inquiry.submitter_phone}</a>}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>
            {created ? created.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : ''}
          </p>
          {inquiry.listing_name && (
            <Link
              href={listingHref}
              style={{
                display: 'inline-block',
                marginTop: '0.25rem',
                color: 'rgba(255,255,255,0.65)',
                fontSize: '0.8rem',
                textDecoration: 'none',
                padding: '0.2rem 0.5rem',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: 4,
              }}
            >
              {inquiry.listing_type === 'rink' ? '🏒' : inquiry.listing_type === 'team' ? '🛡️' : '🏆'} {inquiry.listing_name}
            </Link>
          )}
        </div>
      </div>

      <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: '0.875rem 1rem', color: 'rgba(255,255,255,0.85)', fontSize: '0.9rem', lineHeight: 1.55, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {inquiry.message || ''}
      </div>
    </div>
  );
}
