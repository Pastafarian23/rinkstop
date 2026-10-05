/**
 * ScoresheetQRPanel — server-rendered card on rinkstop.com /directory/games/[id]
 *
 * Shows the QR + a "Track this game with Scoresheet" CTA. Only renders
 * for `scheduled` fixtures (B3 will replace this with the live broadcast
 * card for `in_progress` fixtures linked to a scoresheet game).
 *
 * The QR image is loaded from /api/scoresheet-qr/[fixtureId] so the SVG
 * is cached at the edge. The deep-link is also surfaced as a copy-able
 * URL for users who can't scan (desktop, etc).
 */

interface Props {
  fixtureId: string;
  status: string;
  /** Set false by /api route to suppress rendering when qr is opted out. */
  qrEnabled?: boolean;
}

export function ScoresheetQRPanel({ fixtureId, status, qrEnabled = true }: Props) {
  if (status !== 'scheduled') return null;
  if (!qrEnabled) return null;

  const deepLink = `https://scoresheet.rinkstop.com/new?fixture=${encodeURIComponent(fixtureId)}`;

  return (
    <section
      data-scoresheet-qr
      style={{
        background: 'linear-gradient(180deg, rgba(255,184,28,0.06) 0%, rgba(15,23,42,0.4) 100%)',
        border: '1px solid rgba(255,184,28,0.25)',
        borderRadius: 12,
        padding: '1.25rem',
        margin: '1.5rem 0',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '1.25rem',
      }}
    >
      <img
        src={`/api/scoresheet-qr/${encodeURIComponent(fixtureId)}`}
        alt="QR code — scan to open this game in the RinkStop Scoresheet app"
        width={120}
        height={120}
        loading="lazy"
        style={{
          display: 'block',
          width: 120,
          height: 120,
          background: '#fff',
          borderRadius: 8,
          padding: 6,
          flexShrink: 0,
        }}
      />
      <div style={{ flex: '1 1 280px', minWidth: 0 }}>
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
        <h3
          style={{
            fontSize: '1.125rem',
            fontWeight: 700,
            color: '#fff',
            margin: '0.25rem 0 0.5rem',
          }}
        >
          Track this game with the Scoresheet app
        </h3>
        <p
          style={{
            fontSize: '0.875rem',
            color: 'rgba(255,255,255,0.75)',
            lineHeight: 1.5,
            margin: '0 0 0.625rem',
          }}
        >
          Scan to score from your phone at the rink — real-time timer,
          play-by-play events, and a shareable live view for coaches
          and parents.
        </p>
        <a
          href={deepLink}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-block',
            padding: '0.5rem 1rem',
            background: '#FFB81C',
            color: '#041E42',
            borderRadius: 6,
            textDecoration: 'none',
            fontWeight: 700,
            fontSize: '0.8125rem',
            letterSpacing: '0.04em',
          }}
        >
          Open in Scoresheet →
        </a>
        <p
          style={{
            fontSize: '0.6875rem',
            color: 'rgba(255,255,255,0.4)',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            margin: '0.625rem 0 0',
            wordBreak: 'break-all',
          }}
        >
          {deepLink}
        </p>
      </div>
    </section>
  );
}
