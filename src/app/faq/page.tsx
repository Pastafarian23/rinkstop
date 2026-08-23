import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'FAQ',
  description: 'Frequently asked questions about RinkStop - the world\'s hockey directory. Accounts, listings, memberships, claims, hockey passports, family hub, stamps & QR codes, referee tools, and more.',
  alternates: { canonical: 'https://rinkstop.com/faq' },
  openGraph: {
    title: 'FAQ',
    description: 'Accounts, listings, memberships, claims, hockey passports, family hub, stamps & QR codes, referee tools, and more.',
    url: 'https://rinkstop.com/faq',
    siteName: 'RinkStop',
    images: [{ url: 'https://rinkstop.com/og-image.png', width: 1200, height: 630 }],
  },
};

// All Q&A content is defined here as data so we can render it both as visible
// <details> accordions AND as a JSON-LD FAQPage schema (for Google rich results).
// Every answer is verified against the live code as of 2026-07-10.

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
        a: 'Every RinkStop account has a public profile page at /profile/[username]. You choose your own username during sign-up (e.g., /profile/rinkstophelper). Other users can see your display name, avatar, bio, location, and membership tier. Tiers are shown as text pills (Free / Verified Identity / Identity Plus / Club Starter / Club Pro / Club Elite / League / Federation / Business Listing / Business Plus). An identity-verified checkmark - a navy-and-gold mark separate from your tier - means the account holder has verified their government ID through RinkStop. Founding Members get a special badge. You control what appears in your bio and location; avatar and name are set via the Clerk UserButton.',
      },
      {
        q: 'What are the username rules?',
        a: 'Usernames must be 1-30 characters, lowercase letters and numbers only (a-z, 0-9), with optional periods and underscores. Dashes, spaces, and special characters are not allowed. All usernames are case-insensitive - /profile/CoachSmith and /profile/coachsmith go to the same page. You can change your username once every 14 days; the old username is held for 14 days before becoming available again. A number of slugs are reserved: system routes (/admin, /dashboard, /login, etc.), brand terms (rinkstop, hockey, ice, rink, puck), and account-type words (team, league, player, coach, referee).',
      },
      {
        q: 'What is the username review queue?',
        a: 'When you sign up, your username passes through three automated checks. Layer 1 validates the format (allowed characters, length, no reserved slugs). Layer 2 flags any username starting with a brand-protected prefix (e.g. rinkstop, kiloclaw) for human review - the account is created but the username is held until an admin approves or rejects it. Layer 3 checks against a profanity and inappropriate-word list; matches are either hard-blocked (clear slurs, auto-rejected with a polite message) or soft-queued (borderline terms, reviewed by an admin). You are notified by email once your username is decided. If you believe your username was rejected in error, contact support@rinkstop.com.',
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
        a: 'Identity verification (a government ID + selfie check) confirms that your RinkStop account belongs to a real person. It is free for every profile type — players, parents, coaches, scouts, officials, rink owners, team managers, and league admins. Once verified, your public profile shows a navy-and-gold checkmark, distinct from your tier pill. The check is valid for two years before a re-verification is prompted. Start the process from /dashboard/identity; it takes about 60 seconds.',
      },
      {
        q: 'Why would I verify my identity?',
        a: 'Verification is free and gives your public profile a navy-and-gold checkmark that signals to coaches, league admins, parents, and fellow players that you are a real, identified person. Verified listings get more clicks in search results and more profile visits. For owners claiming rinks, teams, or leagues, verification turns your listing from "claimed but unverified" into "verified owner" — the public signal that the listing is accurate and you’re behind it.',
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
        a: 'RinkStop has ten tiers across three groups: Individuals (Free, Verified Identity, Identity Plus), Organizations (Club Starter, Club Pro, Club Elite, League, Federation), and Businesses (Business Listing, Business Plus). The first 500 paid members get a permanent Founding Member badge. See the full tier table with caps, features, and pricing at /pricing.',
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
        a: 'Yes. Upgrades take effect immediately and the unused portion of your current plan is credited toward the new one. Go to /pricing and pick the higher tier - the checkout flow handles proration automatically.',
      },
      {
        q: 'What is the Founding Member badge?',
        a: 'The first 500 paying members (any paid tier) get a permanent Founding Member badge on their profile. After 500, the tier stays available, but the badge does not come back. The badge marks the people who backed the site early.',
      },
      {
        q: 'Is there a free trial?',
        a: 'No. There is a permanent Free tier that includes most browsing features. If you want to try a paid feature, sign up for Verified Identity - it is $24.99/year and you can cancel anytime by emailing support.',
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
        a: 'Anyone with a RinkStop account can claim one listing for free — players, parents, coaches, rink owners, team managers, and league admins. Free verification is included: complete a 60-second government ID + selfie check to add a Verified owner badge to your listing. Higher paid tiers unlock more claims and business/club features (lead capture, roster management, dues, etc.). Parents of youth players can claim their kid\'s profile through the "I am this player\'s parent" button on the player page. See exact caps per tier at /pricing.',
      },
      {
        q: 'Are NHL / AHL / KHL / PWHL players and teams claimable?',
        a: 'No. The four unambiguously professional leagues (NHL, AHL, KHL, PWHL) and their players, coaches, staff, and teams are managed by the league itself, not user-claimed. Their profiles on RinkStop are curated from verified league data feeds and show a "Verified" badge. CHL major-junior (WHL/OHL/QMJHL), NCAA (D1/D2/D3), USHL, NAHL, ECHL, IIHF, and every amateur/youth/community league stay claimable — any player or team member on those can claim their own profile.',
      },
      {
        q: 'I run a rink, team, or league. Which tier is right for me?',
        a: 'Club Starter covers one small club with up to 30 players. Club Pro covers up to 150 players with multiple teams. Club Elite covers unlimited teams with advanced analytics and custom branding. Federation is custom for organizations larger than that. Lead capture is included on every claimed listing regardless of tier. See the full comparison at /pricing.',
      },
      {
        q: 'I am a parent. Can I manage my kid\'s profile?',
        a: 'Yes. On your kid\'s player profile page, click "I am this player\'s parent" and submit the form. The kid\'s profile shows "Managed by [your name]." You can manage the kid\'s team history, season stats, federation numbers, and track coach verifications and endorsements from your account. All messages sent to the kid route to your inbox. One parent account can manage multiple kids.',
      },
      {
        q: 'Can I update hours, contacts, and socials for a listing I claimed?',
        a: 'Yes. Rink hours, contact email/phone, website, and social handles are all updatable from your dashboard once a listing is claimed. The number of listings you can claim depends on your tier — see /pricing for the full breakdown.',
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
        a: 'Sign in, then click the bookmark icon on any team, player, or rink page. The item shows up in /dashboard/favorites. Free users can save unlimited favorites and follow unlimited teams or players.',
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
    id: 'passport',
    title: 'Hockey Passport & Coach Verification',
    icon: '📋',
    qa: [
      {
        q: 'What is a hockey passport?',
        a: 'Your hockey passport is a verified record of your hockey career on RinkStop. It appears on your public profile at /profile/[username] and shows team history, per-season stats, federation registration numbers (USA Hockey, Hockey Canada), coach endorsements, and coach verifications. Self-reported rows start as "self-reported." Once a coach verifies a row, it flips to "coach-verified" with the coach\'s name and verification date. Only authenticated users can submit data; the passport itself is viewable by anyone.',
      },
      {
        q: 'How do I add my team history to my passport?',
        a: 'Sign in, go to /dashboard/passport, and click "Add Team History." Choose a team and season, enter your jersey number, position (Forward, Defense, or Goalie), and start/end dates. Submitted rows start as "self-reported." You can manage all entries from your dashboard.',
      },
      {
        q: 'How do I add my stats to my passport?',
        a: 'From /dashboard/passport, click "Add Season Stats." Select a season, level, and team, then enter your numbers. Skaters enter games played, goals, assists, and plus/minus. Goalies enter games played, wins, losses, goals against, save percentage, and shutouts. Each season+level can only be entered once — duplicate submissions return an error.',
      },
      {
        q: 'How do I add my USA Hockey or Hockey Canada number?',
        a: 'From /dashboard/passport, click "Edit Federation Numbers." Both fields are optional — you can add one, the other, or neither. You can update them at any time.',
      },
      {
        q: 'How does coach verification work?',
        a: 'When you add self-reported team history for a team, any registered coach who is on record coaching that team can verify your row. Verification only works for rows marked "self-reported." Once a coach verifies, the row flips to "coach-verified" with the coach\'s name and verification date. Coaches can only verify rows for teams they actually coach (checked against their current team + team history). Coaches cannot re-verify rows that are already verified.',
      },
      {
        q: 'How do coach endorsements work?',
        a: 'Registered coaches can write an endorsement for any player. Endorsements cover skills, character, leadership, eligibility for the next level, or recruitment readiness. The coach chooses visibility — sport-scoped (visible everywhere), cross-sport (visible in other sports), or private (only the player + coach). Endorsements appear on the player\'s passport with the coach\'s name and date. No two coaches can issue the same endorsement type for the same player — duplicate submissions are blocked.',
      },
      {
        q: 'How do I become a verified coach on RinkStop?',
        a: 'Go to /dashboard/coach to register. Fill in your license number or issuing authority, your current team, and a short bio. Identity verification (government ID + selfie) is required — your coach profile is only issued after your identity is confirmed. Once registered, your coach profile is visible to players and you can issue endorsements and verify self-reported rows for teams you coach.',
      },
      {
        q: 'Can a parent verify a youth player\'s passport entries?',
        a: 'Parents manage a youth player\'s passport by claiming the kid\'s profile. The parent\'s account can add the kid\'s team history, stats, and federation numbers. Coach verification is the only thing a parent cannot do directly — only coaches physically involved with that team can verify. Coach endorsements are also written by coaches, not parents.',
      },
    ],
  },
  {
    id: 'family-hub',
    title: 'Family Hub',
    icon: '👨‍👩‍👧‍👦',
    qa: [
      {
        q: 'What is Family Hub?',
        a: 'Family Hub is a section of your dashboard that lives at /dashboard/family. It is part of Identity Plus and Business Plus tiers. It lets a parent link unlimited children (managed_profiles), and view per-child data in one place: Hockey Passport, schedule, payments, achievements, career timeline, photos, videos, and secure documents. The hub is built for parents managing multiple youth players — no more logging into each kid separately.',
      },
      {
        q: 'Who is Family Hub for?',
        a: 'Parents and guardians managing youth players. Coaches managing one team don\'t need Family Hub — they get team-level views in /dashboard/manage/team/[id]. The hub is designed for the household view.',
      },
      {
        q: 'How do I link a child to my Family Hub?',
        a: 'Sign in with Identity Plus or Business Plus, go to /dashboard/family, and use the Family Search box to find your child by name. If they don\'t have a RinkStop profile yet, you can create one from the same flow. Linking creates a managed_profiles row tied to your user_id — the child cannot accept or decline the link, but they can see it on their own profile.',
      },
      {
        q: 'Can I unlink a child?',
        a: 'Yes. From /dashboard/family, click the child and choose "Unlink". The child\'s data (passport, achievements, media) remains theirs; only the parental view is removed. If you re-link later, the data is restored.',
      },
      {
        q: 'What documents can I store for my kids?',
        a: 'Birth certificates, waivers, medical forms, vaccine records, travel documents. Documents live in /dashboard/family under "Documents." You control who sees each document — only you by default, but you can mark a document as visible to specific coaches or teams. Stored in Supabase with row-level security — only the linked parent and explicit grantees can read.',
      },
      {
        q: 'Can my child opt out of the parental link?',
        a: 'A child who is 18+ (or the age of digital consent in their country) can revoke a parent link from their own profile settings. For minors, the parent link stands until the child reaches the age threshold OR the parent removes it.',
      },
      {
        q: 'What is the Family Setup Wizard?',
        a: 'When you first sign in to Identity Plus or Business Plus with kids to link, a setup wizard walks you through linking each child and importing any existing data. You can dismiss it and run it again from /dashboard/family if you skipped it the first time.',
      },
    ],
  },
  {
    id: 'stamps',
    title: 'Stamps, QR Codes & Disputes',
    icon: '🔖',
    qa: [
      {
        q: 'What is a passport stamp?',
        a: 'A stamp is a verifiable event recorded on your Hockey Passport. Stamps come from three sources: (1) a coach or operator scanning your QR code at a practice, game, or check-in — creates a "stamp" with context (practice/game/check-in) and the actor\'s identity; (2) a self-reported row you add directly to your passport; (3) a third-party scan where someone else scans their own QR and you are the subject (e.g., a coach scanning for a player who lost their phone). All stamps are timestamped and immutable.',
      },
      {
        q: 'How do I get a passport QR code?',
        a: 'Once you have a Verified Identity or higher, your passport gets a unique QR identifier. You can view it at /dashboard/passport. Operators print this QR and post it at their venue (rink, gym, clinic). Anyone can scan it with their phone to stamp your passport.',
      },
      {
        q: 'Who can stamp my passport?',
        a: 'Any signed-in RinkStop user. Stamps are gated only by the STAMPS_ENABLED feature flag, not by tier — so a Free user scanning a coach\'s QR still creates a valid stamp. This is intentional: stamping is a public-verifiability feature.',
      },
      {
        q: 'Can I see who stamped me and when?',
        a: 'Yes. /dashboard/passport shows your full stamp history with actor (who), timestamp (when), context (practice/game/check-in), and visibility (private or public). You can hide a stamp from your public passport without deleting it.',
      },
      {
        q: 'What if a stamp is wrong or fraudulent?',
        a: 'Open the stamp in /dashboard/passport and click "Dispute." The dispute goes to an operator queue (if it\'s a venue stamp) or a staff queue (if it crosses venue boundaries). Adjudicators can reject the stamp, which removes it from your passport and flags the actor\'s account. Both queues ship with full audit trails.',
      },
      {
        q: 'How do operators manage their QR codes?',
        a: 'Rink operators and team managers go to /dashboard/manage/rink/[id] (or /dashboard/manage/team/[id]). They get a printable QR card that they can rotate at any time for security. Rotation invalidates old QR codes immediately.',
      },
      {
        q: 'Is my QR code safe to share publicly?',
        a: 'Your QR encodes an opaque identifier, not your personal data. Scanning only creates a stamp; it does not reveal your email, phone, or full profile. QR rotation gives you a kill-switch if a QR is ever leaked or photographed by someone you don\'t want scanning it.',
      },
    ],
  },
  {
    id: 'referee-tools',
    title: 'Referee Tools',
    icon: '🥅',
    qa: [
      {
        q: 'What are referee tools on RinkStop?',
        a: 'A read-only dashboard built for referees, at /dashboard/referee. It shows upcoming game assignments, recent attendance, payment summary (what you\'re owed vs what you\'ve been paid), and a per-game detail page with check-in / check-out. The tools are not a full assignment-management system — they are the referee\'s view into leagues that already assign them through RinkStop.',
      },
      {
        q: 'Who can use referee tools?',
        a: 'Anyone whose profile has the referee account type. You can request the referee account type from /dashboard/roles (requires Verified Identity or higher). League admins assign you games; the tools show what was assigned to you.',
      },
      {
        q: 'How do I check in to a game?',
        a: 'From /dashboard/referee/games, click an assignment and use the check-in button when you arrive at the rink. The check-in time is recorded against the assignment and visible to the league admin.',
      },
      {
        q: 'How do I check out / log payment?',
        a: 'After the game, open the assignment detail and click check-out. If the league pays through RinkStop, the system marks the assignment as paid. If the league pays outside RinkStop (cash, check, external invoice), you can manually mark it as paid.',
      },
      {
        q: 'Where does my referee payment come from?',
        a: 'Payment is set by the league that assigned you. RinkStop is the record-keeper, not the payer. The /dashboard/referee page shows your total earned this year and per-assignment status (paid / outstanding / overdue) so you can chase outstanding payments with one screen.',
      },
    ],
  },
  {
    id: 'guest-checkout',
    title: 'Buying & Guest Checkout',
    icon: '💳',
    qa: [
      {
        q: 'Can I buy a tier without creating an account first?',
        a: 'Yes. Guest checkout is enabled — visit /pricing, pick a tier, enter your email and card details. Stripe processes the payment, your account is auto-created (or linked to your existing one if the email matches a Clerk user), and your tier activates within seconds. You land back on the dashboard.',
      },
      {
        q: 'What happens after guest checkout?',
        a: 'You receive a welcome email with a link to set your password. Clicking it signs you in to your new (or existing) account with the paid tier already applied. No "verify your email first" friction.',
      },
      {
        q: 'Can I claim a listing before signing up?',
        a: 'You need a RinkStop account before claiming, but the account itself is free and verification is also free. Sign up free, complete the optional free verification (~60 seconds, government ID + selfie), then claim. Verification earns your listing a "Verified owner" badge. You can pay for additional tools (lead capture, roster management, dues collection) any time after.',
      },
      {
        q: 'What payment methods are accepted?',
        a: 'Visa, Mastercard, American Express, Discover, JCB, and most country-specific debit cards. We use Stripe Checkout, which handles 3D Secure and most regional payment methods automatically.',
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
        a: 'Identity Plus, Business Plus, Club Elite, League, and Federation tier members can DM each other. Free, Verified Identity, Business Listing, and lower Club tiers can read messages but cannot initiate new conversations. On any user\'s public profile page, click "Send connection request". Once they accept, you can message them from /dashboard/messages.',
      },
      {
        q: 'Why do I need a Pro tier to DM?',
        a: 'Identity. Anyone can sign up for Free and browse listings, but DMs require a paid tier (Identity Plus, Business Plus, Club Elite, League, or Federation) so the person on the other end knows they are dealing with a real account, not a throwaway.',
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
        a: 'Reach out at /partner or email support@rinkstop.com with your story. Business Plus and Club Elite members get automatic Featured Listing rotation in their city. Non-Premium members can be considered for editorial coverage in /highlights.',
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
        a: 'Open a support ticket at /dashboard/support with subject "Report incorrect information", include the listing URL, and tell us what is wrong. We will fix verified errors within 1-2 business days. (See also: "How do I get help?" under Technical Support.)',
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
        a: 'Open a support ticket at /dashboard/support with subject "Report a bug". Include the page URL, what you were doing, what you expected to happen, and what actually happened. Screenshots are very helpful. (See also: "How do I get help?" below.)',
      },
      {
        q: 'Is there a mobile app?',
        a: 'Not yet. RinkStop is a mobile-responsive website that works on phones and tablets. Native iOS and Android apps are on the roadmap. There is no PWA install option at this time.',
      },
      {
        q: 'How do I use the Hockey Cost Calculator?',
        a: 'The Hockey Cost Calculator at /tools/hockey-cost-calculator estimates how much hockey costs per year in the United States. Enter the player\'s age, your state, and hockey level (House/Rec, Travel A/AA, or AAA), and the calculator returns a breakdown covering registration fees, equipment, ice time, tournaments, travel, and other costs - all based on 2026 data. No sign-up is required. The calculator is free to use and the results are shareable.',
      },
      {
        q: 'How do I find out if a rink, team, or league is already on RinkStop?',
        a: 'Use the search bar on the homepage or go to /claim-your-listing and type the name. If the listing appears, it\'s already in our directory. If it does not appear, you can submit a new listing from /add-listing or claim it once you have a Verified Identity or higher membership.',
      },
      {
        q: 'How do I delete a review I left?',
        a: 'Email support@rinkstop.com with the review text and the rink it was on. We will remove it within 1-2 business days.',
      },
      {
        q: 'How do I get help?',
        a: 'Open a /dashboard/support ticket for any account, listing, or technical issue. Tickets are routed to the right team (general, listings, billing, or technical) and we respond within 1-2 business days, or 24 hours for paid-tier members. For partnership or advertising inquiries, see /advertise. For general inquiries (media, mailing address, privacy requests), see /about#contact.',
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
        <Link href="/about#contact" style={{ color: '#C8102E' }}>Contact us</Link>.
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
        <Link href="/about#contact" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', background: '#C8102E', color: '#fff', fontWeight: 700, borderRadius: '6px', textDecoration: 'none', fontSize: '0.9375rem' }}>
          ✉️ Contact Support
        </Link>
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