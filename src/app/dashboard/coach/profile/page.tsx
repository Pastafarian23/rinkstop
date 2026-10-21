// src/app/dashboard/coach/profile/page.tsx
// Coach creates or edits their own coach_profiles row.

import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { redirect } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import CoachProfileFormClient from './CoachProfileFormClient';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
// Lazy client: this module is imported during `next build`'s "Collecting page
// data" phase, before Vercel injects runtime env. Module-scope createClient()
// throws "supabaseUrl is required" and fails the entire production build.
let _c: ReturnType<typeof createClient> | null = null;
function getLazyClient() {
  if (!_c) _c = createClient(supabaseUrl, supabaseServiceKey);
  return _c;
}
const supabaseAdmin = new Proxy({} as ReturnType<typeof createClient>, {
  get(_t, prop) {
    return (getLazyClient() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export const dynamic = 'force-dynamic';

export default async function CoachProfilePage() {
  const session = await auth();
  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);
  if (!session.userId) redirect('/login?redirect_url=/dashboard/coach/profile');

  // Fetch existing coach profile if any + display name from profiles
  // WS8 PR4: license_number / license_issuing_authority / license_expires_at
  // columns were dropped from coach_profiles; those reads are gone. Federation
  // registration lives in federation_registrations (separate page).
  const [{ data: existing }, { data: profile }, { data: teams }] = await Promise.all([
    supabaseAdmin
      .from('coach_profiles')
      .select('id, years_coaching, current_team_id, bio, verification_status')
      .eq('profile_id', userId)
      .maybeSingle(),
    supabaseAdmin
      .from('profiles')
      .select('display_name, username')
      .eq('user_id', userId)
      .maybeSingle(),
    supabaseAdmin
      .from('team_workspaces')
      .select('id, name, slug, league_id, leagues(name)')
      .eq('is_active', true)
      .order('name')
      .limit(2000),
  ]);

  const coachName = profile?.display_name ?? 'Coach';

  return (
    <CoachProfileFormClient
      coachName={coachName}
      initial={{
        years_coaching: existing?.years_coaching != null ? String(existing.years_coaching) : '',
        current_team_id: existing?.current_team_id ?? '',
        bio: existing?.bio ?? '',
      }}
      verificationStatus={existing?.verification_status ?? 'self_reported'}
      teams={teams ?? []}
    />
  );
}