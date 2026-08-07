import Link from 'next/link';
// src/app/dashboard/passport/federation/page.tsx
// Server page for editing federation registration numbers + position category.
//
// WS13 PR4a: dynamic cert list driven by v_user_visible_certifications.
// Replaces the pre-PR3 hardcoded "USA Hockey / Hockey Canada" 2-input form
// with a dynamic list built from the 9 seeded certifications, filtered
// by the user's country context (profile_country_context.primary_country).
// No country set → show all player-category certs.

import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { redirect } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import FederationFormClient from './FederationFormClient';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export const dynamic = 'force-dynamic';

interface RegistrationRow {
  id: string;
  certification_id: string | null;
  federation_id: string;
  registration_number: string;
  submission_status: 'draft' | 'pending' | 'approved' | 'rejected';
  rejection_reason: string | null;
  verified_at: string | null;
  expires_at: string | null;
}

export default async function FederationPage() {
  const session = await auth();
  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);
  if (!session.userId) redirect('/login?redirect_url=/dashboard/passport/federation');

  const { data: player } = await supabaseAdmin
    .from('players')
    .select('id, first_name, last_name, primary_position_category')
    .eq('user_id', userId)
    .maybeSingle();

  if (!player) {
    return (
      <main className="min-h-screen bg-[#041E42] text-white">
        <nav style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.75rem' }}>
          <Link href="/dashboard" style={{ color: 'rgba(255,255,255,0.5)' }}>Dashboard</Link>
          <span style={{ margin: '0 0.4rem' }}>›</span>
          <Link href="/dashboard/passport" style={{ color: 'rgba(255,255,255,0.5)' }}>Passport</Link>
          <span style={{ margin: '0 0.4rem' }}>›</span>
          <span style={{ color: 'rgba(255,255,255,0.4)' }}>Federation numbers</span>
        </nav>
        <div className="max-w-3xl mx-auto px-5 py-10">
          <h1 className="font-sport text-2xl mb-4">FEDERATION REGISTRATION</h1>
          <p className="text-white/70">
            You need to claim a player profile before setting federation numbers.{' '}
            <a href="/claim-your-listing" className="text-[#FFB81C] underline">
              Claim your profile
            </a>
            .
          </p>
        </div>
      </main>
    );
  }

  // Fetch user's country context (may be null = no country set yet).
  // WS13 PR4a: when null, v_user_visible_certifications returns all certs
  // visible (the view's CASE expression handles null user_id = true).
  const { data: countryRow } = await supabaseAdmin
    .from('profile_country_context')
    .select('primary_country, additional_countries')
    .eq('user_id', userId)
    .maybeSingle();
  const userCountry = countryRow?.primary_country ?? null;

  // Fetch all active player-category certifications via the country-aware
  // view. WS13 PR3: replaced the JS-side visibility filter (which duplicated
  // the view's CASE expression) with a direct view query. Same shape output.
  const { data: visibleCertsRaw } = await supabaseAdmin
    .from('v_user_visible_certifications')
    .select('id, slug, name, description, is_international, issuer_id, issuer_slug, issuer_name, issuer_country_code, issuer_kind, visible_to_user')
    .eq('visible_to_user', true)
    .eq('category', 'player')
    .order('name');

  const visibleCerts = (visibleCertsRaw ?? [])
    .map((c: any) => ({
      certification_id: c.id,
      slug: c.slug,
      name: c.name,
      description: c.description,
      is_international: c.is_international,
      federation_id: c.issuer_id as string,
      federation_slug: c.issuer_slug as string,
      federation_name: c.issuer_name as string,
      country_code: c.issuer_country_code as string | null,
      kind: c.issuer_kind as 'national' | 'international',
    }));

  // Fetch existing federation_registrations for this player, indexed by
  // certification_id (new key) with fallback to legacy federation_id key
  // for any pre-PR3 rows that lack certification_id.
  const { data: rows } = await supabaseAdmin
    .from('federation_registrations')
    .select('id, certification_id, federation_id, registration_number, submission_status, rejection_reason, verified_at, expires_at')
    .eq('player_id', player.id);

  const byCertId: Record<string, RegistrationRow> = {};
  const legacyByFedSlug: Record<string, RegistrationRow & { federation_slug: string }> = {};
  for (const raw of (rows ?? []) as any[]) {
    if (raw.certification_id) {
      byCertId[raw.certification_id] = raw as RegistrationRow;
    } else {
      // Legacy row (pre-PR3) — surface it under the federation slug
      // so the user can see + edit/delete it via the new flow.
      // Resolve federation slug from the cert that matches this
      // federation's player cert.
      const matchingCert = visibleCerts.find((c) => c.federation_id === raw.federation_id);
      if (matchingCert) {
        legacyByFedSlug[matchingCert.federation_slug] = {
          ...(raw as RegistrationRow),
          federation_slug: matchingCert.federation_slug,
        };
      }
    }
  }

  return (
    <FederationFormClient
      playerId={player.id}
      playerName={[player.first_name, player.last_name].filter(Boolean).join(' ') || 'this player'}
      initialPositionCategory={player.primary_position_category ?? ''}
      userCountry={userCountry}
      visibleCerts={visibleCerts}
      registrationsByCertId={byCertId}
      legacyRegistrationsByFedSlug={legacyByFedSlug}
    />
  );
}
