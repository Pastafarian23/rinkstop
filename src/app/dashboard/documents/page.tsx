/**
 * /dashboard/documents
 *
 * 2026-07-22 (Arnel): Documents and Passport were redundant and mixed into
 * the dashboard. Documents now live as a standalone top-level destination,
 * parallel to /dashboard/passport. This page is the unified Documents hub
 * for personal users:
 *
 *   1. Your uploads  — player_documents you uploaded for linked children
 *   2. Shared with you — team documents distributed to you by coaches/
 *      admins (the inbox that previously lived at /dashboard/family/documents
 *      without being linked anywhere)
 *
 * Both are accessible from here. For team-level document management (admin
 * uploads, distribution, signatures), coaches and admins use
 * /dashboard/team/[slug]/documents — that surface is unchanged.
 *
 * Tier gate: verified_identity+ (must be verified to handle documents).
 * Account-type gate: any signed-in user; the inbox is empty for non-parents.
 *
 * Why server component: everything reads from Supabase and can render
 * directly. No client state needed for v1.
 */

import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { tierAtLeastSameTrack } from '@/lib/tier-gate';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Documents',
  description:
    'Manage your hockey documents — waivers, releases, and team-shared files. Upload, sign, archive, and download with full audit trail.',
};

export default async function DocumentsHubPage() {
  const session = await auth();
  const cu = await currentUser();
  if (!session?.userId) redirect('/login');

  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);
  if (!userId) redirect('/login');

  // Tier gate: verified_identity+ (must be verified to handle documents).
  // We read the profile here so the gate is server-side; the page never
  // renders anything for under-tier users beyond the upgrade CTA.
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('tier')
    .eq('user_id', userId)
    .maybeSingle();
  const tier = (profile?.tier as string) ?? 'free';
  const tierOk =
    tierAtLeastSameTrack(tier, 'verified_identity') ||
    tierAtLeastSameTrack(tier, 'business_listing');
  if (!tierOk) {
    return (
      <div style={{ maxWidth: 720, padding: '2rem' }}>
        <h1
          style={{
            fontFamily: "'Bebas Neue', Impact, sans-serif",
            fontSize: '1.75rem',
            color: '#fff',
            letterSpacing: '0.05em',
            margin: '0 0 0.75rem',
          }}
        >
          DOCUMENTS
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', lineHeight: 1.5, margin: '0 0 1.5rem' }}>
          Document storage and signing requires Hockey Passport or higher. Verify once, then upload waivers, releases, and shared team documents — all with a full audit trail.
        </p>
        <Link
          href="/pricing?tier=verified_identity"
          style={{
            display: 'inline-block',
            padding: '0.6rem 1.25rem',
            background: '#FFB81C',
            color: '#0a0a0a',
            borderRadius: 6,
            fontSize: '0.9rem',
            fontWeight: 700,
            textDecoration: 'none',
          }}
        >
          Upgrade to Hockey Passport →
        </Link>
      </div>
    );
  }

  // Fetch linked kids so we can list player-documents for each.
  const { data: managed } = await supabaseAdmin
    .from('managed_profiles')
    .select('profile_id')
    .eq('manager_user_id', userId);
  const profileIds = (managed || []).map((m: any) => m.profile_id);
  const playerMap: Record<string, { first_name: string; last_name: string }> = {};
  if (profileIds.length > 0) {
    const { data: players } = await supabaseAdmin
      .from('players')
      .select('id, first_name, last_name')
      .in('id', profileIds);
    for (const p of players || []) {
      playerMap[p.id] = { first_name: p.first_name || '', last_name: p.last_name || '' };
    }
  }

  // Your uploads — all player_documents for linked kids, plus solo
  // documents if any (for users without managed children). Computes
  // status='expired' on read for documents whose expires_at has passed.
  let yourUploads: Array<{
    id: string;
    player_id: string | null;
    category: string;
    title: string;
    file_name: string | null;
    expires_at: string | null;
    status: string;
    created_at: string;
  }> = [];
  if (profileIds.length > 0) {
    const { data: docs } = await supabaseAdmin
      .from('player_documents')
      .select('id, player_id, category, title, file_name, expires_at, status, created_at')
      .in('player_id', profileIds)
      .order('created_at', { ascending: false })
      .limit(50);
    const today = new Date().toISOString().slice(0, 10);
    yourUploads = (docs || []).map((d: any) => ({
      ...d,
      status: d.status === 'active' && d.expires_at && d.expires_at < today ? 'expired' : d.status,
    }));
  }

  // Shared with you — read the parent's inbox for distributed team docs.
  // We re-implement the inbox summary here so this page is self-contained.
  // The full per-document inbox experience still lives at
  // /dashboard/family/documents (deep link from this page).
  let sharedCount = 0;
  try {
    const { count } = await supabaseAdmin
      .from('document_recipients')
      .select('id', { count: 'exact', head: true })
      .or(`recipient_user_id.eq.${userId}`)
      .is('acknowledged_at', null);
    sharedCount = count || 0;
  } catch {
    // Table may not exist yet — show 0, no error.
  }

  const cardBase = {
    background: '#0f0f0f',
    border: '1px solid #1e1e1e',
    borderRadius: 12,
    padding: '1.5rem',
  } as const;
  const headerStyle = {
    fontFamily: "'Bebas Neue', Impact, sans-serif",
    fontSize: '1.15rem',
    color: '#fff',
    letterSpacing: '0.05em',
    margin: '0 0 1rem',
  } as const;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: 920 }}>
      {/* Header */}
      <div
        data-testid="documents-hub-header"
        style={{
          background: '#0f0f0f',
          border: '1px solid #1e1e1e',
          borderRadius: 12,
          padding: '1.5rem 1.75rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ fontSize: '2rem' }} aria-hidden>📁</div>
        <div style={{ flex: 1, minWidth: 240 }}>
          <h1 style={{
            fontFamily: "'Bebas Neue', Impact, sans-serif",
            fontSize: '1.5rem',
            color: '#fff',
            letterSpacing: '0.05em',
            margin: '0 0 0.25rem',
          }}>
            DOCUMENTS
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', margin: 0, lineHeight: 1.5 }}>
            Waivers, releases, and shared team documents — all in one place, with full audit trail.
          </p>
        </div>
        <Link
          href="/dashboard/passport"
          style={{
            color: 'rgba(255,255,255,0.6)',
            fontSize: '0.85rem',
            textDecoration: 'none',
            padding: '0.4rem 0.85rem',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 6,
          }}
        >
          Hockey Passport →
        </Link>
      </div>

      {/* Your uploads (player documents for linked kids) */}
      <section
        data-testid="documents-your-uploads"
        style={cardBase}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: '1rem' }}>
          <h2 style={headerStyle}>YOUR UPLOADS</h2>
          <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.75rem' }}>
            {yourUploads.length} total
          </span>
        </div>
        {profileIds.length === 0 ? (
          <div
            data-testid="documents-no-kids"
            style={{
              padding: '1.5rem 1rem',
              background: '#0a0a0a',
              border: '1px dashed rgba(255,255,255,0.15)',
              borderRadius: 10,
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '1.5rem', marginBottom: 8 }} aria-hidden>👶</div>
            <h3 style={{
              fontFamily: "'Bebas Neue', Impact, sans-serif",
              fontSize: '1rem',
              color: '#fff',
              letterSpacing: '0.05em',
              margin: '0 0 0.25rem',
            }}>
              NO LINKED PLAYERS YET
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.875rem', margin: '0 0 1rem', maxWidth: 380, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.5 }}>
              Link a player in Family Hub first. You can then upload birth certificates, waivers, and medical forms tied to their profile.
            </p>
            <Link
              href="/dashboard/family"
              style={{
                display: 'inline-block',
                padding: '0.5rem 1rem',
                background: '#14B8A6',
                color: '#0a0a0a',
                borderRadius: 6,
                fontSize: '0.85rem',
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              Open Family Hub →
            </Link>
          </div>
        ) : yourUploads.length === 0 ? (
          <div
            data-testid="documents-uploads-empty"
            style={{
              padding: '1.25rem 1rem',
              background: '#0a0a0a',
              border: '1px dashed rgba(255,255,255,0.15)',
              borderRadius: 10,
              textAlign: 'center',
            }}
          >
            <h3 style={{
              fontFamily: "'Bebas Neue', Impact, sans-serif",
              fontSize: '1rem',
              color: '#fff',
              letterSpacing: '0.05em',
              margin: '0 0 0.25rem',
            }}>
              NO DOCUMENTS UPLOADED YET
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.875rem', margin: '0 0 1rem', lineHeight: 1.5 }}>
              Upload your first document (birth certificate, waiver, or medical form) in Family Hub.
            </p>
            <Link
              href="/dashboard/family"
              style={{
                display: 'inline-block',
                padding: '0.5rem 1rem',
                background: '#14B8A6',
                color: '#0a0a0a',
                borderRadius: 6,
                fontSize: '0.85rem',
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              Open Family Hub →
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {yourUploads.slice(0, 10).map((d) => {
              const player = d.player_id ? playerMap[d.player_id] : null;
              const childName = player
                ? `${player.first_name} ${player.last_name}`.trim() || 'Unknown Player'
                : 'You';
              return (
                <div
                  key={d.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '0.75rem 1rem',
                    background: '#0a0a0a',
                    border: '1px solid #141414',
                    borderRadius: 8,
                  }}
                >
                  <div style={{ fontSize: '1.25rem' }} aria-hidden>📄</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: '#fff', fontSize: '0.95rem', fontWeight: 600 }}>
                      {d.title}
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>
                      {childName} · {d.category}
                      {d.file_name ? ` · ${d.file_name}` : ''}
                    </div>
                  </div>
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    padding: '0.2rem 0.55rem',
                    borderRadius: 999,
                    background:
                      d.status === 'expired'
                        ? 'rgba(200,16,46,0.12)'
                        : 'rgba(20,184,166,0.12)',
                    color: d.status === 'expired' ? '#FF6B7A' : '#14B8A6',
                    border: `1px solid ${
                      d.status === 'expired' ? 'rgba(200,16,46,0.4)' : 'rgba(20,184,166,0.4)'
                    }`,
                  }}>
                    {d.status}
                  </span>
                </div>
              );
            })}
            {yourUploads.length > 10 ? (
              <Link
                href="/dashboard/family"
                style={{
                  alignSelf: 'center',
                  padding: '0.4rem 0.85rem',
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: '0.8rem',
                  textDecoration: 'none',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 6,
                }}
              >
                +{yourUploads.length - 10} more in Family Hub
              </Link>
            ) : null}
          </div>
        )}
      </section>

      {/* Shared with you (inbox for team-distributed documents) */}
      <section
        data-testid="documents-shared-with-you"
        style={cardBase}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: '1rem' }}>
          <h2 style={headerStyle}>SHARED WITH YOU</h2>
          <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.75rem' }}>
            {sharedCount} unread
          </span>
        </div>
        {sharedCount === 0 ? (
          <div
            data-testid="documents-inbox-empty"
            style={{
              padding: '1.25rem 1rem',
              background: '#0a0a0a',
              border: '1px dashed rgba(255,255,255,0.15)',
              borderRadius: 10,
              textAlign: 'center',
            }}
          >
            <h3 style={{
              fontFamily: "'Bebas Neue', Impact, sans-serif",
              fontSize: '1rem',
              color: '#fff',
              letterSpacing: '0.05em',
              margin: '0 0 0.25rem',
            }}>
              NO DOCUMENTS WAITING
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.875rem', margin: 0, lineHeight: 1.5 }}>
              When a coach or team admin distributes a document to you, it appears here for review and signature.
            </p>
          </div>
        ) : (
          <div>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', margin: '0 0 1rem', lineHeight: 1.5 }}>
              You have <strong style={{ color: '#14B8A6' }}>{sharedCount}</strong> document{sharedCount === 1 ? '' : 's'} waiting for your review or signature.
            </p>
            <Link
              href="/dashboard/family/documents"
              style={{
                display: 'inline-block',
                padding: '0.55rem 1rem',
                background: '#14B8A6',
                color: '#0a0a0a',
                borderRadius: 6,
                fontSize: '0.85rem',
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              Open inbox →
            </Link>
          </div>
        )}
      </section>

      {/* Cross-link to Passport — make the parallel explicit */}
      <section
        data-testid="documents-passport-crosslink"
        style={{
          background: 'rgba(20,184,166,0.06)',
          border: '1px solid rgba(20,184,166,0.3)',
          borderRadius: 12,
          padding: '1.25rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ fontSize: '1.5rem' }} aria-hidden>📋</div>
        <div style={{ flex: 1, minWidth: 240 }}>
          <h3 style={{
            fontFamily: "'Bebas Neue', Impact, sans-serif",
            fontSize: '1rem',
            color: '#fff',
            letterSpacing: '0.05em',
            margin: 0,
            marginBottom: 2,
          }}>
            DOCUMENTS AND PASSPORT ARE SEPARATE
          </h3>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', margin: 0, lineHeight: 1.45 }}>
            Documents are your paper trail (waivers, releases, medical forms). Your Hockey Passport is your verified career record (team history, stats, federation numbers). Manage either independently.
          </p>
        </div>
        <Link
          href="/dashboard/passport"
          style={{
            display: 'inline-block',
            padding: '0.55rem 1rem',
            background: 'transparent',
            border: '1px solid rgba(20,184,166,0.5)',
            color: '#14B8A6',
            borderRadius: 6,
            fontSize: '0.85rem',
            fontWeight: 700,
            textDecoration: 'none',
          }}
        >
          Open Passport →
        </Link>
      </section>
    </div>
  );
}
