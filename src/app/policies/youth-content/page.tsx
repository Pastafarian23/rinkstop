import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Youth Content Policy — RinkStop',
  description: 'How RinkStop handles hockey content involving minors. Our COPPA and Treating Families as Third Parties compliance, what youth content we publish, how parent claims work, and how to request removal.',
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://rinkstop.com/policies/youth-content' },
};

export default function YouthContentPolicyPage() {
  return (
    <main style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1rem 4rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1.5rem' }}>
        <Link href="/" style={{ color: '#555' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/policies" style={{ color: '#555' }}>Policies</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>Youth Content</span>
      </nav>

      <h1 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 'clamp(2rem, 5vw, 3rem)', color: '#041E42', letterSpacing: '0.04em', marginBottom: '1rem' }}>
        YOUTH CONTENT POLICY
      </h1>
      <p style={{ marginBottom: '2rem', color: '#444' }}>Last updated: August 11, 2026</p>

      <div style={{ color: '#1a1a1a', lineHeight: 1.8, fontSize: '1rem' }}>
        <p style={{ marginBottom: '1.5rem' }}>
          RinkStop publishes hockey content about players, coaches, and organizations across every age level — including youth and adolescent hockey. This page explains how we handle content that involves minors, the regulatory frameworks we work within, and the controls available to parents and guardians.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Our compliance frameworks</h2>
        <p style={{ marginBottom: '1rem' }}>RinkStop treats content involving minors under two complementary standards:</p>
        <ul style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li><strong>COPPA</strong> (Children&rsquo;s Online Privacy Protection Act, U.S.) — governs the collection of personal information from children under 13.</li>
          <li><strong>TFAT</strong> (Treating Families as Third Parties, U.K. ICO age-appropriate design code) — broader framework for handling data and content involving minors, not limited to under-13s.</li>
        </ul>
        <p style={{ marginBottom: '1.5rem' }}>
          We apply both standards globally, regardless of where the child or the user is located. The TFAT framework in particular informs how we design features, defaults, and disclosure surfaces that may involve a minor or a minor&rsquo;s parent.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>What youth content we publish</h2>
        <p style={{ marginBottom: '1rem' }}>RinkStop publishes two types of content that may involve minors:</p>
        <ul style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li><strong>Public directory listings</strong> — youth teams, youth leagues, and youth tournaments that publish rosters and schedules through their own federations and websites.</li>
          <li><strong>Editorial coverage</strong> — news, analysis, and how-to guides about youth hockey development, often covering well-known tournaments, development models, and parent-facing topics.</li>
        </ul>
        <p style={{ marginBottom: '1.5rem' }}>
          We do not publish personal contact information, home addresses, school affiliations, or sensitive biographical details about individual minors. Where individual player names appear in directory listings, they are limited to first name, last initial, jersey number, position, and team — the same scope used by most youth league public rosters.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Advertising on youth content</h2>
        <p style={{ marginBottom: '1.5rem' }}>
          RinkStop&rsquo;s youth-facing pages (<Link href="/directory/youth-hockey" style={{ color: '#C8102E' }}>/directory/youth-hockey</Link>, <Link href="/guides/youth" style={{ color: '#C8102E' }}>/guides/youth</Link>) are excluded from ad placement. This is a deliberate policy choice, not a technical limitation. We do not run contextual or personalized advertising against pages whose primary audience is parents or minors, and we do not use remarketing audiences derived from visits to those pages.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Parent and guardian claims</h2>
        <p style={{ marginBottom: '1rem' }}>Parents and guardians can claim a minor&rsquo;s player profile on RinkStop using the standard claim flow:</p>
        <ol style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li>Sign in or create a free account.</li>
          <li>Open the player profile and choose &ldquo;Claim this listing.&rdquo;</li>
          <li>Indicate that this is a parent-managed claim for a minor.</li>
          <li>Verify relationship to the minor via the verification flow.</li>
        </ol>
        <p style={{ marginBottom: '1.5rem' }}>
          Parent-managed claims bypass the standard claim cap (one claim per free tier) so that a parent can claim their child&rsquo;s profile without consuming their own claim allocation. Once a parent claim is approved, the parent controls what appears on the player profile — including the option to limit the profile to first name and last initial only, or to request full takedown.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Removal and takedown</h2>
        <p style={{ marginBottom: '1.5rem' }}>
          A parent or guardian can request removal or redaction of any content involving their child — including directory listings, photos, editorial mentions, and any other surface — by contacting <a href="mailto:youth-content@rinkstop.com" style={{ color: '#C8102E' }}>youth-content@rinkstop.com</a>. We honor these requests within five business days. Takedown is permanent; redaction is permanent unless the parent later requests that the content be restored.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>What we don&rsquo;t do</h2>
        <ul style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li>We do not collect email addresses, phone numbers, or other direct contact info from users we know to be under 13.</li>
          <li>We do not run ad campaigns, retargeting, or lookalike audiences based on visits to youth-content pages.</li>
          <li>We do not profile minors for behavioral advertising purposes under any circumstance.</li>
          <li>We do not publish home addresses, school names, or specific birth dates for individual minors.</li>
          <li>We do not solicit or display user-uploaded photos of identifiable minors without a parent claim in place.</li>
        </ul>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Data retention</h2>
        <p style={{ marginBottom: '1.5rem' }}>
          Directory records for youth teams, leagues, and tournaments are retained as long as the underlying organization exists in the public record and the listing meets our quality thresholds. Editorial articles remain published unless corrected or removed through our standard <Link href="/corrections" style={{ color: '#C8102E' }}>corrections process</Link>. When a parent request leads to takedown of a player profile, the record is removed from active surface and from search results within five business days; the row is retained in our audit log only for as long as needed to demonstrate compliance.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>How this policy fits with the rest of our policies</h2>
        <p style={{ marginBottom: '1rem' }}>This page is one of a set. For related reading:</p>
        <ul style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li><Link href="/privacy" style={{ color: '#C8102E' }}>Privacy Policy</Link> — full data-handling disclosure.</li>
          <li><Link href="/cookies" style={{ color: '#C8102E' }}>Cookie Policy</Link> — what cookies and trackers RinkStop uses.</li>
          <li><Link href="/data-methodology" style={{ color: '#C8102E' }}>Data Methodology</Link> — how directory information is sourced, verified, and updated.</li>
          <li><Link href="/editorial-policy" style={{ color: '#C8102E' }}>Editorial Policy</Link> — how we produce, fact-check, and correct editorial content.</li>
          <li><Link href="/corrections" style={{ color: '#C8102E' }}>Corrections</Link> — public log and submission form.</li>
        </ul>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Contact</h2>
        <p style={{ marginBottom: '1rem' }}>
          To exercise any of the controls described on this page, to ask a question about how a specific piece of content is handled, or to report a concern about youth content on RinkStop, contact <a href="mailto:youth-content@rinkstop.com" style={{ color: '#C8102E' }}>youth-content@rinkstop.com</a>. We aim to respond within five business days, and sooner for takedown requests.
        </p>
      </div>
    </main>
  );
}
