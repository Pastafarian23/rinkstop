'use client';

import Link from 'next/link';
import {
  buildAffiliateUrl,
  hasAffiliateNetwork,
  type ProductRecommendation,
} from '@/lib/affiliate-links';

interface AffiliateProductCardProps {
  product: ProductRecommendation;
  /** Where this recommendation shows (for analytics) */
  placement?: string;
}

/**
 * <AffiliateProductCard /> — Renders a single product recommendation with an
 * outbound affiliate link.
 *
 * Behavior:
 *   - If any affiliate network is configured (AMZN_ASSOCIATE_TAG, etc.):
 *     - Show "Where to buy →" link with affiliate-tagged URL
 *     - Link opens in new tab (outbound commerce)
 *     - rel="sponsored noopener" (Google compliance for paid links)
 *   - If no network is configured (current state):
 *     - Show "Find on Amazon →" link to clean Amazon search URL
 *     - rel="noopener" (no paid link signals)
 *     - No broken UI — works the same way
 *
 * Component is SSR-safe (no hooks). Server-rendered for SEO.
 */
export default function AffiliateProductCard({ product, placement = 'inline' }: AffiliateProductCardProps) {
  const url = buildAffiliateUrl(product);
  const isAffiliate = hasAffiliateNetwork();
  const hasAsin = Boolean(product.asin);

  return (
    <div
      data-affiliate-card={product.brand.toLowerCase()}
      data-affiliate-placement={placement}
      style={{
        display: 'flex',
        gap: '1rem',
        padding: '1rem 1.25rem',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 8,
        marginBottom: '0.75rem',
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{
          fontSize: '0.7rem',
          fontWeight: 800,
          letterSpacing: '0.1em',
          color: '#FFB81C',
          textTransform: 'uppercase',
          marginBottom: '0.25rem',
        }}>
          {product.brand}{hasAsin ? '' : ' (search)'}
        </div>
        <div style={{
          fontSize: '1rem',
          fontWeight: 700,
          color: '#fff',
          marginBottom: '0.35rem',
          lineHeight: 1.3,
        }}>
          {product.name}
        </div>
        <div style={{
          fontSize: '0.875rem',
          color: 'rgba(255,255,255,0.65)',
          lineHeight: 1.5,
        }}>
          {product.reason}
        </div>
        {product.priceUsd && (
          <div style={{
            marginTop: '0.4rem',
            fontSize: '0.8rem',
            color: 'rgba(255,255,255,0.45)',
            fontFamily: 'ui-monospace, monospace',
          }}>
            ~${product.priceUsd}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        <Link
          href={url || '#'}
          target="_blank"
          rel={isAffiliate ? 'sponsored noopener' : 'noopener'}
          data-affiliate-network={isAffiliate ? 'amazon' : 'amazon-search'}
          style={{
            display: 'inline-block',
            background: '#FFB81C',
            color: '#0D1117',
            fontSize: '0.85rem',
            fontWeight: 700,
            padding: '0.65rem 1.1rem',
            borderRadius: 6,
            textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          Where to buy →
        </Link>
      </div>
    </div>
  );
}

interface AffiliateDisclosureProps {
  /** Where the disclosure is shown */
  placement?: string;
}

/**
 * <AffiliateDisclosure /> — Renders FTC-compliant disclosure text. Shows only
 * if any affiliate network is configured (otherwise there's nothing to disclose).
 */
export function AffiliateDisclosure({ placement = 'inline' }: AffiliateDisclosureProps) {
  if (!hasAffiliateNetwork()) return null;

  return (
    <div
      data-affiliate-disclosure={placement}
      style={{
        fontSize: '0.8rem',
        color: 'rgba(255,255,255,0.5)',
        padding: '0.75rem 1rem',
        background: 'rgba(255,184,28,0.05)',
        border: '1px solid rgba(255,184,28,0.15)',
        borderRadius: 6,
        marginTop: '1rem',
        marginBottom: '1rem',
        lineHeight: 1.5,
      }}
    >
      <strong style={{ color: '#FFB81C' }}>Affiliate disclosure:</strong>{' '}
      Some links on this page are affiliate links. RinkStop may earn a small commission
      if you buy through them, at no extra cost to you. We only recommend products we
      genuinely believe are good picks for hockey players and parents.
    </div>
  );
}