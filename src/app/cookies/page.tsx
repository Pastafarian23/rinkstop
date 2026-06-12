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
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1.5rem' }}>
        <Link href="/" style={{ color: '#555' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>Cookie Policy</span>
      </nav>

      <h1 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 'clamp(2rem, 5vw, 3rem)', color: '#041E42', letterSpacing: '0.04em', marginBottom: '2rem' }}>
        COOKIE POLICY
      </h1>

      <div style={{ color: '#1a1a1a', lineHeight: 1.8, fontSize: '1rem' }}>
        <p style={{ marginBottom: '1.5rem', color: '#444' }}>Last updated: May 15, 2026</p>

        <p style={{ marginBottom: '1.5rem' }}>
          This Cookie Policy explains what cookies and similar tracking technologies RinkStop uses when you visit our website rinkstop.com (the &quot;Site&quot;). It also explains how you can control or disable these cookies.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>What Are Cookies</h2>
        <p style={{ marginBottom: '1.5rem' }}>
          Cookies are small text files that are stored on your device (computer, tablet, or mobile) when you visit a website. They help websites remember your preferences and understand how you use the site. Similar technologies include web beacons, pixel tags, and local storage.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>How We Use Cookies</h2>
        <p style={{ marginBottom: '1rem' }}>RinkStop uses cookies for the following purposes:</p>
        <ul style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li><strong>Essential cookies:</strong> Required for the website to function properly. They enable core features like page navigation, secure areas access, and newsletter signup. You cannot opt out of essential cookies as they are necessary for the site to work.</li>
          <li><strong>Analytics cookies:</strong> Help us understand how visitors interact with our website by collecting information about pages visited, time spent, and referral sources. We use this information to improve user experience.</li>
          <li><strong>Advertising cookies:</strong> Used by our advertising partner Google AdSense to deliver relevant advertisements based on your interests. These cookies track your browsing activity across our site and other websites to personalize ads.</li>
        </ul>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Third-Party Cookies</h2>
        <p style={{ marginBottom: '1rem' }}>Some cookies are placed by third-party services that appear on our pages:</p>
        <ul style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li><strong>Google AdSense:</strong> Uses cookies to serve personalized advertising based on your browsing history. You can opt out at <a href="https://www.google.com/settings/ads" style={{ color: '#C8102E' }}>Google&apos;s Ads Settings</a>.</li>
          <li><strong>Google Analytics:</strong> Uses cookies to measure site traffic and understand how users navigate our site. You can install the <a href="https://tools.google.com/dlpage/gaoptout" style={{ color: '#C8102E' }}>Google Analytics Opt-out Browser Add-on</a> to disable analytics.</li>
        </ul>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Cookie Consent</h2>
        <p style={{ marginBottom: '1rem' }}>
          When you first visit our website, you will see a cookie consent banner informing you about our use of cookies. You can choose to Accept or Decline non-essential cookies. Your preference is stored in local storage on your device.
        </p>
        <p style={{ marginBottom: '1.5rem' }}>
          You can change your cookie preferences at any time by clearing your browser cookies and visiting our site again to show the consent banner.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Managing Cookies in Your Browser</h2>
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

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Updates to This Policy</h2>
        <p style={{ marginBottom: '1.5rem' }}>
          We may update this Cookie Policy from time to time. Any changes will be posted on this page with an updated &quot;Last updated&quot; date.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Contact Us</h2>
        <p style={{ marginBottom: '1rem' }}>For questions about our use of cookies, contact us:</p>
        <p style={{ marginBottom: '0.5rem' }}>Email: <a href="mailto:support@rinkstop.com" style={{ color: '#C8102E' }}>support@rinkstop.com</a></p>
        <p style={{ marginBottom: '2rem' }}>Website: <a href="https://rinkstop.com" style={{ color: '#C8102E' }}>https://rinkstop.com</a></p>
      </div>
    </main>
  );
}