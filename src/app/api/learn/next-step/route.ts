/**
 * GET /api/learn/next-step
 *
 * Phase 5 recommendation engine. Returns the next /learn page the user
 * should read, with a 1-sentence reason.
 *
 * Logic (deterministic, no LLM — runs on every /learn index render):
 *
 *  1. If user has read 0 /learn pages:
 *     - return '/learn/first-day-on-ice' (highest-intent entry for new players)
 *
 *  2. If user has a 'parent' account_type (via profile_account_types):
 *     - prefer unread parent-survival-guide, cost-by-age, age-to-start-hockey
 *     - then fall through to default next-unread
 *
 *  3. Otherwise (player / coach / official / operator / generic):
 *     - return the lowest-readTime unread page (respects "5 min until next thing")
 *
 *  4. If everything is read:
 *     - return null + suggested_action: 'revisit' with the oldest read page
 *
 * Auth: required (Clerk). 401 if unauthenticated.
 *
 * Response:
 *   { next: { href, title, reason } | null, suggestedAction: 'continue' | 'revisit' | 'none' }
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { LEARN } from '@/lib/learn-catalog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const FIRST_READ_RECOMMENDATION = '/learn/first-day-on-ice';

const PARENT_PRIORITY = [
  '/learn/parent-survival-guide',
  '/learn/cost-by-age',
  '/learn/age-to-start-hockey',
];

function findByHref(href: string) {
  return LEARN.find((e) => e.href === href);
}

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session.userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // 1) Read the user's progress + account_type in parallel.
  const [progressRes, profileRes] = await Promise.all([
    supabaseAdmin
      .from('learn_progress')
      .select('href, read_at')
      .eq('user_id', session.userId)
      .order('read_at', { ascending: false }),
    supabaseAdmin
      .from('profile_account_types')
      .select('account_type')
      .eq('user_id', session.userId)
      .maybeSingle(),
  ]);

  if (progressRes.error) {
    console.error('[learn/next-step] progress select failed:', progressRes.error);
    return NextResponse.json(
      { error: 'db_error', message: progressRes.error.message },
      { status: 500 }
    );
  }

  const readHrefs = new Set((progressRes.data || []).map((r) => r.href));
  const isParent = profileRes.data?.account_type === 'parent';

  // 2) If user has read 0 pages, return the first-read recommendation.
  if (readHrefs.size === 0) {
    const entry = findByHref(FIRST_READ_RECOMMENDATION);
    if (entry) {
      return NextResponse.json({
        next: {
          href: entry.href,
          title: entry.title,
          reason: 'Start here — the 15-minute walk-through for your first day on the ice.',
        },
        suggestedAction: 'continue',
      });
    }
  }

  // 3) Parent prioritization.
  if (isParent) {
    for (const href of PARENT_PRIORITY) {
      if (!readHrefs.has(href)) {
        const entry = findByHref(href);
        if (entry) {
          return NextResponse.json({
            next: {
              href: entry.href,
              title: entry.title,
              reason:
                href === '/learn/parent-survival-guide'
                  ? 'You marked one /learn page as read — here is the parent-focused onboarding next.'
                  : href === '/learn/cost-by-age'
                  ? 'Real costs by age group, so you can budget before registration.'
                  : 'When to start hockey by region + when to specialize — the most-asked parent question.',
            },
            suggestedAction: 'continue',
          });
        }
      }
    }
  }

  // 4) Default: lowest-readTime unread page.
  const unread = LEARN.filter((e) => !readHrefs.has(e.href)).sort(
    (a, b) => a.readTime - b.readTime
  );
  if (unread.length > 0) {
    const entry = unread[0];
    return NextResponse.json({
      next: {
        href: entry.href,
        title: entry.title,
        reason: `Quick read — about ${entry.readTime} min. ${
          entry.desc.split('. ')[0]
        }.`,
      },
      suggestedAction: 'continue',
    });
  }

  // 5) Everything is read — recommend a revisit.
  const oldest = (progressRes.data || [])
    .slice()
    .reverse()
    .find((r) => findByHref(r.href));
  if (oldest) {
    const entry = findByHref(oldest.href)!;
    return NextResponse.json({
      next: {
        href: entry.href,
        title: entry.title,
        reason: 'You read everything new — this one is worth a second look.',
      },
      suggestedAction: 'revisit',
    });
  }

  return NextResponse.json({ next: null, suggestedAction: 'none' });
}
