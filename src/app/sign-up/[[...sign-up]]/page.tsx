import { SignUp } from '@clerk/nextjs';
import styles from '../../login/login.module.css';

export default function SignUpPage() {
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>Join RinkStop</h1>
          <p className={styles.subtitle}>Create your free account. Verified profiles, saved favorites, and more.</p>
        </div>
        <div className={styles.clerkWrap}>
          <SignUp path="/sign-up" routing="path" signInUrl="/login" />
        </div>
      </div>
    </div>
  );
}
