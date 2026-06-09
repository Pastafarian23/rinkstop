import { SignIn } from '@clerk/nextjs';
import { signInAppearance } from '@/lib/clerk-appearance';
import styles from '../login.module.css';

export default function LoginPage() {
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>Sign In to RinkStop</h1>
          <p className={styles.subtitle}>Access your dashboard, saved players, and more.</p>
        </div>
        <div className={styles.clerkWrap}>
          <SignIn
            path="/login"
            routing="path"
            signUpUrl="/sign-up"
            forceRedirectUrl="/dashboard"
            fallbackRedirectUrl="/dashboard"
            appearance={signInAppearance}
          />
        </div>
      </div>
    </div>
  );
}
