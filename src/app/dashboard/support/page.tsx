import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default async function SupportPage() {
  const { userId } = await auth();
  if (!userId) redirect('/login');

  const user = await currentUser();
  const firstName = user?.firstName || '';
  const email = user?.emailAddresses?.[0]?.emailAddress || '';

  const faqs = [
    {
      q: 'How do I claim a rink, team, or player listing?',
      a: 'Go to your Dashboard and click "Claim a Profile." Search for the listing you want to claim, then submit a request. Our team will review it and reach out to verify ownership.',
    },
    {
      q: 'How do I leave a review?',
      a: 'Visit any rink page and scroll to the "Write a Review" section at the bottom. You\'ll need to be signed in to submit a review.',
    },
    {
      q: 'Can I delete my review?',
      a: 'Yes. Go to Dashboard → My Reviews and click the delete option on any review you\'ve submitted.',
    },
    {
      q: 'How does Founding Membership work?',
      a: 'Founding Members get verified status on their profile, priority support, and access to exclusive features. Visit the Founding Member page for full details and pricing.',
    },
    {
      q: 'How do I save players or teams?',
      a: 'When viewing a player or team page, click the bookmark/save icon. Your saved items appear in Dashboard → Saved Items.',
    },
    {
      q: 'My rink or team info is wrong. How do I fix it?',
      a: 'Use the "Suggest an Edit" link on the listing page, or contact our support team with the correct information.',
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: 720 }}>

      <div style={{
        background: '#0f0f0f',
        border: '1px solid #1e1e1e',
        borderRadius: 12,
        padding: '1.5rem',
      }}>
        <h2 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '1.25rem', color: '#fff', letterSpacing: '0.04em', margin: '0 0 0.25rem' }}>
          HELP & SUPPORT
        </h2>
        <p style={{ color: '#666', fontSize: '0.875rem', margin: 0 }}>
          Find answers below or contact our team directly.
        </p>
      </div>

      {/* Contact form placeholder */}
      <div style={{
        background: '#0f0f0f',
        border: '1px solid #1e1e1e',
        borderRadius: 12,
        padding: '1.5rem',
      }}>
        <h3 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '1rem', color: '#888', letterSpacing: '0.06em', margin: '0 0 1rem' }}>
          CONTACT OUR TEAM
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', color: '#888', fontSize: '0.8rem', marginBottom: '0.4rem' }}>Name</label>
            <div style={{ background: '#141414', border: '1px solid #1e1e1e', borderRadius: 6, padding: '0.625rem 0.875rem', color: '#ccc', fontSize: '0.9rem' }}>
              {firstName || 'Your Name'}
            </div>
          </div>
          <div>
            <label style={{ display: 'block', color: '#888', fontSize: '0.8rem', marginBottom: '0.4rem' }}>Email</label>
            <div style={{ background: '#141414', border: '1px solid #1e1e1e', borderRadius: 6, padding: '0.625rem 0.875rem', color: '#ccc', fontSize: '0.9rem' }}>
              {email}
            </div>
          </div>
          <div>
            <label style={{ display: 'block', color: '#888', fontSize: '0.8rem', marginBottom: '0.4rem' }}>Subject</label>
            <select style={{
              width: '100%',
              background: '#141414',
              border: '1px solid #1e1e1e',
              borderRadius: 6,
              padding: '0.625rem 0.875rem',
              color: '#ccc',
              fontSize: '0.9rem',
            }}>
              <option>General question</option>
              <option>Report incorrect information</option>
              <option>Claim a listing</option>
              <option>Report a bug</option>
              <option>Business partnership</option>
              <option>Other</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', color: '#888', fontSize: '0.8rem', marginBottom: '0.4rem' }}>Message</label>
            <textarea
              rows={4}
              placeholder="Tell us how we can help..."
              style={{
                width: '100%',
                background: '#141414',
                border: '1px solid #1e1e1e',
                borderRadius: 6,
                padding: '0.625rem 0.875rem',
                color: '#e2e8f0',
                fontSize: '0.9rem',
                resize: 'vertical',
                fontFamily: 'inherit',
                outline: 'none',
              }}
            />
          </div>
          <a
            href={`mailto:support@rinkstop.com?subject=RinkStop Support Request&body=Name: ${firstName}%0AEmail: ${email}%0A%0A`}
            style={{
              display: 'inline-block',
              background: '#C8102E',
              color: '#fff',
              padding: '0.75rem 1.5rem',
              borderRadius: 6,
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '0.875rem',
              textAlign: 'center',
              alignSelf: 'flex-start',
            }}
          >
            Send Message
          </a>
        </div>
      </div>

      {/* FAQ Accordion */}
      <div style={{
        background: '#0f0f0f',
        border: '1px solid #1e1e1e',
        borderRadius: 12,
        padding: '1.5rem',
      }}>
        <h3 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '1rem', color: '#888', letterSpacing: '0.06em', margin: '0 0 1.25rem' }}>
          FREQUENTLY ASKED QUESTIONS
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {faqs.map(({ q, a }) => (
            <details key={q} style={{ borderBottom: '1px solid #1e1e1e', paddingBottom: '1rem' }}>
              <summary style={{ cursor: 'pointer', color: '#e2e8f0', fontWeight: 500, fontSize: '0.9rem', listStyle: 'none', userSelect: 'none' }}>
                {q}
              </summary>
              <p style={{ color: '#888', fontSize: '0.875rem', lineHeight: 1.65, marginTop: '0.75rem' }}>{a}</p>
            </details>
          ))}
        </div>
      </div>

    </div>
  );
}