// /dashboard/admin/articles
//
// Article review queue for site owner. Lists all posts in the review
// queue (human_review_status='pending') with Approve / Reject controls.
//
// Per Arnel 2026-09-22 19:00 CDT (Open Protocol Gap 3):
//   - Articles should publish automatically when audit passes
//   - Human review only kicks in for unverifiable / failed-audit content
//   - Approve → status='published', human_review_status='approved'
//   - Reject → status='rejected' (NEW status, distinct from 'draft'),
//     requires a note explaining the rejection
//
// Auth: OWNER_EMAILS bypass (Clerk session + email match). Mirrors the
// pattern in /dashboard/admin/funnel/page.tsx.

import { Metadata } from 'next';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getCurrentCanonicalUserId } from '@/lib/admin-auth';
import ArticleReviewList from './ArticleReviewList';
import type { PostRow } from './types';

export const metadata: Metadata = {
  title: 'Article Review — RinkStop',
  description: 'Approve or reject pending articles before they publish.',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function AdminArticlesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; limit?: string }>;
}) {
  const session = await auth();
  const admin = await getCurrentCanonicalUserId();
  if (!session.userId || !admin) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">Not authorized</h1>
        <p className="text-gray-600">This page is restricted to site admins.</p>
      </div>
    );
  }

  const params = await searchParams;
  const statusFilter = (params.status || 'pending') as string;
  const limit = Math.min(Number(params.limit) || 50, 200);

  // Fetch posts based on status filter
  let query = supabaseAdmin.from('posts').select(
    'id, slug, title, subtitle, status, human_review_status, audit_status, last_audit_check_at, last_audit_status, reviewed_at, reviewed_by, review_note, created_at, published_at, category',
  );

  if (statusFilter === 'pending') {
    query = query.eq('status', 'draft').eq('human_review_status', 'pending');
  } else if (statusFilter === 'rejected') {
    query = query.eq('status', 'rejected').order('reviewed_at', { ascending: false });
  } else if (statusFilter === 'approved') {
    query = query.eq('human_review_status', 'approved').order('reviewed_at', { ascending: false });
  } else if (statusFilter === 'published') {
    query = query.eq('status', 'published').order('published_at', { ascending: false });
  } else if (statusFilter === 'all') {
    query = query.order('updated_at', { ascending: false });
  } else {
    query = query.eq('status', 'draft').eq('human_review_status', 'pending');
  }

  const { data: posts, error } = await query.limit(limit);

  // Fetch counts for the filter tabs
  const { count: pendingCount } = await supabaseAdmin
    .from('posts')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'draft')
    .eq('human_review_status', 'pending');

  const { count: rejectedCount } = await supabaseAdmin
    .from('posts')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'rejected');

  const { count: publishedCount } = await supabaseAdmin
    .from('posts')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'published');

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-bold mb-1">Article Review</h1>
        <p className="text-gray-500 text-sm">
          Approve or reject articles that couldn't be auto-verified against canonical sources.
          Game-recap articles with audit-status PASS_* auto-publish without review.
        </p>
      </header>

      {/* Filter tabs */}
      <nav className="flex gap-2 mb-6 border-b" style={{ borderColor: 'var(--border)' }}>
        {[
          { key: 'pending', label: 'Pending', count: pendingCount },
          { key: 'published', label: 'Published', count: publishedCount },
          { key: 'rejected', label: 'Rejected', count: rejectedCount },
          { key: 'all', label: 'All', count: null },
        ].map((tab) => (
          <a
            key={tab.key}
            href={`?status=${tab.key}`}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              statusFilter === tab.key
                ? 'border-red-500 text-white'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
            style={
              statusFilter === tab.key
                ? { borderColor: '#C8102E', color: '#fff' }
                : { borderColor: 'transparent' }
            }
          >
            {tab.label}
            {tab.count != null && (
              <span className="ml-2 px-1.5 py-0.5 rounded text-xs bg-white/10">{tab.count}</span>
            )}
          </a>
        ))}
      </nav>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded mb-4">
          Failed to load articles: {error.message}
        </div>
      )}

      <ArticleReviewList posts={(posts as PostRow[]) || []} statusFilter={statusFilter} />
    </div>
  );
}
