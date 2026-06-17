/**
 * src/app/admin/bad-words/page.tsx
 *
 * /admin/bad-words
 *
 * Arnel's view for managing the bad-words filter list.
 * - Browse all 311 entries
 * - Filter by severity (hard/soft) and search by word
 * - Promote/demote severity with one click
 * - Add a new bad word
 * - Delete an entry
 *
 * Mirrors the /admin/username-review pattern: server component for
 * the gate + data fetch, client component for interactivity.
 */

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase';
import BadWordsClient from './BadWordsClient';

export const dynamic = 'force-dynamic';

const ADMIN_EMAILS = new Set([
  'arnellarracas@gmail.com',
  'support@rinkstop.com',
]);

export default async function BadWordsPage() {
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
  if (!isSuper && !ADMIN_EMAILS.has(profile?.email ?? '')) {
    return (
      <main className="min-h-screen bg-[#041E42] text-white p-8">
        <h1 className="text-2xl font-bold">Access denied</h1>
        <p className="text-white/70 mt-2">
          You don&apos;t have permission to view this page.
        </p>
      </main>
    );
  }

  // Initial fetch (server-rendered so the first paint has data)
  const { data: items, error } = await supabaseAdmin
    .from('bad_words')
    .select('id, word, severity, category, notes, created_at')
    .order('word')
    .limit(500);

  if (error) {
    return (
      <main className="min-h-screen bg-[#041E42] text-white p-8">
        <h1 className="text-2xl font-bold">Error loading list</h1>
        <pre className="text-red-300 text-sm mt-4">{error.message}</pre>
      </main>
    );
  }

  return (
    <BadWordsClient initialItems={(items as any[]) ?? []} />
  );
}
