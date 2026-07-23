// src/app/dashboard/referee/credentials/page.tsx
// Referee federation/license credentials management.
//
// Tier 2 (2026-07-23). Same pattern as the coach credentials page but for
// referees (owner = Clerk user id via federation_registrations.referee_user_id).

import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import CredentialsFormClient from '@/app/dashboard/coach/credentials/CredentialsFormClient';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export const dynamic = 'force-dynamic';

interface RegistrationRow {
  id: string;
  registration_number: string;
  submission_status: 'draft' | 'pending' | 'approved' | 'rejected';
  rejection_reason: string | null;
  verified_at: string | null;
  expires_at: string | null;
  federation: { slug: string; name: string } | null;
}

export default async function RefereeCredentialsPage() {
  const session = await auth();
  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);
  if (!session.userId) redirect('/login?redirect_url=/dashboard/referee/credentials');

  const { data: rows } = await supabaseAdmin
    .from('federation_registrations')
    .select('id, registration_number, submission_status, rejection_reason, verified_at, expires_at, federation:federations(slug, name)')
    .eq('referee_user_id', userId);

  const bySlug: Record<string, RegistrationRow> = {};
  for (const raw of (rows ?? []) as any[]) {
    const fed = Array.isArray(raw.federation) && raw.federation.length > 0 ? raw.federation[0] : raw.federation;
    if (!fed) continue;
    bySlug[fed.slug] = { ...raw, federation: fed } as RegistrationRow;
  }

  const { data: federations } = await supabaseAdmin
    .from('federations')
    .select('slug, name, country_code')
    .eq('is_active', true)
    .order('name');

  return (
    <main style={{ minHeight: '100vh', background: '#041E42', color: '#fff' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '2rem 1.25rem 4rem' }}>
        <CredentialsFormClient
          persona="referee"
          subjectName={cu?.firstName ?? 'Referee'}
          registrations={bySlug}
          federations={(federations ?? []) as { slug: string; name: string; country_code: string | null }[]}
          apiBase="/api/referee/credentials"
        />
      </div>
    </main>
  );
}
