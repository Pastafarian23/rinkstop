// Staging-only preview of the approved-claim Organization Plus offer (B-4 review, 2026-11-27).
// Shows SAMPLE data only. Reads no claim, creates no account, writes nothing, starts no purchase.
// Served ONLY when VERCEL_ENV === 'preview' (fail closed: production, development and unset all 404).
// Excluded from the sitemap; see tests/org-plus-preview-gate.test.ts.
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { orgPlusOfferCopy } from '@/lib/org-plus-offer';
import { isPreviewServable } from '@/lib/org-plus-preview-gate';

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function OrgPlusOfferPreview() {
  if (!isPreviewServable(process.env.VERCEL_ENV)) notFound();
  return (
    <main style={{ maxWidth: 640, margin: '0 auto', padding: '1.5rem 1rem', color: '#fff' }}>
      <p style={{ background: '#222', color: '#FFB81C', padding: '0.6rem 0.8rem', borderRadius: 6, fontSize: '0.85rem' }}>
        PREVIEW ONLY. Sample data. No claim, account, or payment is involved.
      </p>
      {(['rink', 'team'] as const).map((type) => {
        const o = orgPlusOfferCopy(type);
        return (
          <section key={type} style={{ border: '1px solid #FFB81C', borderRadius: 10, padding: '1rem 1.1rem', margin: '1rem 0' }}>
            <p style={{ color: '#888', fontSize: '0.75rem', margin: '0 0 0.4rem' }}>Sample approved {type} claim</p>
            <p style={{ color: '#FFB81C', fontWeight: 700, margin: '0 0 0.5rem' }}>{o.headline}</p>
            <ul style={{ color: '#ccc', fontSize: '0.9rem', lineHeight: 1.6, paddingLeft: '1.1rem', margin: '0 0 0.8rem' }}>
              {o.benefits.map((b) => <li key={b}>{b}</li>)}
            </ul>
            <Link href={o.href} style={{ display: 'inline-block', background: '#FFB81C', color: '#0a0a0a', padding: '0.6rem 1rem', borderRadius: 6, fontWeight: 700, textDecoration: 'none', fontSize: '0.9rem' }}>
              {o.ctaLabel} →
            </Link>
          </section>
        );
      })}
    </main>
  );
}
