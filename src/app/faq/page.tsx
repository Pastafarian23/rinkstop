import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'FAQ | RinkStop',
  description: 'Frequently asked questions about RinkStop - the world\'s hockey directory. Find answers about listings, accounts, partnerships, and more.',
};

export default function FAQPage() {
  return (
    <main style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1rem 4rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1.5rem' }}>
        <Link href="/" style={{ color: '#555' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>FAQ</span>
      </nav>

      <h1 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 'clamp(2rem, 5vw, 3rem)', color: '#fff', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>
        FREQUENTLY ASKED QUESTIONS
      </h1>

      <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1.0625rem', lineHeight: 1.7, marginBottom: '2.5rem', maxWidth: '700px' }}>
        Everything you need to know about RinkStop. Can't find what you're looking for? <a href="mailto:support@rinkstop.com" style={{ color: '#C8102E' }}>Contact us</a>.
      </p>

      {/* Directory */}
      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#C8102E', letterSpacing: '0.04em', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ width: '40px', height: '40px', background: '#C8102E', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>📁</span>
          Directory & Listings
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[
            {
              q: "How do I add a hockey team, league, or rink to the directory?",
              a: "Click the 'Add Listing' button in the header or visit /add-listing. Fill out the form with your organization details and we'll review it within 1-2 business days."
            },
            {
              q: "How do I claim a listing for my team or organization?",
              a: "Navigate to the team or rink page and look for the 'Claim This Listing' button. You'll need to create a free account and verify your relationship to the organization."
            },
            {
              q: "Can I update or correct information in the directory?",
              a: "Yes! If you have a RinkStop account and own or manage a listing, you can update it directly from your dashboard. Otherwise, use the 'Suggest Edit' link on the listing page."
            },
            {
              q: "Is there a cost to list my team or organization?",
              a: "Basic listings are completely free. We also offer verified/profiles with enhanced features for a monthly fee."
            },
            {
              q: "How does the rink reviews system work?",
              a: "Any registered user can leave reviews for rinks. Reviews include ratings for ice quality, amenities, staff, and value. We moderate all reviews to keep them helpful and honest."
            },
          ].map((item, i) => (
            <details key={i} style={{ background: 'var(--s2)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <summary style={{ padding: '1rem 1.25rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.9375rem', color: '#fff', listStyle: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {item.q}
                <span style={{ color: '#C8102E', fontSize: '1.25rem', transition: 'transform 0.2s' }}>▸</span>
              </summary>
              <div style={{ padding: '0 1.25rem 1.25rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, fontSize: '0.9375rem' }}>
                {item.a}
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* Accounts */}
      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#C8102E', letterSpacing: '0.04em', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ width: '40px', height: '40px', background: '#C8102E', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>👤</span>
          Accounts & Dashboard
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[
            {
              q: "How do I create a RinkStop account?",
              a: "Click 'Sign Up Free' in the header or visit /sign-up. You can sign up with your email or use Google/Apple single sign-on for faster access."
            },
            {
              q: "What can I do in my dashboard?",
              a: "Your dashboard lets you manage your listings, track favorite teams/players, view your reviews, and access your support tickets. Managing your account is all done from /dashboard."
            },
            {
              q: "How do I save favorite teams and players?",
              a: "Browse to any team or player page and click the bookmark icon. Your saved items appear in your dashboard under 'Favorites' for quick access."
            },
            {
              q: "I forgot my password. How do I reset it?",
              a: "Click 'Sign In' then 'Forgot Password' and enter your email. We'll send you a link to create a new password. Check your spam folder if you don't see it within a few minutes."
            },
            {
              q: "How do I delete my account?",
              a: "Go to your dashboard profile settings and click 'Delete Account'. Note that this permanently removes your profile, saved favorites, and review history."
            },
          ].map((item, i) => (
            <details key={i} style={{ background: 'var(--s2)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <summary style={{ padding: '1rem 1.25rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.9375rem', color: '#fff', listStyle: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {item.q}
                <span style={{ color: '#C8102E', fontSize: '1.25rem', transition: 'transform 0.2s' }}>▸</span>
              </summary>
              <div style={{ padding: '0 1.25rem 1.25rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, fontSize: '0.9375rem' }}>
                {item.a}
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* Finding Hockey */}
      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#C8102E', letterSpacing: '0.04em', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ width: '40px', height: '40px', background: '#C8102E', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>🏒</span>
          Finding Hockey
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[
            {
              q: "How do I find hockey leagues or teams in my area?",
              a: "Use the directory at /directory or search directly for your city. You can filter by country, league type (youth, adult, professional), and more."
            },
            {
              q: "How do I find ice rinks near me?",
              a: "Go to /directory/rinks and browse by country or state. You can also use the search bar on the homepage to find rinks in any city."
            },
            {
              q: "I'm new to hockey. Where do I start?",
              a: "Check out our Youth Hockey section at /directory/youth-hockey. We have resources for beginners including 'Learn to Play' programs, what to expect at first practice, and how to find beginner-friendly leagues."
            },
            {
              q: "Can I track specific players or teams?",
              a: "Yes! Create a free account and use the bookmark/favorite button on any team or player page. You'll be able to track their progress and upcoming games from your dashboard."
            },
            {
              q: "Does RinkStop cover women's hockey?",
              a: "Absolutely. We include the PWHL, NCAA women's hockey, and other women's leagues alongside our coverage of men's hockey."
            },
          ].map((item, i) => (
            <details key={i} style={{ background: 'var(--s2)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <summary style={{ padding: '1rem 1.25rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.9375rem', color: '#fff', listStyle: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {item.q}
                <span style={{ color: '#C8102E', fontSize: '1.25rem', transition: 'transform 0.2s' }}>▸</span>
              </summary>
              <div style={{ padding: '0 1.25rem 1.25rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, fontSize: '0.9375rem' }}>
                {item.a}
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* Partnerships */}
      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#C8102E', letterSpacing: '0.04em', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ width: '40px', height: '40px', background: '#C8102E', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>🤝</span>
          Partnerships & Business
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[
            {
              q: "How can my league or team get featured on RinkStop?",
              a: "We regularly feature leagues and teams in our highlights section. Reach out to us at /partner or email support@rinkstop.com with your story and we'll consider adding you to our editorial coverage."
            },
            {
              q: "I'd like to advertise on RinkStop. Who do I contact?",
              a: "Visit /advertise for our advertising options. We offer banner ads, sponsored content, and partnership packages. Email us at support@rinkstop.com with your goals and we'll put together a custom proposal."
            },
            {
              q: "Can I integrate my hockey organization's data with RinkStop?",
              a: "We're always looking to expand our data partnerships. If you represent a league, federation, or data provider, contact us at support@rinkstop.com to discuss integration opportunities."
            },
            {
              q: "Do you offer API access to your directory data?",
              a: "API access is available for verified partners. Contact us at support@rinkstop.com with details about your use case and we'll discuss options."
            },
          ].map((item, i) => (
            <details key={i} style={{ background: 'var(--s2)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <summary style={{ padding: '1rem 1.25rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.9375rem', color: '#fff', listStyle: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {item.q}
                <span style={{ color: '#C8102E', fontSize: '1.25rem', transition: 'transform 0.2s' }}>▸</span>
              </summary>
              <div style={{ padding: '0 1.25rem 1.25rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, fontSize: '0.9375rem' }}>
                {item.a}
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* Technical */}
      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#C8102E', letterSpacing: '0.04em', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ width: '40px', height: '40px', background: '#C8102E', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>⚙️</span>
          Technical & Account Support
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[
            {
              q: "The site isn't loading correctly for me. What should I do?",
              a: "First, try clearing your browser cache and refreshing. If the issue persists, let us know at support@rinkstop.com with details about your browser and device, and we'll investigate."
            },
            {
              q: "I found a bug or error on the site. How do I report it?",
              a: "We appreciate bug reports! Email support@rinkstop.com with the page URL, what you were trying to do, and a description of the issue. Screenshots are helpful but not required."
            },
            {
              q: "How do I contact RinkStop support?",
              a: "The fastest way is email: support@rinkstop.com. We respond to all inquiries within 1-2 business days. You can also use the contact form at /contact."
            },
            {
              q: "Is there a mobile app for RinkStop?",
              a: "Not yet, but the site is fully mobile-responsive and works great on phones and tablets. Download our progressive web app (PWA) for an app-like experience on your home screen."
            },
          ].map((item, i) => (
            <details key={i} style={{ background: 'var(--s2)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <summary style={{ padding: '1rem 1.25rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.9375rem', color: '#fff', listStyle: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {item.q}
                <span style={{ color: '#C8102E', fontSize: '1.25rem', transition: 'transform 0.2s' }}>▸</span>
              </summary>
              <div style={{ padding: '0 1.25rem 1.25rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, fontSize: '0.9375rem' }}>
                {item.a}
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* Contact CTA */}
      <section style={{ background: 'var(--s2)', padding: '2rem', borderRadius: '12px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.06)' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.75rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>
          STILL HAVE QUESTIONS?
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '1.25rem', fontSize: '1rem' }}>
          We're here to help. Send us an email and we'll get back to you within 1-2 business days.
        </p>
        <a href="mailto:support@rinkstop.com" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', background: '#C8102E', color: '#fff', fontWeight: 700, borderRadius: '6px', textDecoration: 'none', fontSize: '0.9375rem' }}>
          ✉️ Email Support
        </a>
      </section>
    </main>
  );
}