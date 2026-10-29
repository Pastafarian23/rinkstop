'use client';

/**
 * MoneyPageViewTracker — fires ONE `money_page_viewed` event when a
 * revenue-critical page is opened.
 *
 * Why this exists (2026-10-28):
 *   /dataset-license, /advertise, /partner-with-us and /hockey-database had
 *   NO analytics instrumentation at all. The $499 dataset product was being
 *   scraped (1,000+ /api/data/dataset hits) but the landing page recorded
 *   zero views and zero CTA clicks — so there was no way to know whether the
 *   money pages were working, and revenue was effectively invisible.
 *
 * Server-side `trackPageView()` was rejected as the mechanism because these
 * pages are static/ISR and adding `headers()` would opt them out of caching.
 * A tiny client component keeps the pages cached and still records the view.
 *
 * Props:
 *   page        — canonical page id (e.g. 'dataset-license')
 *   surface     — where the visitor is coming from, if known
 */

import { useEffect } from 'react';
import { trackClient } from '@/lib/client-track';

export default function MoneyPageViewTracker({
  page,
  surface,
}: {
  page: string;
  surface?: string;
}): null {
  useEffect(() => {
    trackClient('money_page_viewed', {
      page,
      surface: surface ?? null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, surface]);

  return null;
}
