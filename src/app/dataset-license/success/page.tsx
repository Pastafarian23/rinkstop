import type { Metadata } from 'next';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import { withDefaultOg } from '@/lib/metadata-defaults';

export const metadata: Metadata = {
  title: 'Dataset License — Download | RinkStop',
  description: 'Download your licensed RinkStop hockey dataset. CSV + JSON, all entities.',
  robots: { index: false, follow: false },
  openGraph: withDefaultOg({
    title: 'Dataset License — Download',
    description: 'Your RinkStop hockey dataset is ready to download.',
    url: 'https://rinkstop.com/dataset-license/success',
    siteName: 'RinkStop',
    type: 'website',
  }),
};

/**
 * /dataset-license/success — Post-payment download page.
 *
 * Triggered by Stripe after a successful $499 dataset license payment via
 * the dataset_license Payment Link. The Stripe webhook (already wired) upserts
 * a profiles row with tier='dataset_license' keyed by stripe_session_id.
 *
 * Here we look up the profile by the session_id in the URL, confirm the
 * payment is active, and display direct download links for the dataset.
 *
 * No human action needed — the dataset is the same as the public
 * /api/data/dataset endpoint but curated + cited, with attribution guidance.
 */
export const dynamic = 'force-dynamic';

const DATASET_DOWNLOAD_URLS = {
  json: 'https://rinkstop.com/api/data/dataset?format=json',
  jsonl: 'https://rinkstop.com/api/data/dataset?format=jsonl',
  csv_rinks: 'https://rinkstop.com/api/data/dataset?entity=rinks&format=csv',
  csv_teams: 'https://rinkstop.com/api/data/dataset?entity=teams&format=csv',
  csv_leagues: 'https://rinkstop.com/api/data/dataset?entity=leagues&format=csv',
  csv_players: 'https://rinkstop.com/api/data/dataset?entity=players&format=csv',
  schema: 'https://rinkstop.com/api/data/dataset?format=schema',
};

export default async function DatasetLicenseSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;

  // Look up the profile by stripe_session_id to confirm payment + grab email
  let buyerEmail: string | null = null;
  let paidAt: string | null = null;
  if (session_id) {
    try {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('email, updated_at, tier')
        .eq('stripe_session_id', session_id)
        .maybeSingle();
      if (profile && profile.tier === 'dataset_license') {
        buyerEmail = profile.email;
        paidAt = profile.updated_at;
      }
    } catch {
      // Profile lookup is best-effort. The download links work either way.
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0D1117', color: '#fff' }}>
      <div className="container" style={{ maxWidth: 800, margin: '0 auto', padding: '3rem 1rem 4rem' }}>

        {/* Confirmation */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{
            fontSize: '3.5rem',
            marginBottom: '1rem',
            lineHeight: 1,
          }}>📦</div>
          <h1 style={{
            fontSize: 'clamp(2rem, 5vw, 2.75rem)',
            fontWeight: 900,
            margin: '0 0 0.75rem',
          }}>
            Dataset licensed.
          </h1>
          <p style={{
            fontSize: '1.0625rem',
            color: 'rgba(255,255,255,0.7)',
            maxWidth: 580,
            margin: '0 auto 1rem',
            lineHeight: 1.55,
          }}>
            Thank you. Your commercial-use license is active.{' '}
            {buyerEmail && (
              <>A receipt has been emailed to <strong style={{ color: '#FFB81C' }}>{buyerEmail}</strong>.</>
            )}
          </p>
          {paidAt && (
            <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.45)' }}>
              License started {new Date(paidAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
            </div>
          )}
        </div>

        {/* Download grid */}
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1rem' }}>
          Download your bundle
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '0.75rem',
          marginBottom: '2.5rem',
        }}>
          {[
            { name: 'Full dataset (JSON)', url: DATASET_DOWNLOAD_URLS.json, size: 'Single object', hot: true },
            { name: 'Full dataset (JSONL)', url: DATASET_DOWNLOAD_URLS.jsonl, size: 'LLM-friendly' },
            { name: 'rinks.csv', url: DATASET_DOWNLOAD_URLS.csv_rinks, size: '1,857 rows' },
            { name: 'teams.csv', url: DATASET_DOWNLOAD_URLS.csv_teams, size: '2,601 rows' },
            { name: 'leagues.csv', url: DATASET_DOWNLOAD_URLS.csv_leagues, size: '305 rows' },
            { name: 'players.csv', url: DATASET_DOWNLOAD_URLS.csv_players, size: '6,351 rows' },
            { name: 'schema.json', url: DATASET_DOWNLOAD_URLS.schema, size: 'JSON Schema' },
          ].map((dl) => (
            <a
              key={dl.name}
              href={dl.url}
              target="_blank"
              rel="noopener"
              style={{
                display: 'block',
                padding: '1rem 1.25rem',
                background: dl.hot ? 'rgba(200,16,46,0.08)' : 'rgba(255,255,255,0.025)',
                border: `1px solid ${dl.hot ? 'rgba(200,16,46,0.3)' : 'rgba(255,255,255,0.06)'}`,
                borderRadius: 6,
                color: '#fff',
                textDecoration: 'none',
                transition: 'transform 0.15s',
              }}
            >
              <div style={{
                fontFamily: 'ui-monospace, monospace',
                fontSize: '0.875rem',
                fontWeight: 700,
                marginBottom: '0.2rem',
              }}>{dl.name}</div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>{dl.size}</div>
            </a>
          ))}
        </div>

        {/* Usage guidance */}
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.75rem' }}>
          Using the data
        </h2>
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 8,
          padding: '1.5rem',
          marginBottom: '2.5rem',
          fontSize: '0.95rem',
          color: 'rgba(255,255,255,0.75)',
          lineHeight: 1.6,
        }}>
          <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
            <li style={{ marginBottom: '0.5rem' }}>
              <strong style={{ color: '#fff' }}>Cite us</strong> in your methodology:{' '}
              <code style={{ background: 'rgba(255,255,255,0.06)', padding: '0.1rem 0.4rem', borderRadius: 3, fontSize: '0.85em' }}>
                Data: RinkStop.com, {new Date().getFullYear()}
              </code>
            </li>
            <li style={{ marginBottom: '0.5rem' }}>
              <strong style={{ color: '#fff' }}>Refreshes</strong> every quarter for 12 months. We'll email{' '}
              {buyerEmail || 'you'} when new versions drop.
            </li>
            <li style={{ marginBottom: '0.5rem' }}>
              <strong style={{ color: '#fff' }}>License terms</strong>: commercial use OK. Reselling the raw dataset is not.
            </li>
            <li>
              <strong style={{ color: '#fff' }}>Need bulk + custom</strong>? Email{' '}
              <a href="mailto:support@rinkstop.com" style={{ color: '#FFB81C' }}>support@rinkstop.com</a>{' '}
              for enterprise terms.
            </li>
          </ul>
        </div>

        {/* Account link (optional) */}
        <div style={{
          padding: '1.25rem',
          background: 'rgba(255,184,28,0.04)',
          border: '1px solid rgba(255,184,28,0.15)',
          borderRadius: 8,
          textAlign: 'center',
        }}>
          <div style={{ fontWeight: 700, marginBottom: '0.4rem' }}>
            Want to keep your license + get refreshes automatically?
          </div>
          <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.65)', marginBottom: '1rem' }}>
            Create a RinkStop account with the same email and we'll attach the license to your profile.
          </div>
          <Link
            href={`/sign-up${buyerEmail ? `?email=${encodeURIComponent(buyerEmail)}` : ''}&redirect_url=${encodeURIComponent('/dashboard')}`}
            style={{
              display: 'inline-block',
              padding: '0.65rem 1.5rem',
              background: '#FFB81C',
              color: '#0D1117',
              fontWeight: 700,
              fontSize: '0.9rem',
              borderRadius: 6,
              textDecoration: 'none',
            }}
          >
            Create account →
          </Link>
        </div>
      </div>
    </div>
  );
}