import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import EntityEditForm from '../../EntityEditForm';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ManageTeamPage({ params }: PageProps) {
  const { userId } = await auth();
  if (!userId) redirect('/login');
  const { id } = await params;

  const { data: entity, error } = await supabaseAdmin
    .from('teams')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error || !entity) {
    return (
      <div style={{ maxWidth: 720 }}>
        <div style={{ background: 'rgba(200,16,46,0.1)', border: '1px solid rgba(200,16,46,0.4)', color: '#FF6B7A', padding: '1rem 1.25rem', borderRadius: 8 }}>
          Could not load team. It may have been removed.
        </div>
        <Link href="/dashboard/claims" style={{ display: 'inline-block', marginTop: '1rem', color: '#14B8A6' }}>← Back to claims</Link>
      </div>
    );
  }

  const { count: claimCount } = await supabaseAdmin
    .from('claims')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('claim_type', 'team')
    .eq('entity_id', id)
    .eq('status', 'approved');

  if (!claimCount) {
    return (
      <div style={{ maxWidth: 720, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ background: 'rgba(255,184,28,0.08)', border: '1px solid rgba(255,184,28,0.3)', color: '#FFB81C', padding: '1rem 1.25rem', borderRadius: 8, fontSize: '0.9rem' }}>
          You don&rsquo;t have an approved claim for this team. Claim it first, then come back here to edit.
        </div>
        <Link href={`/dashboard/claims?entity=team&id=${id}`} style={{ color: '#14B8A6' }}>→ Go to claims</Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 720, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: 12, padding: '1.5rem 1.75rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ fontSize: '2rem' }}>🏒</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.05em', margin: '0 0 0.25rem' }}>
            MANAGE TEAM
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {entity.name as string}
          </p>
        </div>
      </div>

      <EntityEditForm
        type="team"
        id={id}
        initial={entity as Record<string, unknown>}
        slug={(entity as { slug?: string }).slug || null}
        publicHref={`/directory/teams/${(entity as { slug?: string }).slug || id}`}
      />
    </div>
  );
}
