import Link from 'next/link';

/**
 * RinkStop Scoresheet landing page.
 *
 * Public. No auth required to see this. The two CTAs (Live / Watch)
 * take users to sign-in if not authenticated.
 *
 * Phase A1: This is a marketing-light landing that explains the two
 * modes. Later phases add demo videos, screenshots, and pricing.
 */
export default function Home() {
  return (
    <main
      style={{
        maxWidth: 720,
        margin: '0 auto',
        padding: '2.5rem 1.25rem 4rem',
        minHeight: '100dvh',
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          marginBottom: '2.5rem',
        }}
      >
        <div
          aria-hidden
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: 'radial-gradient(circle at 30% 30%, #FFD66B 0%, #FFB81C 60%, #B45309 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: 16,
            color: '#0B1E3F',
            letterSpacing: '0.05em',
          }}
        >
          RS
        </div>
        <div>
          <p
            style={{
              fontSize: 11,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: '#FFB81C',
              fontWeight: 700,
              margin: 0,
            }}
          >
            RinkStop
          </p>
          <h1
            style={{
              fontSize: '1.25rem',
              margin: 0,
              fontWeight: 700,
              color: '#fff',
            }}
          >
            Scoresheet
          </h1>
        </div>
      </header>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2
          style={{
            fontSize: '2.25rem',
            fontWeight: 800,
            margin: '0 0 0.75rem',
            color: '#fff',
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
          }}
        >
          Score every hockey game.
        </h2>
        <p
          style={{
            fontSize: '1.0625rem',
            color: 'rgba(255,255,255,0.75)',
            lineHeight: 1.55,
            margin: 0,
            maxWidth: 560,
          }}
        >
          Official timing, play-by-play stats, and a shareable live view —
          right from your phone. Works offline. Built for rinks.
        </p>
      </section>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: '1rem',
          marginBottom: '2.5rem',
        }}
      >
        <Link
          href="/scoresheet/new/live"
          className="rs-card"
          style={{
            textDecoration: 'none',
            color: 'inherit',
            display: 'block',
            borderColor: '#FFB81C',
            background: 'linear-gradient(180deg, rgba(255,184,28,0.10) 0%, rgba(255,184,28,0.04) 100%)',
          }}
        >
          <p
            style={{
              fontSize: 11,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: '#FFB81C',
              fontWeight: 700,
              margin: 0,
            }}
          >
            For scorekeepers
          </p>
          <h3
            style={{
              fontSize: '1.375rem',
              fontWeight: 700,
              margin: '0.5rem 0 0.5rem',
              color: '#fff',
            }}
          >
            Live Scoring →
          </h3>
          <p
            style={{
              fontSize: '0.9375rem',
              color: 'rgba(255,255,255,0.7)',
              lineHeight: 1.55,
              margin: 0,
            }}
          >
            Full timer, every event type, official PDF scoresheet, roster
            entry. For the person running the game.
          </p>
        </Link>

        <Link
          href="/scoresheet/new/watch"
          className="rs-card"
          style={{
            textDecoration: 'none',
            color: 'inherit',
            display: 'block',
          }}
        >
          <p
            style={{
              fontSize: 11,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.5)',
              fontWeight: 700,
              margin: 0,
            }}
          >
            For fans
          </p>
          <h3
            style={{
              fontSize: '1.375rem',
              fontWeight: 700,
              margin: '0.5rem 0 0.5rem',
              color: '#fff',
            }}
          >
            Watch Mode →
          </h3>
          <p
            style={{
              fontSize: '0.9375rem',
              color: 'rgba(255,255,255,0.7)',
              lineHeight: 1.55,
              margin: 0,
            }}
          >
            Tap &quot;Home goal&quot; / &quot;Away goal&quot; as you watch. No
            roster, no setup. Track every game your team plays.
          </p>
        </Link>
      </section>

      <section
        style={{
          background: 'rgba(0,0,0,0.25)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 12,
          padding: '1.5rem',
          marginBottom: '2rem',
        }}
      >
        <h3
          style={{
            fontSize: '1.0625rem',
            fontWeight: 700,
            color: '#fff',
            margin: '0 0 0.5rem',
          }}
        >
          Phase A1 — Foundation
        </h3>
        <p
          style={{
            fontSize: '0.875rem',
            color: 'rgba(255,255,255,0.7)',
            lineHeight: 1.55,
            margin: 0,
          }}
        >
          This is the first build. The two flows above (Live Scoring and
          Watch Mode) are coming online. Sign in to be notified when they
          ship.
        </p>
        <div
          style={{
            display: 'flex',
            gap: '0.75rem',
            marginTop: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <Link href="/sign-in" className="rs-btn-primary">
            Sign in
          </Link>
          <Link href="/sign-up" className="rs-btn-secondary">
            Create account
          </Link>
        </div>
      </section>

      <footer
        style={{
          fontSize: '0.75rem',
          color: 'rgba(255,255,255,0.4)',
          textAlign: 'center',
          marginTop: '3rem',
        }}
      >
        A RinkStop product. <a href="https://rinkstop.com" style={{ color: '#FFB81C' }}>rinkstop.com</a>
      </footer>
    </main>
  );
}
