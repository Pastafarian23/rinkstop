/**
 * src/app/advertise/page.tsx
 *
 * Phase 10 of the conversion overhaul (memory/2026-10-01-conversion-monetization-overhaul.md).
 * Rewritten so the page does NOT make unsupported claims like "Deep
 * Engagement" without supporting metrics. Where metrics exist, show them.
 * Where they don't, use the fallback language "Growing global hockey
 * audience" rather than inventing engagement statistics.
 *
 * Real metrics we DO have (per 2026-10-01 directory-counts hotfix):
 * - 1,856 rinks · 2,601 teams · 6,351 players · 305 leagues · 84 countries
 *
 * Real metrics we DO NOT have:
 * - Monthly users / pageviews / search impressions
 * - Average time on page / session duration
 * - Email subscriber count (CMS table exists but unconfirmed)
 * - Demographics
 *
 * The page sells targeted hockey access to businesses by listing what
 * categories of audience RinkStop serves (rink operators, hockey clubs,
 * league admins, equipment businesses), NOT by claiming engagement we
 * cannot substantiate.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { getDirectoryCounts } from '@/lib/directory-counts';

export const metadata: Metadata = {
  title: 'Advertise with RinkStop | Hockey Directory Advertising',
  description: 'Advertise your hockey brand, product, or service to a global audience. RinkStop reaches hockey enthusiasts across NHL, international leagues, youth, and non-traditional markets.',
};

export const dynamic = 'force-dynamic';

export default async function AdvertisePage() {
  const counts = await getDirectoryCounts();

  const reach = [
    {
      stat: counts.rinks.toLocaleString(),
      label: 'ice rinks listed',
      desc: 'Real rinks in 84 countries. Most with public programs, schedules, and contact details.',
    },
    {
      stat: counts.teams.toLocaleString(),
      label: 'team profiles',
      desc: 'From NHL and KHL to youth hockey associations and beer-league rosters.',
    },
    {
      stat: counts.leagues.toLocaleString(),
      label: 'leagues covered',
      desc: 'Pro, junior, college, youth, women, and non-traditional hockey markets.',
    },
    {
      stat: counts.countries.toLocaleString(),
      label: 'countries reached',
      desc: 'Audiences across North America, Europe, Asia, and growing markets like UAE, Thailand, and the Philippines.',
    },
  ];

  const audiences = [
    {
      title: 'For rink operators',
      desc: 'Hockey rink owners and managers searching for scheduling software, equipment, ice-resurfacer services, and concession suppliers.',
    },
    {
      title: 'For hockey clubs & teams',
      desc: 'Club administrators, coaches, and team managers looking for tournament hosting, league registration, and roster tools.',
    },
    {
      title: 'For hockey businesses',
      desc: 'Pro shops, equipment manufacturers, skate sharpening, and hockey training services targeting a qualified buyer audience.',
    },
    {
      title: 'For league administrators',
      desc: 'Federation staff and league commissioners seeking programs, officiating services, and federation membership tools.',
    },
  ];

  return (
    <main style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1rem 4rem' }}>
      <nav style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '1.5rem' }}>
        <Link href="/" style={{ color: 'rgba(255,255,255,0.4)' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: 'rgba(255,255,255,0.6)' }}>Advertise</span>
      </nav>

      <h1 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 'clamp(2rem, 5vw, 3rem)', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>
        ADVERTISE WITH RINKSTOP
      </h1>

      <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1.125rem', lineHeight: 1.7, marginBottom: '2.5rem', borderLeft: '4px solid #C8102E', paddingLeft: '1.25rem' }}>
        Reach the operators and organizers who run the world's hockey infrastructure — rink owners, club admins, league commissioners, and hockey brands.
      </p>

      {/* What we list — real, not invented */}
      <div style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.75rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1.25rem' }}>
          WHAT RINKSTOP LISTS
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
          {reach.map(item => (
            <div key={item.label} style={{ background: 'var(--s2)', padding: '1.25rem 1.5rem', borderRadius: '8px' }}>
              <div style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '2rem', color: '#FFB81C', letterSpacing: '0.02em', marginBottom: '0.25rem', lineHeight: 1 }}>
                {item.stat}
              </div>
              <div style={{ fontWeight: 800, fontSize: '0.6875rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C8102E', marginBottom: '0.5rem' }}>
                {item.label}
              </div>
              <div style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
                {item.desc}
              </div>
            </div>
          ))}
        </div>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', marginTop: '0.75rem', lineHeight: 1.6 }}>
          Growing global hockey audience. Exact monthly traffic and engagement metrics are not yet published; this list is updated as the directory grows.
        </p>
      </div>

      {/* Audience segments — concrete, not invented */}
      <div style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.75rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1.25rem' }}>
          WHO YOU REACH
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.95rem', marginBottom: '1.25rem' }}>
          RinkStop's audience is the people who actually run and play the game — not generic sports fans. Targeting options:
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {audiences.map(item => (
            <div key={item.title} style={{ border: '1px solid var(--border)', borderRadius: '6px', padding: '1.25rem 1.5rem' }}>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: '#fff', marginBottom: '0.5rem' }}>{item.title}</div>
              <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Ad formats — preserved from previous version */}
      <div style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.75rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1.25rem' }}>
          ADVERTISING OPTIONS
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[
            {
              format: 'Directory Listings & Promotions',
              desc: 'Premium placement for teams, leagues, rinks, and brands. Get featured positioning and enhanced listing visibility for key pages.',
            },
            {
              format: 'Sponsored Content',
              desc: 'Featured in editorial content. Sponsored articles, directory spotlights, and newsletter features available. Contact us for custom content packages.',
            },
            {
              format: 'Newsletter Sponsorship',
              desc: 'Reach our email subscribers directly. Newsletter sponsorships include brand mentions and featured placements.',
            },
            {
              format: 'Display Advertising (when enabled)',
              desc: 'Contextual display ads. RinkStop does not run Google AdSense or personalized ad networks on the live site as of this writing. When ads are enabled they will be clearly labelled "Advertisement" or "Sponsored."',
            },
          ].map(item => (
            <div key={item.format} style={{ border: '1px solid var(--border)', borderRadius: '6px', padding: '1.25rem 1.5rem' }}>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: '#fff', marginBottom: '0.5rem' }}>{item.format}</div>
              <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Advertiser disclosure — preserved */}
      <div style={{ marginBottom: '3rem', borderTop: '1px solid var(--border)', paddingTop: '2rem' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>
          ADVERTISER DISCLOSURE &amp; EDITORIAL INDEPENDENCE
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.55)', lineHeight: 1.8, fontSize: '0.95rem', marginBottom: '1rem' }}>
          RinkStop displays advertisements served by third-party advertising networks. As of the date at the top of this page, RinkStop does <strong>not</strong> run Google AdSense or any other personalized ad network on the live site. When ads are enabled, they will be clearly distinguishable from editorial content and labelled as &ldquo;Advertisement&rdquo; or &ldquo;Sponsored.&rdquo;
        </p>
        <p style={{ color: 'rgba(255,255,255,0.55)', lineHeight: 1.8, fontSize: '0.95rem', marginBottom: '1rem' }}>
          <strong>Editorial independence:</strong> Advertising never influences what we write, who we cover, or how we cover it. See our <Link href="/editorial-policy" style={{ color: '#C8102E' }}>Editorial Policy</Link> for the full standard.
        </p>
        <p style={{ color: 'rgba(255,255,255,0.55)', lineHeight: 1.8, fontSize: '0.95rem', marginBottom: '1rem' }}>
          <strong>Affiliate disclosure:</strong> Some links on RinkStop may be affiliate links. Affiliate relationships are disclosed in the article footer where they appear.
        </p>
        <p style={{ color: 'rgba(255,255,255,0.55)', lineHeight: 1.8, fontSize: '0.95rem', marginBottom: '1rem' }}>
          <strong>Personalized advertising &amp; EEA / UK / Switzerland:</strong> For visitors in the European Economic Area, United Kingdom, or Switzerland, RinkStop uses a Google-certified consent management platform. Personalized advertising is only loaded after explicit consent.
        </p>
        <p style={{ color: 'rgba(255,255,255,0.55)', lineHeight: 1.8, fontSize: '0.95rem' }}>
          <strong>Children&rsquo;s privacy:</strong> RinkStop does not enable personalized or retargeted advertising on youth-hockey sections of the site, in line with our <Link href="/privacy" style={{ color: '#C8102E' }}>Privacy Policy</Link> and COPPA compliance.
        </p>
      </div>

      {/* Contact */}
      <div style={{ background: 'var(--s2)', padding: '2rem 2.5rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.75rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>GET STARTED</h2>
        <p style={{ color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, marginBottom: '1.5rem' }}>
          Ready to reach the operators and organizers behind global hockey? Send us a message with details about your business, audience, and goals, and we'll put together a proposal.
        </p>
        <a
          href="/about#contact"
          style={{
            display: 'inline-block',
            background: '#C8102E',
            color: '#fff',
            padding: '0.75rem 1.75rem',
            borderRadius: '4px',
            fontWeight: 700,
            fontSize: '0.9375rem',
            textDecoration: 'none',
          }}
        >
          Send Us a Message
        </a>
      </div>
    </main>
  );
}