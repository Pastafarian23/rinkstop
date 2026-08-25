import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import { isIdentityVerified } from '@/lib/identity-verified';
import EntityEditForm from '../../EntityEditForm';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ManageLeaguePage({ params }: PageProps) {
  const session = await auth();
  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);
  if (!session.userId) redirect('/login');
  const { id } = await params;

  // League admin gating: requires `league_admin` account type AND a real league
  // with that id. The claim system doesn't support leagues today, so we lean
  // on the account-type signal.
  // NOTE: a proper league_claims table is a separate feature, not a cleanup.
  // Tracked in memory/2026-06-29-rinkstop-prep.md §4. Build when we add league
  // claiming as a product surface (probably Q3 2026).
  const { count: adminCount } = await supabaseAdmin
    .from('profile_account_types')
    .select('user_id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('account_type', 'league_admin');

  if (!adminCount) {
    return (
      <div style={{ maxWidth: 720, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ background: 'rgba(255,184,28,0.08)', border: '1px solid rgba(255,184,28,0.3)', color: '#FFB81C', padding: '1rem 1.25rem', borderRadius: 8, fontSize: '0.9rem' }}>
          The League Admin account type is required to manage a league. You can add it on your profile or claim this league through the standard claim flow once that&rsquo;s wired up.
        </div>
        <Link href="/dashboard" style={{ color: '#14B8A6' }}>← Back to dashboard</Link>
      </div>
    );
  }

  // WS25 (2026-08-23): pass isVerified so the edit form can show the
  // verification banner for unverified league admins. League admin gating
  // is via account type, not claim — so we don't gate on claims here.
  const ownerVerified = await isIdentityVerified(userId).catch(() => false);

  const { data: entity, error } = await supabaseAdmin
    .from('leagues')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error || !entity) {
    return (
      <div style={{ maxWidth: 720 }}>
        <div style={{ background: 'rgba(200,16,46,0.1)', border: '1px solid rgba(200,16,46,0.4)', color: '#FF6B7A', padding: '1rem 1.25rem', borderRadius: 8 }}>
          Could not load league. It may have been removed.
        </div>
        <Link href="/dashboard" style={{ display: 'inline-block', marginTop: '1rem', color: '#14B8A6' }}>← Back to dashboard</Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 720, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: 12, padding: '1.5rem 1.75rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ fontSize: '2rem' }}>🏆</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.05em', margin: '0 0 0.25rem' }}>
            MANAGE LEAGUE
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {entity.name as string}
          </p>
        </div>
      </div>

      <EntityEditForm
        type="league"
        id={id}
        initial={entity as Record<string, unknown>}
        slug={null}
        publicHref={`/directory/leagues/${id}`}
        isVerified={ownerVerified}
      />
    </div>
  );
}
