import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';
import CorrectionForm from './CorrectionForm';
import MySubmissions from './MySubmissions';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{
    entity_type?: string;
    entity_id?: string;
    field_name?: string;
    current_value?: string;
  }>;
}

export default async function NewCorrectionPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.userId) redirect('/login');
  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);
  if (!userId) redirect('/login');

  // Account-age gate mirrors the API. We surface a clearer UI message here
  // before the user fills out the form and gets rejected at submit.
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('created_at')
    .eq('user_id', userId)
    .maybeSingle();
  const accountAgeDays = profile?.created_at
    ? (Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24)
    : 0;
  const tooNew = accountAgeDays < 7;

  const sp = await searchParams;

  // Pull the user's own submissions to show under the form
  const { data: mySubs } = await supabaseAdmin
    .from('corrections')
    .select('id, entity_type, entity_id, field_name, proposed_value, status, submitted_at, reviewed_at, reviewer_note')
    .eq('submitter_user_id', userId)
    .order('submitted_at', { ascending: false })
    .limit(50);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: 760 }}>
      <div
        style={{
          background: '#0f0f0f',
          border: '1px solid #1e1e1e',
          borderRadius: 12,
          padding: '1.5rem 1.75rem',
        }}
      >
        <h1
          style={{
            fontFamily: "'Bebas Neue', Impact, sans-serif",
            fontSize: '1.5rem',
            color: '#fff',
            letterSpacing: '0.05em',
            margin: '0 0 0.5rem',
          }}
        >
          SUGGEST A CORRECTION
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', margin: 0, lineHeight: 1.5 }}>
          See something wrong? Submit a correction and an admin will review it before any change is applied.
        </p>
      </div>

      {tooNew ? (
        <div
          role="alert"
          style={{
            padding: '0.85rem 1rem',
            background: 'rgba(255,184,28,0.1)',
            border: '1px solid rgba(255,184,28,0.35)',
            borderRadius: 8,
            color: '#FFB81C',
            fontSize: '0.9rem',
          }}
        >
          Your account is too new to submit corrections. The 7-day waiting period helps us keep submissions spam-free.
        </div>
      ) : (
        <CorrectionForm
          initialEntityType={sp.entity_type || 'player'}
          initialEntityId={sp.entity_id || ''}
          initialFieldName={sp.field_name || ''}
          initialCurrentValue={sp.current_value || ''}
        />
      )}

      <MySubmissions
        submissions={mySubs || []}
        entityLabels={await resolveEntityLabels((mySubs || []).map((s) => ({ type: s.entity_type, id: s.entity_id })))}
      />
    </div>
  );
}

async function resolveEntityLabels(
  refs: Array<{ type: string; id: string }>,
): Promise<Record<string, string>> {
  if (refs.length === 0) return {};
  const playerIds = refs.filter((r) => r.type === 'player').map((r) => r.id);
  const map: Record<string, string> = {};
  if (playerIds.length > 0) {
    const { data: players } = await supabaseAdmin
      .from('players')
      .select('id, first_name, last_name, slug')
      .in('id', playerIds);
    for (const p of players || []) {
      const name = `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.slug || p.id;
      map[`player:${p.id}`] = name;
    }
  }
  return map;
}