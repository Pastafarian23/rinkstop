import { SignUp } from '@clerk/nextjs';
import { signInAppearance } from '@/lib/clerk-appearance';
import styles from '../../login/login.module.css';

export default function SignUpPage() {
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.clerkWrap}>
          <SignUp
            path="/sign-up"
            routing="path"
            signInUrl="/login"
            forceRedirectUrl="/dashboard"
            fallbackRedirectUrl="/dashboard"
            appearance={signInAppearance}
          />
        </div>
      </div>
    </div>
  );
}
