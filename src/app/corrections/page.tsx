import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Corrections — RinkStop',
  description: 'How to report an error on RinkStop. Public log of corrections to editorial content and directory listings.',
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://rinkstop.com/corrections' },
};

export default function CorrectionsPage() {
  return (
    <main style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1rem 4rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1.5rem' }}>
        <Link href="/" style={{ color: '#555' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>Corrections</span>
      </nav>

      <h1 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 'clamp(2rem, 5vw, 3rem)', color: '#041E42', letterSpacing: '0.04em', marginBottom: '1rem' }}>
        CORRECTIONS
      </h1>
      <p style={{ marginBottom: '2rem', color: '#444' }}>Last updated: August 10, 2026</p>

      <div style={{ color: '#1a1a1a', lineHeight: 1.8, fontSize: '1rem' }}>
        <p style={{ marginBottom: '1.5rem' }}>
          RinkStop is a directory of more than 9,500 hockey listings and a roster of editorial articles covering hockey at every level. We work to keep the data accurate, but errors are inevitable at our scale. This page explains how to report one and how we handle it.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Found an error? Tell us.</h2>
        <p style={{ marginBottom: '1rem' }}>
          Send the following to <a href="mailto:corrections@rinkstop.com" style={{ color: '#C8102E' }}>corrections@rinkstop.com</a>:
        </p>
        <ol style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li>The URL of the page where the error appears</li>
          <li>What the page currently says</li>
          <li>What the correct information is</li>
          <li>A source for the correct information (URL, document, league box score, federation site, or official announcement), if possible</li>
          <li>Your name and contact information, in case we need to follow up</li>
        </ol>
        <p style={{ marginBottom: '1.5rem' }}>
          Corrections on editorial articles and directory listings follow the same process. We aim to respond within five business days and to publish any accepted correction within ten business days of confirmation.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>How corrections appear on the site</h2>
        <p style={{ marginBottom: '1rem' }}>
          When an editorial article is corrected:
        </p>
        <ol style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li>The article body is updated to reflect the correct information.</li>
          <li>A short correction note is appended at the bottom of the article describing what changed and when.</li>
          <li>Material corrections are also reflected in the article&rsquo;s &ldquo;Last updated&rdquo; metadata.</li>
        </ol>
        <p style={{ marginBottom: '1.5rem' }}>
          When a directory listing is corrected:
        </p>
        <ol style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li>The listing is updated in our database.</li>
          <li>The page renders the corrected value on the next refresh.</li>
          <li>If the listing was significantly wrong (e.g., wrong city or wrong league assignment), the source attribution on the page is also updated.</li>
        </ol>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Public correction log</h2>
        <p style={{ marginBottom: '1.5rem' }}>
          We maintain a public log of material corrections to editorial content. The current log is empty — this page was created on August 10, 2026, and the policy takes effect from this date forward. Material corrections to articles published after this date will be appended here with the article URL, the original claim, the corrected claim, the date of correction, and a link to the article&rsquo;s correction note.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>What we don&rsquo;t do</h2>
        <p style={{ marginBottom: '1.5rem' }}>
          We do not silently edit a published article in a way that misrepresents what was originally written. We do not remove correction notes to obscure prior errors. We do not delete user-submitted corrections or dispute correspondence.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Related</h2>
        <ul style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li><Link href="/editorial-policy" style={{ color: '#C8102E' }}>Editorial Policy</Link> — how we produce and review content</li>
          <li><Link href="/data-methodology" style={{ color: '#C8102E' }}>Data Methodology</Link> — how directory listings are sourced and updated</li>
          <li><Link href="/about" style={{ color: '#C8102E' }}>About RinkStop</Link> — ownership, contact, and mission</li>
        </ul>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Contact</h2>
        <p style={{ marginBottom: '1rem' }}>
          For corrections: <a href="mailto:corrections@rinkstop.com" style={{ color: '#C8102E' }}>corrections@rinkstop.com</a>
        </p>
        <p style={{ marginBottom: '1.5rem' }}>
          For general inquiries: <a href="mailto:support@rinkstop.com" style={{ color: '#C8102E' }}>support@rinkstop.com</a>
        </p>
      </div>
    </main>
  );
}