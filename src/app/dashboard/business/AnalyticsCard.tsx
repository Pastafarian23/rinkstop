'use client';

// Business dashboard: Enhanced Analytics card (Business Plus feature).
// Shows 30-day rolling summary + per-day chart.

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface DailyPoint {
  date: string;
  page_views: number;
  unique_visitors: number;
  lead_form_submissions: number;
  favorite_count: number;
  review_count: number;
  phone_clicks: number;
  website_clicks: number;
  email_clicks: number;
  booking_inquiries: number;
}

interface AnalyticsCardProps {
  listingId: string;
  userTier: string;
}

export default function AnalyticsCard({ listingId, userTier }: AnalyticsCardProps) {
  const [summary, setSummary] = useState<any | null>(null);
  const [daily, setDaily] = useState<DailyPoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const tierRank: Record<string, number> = { free: 0, business_listing: 1, business_plus: 2 };
  const hasPlus = (tierRank[userTier] ?? 0) >= 2;

  useEffect(() => {
    if (!hasPlus) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      const r = await fetch(`/api/manage/business/analytics?listing_id=${listingId}&days=30`);
      if (cancelled) return;
      if (!r.ok) { setError(`Failed to load (${r.status})`); setLoading(false); return; }
      const j = await r.json();
      setSummary(j.summary);
      setDaily(j.daily || []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [listingId, hasPlus]);

  if (!hasPlus) {
    return (
      <div style={{ background: 'rgba(13,17,23,0.6)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.25rem 1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
          <span style={{ fontSize: '1.1rem' }}>📊</span>
          <h2 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '1.15rem', color: '#fff', letterSpacing: '0.05em', margin: 0 }}>
            ENHANCED ANALYTICS
          </h2>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', margin: '0.25rem 0 0.75rem' }}>
          30-day rolling summary, per-day charts, and conversion tracking. Requires Business Plus.
        </p>
        <Link href="/pricing?for=business" style={{ display: 'inline-block', background: '#C8102E', color: '#fff', padding: '0.5rem 0.875rem', borderRadius: 8, fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none' }}>
          Upgrade to Business Plus →
        </Link>
      </div>
    );
  }

  const maxViews = Math.max(1, ...daily.map((d) => d.page_views));
  const width = 600;
  const height = 120;
  const padX = 24;
  const padY = 12;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;
  const pointSpacing = daily.length > 1 ? innerW / (daily.length - 1) : 0;
  const points = daily.map((d, i) => {
    const x = padX + i * pointSpacing;
    const y = padY + innerH - (d.page_views / maxViews) * innerH;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div style={{ background: 'rgba(13,17,23,0.6)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.25rem 1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <span style={{ fontSize: '1.1rem' }}>📊</span>
        <h2 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '1.15rem', color: '#fff', letterSpacing: '0.05em', margin: 0 }}>
          ENHANCED ANALYTICS — 30 DAYS
        </h2>
      </div>
      {error && <p style={{ color: '#FF6B7A', fontSize: '0.85rem' }}>{error}</p>}
      {loading ? (
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>Loading…</p>
      ) : !summary ? (
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>
          No analytics data yet. The first rollup runs tonight. Check back tomorrow.
        </p>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.75rem', marginBottom: '0.875rem' }}>
            <Stat label="Page views" value={summary.page_views_30d ?? 0} />
            <Stat label="Unique visitors" value={summary.unique_visitors_30d ?? 0} />
            <Stat label="Leads" value={summary.leads_30d ?? 0} highlight />
            <Stat label="Phone clicks" value={summary.phone_clicks_30d ?? 0} />
            <Stat label="Website clicks" value={summary.website_clicks_30d ?? 0} />
            <Stat label="Email clicks" value={summary.email_clicks_30d ?? 0} />
            <Stat label="Booking inquiries" value={summary.booking_inquiries_30d ?? 0} />
            <Stat label="Favorites (net)" value={summary.favorites_net_30d ?? 0} />
            <Stat label="Reviews (net)" value={summary.reviews_net_30d ?? 0} />
          </div>
          {daily.length > 1 && (
            <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', maxWidth: '100%' }}>
              <defs>
                <linearGradient id="vfill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#C8102E" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#C8102E" stopOpacity="0" />
                </linearGradient>
              </defs>
              <polyline points={points} fill="none" stroke="#C8102E" strokeWidth="2" />
              <polygon points={`${padX},${padY + innerH} ${points} ${padX + (daily.length - 1) * pointSpacing},${padY + innerH}`} fill="url(#vfill)" />
              {daily.map((d, i) => {
                const x = padX + i * pointSpacing;
                const y = padY + innerH - (d.page_views / maxViews) * innerH;
                return <circle key={d.date} cx={x} cy={y} r="2.5" fill="#C8102E" />;
              })}
            </svg>
          )}
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', margin: '0.5rem 0 0' }}>
            Last activity: {summary.last_activity_date || 'no data yet'}
          </p>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
      <span style={{ color: highlight ? '#86EFAC' : '#fff', fontSize: '1.4rem', fontWeight: 700, lineHeight: 1 }}>{value}</span>
      <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem', marginTop: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
    </div>
  );
}
