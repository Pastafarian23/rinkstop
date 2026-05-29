import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy | RinkStop',
  description: 'How RinkStop collects, uses, and protects your personal information. Learn about cookies, data sharing, and your rights under applicable privacy laws.',
  robots: { index: false, follow: false },
};

export default function PrivacyPage() {
  return (
    <main style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1rem 4rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1.5rem' }}>
        <Link href="/" style={{ color: '#555' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>Privacy Policy</span>
      </nav>

      <h1 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 'clamp(2rem, 5vw, 3rem)', color: '#041E42', letterSpacing: '0.04em', marginBottom: '2rem' }}>
        PRIVACY POLICY
      </h1>

      <div style={{ color: '#1a1a1a', lineHeight: 1.8, fontSize: '1rem' }}>
        <p style={{ marginBottom: '1.5rem', color: '#444' }}>Last updated: May 15, 2026</p>

        <p style={{ marginBottom: '1.5rem' }}>
          RinkStop (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) operates the website rinkstop.com and related services. We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Information We Collect</h2>
        <p style={{ marginBottom: '1rem' }}>We collect information that you voluntarily provide to us, including:</p>
        <ul style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li>Email addresses submitted through our newsletter or contact forms</li>
          <li>Team, player, league, and rink data submitted through our directory submission forms</li>
          <li>Any other information you voluntarily provide through our services</li>
        </ul>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Automatically Collected Information</h2>
        <p style={{ marginBottom: '1rem' }}>When you visit our website, we automatically collect certain information about your device, including:</p>
        <ul style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li>IP address and general geographic location</li>
          <li>Browser type and version</li>
          <li>Pages visited and time spent on each page</li>
          <li>Referring website or source</li>
          <li>Cookies and similar tracking technologies (see Cookie Policy below)</li>
        </ul>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>How We Use Your Information</h2>
        <p style={{ marginBottom: '1rem' }}>We use the information we collect to:</p>
        <ul style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li>Operate and maintain our website and directory services</li>
          <li>Send newsletters and updates you have subscribed to</li>
          <li>Respond to your inquiries and provide customer support</li>
          <li>Analyze website usage to improve user experience</li>
          <li>Display relevant advertising through Google AdSense (see Third-Party Advertising below)</li>
          <li>Prevent fraud and ensure website security</li>
        </ul>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Cookie Policy</h2>
        <p style={{ marginBottom: '1rem' }}>
          We use cookies and similar tracking technologies to operate our website and collect certain information about your browsing activity.
        </p>
        <p style={{ marginBottom: '1rem' }}>Cookies are small text files stored on your device that help us analyze web traffic and customize content. We use:</p>
        <ul style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li><strong>Essential cookies:</strong> Required for the website to function properly</li>
          <li><strong>Analytics cookies:</strong> Help us understand how visitors interact with our website (Google Analytics)</li>
          <li><strong>Advertising cookies:</strong> Used by Google AdSense to deliver relevant advertisements based on your interests</li>
        </ul>
        <p style={{ marginBottom: '1.5rem' }}>
          You can control or disable cookies through your browser settings. Disabling cookies may affect website functionality.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Third-Party Advertising</h2>
        <p style={{ marginBottom: '1rem' }}>
          We use Google AdSense to display advertisements on our website. Google, as a third-party vendor, uses cookies to serve ads based on your prior visits to our website and other websites.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          Google's use of advertising cookies enables it and its partners to serve ads based on your visit to our site and/or other sites on the internet. You may opt out of personalized advertising by visiting <a href="https://www.google.com/settings/ads" style={{ color: '#C8102E' }}>Google's Ads Settings</a>.
        </p>
        <p style={{ marginBottom: '1.5rem' }}>
          Third-party advertisers may also use cookies and similar technologies. We do not control these third parties' tracking technologies or how they may be used.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Data Sharing</h2>
        <p style={{ marginBottom: '1rem' }}>We may share your information with:</p>
        <ul style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li><strong>Service providers:</strong> Companies that help us operate our website (hosting, analytics, email delivery)</li>
          <li><strong>Advertising partners:</strong> Google AdSense and related advertising services</li>
          <li><strong>Legal requirements:</strong> When required by law, court order, or governmental authority</li>
          <li><strong>Business transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
        </ul>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Data Security</h2>
        <p style={{ marginBottom: '1.5rem' }}>
          We implement appropriate technical and organizational security measures to protect your personal information. However, no method of electronic storage or transmission over the internet is 100% secure, and we cannot guarantee absolute security.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Your Rights</h2>
        <p style={{ marginBottom: '1rem' }}>Depending on your location, you may have the right to:</p>
        <ul style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li>Access the personal information we hold about you</li>
          <li>Request correction of inaccurate information</li>
          <li>Request deletion of your personal information</li>
          <li>Opt out of marketing communications at any time</li>
          <li>Opt out of personalized advertising (see Google Ads Settings link above)</li>
        </ul>
        <p style={{ marginBottom: '1.5rem' }}>
          To exercise any of these rights, please contact us at <a href="mailto:support@rinkstop.com" style={{ color: '#C8102E' }}>support@rinkstop.com</a>.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Children's Privacy</h2>
        <p style={{ marginBottom: '1.5rem' }}>
          Our website is not intended for children under 16 years of age. We do not knowingly collect personal information from children under 16. If you believe we have inadvertently collected such information, please contact us immediately.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>International Data Transfers</h2>
        <p style={{ marginBottom: '1.5rem' }}>
          If you are accessing our website from outside the United States, please note that your information may be transferred to and processed in the United States, where our servers are located. By using our services, you consent to such transfer.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Changes to This Policy</h2>
        <p style={{ marginBottom: '1.5rem' }}>
          We may update this Privacy Policy from time to time. The updated date will be posted at the top of this page. We encourage you to review this policy periodically.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Contact Us</h2>
        <p style={{ marginBottom: '1rem' }}>
          If you have questions or concerns about this Privacy Policy or our data practices, please contact us:
        </p>
        <p style={{ marginBottom: '0.5rem' }}><strong>RinkStop</strong></p>
        <p style={{ marginBottom: '0.5rem' }}>Email: <a href="mailto:support@rinkstop.com" style={{ color: '#C8102E' }}>support@rinkstop.com</a></p>
        <p style={{ marginBottom: '2rem' }}>Website: <a href="https://rinkstop.com" style={{ color: '#C8102E' }}>https://rinkstop.com</a></p>
      </div>
    </main>
  );
}