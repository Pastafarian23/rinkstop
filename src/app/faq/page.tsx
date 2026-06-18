import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'FAQ',
  description: 'Frequently asked questions about RinkStop - the world\'s hockey directory. Find answers about accounts, listings, memberships, claims, and more.',
  alternates: { canonical: 'https://rinkstop.com/faq' },
  openGraph: {
    title: 'FAQ',
    description: 'Accounts, listings, memberships, claims, and more - everything you need to know about RinkStop.',
    url: 'https://rinkstop.com/faq',
    siteName: 'RinkStop',
    images: [{ url: 'https://rinkstop.com/og-image.png', width: 1200, height: 630 }],
  },
};

// All Q&A content is defined here as data so we can render it both as visible
// <details> accordions AND as a JSON-LD FAQPage schema (for Google rich results).
// Every answer is verified against the live code as of 2026-06-11.

type QA = { q: string; a: string };

const sections: Array<{
  id: string;
  title: string;
  icon: string;
  qa: QA[];
}> = [
  {
    id: 'accounts',
    title: 'Accounts & Sign-In',
    icon: '👤',
    qa: [
      {
        q: 'How do I create a RinkStop account?',
        a: 'Click "Sign Up" in the header or go to /sign-up. Enter your email, choose a password, and verify your email with a one-time code. After verification, you land in your dashboard at /dashboard. There is no Google or Apple single-sign-on option at this time - email + password is the only sign-in method.',
      },
      {
        q: 'I forgot my password. How do I reset it?',
        a: 'On the sign-in page at /login, click "Forgot password?" and enter your email. Clerk will send a password-reset link to your inbox. The link is valid for one hour. If you do not see the email, check your spam folder.',
      },
      {
        q: 'How do I change my email, name, or profile photo?',
        a: 'Open your dashboard and click the round avatar in the top-right corner (Clerk UserButton). From there you can change your first name, last name, email, password, and profile photo. These are managed by Clerk, our authentication provider - changes propagate within a few seconds.',
      },
      {
        q: 'What is a "public profile" and where does it live?',
        a: 'Every RinkStop account has a public profile page at /profile/[username]. You choose your own username during sign-up (e.g., /profile/rinkstophelper). Other users can see your display name, avatar, bio, location, and membership tier. Tiers are shown as text pills (Free / Starter / Pro / Premium / Enterprise). An identity-verified checkmark — a navy-and-gold mark separate from your tier — means the account holder has verified their government ID through RinkStop. Founding Members get a special badge. You control what appears in your bio and location; avatar and name are set via the Clerk UserButton.',
      },
      {
        q: 'What are the username rules?',
        a: 'Usernames must be 1–30 characters, lowercase letters and numbers only (a–z, 0–9), with optional periods and underscores. Dashes, spaces, and special characters are not allowed. All usernames are case-insensitive — /profile/CoachSmith and /profile/coachsmith go to the same page. You can change your username once every 14 days; the old username is held for 14 days before becoming available again. A number of slugs are reserved: system routes (/admin, /dashboard, /login, etc.), brand terms (rinkstop, hockey, ice, rink, puck), and account-type words (team, league, player, coach, referee).',
      },
      {
        q: 'What is the username review queue?',
        a: 'When you sign up, your username passes through three automated checks. Layer 1 validates the format (allowed characters, length, no reserved slugs). Layer 2 flags any username starting with a brand-protected prefix (e.g. rinkstop, kiloclaw) for human review — the account is created but the username is held until an admin approves or rejects it. Layer 3 checks against a profanity and inappropriate-word list; matches are either hard-blocked (clear slurs, auto-rejected with a polite message) or soft-queued (borderline terms, reviewed by an admin). You are notified by email once your username is decided. If you believe your username was rejected in error, contact support@rinkstop.com.',
      },
      {
        q: 'How do I edit my bio and location?',
        a: 'Go to /dashboard/profile. Bio and location are editable in the form on that page. First name, last name, email, and avatar are edited through the Clerk UserButton (the round avatar at the top-right of the dashboard).',
      },
      {
        q: 'How do I delete my account?',
        a: 'Email support@rinkstop.com from the email address on your account and ask for account deletion. We will permanently remove your profile, saved favorites, reviews, claims, and connections within 5 business days. Your public profile page (/profile/username) will return 404 after deletion. Listings you claimed are released back to unclaimed status.',
      },
      {
        q: 'What is identity verification and how does it work?',
        a: 'Identity verification (a government ID + selfie check) confirms that your RinkStop account belongs to a real person. It is separate from your membership tier — you can be verified at any paid tier (Starter, Pro, Premium, or Enterprise). Once verified, your public profile shows a navy-and-gold checkmark, distinct from your tier pill. The verification uses a government ID document and a live selfie, processed by our vendor Didit. The check is valid for two years before a re-verification is prompted. Starter members and above can start the process at /dashboard/identity.',
      },
      {
        q: 'Why would I verify my identity?',
        a: 'Verification is required to hold certain roles on RinkStop — including coach, referee, scorekeeper, team manager, rink operator, and federation admin — because those roles involve youth hockey, financial transactions, or organizational trust. Even when not required for a role, verification builds credibility: other users, league admins, and clients see the checkmark and know you are a real, identified person.',
      },
      {
        q: 'I never got my email verification code. What do I do?',
        a: 'Check spam/junk. If still nothing, sign in at /login with your email and password - you can request a new code from the verification screen, or choose the "Email me a link" option instead. If both fail, contact support@rinkstop.com.',
      },
    ],
  },
  {
    id: 'memberships',
    title: 'Memberships & Billing',
    icon: '⭐',
    qa: [
      {
        q: 'What membership tiers are available?',
        a: 'Five tiers. Free ($0) lets you browse the directory, save up to 3 listings, and follow up to 3 teams or players. Starter ($19.99/year) adds unlimited saves and follows, a Founding Member badge (first 500 only), a weekly digest, and the ability to claim 1 listing with a lead-capture form on the profile. Pro ($59.99/year) adds up to 5 claimed listings, each with its own lead-capture form, a public profile page, DM access with other Pro+ users, and above-search-result placement. Premium ($299/year) is for rinks, teams, and leagues that need more scale - it adds a Featured Listing rotation in your city, up to 25 claims, bulk claim, and an analytics dashboard. Enterprise is custom for organizations that need more than 25 claims. Lead capture is included on every claimed listing regardless of tier. Identity verification (a government ID + selfie check) is a separate opt-in flow available to Starter members and above — it is not tied to your tier level, it is its own action you take once. See /dashboard/identity to start the process. Verified accounts show a navy-and-gold checkmark on their public profile.',
      },
      {
        q: 'How do I upgrade from Free to a paid tier?',
        a: 'Go to /pricing, pick the tier you want, and click the button. You will be sent to Stripe Checkout to enter your card. After payment, you land back in your dashboard and your new tier is active immediately. If you are not signed in, you will be prompted to sign up first.',
      },
      {
        q: 'How do I view my invoices or update my payment method?',
        a: 'Go to /dashboard/subscription and click "Manage billing". This opens a Stripe Customer Portal session where you can view PDF invoices, update your card, and see your billing history.',
      },
      {
        q: 'How do I cancel or change my plan?',
        a: 'Email support@rinkstop.com. We respond within 24 hours. We intentionally do not bury a cancel button in your account - we want to understand what we could have done better before you leave. Your benefits stay active through the end of the period you paid for, and we will not auto-renew.',
      },
      {
        q: 'Can I upgrade mid-year?',
        a: 'Yes. Upgrades (Free to Starter, Starter to Pro, Pro to Premium) take effect immediately and the unused portion of your current plan is credited toward the new one. Go to /pricing and pick the higher tier - the checkout flow handles proration automatically.',
      },
      {
        q: 'What is the Founding Member badge?',
        a: 'The first 500 paying members (any paid tier) get a permanent Founding Member badge on their profile. After 500, the tier stays available, but the badge does not come back. The badge marks the people who backed the site early.',
      },
      {
        q: 'Is there a free trial?',
        a: 'No. There is a permanent Free tier that includes most browsing features. If you want to try a paid feature, sign up for Starter - it is $19.99/year and you can cancel anytime by emailing support.',
      },
    ],
  },
  {
    id: 'listings-claims',
    title: 'Listings & Claims',
    icon: '📁',
    qa: [
      {
        q: 'How do I add a team, player, rink, or league that is missing?',
        a: 'Go to /add-listing. Pick the listing type (Team, Player, Rink, League, Tournament, or Other), fill in the name, city, country, website, and a brief description, and submit. You do not need an account to submit a listing. We review submissions within 1-2 business days and email you at the address you provided.',
      },
      {
        q: 'How do I claim a listing I own or manage?',
        a: 'Sign in and go to /dashboard/claims. Pick the type (rink, team, or player), enter the entity name and the URL/ID, and tell us why you are the right person to manage it. Include proof (a link to your official site, a league directory listing, or a screenshot of an admin panel). We review claims within 1-2 business days.',
      },
      {
        q: 'Who can claim a listing?',
        a: 'Starter tier members can claim 1 listing. Pro tier members can claim up to 5 listings — enough for a personal scope (your home rink, your kid’s team, your beer-league squad). Premium tier members can claim up to 25 listings, plus bulk claim for orgs that run multiple rinks, teams, or leagues. Enterprise is custom for leagues, brands, federations, or organizations that need more than 25 claims. Free accounts can browse the directory and submit new listings, but cannot claim existing ones. Parents of youth players can claim their kid\'s profile through the "I am this player\'s parent" button on the player page.',
      },
      {
        q: 'I run a rink, team, or league. Which tier is right for me?',
        a: 'Premium is built for you if you need up to 25 claims, want featured placement at the top of your city\'s directory on every page load, or need bulk claim to claim every team in your league in one request. Enterprise is the right fit for organizations that need more than 25 claims. Lead capture is included on every claimed listing regardless of tier, so a single-rink Starter ($19.99/yr) gets the same lead pipeline as a 25-listing Premium. The analytics dashboard is included on Premium and Enterprise. If you need more than 25 claims, Enterprise is the right fit.',
      },
      {
        q: 'I am a parent. Can I manage my kid\'s profile?',
        a: 'Yes. On your kid\'s player profile page, click "I am this player\'s parent" and submit the form. The kid\'s profile shows "Managed by [your name]". All messages sent to the kid route to your inbox, with the kid\'s name and stats visible in the thread. One parent account can manage multiple kids.',
      },
      {
        q: 'Can I update hours, contacts, and socials for a listing I claimed?',
        a: 'Yes. Starter tier includes 1 claimed listing with editable details. Pro tier includes up to 5 claimed listings. Premium includes up to 25 claimed listings, all editable from your dashboard. Enterprise covers larger organizations. Rink hours, contact email/phone, website, and social handles are all updatable.',
      },
      {
        q: 'How long does listing review take?',
        a: 'New listing submissions: 1-2 business days. Claim requests: 1-2 business days. Both go to our team via internal notifications and email; you will hear back at the address you submitted with.',
      },
      {
        q: 'What if my listing was rejected?',
        a: 'Email support@rinkstop.com with the listing ID (it appears in your submission confirmation). We will tell you why it was rejected and what to change. Most rejections are for duplicate entries or insufficient information.',
      },
    ],
  },
  {
    id: 'directory',
    title: 'Using the Directory',
    icon: '🏒',
    qa: [
      {
        q: 'How do I find hockey leagues or teams near me?',
        a: 'Go to /directory and pick your country, or search by city. You can filter by league type (youth, adult, professional, recreational) and by tier (house, B, A, AA, AAA in the US; Novice through Midget in Canada).',
      },
      {
        q: 'How do I find ice rinks near me?',
        a: 'Go to /directory/rinks and browse by country or state. Each rink has a page with address, hours, amenities, reviews, and a map. The home page also has a "Find rinks near me" search bar.',
      },
      {
        q: 'How do I save a team, player, or rink?',
        a: 'Sign in, then click the bookmark icon on any team, player, or rink page. The item shows up in /dashboard/favorites. Free users can save up to 3; Starter and above can save unlimited.',
      },
      {
        q: 'How do rink reviews work?',
        a: 'Any signed-in user can leave a review on a rink page. Reviews include a 1-5 star rating and a text review. We moderate all reviews for spam, profanity, and personal attacks before they go public. You can see your own pending and published reviews at /dashboard/reviews.',
      },
      {
        q: 'Does RinkStop cover women\'s hockey?',
        a: 'Yes. We include the PWHL, NCAA women\'s hockey, IIHF Women\'s World Championship, and other women\'s leagues alongside our coverage of men\'s hockey. The directory filter has a "women\'s" option in the league-type dropdown.',
      },
      {
        q: 'Does RinkStop cover international hockey?',
        a: 'Yes. We cover 41+ countries and growing. The /directory landing page has a country selector. Coverage is deepest in North America and Europe; we are actively expanding to Asia, Oceania, and South America.',
      },
      {
        q: 'I am new to hockey. Where should I start?',
        a: 'Read our /guides section, starting with the "How to Fit Hockey Equipment" guide (separate versions for parents and adult players). Then visit /directory/youth-hockey for "Learn to Play" programs in your area, or /learn for adult beginner resources.',
      },
    ],
  },
  {
    id: 'messaging',
    title: 'Messaging & Connections',
    icon: '💬',
    qa: [
      {
        q: 'How do I send a direct message (DM) to another user?',
        a: 'Pro, Premium, and Enterprise tier members can DM each other. Free and Starter tiers can read messages but cannot initiate new conversations. On any user\'s public profile page, click "Send connection request". Once they accept, you can message them from /dashboard/messages.',
      },
      {
        q: 'Why do I need a Pro tier to DM?',
        a: 'Identity. Anyone can sign up for Free and browse listings, but DMs require a paid tier (Pro or higher) so the person on the other end knows they are dealing with a real account, not a throwaway. Pro, Premium, and Enterprise tiers can all DM.',
      },
      {
        q: 'How do connection requests work?',
        a: 'Send a request from a user\'s profile page. They get a notification in /dashboard/connections and can accept or decline. Accepted connections unlock a DM thread. You can see incoming, outgoing, and accepted connections in /dashboard/connections.',
      },
      {
        q: 'Can I block someone?',
        a: 'Yes. Open a thread with that person in /dashboard/messages, click the menu, and choose "Block". They will not be able to send you new messages or connection requests. The block is one-sided and silent - they are not notified.',
      },
      {
        q: 'Can I DM as my kid\'s parent?',
        a: 'Yes. The parent\'s account sends the DM; the kid\'s profile is the context. Coaches and scouts see the kid\'s name and stats in the thread, with the parent\'s name in the from-line. This is how youth recruiting conversations work on RinkStop.',
      },
    ],
  },
  {
    id: 'business',
    title: 'Partnerships & Business',
    icon: '🤝',
    qa: [
      {
        q: 'How can my league or team get featured on RinkStop?',
        a: 'Reach out at /partner or email support@rinkstop.com with your story. Premium tier members get automatic Featured Listing rotation in their city. Non-Premium members can be considered for editorial coverage in /highlights.',
      },
      {
        q: 'How do I advertise on RinkStop?',
        a: 'Visit /advertise for our current ad products, or email support@rinkstop.com with your goals. We offer banner placements, sponsored guides, and partner packages. We do not run intrusive popups or take-over ads.',
      },
      {
        q: 'Do you offer API access to your directory data?',
        a: 'Read-only API access is available for verified partners. Email support@rinkstop.com with your use case. We do not currently offer a public/self-serve API.',
      },
      {
        q: 'How do I report incorrect information on a listing?',
        a: 'Open a support ticket at /dashboard/support with subject "Report incorrect information", include the listing URL, and tell us what is wrong. We will fix verified errors within 1-2 business days.',
      },
    ],
  },
  {
    id: 'technical',
    title: 'Technical Support',
    icon: '⚙️',
    qa: [
      {
        q: 'The site is not loading correctly. What should I try first?',
        a: 'Hard refresh (Ctrl+Shift+R on Windows/Linux, Cmd+Shift+R on Mac) to bypass cache. If the issue persists, try a different browser or device. If it still does not work, open a support ticket at /dashboard/support with the page URL, your browser, and your device.',
      },
      {
        q: 'I found a bug. How do I report it?',
        a: 'Open a support ticket at /dashboard/support with subject "Report a bug". Include the page URL, what you were doing, what you expected to happen, and what actually happened. Screenshots are very helpful.',
      },
      {
        q: 'Is there a mobile app?',
        a: 'Not yet. RinkStop is a mobile-responsive website that works on phones and tablets. Native iOS and Android apps are on the roadmap. There is no PWA install option at this time.',
      },
      {
        q: 'How do I use the Hockey Cost Calculator?',
        a: 'The Hockey Cost Calculator at /tools/hockey-cost-calculator estimates how much hockey costs per year in the United States. Enter the player\'s age, your state, and hockey level (House/Rec, Travel A/AA, or AAA), and the calculator returns a breakdown covering registration fees, equipment, ice time, tournaments, travel, and other costs — all based on 2026 data. No sign-up is required. The calculator is free to use and the results are shareable.',
      },
      {
        q: 'How do I find out if a rink, team, or league is already on RinkStop?',
        a: 'Use the search bar on the homepage or go to /claim-your-listing and type the name. If the listing appears, it\'s already in our directory. If it does not appear, you can submit a new listing from /add-listing or claim it once you have a Starter or higher membership.',
      },
      {
        q: 'How do I delete a review I left?',
        a: 'Email support@rinkstop.com with the review text and the rink it was on. We will remove it within 1-2 business days.',
      },
      {
        q: 'How do I contact support?',
        a: 'Email support@rinkstop.com for all questions. You can also open a ticket in-app at /dashboard/support. We respond within 1-2 business days for general questions and within 24 hours for paid-tier members.',
      },
    ],
  },
];

// Flatten QAs for JSON-LD
const allQAs = sections.flatMap(s => s.qa);

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

      <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1.0625rem', lineHeight: 1.7, marginBottom: '1.5rem', maxWidth: '700px' }}>
        Everything you need to know about RinkStop. Can&apos;t find what you&apos;re looking for?{' '}
        <a href="mailto:support@rinkstop.com" style={{ color: '#C8102E' }}>Contact us</a>.
      </p>

      {/* Quick jump links to each section */}
      <nav aria-label="FAQ sections" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '2.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {sections.map(s => (
          <a
            key={s.id}
            href={`#${s.id}`}
            style={{ padding: '0.4rem 0.85rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '999px', color: 'rgba(255,255,255,0.7)', fontSize: '0.8125rem', textDecoration: 'none' }}
          >
            {s.icon} {s.title}
          </a>
        ))}
      </nav>

      {sections.map(section => (
        <section key={section.id} id={section.id} style={{ marginBottom: '3rem', scrollMarginTop: '1rem' }}>
          <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#C8102E', letterSpacing: '0.04em', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ width: '40px', height: '40px', background: '#C8102E', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>{section.icon}</span>
            {section.title}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {section.qa.map((item, i) => (
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
      ))}

      {/* Contact CTA */}
      <section style={{ background: 'var(--s2)', padding: '2rem', borderRadius: '12px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.06)' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.75rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>
          STILL HAVE QUESTIONS?
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '1.25rem', fontSize: '1rem' }}>
          We&apos;re here to help. Send us an email and we&apos;ll get back to you within 1-2 business days.
        </p>
        <a href="mailto:support@rinkstop.com" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', background: '#C8102E', color: '#fff', fontWeight: 700, borderRadius: '6px', textDecoration: 'none', fontSize: '0.9375rem' }}>
          ✉️ Email Support
        </a>
      </section>

      {/* JSON-LD FAQPage schema for Google rich results */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            name: 'RinkStop FAQ',
            url: 'https://rinkstop.com/faq',
            mainEntity: allQAs.map(({ q, a }) => ({
              '@type': 'Question',
              name: q,
              acceptedAnswer: {
                '@type': 'Answer',
                text: a,
              },
            })),
          }),
        }}
      />
    </main>
  );
}
