'use client';

import { SignIn, SignUp } from '@clerk/nextjs';
import { useState } from 'react';
import { Header } from '@/components/Header';

interface Props {
  fixtureId: string;
  homeName?: string;
  awayName?: string;
  leagueName?: string;
  scheduledAt?: string;
}

export function SignInCTA({ fixtureId, homeName, awayName, leagueName, scheduledAt }: Props) {
  const [showSignIn, setShowSignIn] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);

  if (showSignIn) {
    return (
      <>
        <Header title="Sign in" />
        <main
          style={{
            minHeight: '100dvh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
          }}
        >
          <SignIn
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
            signUpUrl={`/sign-up?fixture=${fixtureId}`}
            forceRedirectUrl={`/new?fixture=${fixtureId}`}
          />
        </main>
      </>
    );
  }
  if (showSignUp) {
    return (
      <>
        <Header title="Sign up" />
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
            signInUrl={`/sign-in?fixture=${fixtureId}`}
            forceRedirectUrl={`/new?fixture=${fixtureId}`}
          />
        </main>
      </>
    );
  }

  return (
    <>
      <Header title="Track with Scoresheet" />
      <main
        style={{
          maxWidth: 600,
          margin: '0 auto',
          padding: '2.5rem 1.5rem',
        }}
      >
        <p
          style={{
            fontSize: '0.6875rem',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: '#FFB81C',
            fontWeight: 700,
            margin: 0,
          }}
        >
          RinkStop Scoresheet
        </p>
        <h1
          style={{
            fontSize: '1.75rem',
            fontWeight: 800,
            color: '#fff',
            margin: '0.75rem 0 0.5rem',
            lineHeight: 1.1,
          }}
        >
          {awayName || 'Away'} {awayName && '@'} {homeName || 'Home'}
        </h1>
        {leagueName && (
          <p
            style={{
              fontSize: '0.9375rem',
              color: 'rgba(255,255,255,0.7)',
              margin: 0,
            }}
          >
            {leagueName}
            {scheduledAt && (
              <> · {new Date(scheduledAt).toLocaleString()}</>
            )}
          </p>
        )}

        <section
          style={{
            background: 'rgba(0,0,0,0.25)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12,
            padding: '1.5rem',
            marginTop: '2rem',
            textAlign: 'center',
          }}
        >
          <p
            style={{
              fontSize: '0.6875rem',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.5)',
              fontWeight: 700,
              margin: 0,
            }}
          >
            Sign in to track
          </p>
          <p
            style={{
              fontSize: '0.9375rem',
              color: 'rgba(255,255,255,0.8)',
              margin: '0.75rem 0 1.25rem',
              lineHeight: 1.5,
            }}
          >
            Score this game from your phone — timer, play-by-play, and a
            shareable live view. Takes 10 seconds to sign in.
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setShowSignIn(true)}
              className="rs-btn-primary"
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => setShowSignUp(true)}
              className="rs-btn-secondary"
            >
              Create account
            </button>
          </div>
        </section>
      </main>
    </>
  );
}
