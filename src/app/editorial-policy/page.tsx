import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Editorial Policy — RinkStop',
  description: 'How RinkStop produces, reviews, and publishes editorial content. Our standards, sourcing rules, AI-use policy, and how we handle corrections.',
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://rinkstop.com/editorial-policy' },
};

export default function EditorialPolicyPage() {
  return (
    <main style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1rem 4rem' }}>
      <nav style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', marginBottom: '1.5rem' }}>
        <Link href="/" style={{ color: 'rgba(255,255,255,0.45)' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: 'rgba(255,255,255,0.55)' }}>Editorial Policy</span>
      </nav>

      <h1 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 'clamp(2rem, 5vw, 3rem)', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>
        EDITORIAL POLICY
      </h1>
      <p style={{ marginBottom: '2rem', color: 'rgba(255,255,255,0.5)' }}>Last updated: August 10, 2026</p>

      <div style={{ color: 'rgba(255,255,255,0.65)', lineHeight: 1.8, fontSize: '1rem' }}>
        <p style={{ marginBottom: '1.5rem' }}>
          RinkStop publishes editorial content about hockey at every level — from professional leagues and the NHL draft to youth development, the business of the sport, and the growth of hockey in non-traditional markets. This page describes how we produce that content, how we verify it, and how we handle corrections.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Who writes for RinkStop</h2>
        <p style={{ marginBottom: '1.5rem' }}>
          Editorial content on RinkStop is produced by our editorial team and a roster of contracted writers who are identified by name on each article. Our editorial team is led by RinkStop&rsquo;s founders and includes coaches, scouts, and analysts with direct experience in the leagues and markets we cover. Bylines are not used for marketing copy, directory descriptions, or auto-generated summaries.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>How we select stories</h2>
        <p style={{ marginBottom: '1rem' }}>We publish stories that meet at least one of these criteria:</p>
        <ul style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li>Original reporting or first-person analysis of an event, trend, or person in hockey</li>
          <li>Evergreen reference material that helps a reader understand a hockey topic in depth</li>
          <li>Coverage of under-reported markets (youth, women&rsquo;s, international, non-traditional countries)</li>
          <li>Business, development, or cultural analysis that adds context beyond what league box scores and record</li>
        </ul>
        <p style={{ marginBottom: '1.5rem' }}>
          We do not publish articles generated purely to fill keyword gaps. Every published article has a named author, a stated purpose, and a record of sources.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>How we verify facts and statistics</h2>
        <p style={{ marginBottom: '1rem' }}>Every statistical claim in an editorial article is sourced. Typical sources include:</p>
        <ul style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li>Official league box scores and season statistics (NHL, AHL, KHL, PWHL, NCAA, IIHF, Hockey Canada, USA Hockey)</li>
          <li>On-record interviews conducted by RinkStop editorial staff</li>
          <li>Publicly available press releases and federation announcements</li>
          <li>Government statistics where appropriate (population, participation, facility counts)</li>
        </ul>
        <p style={{ marginBottom: '1.5rem' }}>
          Where a source is not directly attributable, we say so. When an estimate is an estimate, we label it as one.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>How we handle corrections</h2>
        <p style={{ marginBottom: '1rem' }}>
          If we publish an error, we correct it promptly and visibly. The process is:
        </p>
        <ol style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li>The article is updated to reflect the correct information.</li>
          <li>A short correction note is appended at the bottom of the article describing what changed and when.</li>
          <li>Material corrections are also reflected in the article&rsquo;s &ldquo;Last updated&rdquo; metadata.</li>
        </ol>
        <p style={{ marginBottom: '1.5rem' }}>
          We do not silently edit published stories in a way that misrepresents what was originally said. See our <Link href="/corrections" style={{ color: '#C8102E' }}>Corrections page</Link> for the public log and the correction-submission form.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>How we separate advertising from editorial</h2>
        <p style={{ marginBottom: '1.5rem' }}>
          Editorial articles are never written in exchange for payment, products, or any other consideration. Any advertising or sponsored content is clearly labeled and is kept out of the editorial workflow. Writers do not see the ad placements on their articles, and the ad operations team does not influence what writers cover or how they cover it.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Our AI-use policy</h2>
        <p style={{ marginBottom: '1rem' }}>
          RinkStop may use technology-assisted research and drafting tools during content production. Concretely:
        </p>
        <ul style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li>AI tools may be used to gather and organize source material, to suggest article outlines, or to assist with translation and copyediting.</li>
          <li>AI tools may not be used to publish a finished article without a named human author who is responsible for the content.</li>
          <li>All published editorial content is reviewed and edited by the RinkStop editorial team for accuracy, relevance, and originality before publication.</li>
          <li>AI-generated images are not used on editorial articles. Article images are sourced from official league feeds, public-domain archives, or commissioned photography.</li>
        </ul>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Fact-checking process</h2>
        <p style={{ marginBottom: '1rem' }}>
          Before an article is published, the author and at least one editor independently verify the load-bearing claims. For long-form analysis pieces, we additionally confirm any quoted material against the original source. The check covers:
        </p>
        <ul style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li>Numerical claims (box scores, rankings, financial figures)</li>
          <li>Quotations and on-the-record statements</li>
          <li>League rules, draft-eligibility rules, and federation policies</li>
          <li>Dates, venues, and event timing</li>
        </ul>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>How directory information is collected</h2>
        <p style={{ marginBottom: '1.5rem' }}>
          Directory listings (rinks, teams, players, leagues) come from public sources, federation records, league box-score archives, user submissions, and direct outreach to organizations. See our <Link href="/data-methodology" style={{ color: '#C8102E' }}>Data Methodology page</Link> for the full breakdown, including update cadence, verification status, and how to submit corrections.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Contact and corrections</h2>
        <p style={{ marginBottom: '1rem' }}>
          To suggest a correction, flag an error, or ask about our editorial process, contact <a href="mailto:editorial@rinkstop.com" style={{ color: '#C8102E' }}>editorial@rinkstop.com</a>. We aim to respond within five business days.
        </p>
      </div>
    </main>
  );
}