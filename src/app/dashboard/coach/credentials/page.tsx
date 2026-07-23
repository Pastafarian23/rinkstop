// src/app/dashboard/coach/credentials/page.tsx
// Coach federation/license credentials management.
//
// Tier 2 (2026-07-23). Federation number is stored in federation_registrations
// (per persona). Status badges + lock + submit/withdraw.

import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import CredentialsFormClient from './CredentialsFormClient';

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

export default async function CoachCredentialsPage() {
  const session = await auth();
  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);
  if (!session.userId) redirect('/login?redirect_url=/dashboard/coach/credentials');

  const { data: coach } = await supabaseAdmin
    .from('coach_profiles')
    .select('id')
    .eq('profile_id', userId)
    .maybeSingle();

  if (!coach) {
    return (
      <main style={{ minHeight: '100vh', background: '#041E42', color: '#fff', padding: '2rem 1.25rem' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.875rem', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
            COACH CREDENTIALS
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.7)' }}>
            You need a coach profile before managing credentials.{' '}
            <Link href="/dashboard/coach/profile" style={{ color: '#FFB81C', textDecoration: 'underline' }}>
              Create your coach profile
            </Link>{' '}
            first.
          </p>
        </div>
      </main>
    );
  }

  const { data: rows } = await supabaseAdmin
    .from('federation_registrations')
    .select('id, registration_number, submission_status, rejection_reason, verified_at, expires_at, federation:federations(slug, name)')
    .eq('coach_id', coach.id);

  const bySlug: Record<string, RegistrationRow> = {};
  for (const raw of (rows ?? []) as any[]) {
    const fed = Array.isArray(raw.federation) && raw.federation.length > 0 ? raw.federation[0] : raw.federation;
    if (!fed) continue;
    bySlug[fed.slug] = { ...raw, federation: fed } as RegistrationRow;
  }

  // Active federations list (for the dropdown to add a new one)
  const { data: federations } = await supabaseAdmin
    .from('federations')
    .select('slug, name, country_code')
    .eq('is_active', true)
    .order('name');

  return (
    <CredentialsFormClient
      persona="coach"
      subjectName={cu?.firstName ?? 'Coach'}
      registrations={bySlug}
      federations={(federations ?? []) as { slug: string; name: string; country_code: string | null }[]}
      apiBase="/api/coach/credentials"
    />
  );
}
