'use client';
import { useState, useEffect } from 'react';
import styles from './SignUpModal.module.css';

interface Props {
  onClose: () => void;
}

export default function SignUpModal({ onClose }: Props) {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    // Simulate submission — wire to your email service (Mailchimp, ConvertKit, etc.)
    await new Promise(r => setTimeout(r, 800));
    setSubmitted(true);
    setLoading(false);
  };

  return (
    <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        {!submitted ? (
          <>
            <div className={styles.icon}>🏒</div>
            <h2 id="modal-title" className={styles.title}>Sign Up Free</h2>
            <p className={styles.subtitle}>
              Get early access to RinkStop&apos;s upcoming apps, features, and hockey content before anyone else.
            </p>
            <ul className={styles.benefits}>
              <li>⚡ <strong>Early access</strong> to new features &amp; apps</li>
              <li>📣 <strong>Exclusive content</strong> — guides, previews, and hockey insights</li>
              <li>🎁 <strong>Priority updates</strong> — be the first to know</li>
            </ul>
            <form onSubmit={handleSubmit} className={styles.form}>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className={styles.input}
                aria-label="Email address"
              />
              <button type="submit" className={styles.submitBtn} disabled={loading}>
                {loading ? 'Signing up...' : 'Sign Up Free →'}
              </button>
            </form>
            <p className={styles.fine}>No spam. Unsubscribe anytime. We respect your privacy.</p>
          </>
        ) : (
          <div className={styles.success}>
            <div className={styles.successIcon}>✅</div>
            <h2 className={styles.title}>You&apos;re in!</h2>
            <p className={styles.subtitle}>
              Welcome to the RinkStop community. We&apos;ll be in touch with exclusive updates and early access.
            </p>
            <button className={styles.submitBtn} onClick={onClose}>Close</button>
          </div>
        )}
      </div>
    </div>
  );
}