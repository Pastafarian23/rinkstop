/**
 * Sign-up page using Clerk's hosted sign-up component.
 * Redirects to /scoresheet on success.
 */

import { SignUp } from '@clerk/nextjs';

export default function Page() {
  return (
    <main
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
    >
      <SignUp
        appearance={{
          variables: {
            colorPrimary: '#FFB81C',
            colorBackground: '#0F172A',
            colorInput: 'rgba(0,0,0,0.3)',
            colorInputForeground: '#F8FAFC',
            colorForeground: '#F8FAFC',
            colorMutedForeground: 'rgba(255,255,255,0.7)',
            colorDanger: '#C8102E',
            borderRadius: '10px',
          },
          elements: {
            card: {
              background: 'rgba(15,23,42,0.85)',
              border: '1px solid rgba(255,255,255,0.12)',
            },
            formButtonPrimary: {
              background: '#FFB81C',
              color: '#041E42',
              '&:hover': { background: '#FFD66B' },
            },
          },
        }}
        signInUrl="/sign-in"
        forceRedirectUrl="/scoresheet"
      />
    </main>
  );
}
