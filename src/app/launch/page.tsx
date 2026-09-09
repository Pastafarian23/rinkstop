// /launch — Founding Partner signup for the RinkStop Ice Marketplace.
//
// Why this page exists:
//   The ice marketplace (WS17 PR4) is built but empty. To fill it with
//   listings, we need rinks/clubs/leagues to onboard. Manual outreach is
//   off the table per Arnel's 2026-06-16 directive. This page is the
//   self-serve entry point — rinks find it via search, fill the form,
//   and the signup goes to Supabase. I see the signups in the dashboard
//   and reach out on my own time.
//
// Offer (founding partner):
//   - 0% RinkStop take-rate for first 6 months
//   - After 6 months: 20% standard take-rate kicks in
//   - In exchange: they list at least 1 ice slot per week, give feedback
//     on the product, and let us use their name as a launch partner
//
// This page is server-rendered, no client JS. The form posts to
// /api/launch-signup which does the Supabase insert + emails me.

import { headers } from 'next/headers';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'List Your Ice on RinkStop — Founding Partner Program',
  description:
    'Rinks, clubs, and leagues: list your open ice time on RinkStop and let coaches, parents, and teams find you. Founding partners pay 0% take-rate for the first 6 months.',
  alternates: { canonical: 'https://rinkstop.com/launch' },
  robots: { index: true, follow: true },
};

const ORG_TYPES = [
  { value: 'rink', label: 'Rink / Arena' },
  { value: 'club', label: 'Hockey Club / Association' },
  { value: 'league', label: 'League' },
  { value: 'federation', label: 'Federation' },
  { value: 'arena', label: 'Multi-purpose Arena' },
  { value: 'other', label: 'Other' },
];

const TIER_OPTIONS = [
  {
    value: 'club_starter',
    label: 'Club Starter',
    price: '$149/year',
    blurb: 'For small clubs (≤30 players). One organization, basic roster pages, visible to every coach and family in your area.',
  },
  {
    value: 'club_pro',
    label: 'Club Pro',
    price: '$399/year',
    blurb: 'For mid clubs (≤150 players). Multiple teams, schedule, standings, dedicated landing page.',
    popular: true,
  },
  {
    value: 'club_elite',
    label: 'Club Elite',
    price: '$999/year',
    blurb: 'For large orgs (unlimited teams). Branded profile, analytics, integrated bookings.',
  },
  {
    value: 'league',
    label: 'League',
    price: '$1,999/year',
    blurb: 'For full leagues. League-wide management: all clubs, all teams, all schedules.',
  },
  {
    value: 'business_listing',
    label: 'Business Listing',
    price: '$99/year',
    blurb: 'For rinks, pro shops, equipment vendors, training facilities. Get found in the directory, claim your listing, post events.',
  },
];

export default async function LaunchPage() {
  const h = await headers();
  const pathname = h.get('x-pathname') || '/launch';

  return (
    <main
      data-page="launch"
      style={{
        minHeight: '100vh',
        background: '#041E42',
        color: '#fff',
        padding: '3rem 1rem 5rem',
      }}
    >
      <div style={{ maxWidth: 880, margin: '0 auto' }}>
        <Link
          href="/"
          style={{
            color: 'rgba(255,255,255,0.6)',
            fontSize: '0.875rem',
            textDecoration: 'none',
            display: 'inline-block',
            marginBottom: '1.5rem',
          }}
        >
          ← RinkStop
        </Link>

        <div
          style={{
            fontSize: '0.6875rem',
            fontWeight: 800,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: '#FFB81C',
            marginBottom: '0.5rem',
          }}
        >
          Founding Partner Program
        </div>
        <h1
          style={{
            fontFamily: '"Bebas Neue", "Arial Narrow", sans-serif',
            fontSize: 'clamp(2.5rem, 6vw, 4rem)',
            lineHeight: 1,
            margin: '0 0 1rem',
            letterSpacing: '0.02em',
          }}
        >
          List your open ice. Get found.
        </h1>
        <p
          style={{
            fontSize: '1.125rem',
            color: 'rgba(255,255,255,0.85)',
            margin: '0 0 2rem',
            maxWidth: 640,
            lineHeight: 1.5,
          }}
        >
          RinkStop is opening a public ice marketplace — every rink, club, and league in the directory can list available
          ice time. Coaches, parents, and tournament organizers will find you by city, age group, and skill level.
        </p>

        <div
          style={{
            background: 'rgba(200,16,46,0.15)',
            border: '2px solid #C8102E',
            borderRadius: 12,
            padding: '1.25rem 1.5rem',
            marginBottom: '2.5rem',
          }}
        >
          <div
            style={{
              fontFamily: '"Bebas Neue", sans-serif',
              fontSize: '1.5rem',
              color: '#FFB81C',
              letterSpacing: '0.04em',
              marginBottom: '0.5rem',
            }}
          >
            Founding partner offer — 0% take-rate for 6 months
          </div>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.9)', fontSize: '0.95rem', lineHeight: 1.5 }}>
            List your first 6 months of ice for free. We keep 0%. You keep 100% of every booking. After 6 months, the
            standard 20% take-rate kicks in. In exchange: list at least one slot per week and give us product feedback.
          </p>
        </div>

        <h2
          style={{
            fontFamily: '"Bebas Neue", sans-serif',
            fontSize: '1.75rem',
            color: '#fff',
            letterSpacing: '0.04em',
            margin: '0 0 1rem',
          }}
        >
          Sign up below
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
          We&apos;ll email you within 2 business days with onboarding steps. No spam, no sales call unless you ask for one.
        </p>

        <form
          method="POST"
          action="/api/launch-signup"
          style={{
            background: '#0a1a36',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12,
            padding: '1.5rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1.25rem',
          }}
        >
          <div style={{ gridColumn: '1 / -1' }}>
            <h3
              style={{
                fontFamily: '"Bebas Neue", sans-serif',
                fontSize: '1.125rem',
                color: '#FFB81C',
                letterSpacing: '0.04em',
                margin: '0 0 0.5rem',
              }}
            >
              Your contact info
            </h3>
          </div>

          <div>
            <label htmlFor="contact_name" style={labelStyle}>
              Your name *
            </label>
            <input id="contact_name" name="contact_name" type="text" required style={inputStyle} placeholder="Jane Smith" />
          </div>

          <div>
            <label htmlFor="contact_email" style={labelStyle}>
              Email *
            </label>
            <input
              id="contact_email"
              name="contact_email"
              type="email"
              required
              style={inputStyle}
              placeholder="jane@yourrink.com"
            />
          </div>

          <div>
            <label htmlFor="contact_phone" style={labelStyle}>
              Phone (optional)
            </label>
            <input id="contact_phone" name="contact_phone" type="tel" style={inputStyle} placeholder="+1 555 123 4567" />
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <h3
              style={{
                fontFamily: '"Bebas Neue", sans-serif',
                fontSize: '1.125rem',
                color: '#FFB81C',
                letterSpacing: '0.04em',
                margin: '0.5rem 0 0.5rem',
              }}
            >
              About your organization
            </h3>
          </div>

          <div>
            <label htmlFor="org_name" style={labelStyle}>
              Organization name *
            </label>
            <input
              id="org_name"
              name="org_name"
              type="text"
              required
              style={inputStyle}
              placeholder="Riverside Ice Arena"
            />
          </div>

          <div>
            <label htmlFor="org_type" style={labelStyle}>
              Organization type *
            </label>
            <select id="org_type" name="org_type" required style={inputStyle}>
              {ORG_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="org_website" style={labelStyle}>
              Website (optional)
            </label>
            <input
              id="org_website"
              name="org_website"
              type="url"
              style={inputStyle}
              placeholder="https://yourrink.com"
            />
          </div>

          <div>
            <label htmlFor="org_city" style={labelStyle}>
              City *
            </label>
            <input id="org_city" name="org_city" type="text" required style={inputStyle} placeholder="Toronto" />
          </div>

          <div>
            <label htmlFor="org_state" style={labelStyle}>
              State / Province
            </label>
            <input id="org_state" name="org_state" type="text" style={inputStyle} placeholder="ON" />
          </div>

          <div>
            <label htmlFor="org_country" style={labelStyle}>
              Country *
            </label>
            <input id="org_country" name="org_country" type="text" required style={inputStyle} placeholder="Canada" />
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <h3
              style={{
                fontFamily: '"Bebas Neue", sans-serif',
                fontSize: '1.125rem',
                color: '#FFB81C',
                letterSpacing: '0.04em',
                margin: '0.5rem 0 0.5rem',
              }}
            >
              What are you interested in?
            </h3>
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
              {TIER_OPTIONS.map((t) => (
                <label
                  key={t.value}
                  htmlFor={`tier_${t.value}`}
                  style={{
                    display: 'block',
                    background: t.popular ? 'rgba(255,184,28,0.1)' : 'rgba(255,255,255,0.04)',
                    border: t.popular ? '1px solid rgba(255,184,28,0.5)' : '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8,
                    padding: '0.75rem 0.875rem',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                    <input
                      type="radio"
                      id={`tier_${t.value}`}
                      name="tier_interest"
                      value={t.value}
                      required
                      style={{ marginTop: 4 }}
                    />
                    <div>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: '0.95rem',
                          color: '#fff',
                          marginBottom: '0.125rem',
                        }}
                      >
                        {t.label}
                        {t.popular ? (
                          <span
                            style={{
                              fontSize: '0.625rem',
                              fontWeight: 800,
                              letterSpacing: '0.1em',
                              textTransform: 'uppercase',
                              color: '#FFB81C',
                              marginLeft: '0.5rem',
                            }}
                          >
                            Popular
                          </span>
                        ) : null}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#FFB81C', marginBottom: '0.25rem' }}>{t.price}</div>
                      <div style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.4 }}>{t.blurb}</div>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="monthly_ice_hours_estimate" style={labelStyle}>
              Open ice hours per month (estimate)
            </label>
            <input
              id="monthly_ice_hours_estimate"
              name="monthly_ice_hours_estimate"
              type="number"
              min="0"
              style={inputStyle}
              placeholder="40"
            />
          </div>

          <div>
            <label htmlFor="currently_uses_bookingsystem" style={labelStyle}>
              Current booking system (optional)
            </label>
            <input
              id="currently_uses_bookingsystem"
              name="currently_uses_bookingsystem"
              type="text"
              style={inputStyle}
              placeholder="FacilityOS, Driven, spreadsheet, none..."
            />
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label htmlFor="notes" style={labelStyle}>
              Anything else we should know?
            </label>
            <textarea id="notes" name="notes" rows={3} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Optional" />
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <input type="hidden" name="source" value="launch_page" />
            <input type="hidden" name="source_url" value={pathname} />
            <button
              type="submit"
              style={{
                display: 'inline-block',
                padding: '0.875rem 1.75rem',
                background: '#C8102E',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                fontWeight: 700,
                fontSize: '1rem',
                fontFamily: 'inherit',
                cursor: 'pointer',
              }}
            >
              Apply to be a founding partner
            </button>
            <p
              style={{
                margin: '0.75rem 0 0',
                fontSize: '0.75rem',
                color: 'rgba(255,255,255,0.5)',
              }}
            >
              We&apos;ll review your application within 2 business days. No commitment, no payment until you accept.
            </p>
          </div>
        </form>

        <div
          style={{
            marginTop: '3rem',
            padding: '1.5rem',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8,
            fontSize: '0.875rem',
            color: 'rgba(255,255,255,0.7)',
            lineHeight: 1.6,
          }}
        >
          <strong style={{ color: '#FFB81C' }}>Why we built this:</strong> RinkStop already lists 1,857 rinks, 3,243 teams, and 303 leagues
          in 78 countries. The directory brings traffic. The marketplace turns that traffic into transactions between
          rinks with open ice and teams that need it. We take a 20% cut of every booking — same model as Airbnb, Vrbo,
          and Classpass.
        </div>
      </div>
    </main>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.75rem',
  fontWeight: 600,
  color: 'rgba(255,255,255,0.7)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom: '0.375rem',
};

const inputStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '0.625rem 0.75rem',
  background: '#0f1e3a',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: 6,
  color: '#fff',
  fontSize: '0.9375rem',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
};
