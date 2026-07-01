import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { auth, currentUser } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { resolveCanonicalUserId } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PlayerRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  slug: string | null;
  position: string | null;
  jersey_number: number | string | null;
  nationality: string | null;
  headshot_url: string | null;
  shoots: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  birth_date: string | null;
  team_id: string | null;
  is_active: boolean | null;
}

interface TeamRow {
  id: string;
  name: string;
  slug: string | null;
  logo_url: string | null;
}

interface LeagueRow {
  id: string;
  name: string;
}

interface ManagedRow {
  manager_user_id: string;
  relationship: string;
}

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

interface PageData {
  player: PlayerRow;
  team: TeamRow | null;
  league: LeagueRow | null;
  /** The viewer's relationship to this player, if any. null = not linked. */
  viewerRelationship: 'self' | 'parent' | 'guardian' | 'spouse' | null;
}

async function fetchPlayer(id: string): Promise<PageData | null> {
  const { data: player } = await supabaseAdmin
    .from('players')
    .select('id, first_name, last_name, slug, position, jersey_number, nationality, headshot_url, shoots, height_cm, weight_kg, birth_date, team_id, is_active')
    .eq('id', id)
    .maybeSingle();

  if (!player) return null;

  let team: TeamRow | null = null;
  let league: LeagueRow | null = null;

  if ((player as PlayerRow).team_id) {
    const { data: t } = await supabaseAdmin
      .from('teams')
      .select('id, name, slug, logo_url, league_id')
      .eq('id', (player as PlayerRow).team_id!)
      .maybeSingle();
    if (t) {
      team = { id: t.id, name: t.name, slug: t.slug, logo_url: t.logo_url };
      if ((t as any).league_id) {
        const { data: l } = await supabaseAdmin
          .from('leagues')
          .select('id, name')
          .eq('id', (t as any).league_id)
          .maybeSingle();
        league = l ?? null;
      }
    }
  }

  // Steward check: is the signed-in viewer a manager of this player?
  // Used for both the "Edit" link and for showing birth_date.
  let viewerRelationship: PageData['viewerRelationship'] = null;
  const session = await auth();
  if (session.userId) {
    const cu = await currentUser();
    const ownerEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
    const viewerUserId = await resolveCanonicalUserId(session.userId, ownerEmail);
    if (viewerUserId) {
      const { data: mgr } = await supabaseAdmin
        .from('managed_profiles')
        .select('relationship')
        .eq('manager_user_id', viewerUserId)
        .eq('profile_type', 'player')
        .eq('profile_id', id)
        .maybeSingle();
      if (mgr) {
        const rel = (mgr as ManagedRow).relationship;
        if (rel === 'self' || rel === 'parent' || rel === 'guardian' || rel === 'spouse') {
          viewerRelationship = rel;
        }
      }
    }
  }

  return { player: player as PlayerRow, team, league, viewerRelationship };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatHeight(cm: number | null): string | null {
  if (!cm) return null;
  const ft = Math.floor(cm / 30.48);
  const inches = Math.round((cm / 2.54) - ft * 12);
  return `${ft}'${inches}" (${cm} cm)`;
}

function formatWeight(kg: number | null): string | null {
  if (!kg) return null;
  return `${Math.round(kg * 2.2046)} lbs (${kg} kg)`;
}

function formatShoots(s: string | null): string | null {
  if (!s) return null;
  if (s === 'L') return 'Left';
  if (s === 'R') return 'Right';
  return s;
}

function ageYears(iso: string | null): number | null {
  if (!iso) return null;
  const birth = new Date(iso);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let a = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) a--;
  return a;
}

function positionLabel(p: string | null): string {
  if (!p) return '';
  const lower = p.toLowerCase();
  if (lower.includes('goal')) return 'Goalie';
  if (lower.includes('defen')) return 'Defense';
  return 'Forward';
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const data = await fetchPlayer(id);
  if (!data) {
    return {
      title: 'Player not found · RinkStop',
      description: 'This player does not exist on RinkStop.',
      robots: { index: false },
    };
  }
  const { player, team } = data;
  const fullName = [player.first_name, player.last_name].filter(Boolean).join(' ') || 'Player';
  const pos = positionLabel(player.position);
  const teamName = team?.name ? ` · ${team.name}` : '';
  const title = `${fullName} — ${pos || 'Hockey player'}${teamName} · RinkStop`;
  const description = `${fullName}'s profile on RinkStop${teamName}.`;
  return {
    title,
    description,
    alternates: { canonical: `https://rinkstop.com/players/${id}` },
    openGraph: { title, description, url: `https://rinkstop.com/players/${id}`, type: 'profile', images: player.headshot_url ? [player.headshot_url] : undefined },
    twitter: { card: 'summary', title, description, images: player.headshot_url ? [player.headshot_url] : undefined },
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function PlayerDetailPage({ params }: PageProps) {
  const { id } = await params;
  const data = await fetchPlayer(id);
  if (!data) notFound();

  const { player, team, league, viewerRelationship } = data;
  const fullName = [player.first_name, player.last_name].filter(Boolean).join(' ') || 'Unnamed Player';
  const pos = positionLabel(player.position);

  // Privacy: birth_date only visible to the steward (self/parent/guardian/spouse).
  // This is conservative; can be widened later.
  const canSeeBirthDate = viewerRelationship !== null;
  const age = canSeeBirthDate ? ageYears(player.birth_date) : null;

  const stats: Array<{ label: string; value: string | null }> = [
    { label: 'Position', value: pos || null },
    { label: 'Jersey',   value: player.jersey_number != null ? `#${player.jersey_number}` : null },
    { label: 'Shoots',   value: formatShoots(player.shoots) },
    { label: 'Height',   value: formatHeight(player.height_cm) },
    { label: 'Weight',   value: formatWeight(player.weight_kg) },
    { label: 'Nationality', value: player.nationality || null },
    { label: 'Age',      value: age != null ? `${age}` : null },
  ];

  return (
    <main className="min-h-screen bg-[#041E42] text-white">
      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Breadcrumb */}
        <nav className="mb-6 text-sm text-white/50">
          <Link href="/directory/players" className="hover:text-white/80">Players</Link>
          <span className="mx-2 text-white/30">›</span>
          <span className="text-white/70">{fullName}</span>
        </nav>

        {/* Header */}
        <header className="flex items-start gap-6 mb-8">
          {player.headshot_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={player.headshot_url}
              alt={fullName}
              className="w-28 h-28 rounded-full object-cover border-2 border-white/10 flex-shrink-0"
            />
          ) : (
            <div className="w-28 h-28 rounded-full bg-white/5 flex items-center justify-center text-4xl flex-shrink-0">🏒</div>
          )}

          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold mb-1">{fullName}</h1>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {pos && (
                <span className="text-xs px-2 py-1 rounded font-semibold" style={{ background: 'rgba(255,184,28,0.12)', border: '1px solid rgba(255,184,28,0.4)', color: '#FFB81C' }}>
                  {pos}
                </span>
              )}
              {player.jersey_number != null && (
                <span className="text-xs px-2 py-1 rounded bg-white/5 border border-white/10 text-white/70">
                  #{player.jersey_number}
                </span>
              )}
              {team && (
                <Link
                  href={`/directory/teams/${team.slug || team.id}`}
                  className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-white/80"
                >
                  {team.logo_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={team.logo_url} alt="" className="w-4 h-4 rounded object-contain" />
                  )}
                  {team.name}
                </Link>
              )}
              {league && (
                <span className="text-xs px-2 py-1 rounded bg-white/5 border border-white/10 text-white/60">
                  {league.name}
                </span>
              )}
            </div>

            {/* Steward actions (Piece 2.4) — visible only to the manager of this player. */}
            {viewerRelationship === 'self' && (
              <Link
                href={`/dashboard/manage/player/${id}`}
                className="inline-flex items-center gap-1.5 text-sm text-[#14B8A6] hover:text-[#14B8A6]/80 border border-[#14B8A6]/30 hover:border-[#14B8A6]/60 rounded-full px-3 py-1.5 transition-colors"
              >
                Edit this player record →
              </Link>
            )}
            {viewerRelationship === 'parent' && (
              <Link
                href={`/dashboard/manage/player/${id}`}
                className="inline-flex items-center gap-1.5 text-sm text-[#14B8A6] hover:text-[#14B8A6]/80 border border-[#14B8A6]/30 hover:border-[#14B8A6]/60 rounded-full px-3 py-1.5 transition-colors"
              >
                Manage your child's profile →
              </Link>
            )}
            {(viewerRelationship === 'guardian' || viewerRelationship === 'spouse') && (
              <Link
                href={`/dashboard/manage/player/${id}`}
                className="inline-flex items-center gap-1.5 text-sm text-[#14B8A6] hover:text-[#14B8A6]/80 border border-[#14B8A6]/30 hover:border-[#14B8A6]/60 rounded-full px-3 py-1.5 transition-colors"
              >
                Manage profile →
              </Link>
            )}
          </div>
        </header>

        {/* Stats card */}
        <section className="mb-8 bg-white/5 border border-white/10 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-white/10">
            <h2 className="text-sm uppercase text-white/50 tracking-wider">Player details</h2>
          </div>
          <dl className="grid grid-cols-2 sm:grid-cols-3">
            {stats.map((s, i) => (
              <div
                key={s.label}
                className="px-5 py-3"
                style={{ borderTop: i >= 3 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}
              >
                <dt className="text-[11px] uppercase text-white/40 tracking-wider mb-0.5">{s.label}</dt>
                <dd className="text-sm text-white/90">{s.value ?? '—'}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Footer */}
        <footer className="text-xs text-white/40">
          <p>
            This is a RinkStop player profile. If you are this player (or their parent/guardian),
            claim this record to edit it from your dashboard.
          </p>
        </footer>
      </div>
    </main>
  );
}