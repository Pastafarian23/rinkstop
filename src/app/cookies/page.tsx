import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Cookie Policy',
  description: 'Information about how RinkStop uses cookies and similar tracking technologies. Learn about essential, analytics, and advertising cookies.',
  robots: { index: false, follow: false },
};

export default function CookiesPage() {
  return (
    <main style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1rem 4rem' }}>
      <nav style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', marginBottom: '1.5rem' }}>
        <Link href="/" style={{ color: 'rgba(255,255,255,0.45)' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: 'rgba(255,255,255,0.55)' }}>Cookie Policy</span>
      </nav>

      <h1 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 'clamp(2rem, 5vw, 3rem)', color: '#fff', letterSpacing: '0.04em', marginBottom: '2rem' }}>
        COOKIE POLICY
      </h1>

      <div style={{ color: 'rgba(255,255,255,0.65)', lineHeight: 1.8, fontSize: '1rem' }}>
        <p style={{ marginBottom: '1.5rem', color: 'rgba(255,255,255,0.5)' }}>Last updated: August 3, 2026</p>

        <p style={{ marginBottom: '1.5rem' }}>
          This Cookie Policy explains what cookies and similar tracking technologies RinkStop uses when you visit our website rinkstop.com (the &quot;Site&quot;). It also explains how you can control or disable these cookies.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>What Are Cookies</h2>
        <p style={{ marginBottom: '1.5rem' }}>
          Cookies are small text files that are stored on your device (computer, tablet, or mobile) when you visit a website. They help websites remember your preferences and understand how you use the site. Similar technologies include web beacons, pixel tags, and local storage.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>How We Use Cookies</h2>
        <p style={{ marginBottom: '1rem' }}>RinkStop uses cookies for the following purposes:</p>
        <ul style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li><strong>Essential cookies:</strong> Required for the website to function properly. They enable core features like page navigation, secure areas access, and newsletter signup. You cannot opt out of essential cookies as they are necessary for the site to work.</li>
          <li><strong>Analytics cookies:</strong> Help us understand how visitors interact with our website by collecting information about pages visited, time spent, and referral sources. We use this information to improve user experience.</li>
          <li><strong>Advertising cookies:</strong> Used by our advertising partner Google AdSense to deliver relevant advertisements based on your interests. These cookies track your browsing activity across our site and other websites to personalize ads.</li>
        </ul>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Third-Party Cookies</h2>
        <p style={{ marginBottom: '1rem' }}>Some cookies are placed by third-party services that appear on our pages:</p>
        <ul style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li><strong>Google AdSense:</strong> Uses cookies to serve personalized advertising based on your browsing history. You can opt out at <a href="https://www.google.com/settings/ads" style={{ color: '#C8102E' }}>Google&apos;s Ads Settings</a>.</li>
          <li><strong>Google Analytics:</strong> Uses cookies to measure site traffic and understand how users navigate our site. You can install the <a href="https://tools.google.com/dlpage/gaoptout" style={{ color: '#C8102E' }}>Google Analytics Opt-out Browser Add-on</a> to disable analytics.</li>
        </ul>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Cookie Consent &amp; Google-Certified CMP</h2>
        <p style={{ marginBottom: '1rem' }}>
          When you first visit our website, you will see a cookie consent banner informing you about our use of cookies. You can choose to Accept or Decline non-essential cookies. Your preference is stored in local storage on your device.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          For visitors in the <strong>European Economic Area (EEA), the United Kingdom, or Switzerland</strong>, consent is managed through Google&apos;s <strong>Privacy &amp; Messaging API</strong> (formerly Google Funding Choices). This is a Google-certified, IAB Europe TCF v2.3-compliant consent management platform. The CMP stores your consent choices in the <code>__tcfapi</code> shared cookie and signals them to our advertising partners (Google AdSense) under the IAB Transparency and Consent Framework technical specification.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          You can change your cookie preferences at any time by:
        </p>
        <ul style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li>Clicking the consent icon that appears in the bottom corner of our site (visible after the consent UI has been closed once)</li>
          <li>Clearing your browser&apos;s cookies and revisiting our site to show the consent banner again</li>
          <li>Visiting <a href="https://www.google.com/settings/ads" style={{ color: '#C8102E' }}>Google Ads Settings</a> to manage your ad personalization preferences</li>
        </ul>

        <h3 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.25rem', color: '#fff', letterSpacing: '0.04em', marginTop: '1.5rem', marginBottom: '0.75rem' }}>Cookies We Use — Specific List</h3>
        <p style={{ marginBottom: '1rem' }}>Below is a list of the cookies set by our site and our partners:</p>
        <ul style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li><strong>cookie_consent</strong> (localStorage, first-party): Stores your Accept/Decline choice. No expiration until you clear it.</li>
          <li><strong>__cfuvid, __cf_bm</strong> (Cloudflare, ~30 min - 1 day): Powers our CDN and bot protection. Essential.</li>
          <li><strong>__session, __client, __session_*</strong> (Clerk, ~7 days): Authentication and session management. Essential.</li>
          <li><strong>_ga, _ga_*</strong> (Google Analytics, ~2 years): Distinguishes unique users for analytics. We use only aggregate, non-identifiable analytics.</li>
          <li><strong>_gcl_au</strong> (Google Ads, ~90 days): Conversion linker to measure ad clicks.</li>
          <li><strong>__gads, __gpi</strong> (Google AdSense, ~13 months): Used to deliver personalized ads, measure ad performance, and remember your ad preferences.</li>
          <li><strong>IDE, _drt, _fcap, _gl_kwd</strong> (DoubleClick, ~13 months): Frequency capping, ad measurement, and keyword targeting for Google AdSense.</li>
          <li><strong>FCNEC, _GREC, _GRECaptcha</strong> (Google Funding Choices / reCAPTCHA, ~6 months - 1 year): Consent management and bot protection.</li>
        </ul>
        <p style={{ marginBottom: '1.5rem' }}>
          This list may change as we add or remove features. We will update this page when the cookie set changes materially.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Managing Cookies in Your Browser</h2>
        <p style={{ marginBottom: '1rem' }}>Most web browsers allow you to control cookies through their settings:</p>
        <ul style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li><strong>Google Chrome:</strong> Settings → Privacy and Security → Cookies and site data</li>
          <li><strong>Mozilla Firefox:</strong> Options → Privacy & Security → Cookies and Site Data</li>
          <li><strong>Safari:</strong> Preferences → Privacy → Cookies and website data</li>
          <li><strong>Microsoft Edge:</strong> Settings → Privacy, search, and services → Cookies</li>
        </ul>
        <p style={{ marginBottom: '1.5rem' }}>
          Disabling cookies may affect the functionality of our website and other websites you visit.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Updates to This Policy</h2>
        <p style={{ marginBottom: '1.5rem' }}>
          We may update this Cookie Policy from time to time. Any changes will be posted on this page with an updated &quot;Last updated&quot; date.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Contact Us</h2>
        <p style={{ marginBottom: '1rem' }}>For questions about our use of cookies, contact us:</p>
        <p style={{ marginBottom: '0.5rem' }}>Email: <a href="mailto:support@rinkstop.com" style={{ color: '#C8102E' }}>support@rinkstop.com</a></p>
        <p style={{ marginBottom: '2rem' }}>Website: <a href="https://rinkstop.com" style={{ color: '#C8102E' }}>https://rinkstop.com</a></p>
      </div>
    </main>
  );
}