import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import { TierBadge } from '@/components/TierBadge';
import { getUserTier } from '@/lib/connections';
import { tierAtLeastSameTrack } from '@/lib/tier-gate';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import FamilySearch from '@/components/family/FamilySearch';
import FamilySetupResume from '@/components/family/FamilySetupResume';
import PlayerDocumentSection from '@/components/player-documents/PlayerDocumentSection';
import PlayerTimelineSection from '@/components/player-achievements/PlayerTimelineSection';
import PlayerMediaSection from '@/components/player-media/PlayerMediaSection';
import { buildTimeline } from '@/lib/timeline-builder';

export const dynamic = 'force-dynamic';

export default async function FamilyPage() {
  const session = await auth();
  if (!session?.userId) redirect('/login');

  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);
  if (!userId) redirect('/login');

  const tier = await getUserTier(userId);

  // Family Hub is part of the Identity Plus plan (and legacy pro/roster_plus).
  // The business track has its own equivalents (business_pro+ = paid business tier with multi-listing).
  // tierAtLeast handles both new and legacy tier names.
  const canAccessFamily =
    tierAtLeastSameTrack(tier, 'identity_plus') ||
    tierAtLeastSameTrack(tier, 'business_listing');
  if (!canAccessFamily) {
    redirect('/pricing');
  }

  // Read family_setup_completed_at to decide whether to show the
  // "Resume Hockey Passport setup" link (Phase 1a, prep doc §3.5).
  // If the column does not exist yet (migration not applied), this
  // returns null which means "show nothing" — the Resume link is
  // conditional on the column being set, so a missing column yields
  // no Resume link. Safe fallback.
  let wizardCompletedAt: string | null = null;
  try {
    const { data } = await supabaseAdmin
      .from('profiles')
      .select('family_setup_completed_at')
      .eq('user_id', userId)
      .maybeSingle();
    wizardCompletedAt = (data as { family_setup_completed_at?: string | null } | null)?.family_setup_completed_at ?? null;
  } catch {
    // Column may not exist yet (migration not applied). Default to null.
    wizardCompletedAt = null;
  }

  // Fetch managed profiles (kids linked to this user)
  // Note: column is manager_user_id, profile_id links to players.id
  const { data: managedProfiles } = await supabaseAdmin
    .from('managed_profiles')
    .select('id, profile_id, relationship, created_at')
    .eq('manager_user_id', userId)
    .order('created_at', { ascending: false });

  // Hydrate player names for display
  const profileIds = (managedProfiles || []).map((mp: any) => mp.profile_id);
  const playerMap: Record<string, any> = {};
  if (profileIds.length > 0) {
    const { data: players } = await supabaseAdmin
      .from('players')
      .select('id, first_name, last_name, slug, headshot_url')
      .in('id', profileIds);
    for (const p of players || []) {
      playerMap[p.id] = p;
    }
  }

  // Phase 1b-2: build the career timeline for each child from on-read joins.
  // The list of (player_id → events[]) is passed to the page so each
  // <PlayerTimelineSection> can render without re-fetching.
  const timelineByPlayer: Record<string, any[]> = {};
  for (const mp of managedProfiles || []) {
    timelineByPlayer[mp.profile_id] = await buildTimeline(mp.profile_id, userId);
  }

  // Phase 1b-2: fetch player_achievements for all linked children in one batch.
  const achievementsByPlayer: Record<string, any[]> = {};
  if (profileIds.length > 0) {
    const { data: achs } = await supabaseAdmin
      .from('player_achievements')
      .select('id, player_id, title, description, category, achieved_at, created_at, updated_at')
      .in('player_id', profileIds)
      .order('achieved_at', { ascending: false });
    for (const a of achs || []) {
      (achievementsByPlayer[a.player_id] = achievementsByPlayer[a.player_id] || []).push(a);
    }
  }

  // Phase 1b-3: fetch player_media for all linked children in one batch.
  const mediaByPlayer: Record<string, any[]> = {};
  if (profileIds.length > 0) {
    const { data: media } = await supabaseAdmin
      .from('player_media')
      .select('id, player_id, media_type, caption, storage_paths, width_px, height_px, duration_sec, file_size_bytes, is_primary, status, created_at, updated_at')
      .in('player_id', profileIds)
      .order('created_at', { ascending: false });
    for (const m of media || []) {
      (mediaByPlayer[m.player_id] = mediaByPlayer[m.player_id] || []).push(m);
    }
  }
  // The component is passed the per-child array; PlayerDocumentList is a
  // server-fed client component so it reads the seed list directly and
  // refetches via GET after the user does an action.
  // We compute status='expired' on read here too, mirroring the GET endpoint,
  // so the list renders correctly without an HTTP roundtrip on first paint.
  const documentsByPlayer: Record<string, any[]> = {};
  if (profileIds.length > 0) {
    const { data: docs } = await supabaseAdmin
      .from('player_documents')
      .select(
        'id, player_id, category, title, description, file_name, file_size_bytes, mime_type, expires_at, status, created_at, updated_at'
      )
      .in('player_id', profileIds)
      .order('created_at', { ascending: false });
    const today = new Date().toISOString().slice(0, 10);
    for (const d of docs || []) {
      let status = d.status;
      if (status === 'active' && d.expires_at && d.expires_at < today) {
        status = 'expired';
      }
      const arr = documentsByPlayer[d.player_id] ?? (documentsByPlayer[d.player_id] = []);
      arr.push({ ...d, status });
    }
  }

  // Per-child consent state — used to gate the upload form when a parent's
  // consent was previously revoked. The link row itself is the source of
  // truth; the upload component re-asserts on submit.
  const consentRevokedByPlayer: Record<string, boolean> = {};
  if (profileIds.length > 0) {
    const { data: links } = await supabaseAdmin
      .from('managed_profiles')
      .select('profile_id, minor_consent_revoked_at')
      .eq('manager_user_id', userId)
      .in('profile_id', profileIds);
    for (const l of links || []) {
      consentRevokedByPlayer[l.profile_id] = !!l.minor_consent_revoked_at;
    }
  }

  // Family Schedule rollup (Phase 1a, prep doc §3.1).
  // Read the parent's own team_schedule events. 1a scope is the parent's
  // own team memberships; per-kid aggregation ships in 1b-3 (family-level
  // rollup views). For now we surface the parent's schedule as the
  // "Family Schedule" with a "coming next" note for per-kid rollup.
  let familySchedule: Array<{ id: string; title: string; starts_at: string; team_name: string; kind: string }> = [];
  try {
    const { data: memberships } = await supabaseAdmin
      .from('team_members')
      .select('team_id, team_workspaces:team_id ( id, name, short_name )')
      .eq('user_id', userId)
      .is('left_at', null);
    const teamIds = (memberships || []).map((m: any) => m.team_id).filter(Boolean);
    if (teamIds.length > 0) {
      const { data: events } = await supabaseAdmin
        .from('team_schedule')
        .select('id, title, starts_at, kind, team_id')
        .in('team_id', teamIds)
        .gte('starts_at', new Date().toISOString())
        .order('starts_at', { ascending: true })
        .limit(8);
      const teamNameById: Record<string, string> = {};
      for (const m of memberships || []) {
        const t: any = m.team_workspaces;
        if (t?.id && t?.name) teamNameById[t.id] = t.short_name || t.name;
      }
      familySchedule = (events || []).map((e: any) => ({
        id: e.id,
        title: e.title,
        starts_at: e.starts_at,
        team_name: teamNameById[e.team_id] || 'Team',
        kind: e.kind,
      }));
    }
  } catch (e) {
    // Table may not exist for some users. Fail silently.
    familySchedule = [];
  }

  // Family Payments rollup (Phase 1a, prep doc §3.1).
  // Read the parent's own payment_records (or team_payments depending on
  // schema). Use team_payments per existing schema (per 2026-06-20 migration).
  // 1a scope is the parent's own team payments; per-kid aggregation ships
  // in 1b-3.
  let familyPayments: Array<{ id: string; amount: number; status: string; team_name: string; due_at: string | null }> = [];
  try {
    const { data: memberships } = await supabaseAdmin
      .from('team_members')
      .select('team_id, team_workspaces:team_id ( id, name, short_name )')
      .eq('user_id', userId)
      .is('left_at', null);
    const teamIds = (memberships || []).map((m: any) => m.team_id).filter(Boolean);
    if (teamIds.length > 0) {
      const { data: payments } = await supabaseAdmin
        .from('team_payments')
        .select('id, amount, status, due_at, team_id')
        .in('team_id', teamIds)
        .in('status', ['pending', 'overdue'])
        .order('due_at', { ascending: true })
        .limit(8);
      const teamNameById: Record<string, string> = {};
      for (const m of memberships || []) {
        const t: any = m.team_workspaces;
        if (t?.id && t?.name) teamNameById[t.id] = t.short_name || t.name;
      }
      familyPayments = (payments || []).map((p: any) => ({
        id: p.id,
        amount: p.amount,
        status: p.status,
        team_name: teamNameById[p.team_id] || 'Team',
        due_at: p.due_at,
      }));
    }
  } catch (e) {
    familyPayments = [];
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: 920 }}>
      {/* Header card */}
      <div
        data-testid="family-hub-header"
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
        <div style={{ fontSize: '2rem' }} aria-hidden>👨‍👩‍👧‍👦</div>
        <div style={{ flex: 1, minWidth: 240 }}>
          <h1 style={{
            fontFamily: "'Bebas Neue', Impact, sans-serif",
            fontSize: '1.5rem', color: '#fff', letterSpacing: '0.05em',
            margin: '0 0 0.25rem',
          }}>
            FAMILY HUB
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', margin: 0, lineHeight: 1.5 }}>
            Your family&rsquo;s permanent record. Linked players, schedule, payments, and more — all in one place.
          </p>
        </div>
        <TierBadge tier={tier} size="xs" />
      </div>

      {/* Resume setup link (Phase 1a, prep doc §3.5). Only visible when
          the user has dismissed the wizard. Cleared via the API route. */}
      {wizardCompletedAt ? <FamilySetupResume /> : null}

      {/* Linked Players (existing surface, slightly richer) */}
      <section
        data-testid="family-linked-players"
        style={{ background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: 12, padding: '1.5rem' }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: '1rem' }}>
          <h2 style={{
            fontFamily: "'Bebas Neue', Impact, sans-serif",
            fontSize: '1.15rem', color: '#fff', letterSpacing: '0.05em', margin: 0,
          }}>
            LINKED PLAYERS
          </h2>
          <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.75rem' }}>
            {(managedProfiles || []).length} linked
          </span>
        </div>

        {!managedProfiles || managedProfiles.length === 0 ? (
          <div
            data-testid="family-empty-state"
            style={{
              padding: '1.5rem 1rem',
              background: '#0a0a0a',
              border: '1px dashed rgba(255,255,255,0.15)',
              borderRadius: 10,
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '1.75rem', marginBottom: 8 }} aria-hidden>👶</div>
            <h3 style={{
              fontFamily: "'Bebas Neue', Impact, sans-serif",
              fontSize: '1rem', color: '#fff', letterSpacing: '0.05em', margin: '0 0 0.25rem',
            }}>
              NO PLAYERS LINKED YET
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.875rem', margin: '0 0 1rem', maxWidth: 380, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.5 }}>
              Link your first child to start your Family Hub. Their Hockey Passport will live here forever.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {managedProfiles.map((mp: any) => {
              const player = playerMap[mp.profile_id] || {};
              return (
                <div
                  key={mp.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '0.75rem 1rem',
                    background: '#0a0a0a', border: '1px solid #141414', borderRadius: 8,
                  }}
                >
                  <div style={{ fontSize: '1.25rem' }} aria-hidden>⭐</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: '#fff', fontSize: '0.95rem', fontWeight: 600 }}>
                      {player.first_name && player.last_name ? `${player.first_name} ${player.last_name}` : 'Unknown Player'}
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>
                      {mp.relationship || 'parent'}
                      {player.slug && (
                        <>
                          {' · '}
                          <Link href={`/directory/players/${player.slug}`} style={{ color: '#14B8A6' }}>
                            view public profile
                          </Link>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <FamilySearch />
      </section>

      {/* Family Schedule (new in 1a) */}
      <section
        data-testid="family-schedule"
        style={{ background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: 12, padding: '1.5rem' }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: '1rem' }}>
          <h2 style={{
            fontFamily: "'Bebas Neue', Impact, sans-serif",
            fontSize: '1.15rem', color: '#fff', letterSpacing: '0.05em', margin: 0,
          }}>
            FAMILY SCHEDULE
          </h2>
          <Link
            href="/dashboard/schedule"
            style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.75rem', textDecoration: 'none' }}
          >
            Open full schedule →
          </Link>
        </div>
        {familySchedule.length === 0 ? (
          <div
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
              fontSize: '1rem', color: '#fff', letterSpacing: '0.05em', margin: '0 0 0.25rem',
            }}>
              NO UPCOMING EVENTS
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.875rem', margin: '0 0 0.75rem', maxWidth: 380, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.5 }}>
              Join a team or organization to see games, practices, and tournaments here.
            </p>
            <Link
              href="/directory/teams"
              style={{
                display: 'inline-block', padding: '0.5rem 1rem',
                background: '#14B8A6', color: '#0a0a0a',
                borderRadius: 6, fontSize: '0.85rem', fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              Browse teams →
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {familySchedule.map((ev) => (
              <div
                key={ev.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '0.75rem 1rem',
                  background: '#0a0a0a', border: '1px solid #141414', borderRadius: 8,
                }}
              >
                <div style={{ fontSize: '1.25rem' }} aria-hidden>📅</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#fff', fontSize: '0.95rem', fontWeight: 600 }}>{ev.title}</div>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>
                    {new Date(ev.starts_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })} · {ev.team_name}
                  </div>
                </div>
                <span style={{
                  fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
                  padding: '0.2rem 0.55rem', borderRadius: 999,
                  background: 'rgba(20,184,166,0.12)', color: '#14B8A6',
                  border: '1px solid rgba(20,184,166,0.3)',
                }}>
                  {ev.kind || 'event'}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Family Payments (new in 1a) */}
      <section
        data-testid="family-payments"
        style={{ background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: 12, padding: '1.5rem' }}
      >
        <h2 style={{
          fontFamily: "'Bebas Neue', Impact, sans-serif",
          fontSize: '1.15rem', color: '#fff', letterSpacing: '0.05em', margin: '0 0 1rem',
        }}>
          FAMILY PAYMENTS
        </h2>
        {familyPayments.length === 0 ? (
          <div
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
              fontSize: '1rem', color: '#fff', letterSpacing: '0.05em', margin: '0 0 0.25rem',
            }}>
              NO PAYMENTS DUE
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.875rem', margin: 0, lineHeight: 1.5 }}>
              Your family is current. Outstanding fees from your teams will show here.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {familyPayments.map((p) => (
              <div
                key={p.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '0.75rem 1rem',
                  background: '#0a0a0a', border: '1px solid #141414', borderRadius: 8,
                }}
              >
                <div style={{ fontSize: '1.25rem' }} aria-hidden>💳</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#fff', fontSize: '0.95rem', fontWeight: 600 }}>
                    ${(p.amount / 100).toFixed(2)} · {p.team_name}
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>
                    {p.due_at ? `Due ${new Date(p.due_at).toLocaleDateString('en-US', { dateStyle: 'medium' })}` : 'Due on request'}
                  </div>
                </div>
                <span style={{
                  fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
                  padding: '0.2rem 0.55rem', borderRadius: 999,
                  background: p.status === 'overdue' ? 'rgba(200,16,46,0.12)' : 'rgba(255,184,28,0.12)',
                  color: p.status === 'overdue' ? '#FF6B7A' : '#FFB81C',
                  border: `1px solid ${p.status === 'overdue' ? 'rgba(200,16,46,0.4)' : 'rgba(255,184,28,0.4)'}`,
                }}>
                  {p.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Documents (1b-1 — live). One per linked child. Server-side seeds
          the list from `player_documents`; PlayerDocumentSection handles
          the post-action `router.refresh()`. We never POST from the page
          itself. */}
      <section
        data-testid="family-documents"
        style={{ background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: 12, padding: '1.5rem' }}
      >
        <h2 style={{
          fontFamily: "'Bebas Neue', Impact, sans-serif",
          fontSize: '1.15rem', color: '#fff', letterSpacing: '0.05em', margin: '0 0 0.5rem',
        }}>
          DOCUMENTS
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem', margin: '0 0 1rem', lineHeight: 1.5 }}>
          Secure document storage for birth certificates, waivers, and medical forms. You control who sees each document.
        </p>

        {!managedProfiles || managedProfiles.length === 0 ? (
          <div
            data-testid="family-documents-empty"
            style={{
              padding: '1rem',
              background: '#0a0a0a',
              border: '1px dashed rgba(255,255,255,0.15)',
              borderRadius: 10,
              textAlign: 'center',
              color: 'rgba(255,255,255,0.55)',
              fontSize: '0.85rem',
            }}
          >
            Link a player first to start uploading documents.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {managedProfiles.map((mp: any) => {
              const player = playerMap[mp.profile_id] || {};
              const docs = documentsByPlayer[mp.profile_id] || [];
              const consentRevoked = !!consentRevokedByPlayer[mp.profile_id];
              const childName =
                player.first_name && player.last_name
                  ? `${player.first_name} ${player.last_name}`
                  : 'Unknown Player';
              return (
                <div
                  key={mp.id}
                  data-testid="family-documents-child"
                  style={{
                    padding: '1rem',
                    background: '#0a0a0a',
                    border: '1px solid #141414',
                    borderRadius: 10,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: '0.85rem' }}>
                    <h3
                      style={{
                        fontFamily: "'Bebas Neue', Impact, sans-serif",
                        fontSize: '0.95rem',
                        color: '#fff',
                        letterSpacing: '0.05em',
                        margin: 0,
                      }}
                    >
                      {childName.toUpperCase()}&rsquo;S DOCUMENTS
                    </h3>
                    <span
                      style={{
                        color: 'rgba(255,255,255,0.4)',
                        fontSize: '0.7rem',
                      }}
                    >
                      {docs.filter((d: any) => d.status !== 'archived').length} active
                    </span>
                  </div>

                  <PlayerDocumentSection
                    playerId={mp.profile_id}
                    documents={docs}
                    consentRevoked={consentRevoked}
                  />
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Achievements + Career Timeline (1b-2 — live). Per linked child, render
          the achievements list + add form, then the career timeline below.
          Server-side pre-computes both from player_achievements, team_members,
          player_documents, and profiles in lib/timeline-builder. */}
      {!managedProfiles || managedProfiles.length === 0 ? (
        <section
          data-testid="family-achievements-empty"
          style={{ background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: 12, padding: '1.5rem' }}
        >
          <h2 style={{
            fontFamily: "'Bebas Neue', Impact, sans-serif",
            fontSize: '1.15rem', color: '#fff', letterSpacing: '0.05em', margin: '0 0 0.5rem',
          }}>
            ACHIEVEMENTS &amp; TIMELINE
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem', margin: 0, lineHeight: 1.5 }}>
            Link a player first to start tracking achievements and the career timeline.
          </p>
        </section>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {managedProfiles.map((mp: any) => {
            const player = playerMap[mp.profile_id] || {};
            const achs = achievementsByPlayer[mp.profile_id] || [];
            const events = timelineByPlayer[mp.profile_id] || [];
            const childName =
              player.first_name && player.last_name
                ? `${player.first_name} ${player.last_name}`
                : 'Unknown Player';
            return (
              <section
                key={mp.id}
                data-testid="family-achievements-child"
                style={{ background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: 12, padding: '1.5rem' }}
              >
                <h2 style={{
                  fontFamily: "'Bebas Neue', Impact, sans-serif",
                  fontSize: '1.15rem', color: '#fff', letterSpacing: '0.05em', margin: '0 0 0.5rem',
                }}>
                  {childName.toUpperCase()}&rsquo;S ACHIEVEMENTS &amp; TIMELINE
                </h2>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem', margin: '0 0 1rem', lineHeight: 1.5 }}>
                  Add achievements and watch the career timeline fill in.
                </p>
                <PlayerTimelineSection
                  playerId={mp.profile_id}
                  achievements={achs}
                  timelineEvents={events}
                />
              </section>
            );
          })}
        </div>
      )}

      {/* Media (1b-3 — live). Per linked child, render the gallery + upload. */}
      <section
        data-testid="family-media"
        style={{ background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: 12, padding: '1.5rem' }}
      >
        <h2 style={{
          fontFamily: "'Bebas Neue', Impact, sans-serif",
          fontSize: '1.15rem', color: '#fff', letterSpacing: '0.05em', margin: '0 0 0.5rem',
        }}>
          MEDIA
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem', margin: '0 0 1rem', lineHeight: 1.5 }}>
          Photos and short videos. Set one as primary to use as the avatar.
        </p>
        {!managedProfiles || managedProfiles.length === 0 ? (
          <div
            data-testid="family-media-empty"
            style={{
              padding: '1rem',
              background: '#0a0a0a',
              border: '1px dashed rgba(255,255,255,0.15)',
              borderRadius: 10,
              textAlign: 'center',
              color: 'rgba(255,255,255,0.55)',
              fontSize: '0.85rem',
            }}
          >
            Link a player first to start uploading media.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {managedProfiles.map((mp: any) => {
              const player = playerMap[mp.profile_id] || {};
              const childMedia = mediaByPlayer[mp.profile_id] || [];
              const childName =
                player.first_name && player.last_name
                  ? `${player.first_name} ${player.last_name}`
                  : 'Unknown Player';
              return (
                <div
                  key={mp.id}
                  data-testid="family-media-child"
                  style={{
                    padding: '1rem',
                    background: '#0a0a0a',
                    border: '1px solid #141414',
                    borderRadius: 10,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: '0.85rem' }}>
                    <h3
                      style={{
                        fontFamily: "'Bebas Neue', Impact, sans-serif",
                        fontSize: '0.95rem',
                        color: '#fff',
                        letterSpacing: '0.05em',
                        margin: 0,
                      }}
                    >
                      {childName.toUpperCase()}&rsquo;S MEDIA
                    </h3>
                    <span
                      style={{
                        color: 'rgba(255,255,255,0.4)',
                        fontSize: '0.7rem',
                      }}
                    >
                      {childMedia.filter((m: any) => m.status !== 'archived').length} item{childMedia.filter((m: any) => m.status !== 'archived').length === 1 ? '' : 's'}
                    </span>
                  </div>
                  <PlayerMediaSection playerId={mp.profile_id} media={childMedia} />
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
