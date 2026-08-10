import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Data Methodology — RinkStop',
  description: 'How RinkStop sources, verifies, updates, and corrects the directory data for rinks, teams, players, and leagues.',
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://rinkstop.com/data-methodology' },
};

export default function DataMethodologyPage() {
  return (
    <main style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1rem 4rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1.5rem' }}>
        <Link href="/" style={{ color: '#555' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>Data Methodology</span>
      </nav>

      <h1 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 'clamp(2rem, 5vw, 3rem)', color: '#041E42', letterSpacing: '0.04em', marginBottom: '1rem' }}>
        DATA METHODOLOGY
      </h1>
      <p style={{ marginBottom: '2rem', color: '#444' }}>Last updated: August 10, 2026</p>

      <div style={{ color: '#1a1a1a', lineHeight: 1.8, fontSize: '1rem' }}>
        <p style={{ marginBottom: '1.5rem' }}>
          RinkStop maintains a directory of more than 9,500 hockey listings — rinks, teams, players, and leagues across roughly 80 countries. This page describes how that data is sourced, how it is kept current, and how errors are handled.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Where the data comes from</h2>
        <p style={{ marginBottom: '1rem' }}>
          Directory records are combined from the following sources:
        </p>
        <ul style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li><strong>Official league feeds.</strong> NHL, AHL, KHL, PWHL, NCAA, IIHF, Hockey Canada, USA Hockey, and other federations publish team rosters, schedules, and venue lists. These are the primary sources for active-team records and league rosters.</li>
          <li><strong>Public federation and association directories.</strong> National federations publish rink and arena registries, club registrations, and competition results.</li>
          <li><strong>Box-score archives.</strong> League box-score archives provide career statistics, season-by-season tables, and historical records for individual players.</li>
          <li><strong>User submissions.</strong> RinkStop&rsquo;s directory-submission forms let team operators, rink managers, and members of the public submit listings or corrections. Submitted listings are reviewed by a RinkStop editor before they appear on the site.</li>
          <li><strong>Direct outreach.</strong> Where public data is incomplete (particularly in non-traditional markets), the editorial team contacts leagues, clubs, and federations directly to confirm venue details, registration status, and contact information.</li>
        </ul>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>How we verify a listing</h2>
        <p style={{ marginBottom: '1rem' }}>
          Every listing page shows one of four verification states:
        </p>
        <ul style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li><strong>Organization verified.</strong> The listing was confirmed directly with the organization (team, rink, league) by the RinkStop editorial team.</li>
          <li><strong>Official source verified.</strong> The listing was created from an official source (league registry, federation site, federation press release) and is updated when the source updates.</li>
          <li><strong>Community submitted.</strong> The listing was submitted by a user and reviewed by a RinkStop editor before publication. It has not been independently verified against the organization.</li>
          <li><strong>Unverified.</strong> The listing was aggregated from public data of uncertain provenance. It appears on the site pending verification.</li>
        </ul>
        <p style={{ marginBottom: '1.5rem' }}>
          Each listing page also shows the date it was last updated and the source(s) used to create it.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>How often data is updated</h2>
        <p style={{ marginBottom: '1rem' }}>
          Update cadence varies by entity type:
        </p>
        <ul style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li><strong>Active professional teams (NHL, AHL, KHL, PWHL, top European leagues):</strong> roster, schedule, and standing data are refreshed daily during the season.</li>
          <li><strong>Amateur, youth, and developmental teams:</strong> rosters are refreshed weekly during the season and at the start of the off-season.</li>
          <li><strong>Players:</strong> career statistics are refreshed weekly during active seasons and quarterly in the off-season.</li>
          <li><strong>Rinks and arenas:</strong> venue details are reviewed at least annually; status changes (open, closed, renamed, expanded) are processed within five business days of being reported.</li>
          <li><strong>Leagues:</strong> structural data (founding year, country, divisions, current champion) is reviewed annually; in-season standings refresh daily.</li>
        </ul>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>How corrections are handled</h2>
        <p style={{ marginBottom: '1.5rem' }}>
          Corrections are processed through the same channel as all other feedback: the <Link href="/corrections" style={{ color: '#C8102E' }}>Corrections page</Link>. When a correction is accepted, the listing is updated, the page renders the corrected value on the next refresh, and the source attribution is updated if the corrected data came from a different or higher-quality source.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>How to submit a new listing</h2>
        <p style={{ marginBottom: '1rem' }}>
          New listings are submitted through <Link href="/add-listing" style={{ color: '#C8102E' }}>/add-listing</Link>. Every submission is reviewed by a RinkStop editor before it appears on the site. Submitting a listing does not transfer ownership of the listing to RinkStop; the listing remains attributable to the original organization, and ownership can be claimed by the organization through <Link href="/claim-your-listing" style={{ color: '#C8102E' }}>/claim-your-listing</Link>.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Editorial content vs directory data</h2>
        <p style={{ marginBottom: '1.5rem' }}>
          Directory listings are factual records and are subject to the verification process above. Editorial articles (news, guides, analysis) are written and reviewed under our <Link href="/editorial-policy" style={{ color: '#C8102E' }}>Editorial Policy</Link>. The two are kept separate: editorial articles never modify directory data, and directory updates never retroactively change published articles.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>What we don&rsquo;t do</h2>
        <ul style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li>We do not publish fabricated listings. Every record on RinkStop traces back to a public source, a federation record, a user submission, or direct outreach.</li>
          <li>We do not present unverified data as verified. Every page declares its verification status.</li>
          <li>We do not silently edit historical data. Corrections are visible on the page (last-updated timestamp + source attribution) and, for editorial articles, are recorded in the public correction log.</li>
          <li>We do not sell or transfer directory data to third parties for marketing use.</li>
        </ul>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Related</h2>
        <ul style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li><Link href="/editorial-policy" style={{ color: '#C8102E' }}>Editorial Policy</Link> — how editorial content is produced and reviewed</li>
          <li><Link href="/corrections" style={{ color: '#C8102E' }}>Corrections</Link> — how to report an error</li>
          <li><Link href="/about" style={{ color: '#C8102E' }}>About RinkStop</Link> — ownership, contact, and mission</li>
        </ul>
      </div>
    </main>
  );
}