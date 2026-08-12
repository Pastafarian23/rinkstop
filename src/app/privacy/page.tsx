import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How RinkStop collects, uses, and protects your personal information. Learn about cookies, data sharing, and your rights under applicable privacy laws.',
  robots: { index: false, follow: false },
};

export default function PrivacyPage() {
  return (
    <main style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1rem 4rem' }}>
      <nav style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', marginBottom: '1.5rem' }}>
        <Link href="/" style={{ color: 'rgba(255,255,255,0.45)' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: 'rgba(255,255,255,0.55)' }}>Privacy Policy</span>
      </nav>

      <h1 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 'clamp(2rem, 5vw, 3rem)', color: '#fff', letterSpacing: '0.04em', marginBottom: '2rem' }}>
        PRIVACY POLICY
      </h1>

      <div style={{ color: 'rgba(255,255,255,0.65)', lineHeight: 1.8, fontSize: '1rem' }}>
        <p style={{ marginBottom: '1.5rem', color: 'rgba(255,255,255,0.5)' }}>Last updated: August 10, 2026</p>

        <p style={{ marginBottom: '1.5rem' }}>
          RinkStop (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) operates the website rinkstop.com and related services. We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Information We Collect</h2>
        <p style={{ marginBottom: '1rem' }}>We collect information that you voluntarily provide to us, including:</p>
        <ul style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li>Email addresses submitted through our newsletter or contact forms</li>
          <li>Team, player, league, and rink data submitted through our directory submission forms</li>
          <li>Any other information you voluntarily provide through our services</li>
        </ul>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Automatically Collected Information</h2>
        <p style={{ marginBottom: '1rem' }}>When you visit our website, we automatically collect certain information about your device, including:</p>
        <ul style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li>IP address and general geographic location</li>
          <li>Browser type and version</li>
          <li>Pages visited and time spent on each page</li>
          <li>Referring website or source</li>
          <li>Cookies and similar tracking technologies (see Cookie Policy below)</li>
        </ul>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>How We Use Your Information</h2>
        <p style={{ marginBottom: '1rem' }}>We use the information we collect to:</p>
        <ul style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li>Operate and maintain our website and directory services</li>
          <li>Send newsletters and updates you have subscribed to</li>
          <li>Respond to your inquiries and provide customer support</li>
          <li>Analyze website usage to improve user experience</li>
          <li>Display advertising through the third-party ad networks disclosed below</li>
          <li>Prevent fraud and ensure website security</li>
        </ul>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Cookie Policy</h2>
        <p style={{ marginBottom: '1rem' }}>
          We use cookies and similar tracking technologies to operate our website and collect certain information about your browsing activity.
        </p>
        <p style={{ marginBottom: '1rem' }}>Cookies are small text files stored on your device that help us analyze web traffic and customize content. We use:</p>
        <ul style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li><strong>Essential cookies:</strong> Required for the website to function properly (authentication, security, language preference)</li>
          <li><strong>Analytics cookies:</strong> Help us understand how visitors interact with our website (Google Analytics)</li>
          <li><strong>Advertising cookies:</strong> Set by the third-party advertising networks listed in the Third-Party Advertising section below, only after you have provided consent where required by law</li>
        </ul>
        <p style={{ marginBottom: '1.5rem' }}>
          You can control or disable cookies through your browser settings. Disabling cookies may affect website functionality. Where required by law (EEA, UK, Switzerland), advertising and analytics cookies are only set after you provide consent through our consent management platform described below.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Third-Party Advertising</h2>
        <p style={{ marginBottom: '1rem' }}>
          RinkStop may display advertisements served by third-party advertising networks. The specific networks currently in use, and the vendors they employ, are listed in our <Link href="/cookies" style={{ color: '#C8102E' }}>Cookie Policy</Link> and updated whenever a network is added or removed. As of the date at the top of this policy, the advertising networks RinkStop works with are listed below.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          When an advertising network is active on RinkStop, that network (or its vendors) may use cookies, device identifiers, and similar technologies to serve ads based on your prior visits to our website and other websites, subject to the consent choices you have made.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          We do not control the tracking technologies used by third-party advertising networks after a network has been enabled. You may opt out of personalized advertising from participating networks by visiting <a href="https://www.aboutads.info/choices" style={{ color: '#C8102E' }}>www.aboutads.info/choices</a> (NAI), <a href="https://www.youronlinechoices.eu" style={{ color: '#C8102E' }}>www.youronlinechoices.eu</a> (EDAA), or your network-specific opt-out page (for example, <a href="https://www.google.com/settings/ads" style={{ color: '#C8102E' }}>Google Ads Settings</a> when Google is active).
        </p>
        <p style={{ marginBottom: '1.5rem' }}>
          When a third-party advertising network is integrated with RinkStop, that network&rsquo;s privacy practices govern the data it collects. We require each network we work with to provide users with the disclosures and controls required by applicable law.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Consent Management (EEA / UK / Switzerland)</h2>
        <p style={{ marginBottom: '1rem' }}>
          For visitors in the European Economic Area, the United Kingdom, or Switzerland, RinkStop only loads advertising and analytics scripts after you have provided consent through our consent management platform.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          When Google AdSense is the active advertising network on RinkStop, the consent management platform we use is Google&rsquo;s Privacy &amp; Messaging API (formerly Funding Choices), which is integrated with the IAB Tech Lab Transparency &amp; Consent Framework (TCF) v2.x. This platform is operated by Google as a processor and is certified under the TCF. The platform records your choices (accept, reject, or manage preferences), transmits those choices to participating advertising vendors, and exposes a control so you can change your choice at any time.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          When a different advertising network is active (or when no advertising network is active), the consent flow is provided by RinkStop&rsquo;s first-party cookie banner, which records your choice in the <code>cookie_consent</code> browser local-storage key and re-prompts you when your stored choice has expired. You can change your choice at any time by clearing your browser&rsquo;s storage for rinkstop.com or by revisiting this page.
        </p>
        <p style={{ marginBottom: '1.5rem' }}>
          We do not load personalized advertising scripts before consent has been recorded. We do not use deceptive design patterns (such as pre-ticked boxes, hidden reject buttons, or visual interference) to obtain consent.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Data Sharing</h2>
        <p style={{ marginBottom: '1rem' }}>We may share your information with:</p>
        <ul style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li><strong>Service providers:</strong> Companies that help us operate our website (hosting, analytics, email delivery)</li>
          <li><strong>Advertising partners:</strong> The third-party advertising networks disclosed in the Third-Party Advertising section above, only after you have provided consent where required by law</li>
          <li><strong>Legal requirements:</strong> When required by law, court order, or governmental authority</li>
          <li><strong>Business transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
        </ul>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Data Security</h2>
        <p style={{ marginBottom: '1.5rem' }}>
          We implement appropriate technical and organizational security measures to protect your personal information. However, no method of electronic storage or transmission over the internet is 100% secure, and we cannot guarantee absolute security.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Your Rights</h2>
        <p style={{ marginBottom: '1rem' }}>Depending on your location, you may have the right to:</p>
        <ul style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li>Access the personal information we hold about you</li>
          <li>Request correction of inaccurate information</li>
          <li>Request deletion of your personal information</li>
          <li>Opt out of marketing communications at any time</li>
          <li>Opt out of personalized advertising through the third-party opt-out links listed above</li>
          <li>Withdraw consent at any time, where processing is based on consent</li>
        </ul>
        <p style={{ marginBottom: '1.5rem' }}>
          To exercise any of these rights, please contact us at <a href="mailto:support@rinkstop.com" style={{ color: '#C8102E' }}>support@rinkstop.com</a>.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Children&apos;s Privacy</h2>
        <p style={{ marginBottom: '1.5rem' }}>
          Our website is not intended for children under 13 years of age, and we do not knowingly collect personal information from children under 13. RinkStop&apos;s hockey directory includes information about youth hockey organizations, leagues, and programs; the editorial content on those pages describes organizations and activities, not individual minors. We do not display personally identifying information about minors on the site, and we do not allow minors to create RinkStop accounts.
        </p>
        <p style={{ marginBottom: '1.5rem' }}>
          Where youth hockey content is displayed, we do not enable personalized advertising or advertising retargeting on those sections. If you believe a child&rsquo;s personal information has been published on RinkStop in error, contact <a href="mailto:support@rinkstop.com" style={{ color: '#C8102E' }}>support@rinkstop.com</a> and we will remove it promptly.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>International Data Transfers &amp; GDPR / UK GDPR</h2>
        <p style={{ marginBottom: '1rem' }}>
          If you are accessing our website from outside the United States, please note that your information may be transferred to and processed in the United States, where our servers are located. By using our services, you consent to such transfer.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          For visitors in the <strong>European Economic Area (EEA), the United Kingdom, or Switzerland</strong>, we rely on the following legal bases under the General Data Protection Regulation (GDPR) and the UK GDPR:
        </p>
        <ul style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li><strong>Consent (Art. 6(1)(a) GDPR):</strong> For advertising and analytics cookies, recorded through our consent management platform described above.</li>
          <li><strong>Legitimate interests (Art. 6(1)(f) GDPR):</strong> For essential cookies, site security, fraud prevention, and aggregated analytics that do not identify you.</li>
          <li><strong>Contract (Art. 6(1)(b) GDPR):</strong> When you create an account, submit a listing, or use paid features.</li>
        </ul>
        <p style={{ marginBottom: '1rem' }}>
          Where personal data is transferred from the EEA, UK, or Switzerland to the United States, our service providers and advertising partners rely on Standard Contractual Clauses or certification under the EU-U.S. Data Privacy Framework, the UK Extension to the EU-U.S. Data Privacy Framework, and the Swiss-U.S. Data Privacy Framework, as applicable. RinkStop acts as a data controller for the information you submit directly to our services, and as a data processor for data submitted through our directory forms on behalf of the team, rink, or league that owns the listing.
        </p>
        <p style={{ marginBottom: '1.5rem' }}>
          To exercise your rights under GDPR or UK GDPR (access, rectification, erasure, restriction, portability, objection), contact <a href="mailto:support@rinkstop.com" style={{ color: '#C8102E' }}>support@rinkstop.com</a>. You also have the right to lodge a complaint with your local data protection authority.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Changes to This Policy</h2>
        <p style={{ marginBottom: '1.5rem' }}>
          We may update this Privacy Policy from time to time. The updated date will be posted at the top of this page. We encourage you to review this policy periodically. If the changes are material, we will provide a more prominent notice (such as a banner on the homepage or an email to registered users).
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Contact Us</h2>
        <p style={{ marginBottom: '1rem' }}>
          If you have questions or concerns about this Privacy Policy or our data practices, please contact us:
        </p>
        <p style={{ marginBottom: '0.5rem' }}><strong>RinkStop</strong></p>
        <p style={{ marginBottom: '0.5rem' }}>Email: <a href="mailto:support@rinkstop.com" style={{ color: '#C8102E' }}>support@rinkstop.com</a></p>
        <p style={{ marginBottom: '0.5rem' }}>Mailing address: 709 S Riverside Dr, Villa Park, IL 60181, United States</p>
        <p style={{ marginBottom: '2rem' }}>Website: <a href="https://rinkstop.com" style={{ color: '#C8102E' }}>https://rinkstop.com</a></p>
      </div>
    </main>
  );
}