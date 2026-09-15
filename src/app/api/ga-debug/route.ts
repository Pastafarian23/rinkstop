// /api/ga-debug
//
// WS29 GA — diagnostic endpoint to verify GA4 + custom analytics setup.
//
// Returns:
//   - GA4 Measurement ID configured (env)
//   - Custom analytics table accessible (Supabase)
//   - Recent event counts by name (last 24h)
//   - Recent Q&A page views
//   - Recent dataset endpoint hits
//   - Recent Bing/IndexNow submissions
//
// Use this to verify that the new tracking infrastructure is actually
// receiving events end-to-end.
//
// Auth: ADMIN_SECRET or no secret (public read-only stats).

import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const ADMIN_SECRET = process.env.ADMIN_SECRET;
const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || null;

export async function GET() {
  const authed = !!ADMIN_SECRET;
  const isAiBot = /\b(GPTBot|ClaudeBot|PerplexityBot|Perplexity-User|Google-Extended)\b/i.test(
    (await headers()).get('user-agent') ?? ''
  );

  // Check analytics_events table accessibility (best-effort)
  let tableAccessible = false;
  let tableError: string | null = null;
  try {
    const { error } = await supabaseAdmin.from('analytics_events').select('id', { count: 'exact', head: true });
    if (!error) tableAccessible = true;
    else tableError = error.message;
  } catch (e: any) {
    tableError = e?.message ?? 'unknown error';
  }

  // Last 24h event counts by name (best-effort)
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  let recentEvents: Record<string, number> = {};
  let sampleRows: any[] = [];
  if (tableAccessible) {
    try {
      const { data } = await supabaseAdmin
        .from('analytics_events')
        .select('name, ts, pathname, props')
        .gte('ts', since)
        .order('ts', { ascending: false })
        .limit(500);
      if (data) {
        sampleRows = data.slice(0, 10);
        for (const row of data) {
          recentEvents[row.name] = (recentEvents[row.name] || 0) + 1;
        }
      }
    } catch {
      /* swallow */
    }
  }

  return NextResponse.json({
    meta: {
      publisher: 'RinkStop',
      endpoint: '/api/ga-debug',
      generated_at: new Date().toISOString(),
    },
    ga4: {
      measurement_id_configured: !!GA_MEASUREMENT_ID,
      measurement_id: GA_MEASUREMENT_ID,
      is_currently_ai_crawler: isAiBot,
    },
    custom_analytics: {
      table_accessible: tableAccessible,
      table_error: tableError,
      backend: 'Supabase analytics_events',
    },
    last_24h_event_counts: recentEvents,
    sample_recent_events: sampleRows.map((r) => ({
      name: r.name,
      ts: r.ts,
      pathname: r.pathname,
      content_type: r.props?.content_type ?? null,
    })),
    new_events_tracked_ws29: [
      'qa_page_viewed',
      'qa_faq_expanded',
      'qa_answer_copied',
      'qa_related_clicked',
      'qa_data_prov_visible',
      'dataset_endpoint_hit',
      'dataset_entity_queried',
      'gear_brand_page_viewed',
      'gear_brand_engaged',
      'bing_submission_completed',
      'indexnow_submission_completed',
    ],
    recommended_ga4_setup: [
      '1. Create custom dimensions in GA4 admin:',
      '   - content_type (qa | directory | brand | gear | dataset_api | seo_automation)',
      '   - qa_page_type (country | state | province | league | city)',
      '   - qa_slug',
      '2. Create custom metrics:',
      '   - short_answer_words',
      '   - data_source_count',
      '   - is_ai_bot (or filter by user agent)',
      '3. Build exploration in GA4:',
      '   - Funnel: qa_page_viewed → qa_faq_expanded → qa_related_clicked',
      '   - Segment: traffic from Perplexity-User, ChatGPT-User, Claude-User',
      '   - Path: /learn/[qa] → /directory/[entity] → /pricing',
    ],
  });
}
