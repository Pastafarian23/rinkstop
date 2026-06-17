/**
 * src/app/admin/username-review/page.tsx
 *
 * /admin/username-review
 *   Arnel's view for Layer 2 (brand prefix) + Layer 3 (profanity) review.
 *
 * Renders the pending queue with one-click approve/reject.
 *
 * Server component fetches the queue; client component handles the
 * approve/reject action via the admin API.
 */

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase';
import UsernameReviewClient from './UsernameReviewClient';

export const dynamic = 'force-dynamic';

const ADMIN_EMAILS = new Set([
  'arnellarracas@gmail.com',
  'support@rinkstop.com',
]);

export default async function UsernameReviewPage() {
  const { userId } = await auth();
  if (!userId) redirect('/login');

  // Admin gate
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role, _deprecated_account_type, email')
    .eq('user_id', userId)
    .maybeSingle();
  const isSuper =
    profile?.role === 'super_admin' || profile?._deprecated_account_type === 'super_admin';
  // Fall back to email check for the founder
  if (!isSuper && !ADMIN_EMAILS.has(profile?.email ?? '')) {
    return (
      <main className="min-h-screen bg-[#041E42] text-white p-8">
        <h1 className="text-2xl font-bold">Access denied</h1>
        <p className="text-white/70 mt-2">
          You don&apos;t have permission to view this page. If you think this is wrong,
          contact support@rinkstop.com.
        </p>
      </main>
    );
  }

  // Read the pending queue
  const { data: pending, error } = await supabaseAdmin
    .from('pending_username_review_queue')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    return (
      <main className="min-h-screen bg-[#041E42] text-white p-8">
        <h1 className="text-2xl font-bold">Error loading queue</h1>
        <pre className="text-red-300 text-sm mt-4">{error.message}</pre>
      </main>
    );
  }

  return (
    <UsernameReviewClient
      initialItems={(pending as any[]) ?? []}
    />
  );
}
