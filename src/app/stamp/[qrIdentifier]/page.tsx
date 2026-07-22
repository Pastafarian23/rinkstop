/**
 * src/app/stamp/[qrIdentifier]/page.tsx
 *
 * WS3 PR2 — Universal stamp confirmation page.
 *
 * Resolves a QR identifier to a target (rink | venue | event) and shows a
 * three-tap confirmation flow:
 *   1. Open the URL from a QR scan.
 *   2. Tap "Yes, stamp" (or "Cancel").
 *   3. Done — sees the success or "already stamped" view.
 *
 * Per Workstream 1 Rule 5 (Feature Flags Mandatory): gated by
 * isStampsEnabled(). When off, the page 404s.
 *
 * Per the WS3 plan's mobile-first / three-tap max rule:
 *   - Self-scan: 2 taps (Confirm, Done)
 *   - Coach→player scan: 3 taps (Confirm, Pick context, Done)
 *
 * Geo is opt-in (per the geo decision locked 2026-07-22): the form has a
 * "Use my location to verify" checkbox. Off by default — matches the
 * stamp visibility default of private.
 *
 * Auth: caller must be signed in. If not, redirect to /login with a return URL.
 */

import { notFound, redirect } from 'next/navigation';
import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { isStampsEnabled, stampService, StampNotFoundError } from '@/lib/passport';
import { StampConfirmForm } from './stamp-confirm-form';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ qrIdentifier: string }>;
  searchParams: Promise<{ subject?: string }>;
}

export default async function StampPage({ params, searchParams }: PageProps) {
  if (!isStampsEnabled()) {
    notFound();
  }

  const session = await auth();
  const { qrIdentifier } = await params;
  const { subject } = await searchParams;

  if (!qrIdentifier) {
    notFound();
  }

  const target = await stampService.resolveTarget(qrIdentifier);
  if (!target) {
    notFound();
  }

  // Auth gate: signed-in only. Redirect with return URL so the scan flow
  // doesn't lose context across the login bounce.
  if (!session?.userId) {
    const returnUrl = `/stamp/${qrIdentifier}${
      subject ? `?subject=${encodeURIComponent(subject)}` : ''
    }`;
    redirect(`/login?redirect_url=${encodeURIComponent(returnUrl)}`);
  }

  const cu = await currentUser();
  const actorUserId = await resolveCanonicalUserId(session.userId, cu?.emailAddresses?.[0]?.emailAddress ?? '');
  if (!actorUserId) {
    redirect('/login');
  }

  // For third-party scans (coach→player), look up the subject's display
  // name so the confirmation page can show "Stamp <player name> for this
  // practice?".
  let subjectName: string | null = null;
  if (subject) {
    const { data: profile } = await (
    await import('@/lib/supabase')
    ).supabaseAdmin
      .from('profiles')
      .select('display_name, first_name, last_name')
      .eq('user_id', subject)
      .maybeSingle();
    if (profile) {
      subjectName =
        profile.display_name ||
        `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() ||
        'player';
    }
  }

  return (
    <StampConfirmForm
      qrIdentifier={qrIdentifier}
      target={target}
      actorUserId={actorUserId}
      subjectUserId={subject ?? null}
      subjectName={subjectName}
    />
  );
}
