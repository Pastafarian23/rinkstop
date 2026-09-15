'use client';
// /components/QaEngagementTracker.tsx
//
// Client component that fires GA4 events for Q&A page engagement signals.
// Mounted inside the Q&A page; uses sendBeacon for reliable delivery.
//
// Events:
//   qa_faq_expanded — when user expands a FAQ <details> element
//   qa_answer_copied — when user clicks "Copy" on the answer capsule
//   qa_related_clicked — when user clicks a related URL
//   qa_data_prov_visible — intersection observer fires when provenance scrolls into view
//   qa_share_clicked — when user shares via Web Share API (future)

import { useEffect } from 'react';

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

interface Props {
  slug: string;
  pageType: string;
  relatedUrls: string[];
}

export default function QaEngagementTracker({ slug, pageType, relatedUrls }: Props): React.ReactElement<null> | null {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const send = (eventName: string, params: Record<string, any>) => {
      // GA4 — send via gtag if present
      if (typeof window.gtag === 'function') {
        window.gtag('event', eventName, { ...params, qa_slug: slug, qa_page_type: pageType });
      }
      // Custom analytics beacon — survives page unload
      const payload = JSON.stringify({ event: eventName, params: { ...params, qa_slug: slug, qa_page_type: pageType } });
      try {
        if (navigator.sendBeacon) {
          navigator.sendBeacon('/api/track', payload);
        } else {
          fetch('/api/track', { method: 'POST', body: payload, keepalive: true }).catch(() => {});
        }
      } catch {
        /* swallow — analytics is best-effort */
      }
    };

    // 1) FAQ expand tracking — listen to <details> toggle events
    const handleDetailsToggle = (e: Event) => {
      const target = e.target as HTMLDetailsElement;
      if (target.tagName.toLowerCase() === 'details' && target.open) {
        const summary = target.querySelector('summary');
        const question = summary?.textContent?.trim().slice(0, 100) ?? '';
        send('qa_faq_expanded', { faq_question: question });
      }
    };
    document.addEventListener('toggle', handleDetailsToggle, true);

    // 2) Related URL click tracking — measure which cross-links get clicks
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a');
      if (!anchor) return;
      const href = anchor.getAttribute('href') ?? '';
      // Only track clicks on related URLs (not nav links / footer)
      if (relatedUrls.includes(href) || href.startsWith('/directory/') || href.startsWith('/learn/hockey-in') || href.startsWith('/learn/hockey-rinks-in') || href.endsWith('-teams')) {
        send('qa_related_clicked', { destination_url: href, link_text: anchor.textContent?.trim().slice(0, 50) ?? '' });
      }
    };
    document.addEventListener('click', handleClick, true);

    // 3) Data provenance visibility — IntersectionObserver fires when in view
    const provenanceEl = document.querySelector('[data-qa-provenance]');
    if (provenanceEl && 'IntersectionObserver' in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              send('qa_data_prov_visible', { slug, pageType });
              observer.disconnect();
            }
          });
        },
        { threshold: 0.5 }
      );
      observer.observe(provenanceEl);
    }

    // 4) Copy answer capsule — listen to copy events on direct-answer block
    const handleCopy = () => {
      const answerEl = document.querySelector('[data-qa-answer-capsule]');
      if (answerEl && window.getSelection()?.toString().includes(answerEl.textContent?.slice(0, 50) ?? '__none__')) {
        send('qa_answer_copied', { copied_chars: window.getSelection()?.toString().length ?? 0 });
      }
    };
    document.addEventListener('copy', handleCopy);

    return () => {
      document.removeEventListener('toggle', handleDetailsToggle, true);
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('copy', handleCopy);
    };
  }, [slug, pageType, relatedUrls]);

  return null;
}
