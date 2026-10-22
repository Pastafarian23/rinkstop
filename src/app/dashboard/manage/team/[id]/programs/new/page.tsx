// src/app/dashboard/manage/team/[id]/programs/new/page.tsx
//
// WS38 - Organization Plus team-registration-management.
//
// New program page. Loads the workspace + claim check, then renders the
// shared client form. We don't pre-fill anything — defaults come from the
// form itself.

import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import { countryToCurrency } from '@/lib/currency';
import ProgramForm from '../ProgramForm';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function NewTeamProgramPage({ params }: PageProps) {
  const session = await auth();
  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);
  if (!session.userId) redirect('/login');
  const { id } = await params;

  // Owner + workspace check in parallel.
  const [{ data: workspace, error: wsErr }, { count: claimCount }] = await Promise.all([
    supabaseAdmin.from('team_workspaces').select('id, name, currency, country').eq('id', id).maybeSingle(),
    supabaseAdmin
      .from('claims')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('claim_type', 'team')
      .eq('entity_id', id)
      .eq('status', 'approved'),
  ]);

  if (wsErr || !workspace) {
    return (
      <div style={{ maxWidth: 720 }}>
        <div style={{ background: 'rgba(200,16,46,0.1)', border: '1px solid rgba(200,16,46,0.4)', color: '#FF6B7A', padding: '1rem 1.25rem', borderRadius: 8 }}>
          Could not load team. It may have been removed.
        </div>
        <Link href="/dashboard/claims" style={{ display: 'inline-block', marginTop: '1rem', color: '#14B8A6' }}>← Back to claims</Link>
      </div>
    );
  }
  if (!claimCount) {
    return (
      <div style={{ maxWidth: 720, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ background: 'rgba(255,184,28,0.08)', border: '1px solid rgba(255,184,28,0.3)', color: '#FFB81C', padding: '1rem 1.25rem', borderRadius: 8, fontSize: '0.9rem' }}>
          You don&rsquo;t have an approved claim for this team.
        </div>
        <Link href={`/dashboard/claims?entity=team&id=${id}`} style={{ color: '#14B8A6' }}>→ Go to claims</Link>
      </div>
    );
  }

  // Load rinks for the optional rink dropdown. Limit to a reasonable count;
  // an unbounded dropdown would render thousands of rows.
  const { data: rinks } = await supabaseAdmin
    .from('rinks')
    .select('id, name')
    .eq('is_active', true)
    .order('name')
    .limit(500);

  // Default currency: team workspace's stored currency, else the country's
  // local currency, else USD. The form will let the user override.
  const defaultCurrency =
    workspace.currency ||
    countryToCurrency(workspace.country) ||
    'USD';

  return (
    <ProgramForm
      isEdit={false}
      initial={{}}
      rinkOptions={(rinks || []) as Array<{ id: string; name: string }>}
      defaultCurrency={defaultCurrency}
      teamCountry={workspace.country ?? null}
    />
  );
}