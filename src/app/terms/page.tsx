import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'The terms and conditions governing your use of the RinkStop website and services. Please read these terms carefully before using our platform.',
  robots: { index: false, follow: false },
};

export default function TermsPage() {
  return (
    <main style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1rem 4rem' }}>
      <nav style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', marginBottom: '1.5rem' }}>
        <Link href="/" style={{ color: 'rgba(255,255,255,0.45)' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: 'rgba(255,255,255,0.55)' }}>Terms of Service</span>
      </nav>

      <h1 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 'clamp(2rem, 5vw, 3rem)', color: '#fff', letterSpacing: '0.04em', marginBottom: '2rem' }}>
        TERMS OF SERVICE
      </h1>

      <div style={{ color: 'rgba(255,255,255,0.65)', lineHeight: 1.8, fontSize: '1rem' }}>
        <p style={{ marginBottom: '1.5rem', color: 'rgba(255,255,255,0.5)' }}>Last updated: August 16, 2026</p>

        <p style={{ marginBottom: '1.5rem' }}>
          Welcome to RinkStop. These Terms of Service (&quot;Terms&quot;) govern your access to and use of the RinkStop website (rinkstop.com) and all related services operated by RinkStop (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;). By accessing or using our website, you agree to be bound by these Terms. If you do not agree to these Terms, please do not use our website.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Description of Service</h2>
        <p style={{ marginBottom: '1.5rem' }}>
          RinkStop operates a global hockey directory that allows users to search, browse, and submit information about hockey teams, players, leagues, rinks, and related content. Our platform includes news articles, directory listings, and other hockey-related information.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Acceptance of Terms</h2>
        <p style={{ marginBottom: '1rem' }}>
          By accessing or using RinkStop, you acknowledge that you have read, understood, and agree to be bound by these Terms and our Privacy Policy. If you are using the website on behalf of an organization, you are agreeing to these Terms for that organization and representing that you have authority to bind that organization to these Terms.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>User Responsibilities</h2>
        <p style={{ marginBottom: '1rem' }}>When using RinkStop, you agree to:</p>
        <ul style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li>Provide accurate, current, and complete information when submitting directory entries or contacting us</li>
          <li>Not use the website for any unlawful purpose or in violation of these Terms</li>
          <li>Not attempt to gain unauthorized access to any part of the website</li>
          <li>Not interfere with or disrupt the website or servers connected to the website</li>
          <li>Not transmit any viruses, malware, or other malicious code</li>
          <li>Not scrape, harvest, or collect information from the website using automated tools</li>
          <li>Not impersonate any person or entity</li>
          <li>Not use the website to spam, harass, or harm others</li>
        </ul>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Directory Submissions</h2>
        <p style={{ marginBottom: '1rem' }}>
          Users may submit information about hockey teams, players, leagues, and rinks through our directory submission features. By submitting content, you:
        </p>
        <ul style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li>Represent that the information is accurate to the best of your knowledge</li>
          <li>Grant RinkStop a non-exclusive, royalty-free, worldwide license to use, display, and distribute the submitted content</li>
          <li>Accept responsibility for ensuring you have the right to share any personal information about third parties</li>
          <li>Understand that submissions may be reviewed, edited, or removed at our discretion</li>
        </ul>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Intellectual Property</h2>
        <p style={{ marginBottom: '1rem' }}>
          All content on RinkStop, including but not limited to text, graphics, logos, icons, images, audio clips, digital downloads, data compilations, and software, is the property of RinkStop or its content suppliers and is protected by international copyright laws.
        </p>
        <p style={{ marginBottom: '1.5rem' }}>
          The RinkStop name, logo, and all related names, logos, product and service names, designs, and slogans are trademarks of RinkStop. You may not use such marks without prior written permission.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Third-Party Content and Links</h2>
        <p style={{ marginBottom: '1rem' }}>
          Our website may contain links to third-party websites or services that are not owned or controlled by RinkStop. We have no control over and assume no responsibility for the content, privacy policies, or practices of any third-party websites or services.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          The inclusion of any linked website or service does not imply endorsement by RinkStop. You acknowledge and agree that we shall not be responsible or liable for any damage or loss caused by or in connection with the use of any such third-party content, goods, or services.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Advertising</h2>
        <p style={{ marginBottom: '1.5rem' }}>
          RinkStop displays third-party advertisements through Google AdSense and potentially other advertising networks. The advertisers are responsible for the content of their ads and any transactions you enter into with them. RinkStop does not endorse or guarantee any products or services advertised on our website.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Disclaimer of Warranties</h2>
        <p style={{ marginBottom: '1rem' }}>
          RINKSTOP IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, WE DISCLAIM ALL WARRANTIES, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          We do not warrant that the website will be uninterrupted, secure, or error-free. We do not warrant that the information on the website is accurate, complete, or current. We reserve the right to modify or discontinue the website at any time without notice.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Limitation of Liability</h2>
        <p style={{ marginBottom: '1rem' }}>
          TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL RINKSTOP, ITS OFFICERS, DIRECTORS, EMPLOYEES, AGENTS, OR AFFILIATES BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING WITHOUT LIMITATION, LOSS OF PROFITS, DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, RESULTING FROM:
        </p>
        <ul style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li>Your access to or use of (or inability to access or use) the website</li>
          <li>Any content obtained from the website</li>
          <li>Unauthorized access, use, or alteration of your transmissions or content</li>
          <li>Any errors, inaccuracies, or omissions in any content</li>
          <li>Any conduct of any third party on the website</li>
        </ul>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Indemnification</h2>
        <p style={{ marginBottom: '1.5rem' }}>
          You agree to defend, indemnify, and hold harmless RinkStop and its officers, directors, employees, contractors, agents, licensors, suppliers, successors, and assigns from and against any claims, liabilities, damages, judgments, awards, losses, costs, expenses, or fees (including reasonable attorneys&apos; fees) arising out of or relating to your violation of these Terms or your use of the website.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Governing Law</h2>
        <p style={{ marginBottom: '1rem' }}>
          These Terms shall be governed by and construed in accordance with the laws of the United States and the State of Delaware, without regard to its conflict of law provisions. You agree to submit to the personal and exclusive jurisdiction of the state and federal courts located within Delaware for the resolution of any disputes.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Changes to These Terms</h2>
        <p style={{ marginBottom: '1.5rem' }}>
          We reserve the right to modify or replace these Terms at any time at our sole discretion. The updated date will be posted on this page. By continuing to access or use our website after any revisions become effective, you agree to be bound by the revised terms.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Severability</h2>
        <p style={{ marginBottom: '1.5rem' }}>
          If any provision of these Terms is held to be invalid, illegal, or unenforceable, the remaining provisions shall continue in full force and effect.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Contact Us</h2>
        <p style={{ marginBottom: '1rem' }}>
          If you have any questions about these Terms, please contact us:
        </p>
        <p style={{ marginBottom: '0.5rem' }}><strong>RinkStop</strong></p>
        <p style={{ marginBottom: '0.5rem' }}>Email: <a href="mailto:support@rinkstop.com" style={{ color: '#C8102E' }}>support@rinkstop.com</a></p>
        <p style={{ marginBottom: '2rem' }}>Website: <a href="https://rinkstop.com" style={{ color: '#C8102E' }}>https://rinkstop.com</a></p>
      </div>
    </main>
  );
}