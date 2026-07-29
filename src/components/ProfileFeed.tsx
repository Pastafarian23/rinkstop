import Link from 'next/link';

interface ProfileFeedProps {
  isOwner: boolean;
  username: string;
}

/**
 * Right column feed for the profile page. Posts / Updates surface.
 *
 * Current state: empty. The "posts" feature is not yet built — this
 * component renders an empty state with a clear CTA for the owner
 * (link to dashboard) and a polite "no posts yet" state for everyone
 * else. When the posts schema + composer ship, this is the single file
 * to update to swap the empty state for a real feed.
 */
export default function ProfileFeed({ isOwner, username }: ProfileFeedProps) {
  return (
    <section id="posts" className="space-y-4">
      {/* Empty state hero */}
      <div
        style={{
          background: 'rgba(0,0,0,0.25)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 8,
          padding: '2rem 1.5rem',
          textAlign: 'center',
        }}
      >
        <div
          aria-hidden
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'rgba(255,184,28,0.1)',
            border: '1px solid rgba(255,184,28,0.3)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.75rem',
            marginBottom: '0.875rem',
          }}
        >
          📝
        </div>
        <h2
          className="font-sport"
          style={{
            fontSize: '1.25rem',
            letterSpacing: '0.04em',
            color: '#fff',
            margin: 0,
            marginBottom: '0.5rem',
          }}
        >
          {isOwner ? 'Share your first update' : 'No posts yet'}
        </h2>
        <p
          style={{
            fontSize: '0.875rem',
            color: 'rgba(255,255,255,0.55)',
            margin: 0,
            marginBottom: isOwner ? '1.25rem' : 0,
            lineHeight: 1.5,
          }}
        >
          {isOwner
            ? 'Post updates, share highlights, and write about your hockey journey. Posts are public and indexed by search.'
            : 'When this profile starts posting, the updates will appear here.'}
        </p>
        {isOwner && (
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5"
            style={{
              background: 'var(--red)',
              color: '#fff',
              border: '1px solid var(--red-dark)',
              borderRadius: 6,
              padding: '0.5rem 1rem',
              fontSize: '0.8125rem',
              fontWeight: 700,
              letterSpacing: '0.05em',
              textDecoration: 'none',
              textTransform: 'uppercase',
            }}
          >
            Open dashboard
            <span aria-hidden>→</span>
          </Link>
        )}
      </div>

      {/* Media placeholder — same "Coming soon" pattern as the tab nav */}
      <div id="media" style={{ scrollMarginTop: '5rem' }}>
        <div
          style={{
            background: 'rgba(0,0,0,0.25)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 8,
            padding: '1.5rem',
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <h2
              className="font-sport uppercase"
              style={{
                fontSize: '0.75rem',
                letterSpacing: '0.12em',
                color: 'rgba(255,255,255,0.5)',
                margin: 0,
              }}
            >
              Media
            </h2>
            <span
              style={{
                fontSize: '0.5625rem',
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.3)',
              }}
            >
              Coming soon
            </span>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '0.5rem',
            }}
          >
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  aspectRatio: '1 / 1',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px dashed rgba(255,255,255,0.1)',
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                  color: 'rgba(255,255,255,0.15)',
                }}
                aria-hidden
              >
                +
              </div>
            ))}
          </div>
          <p
            className="mt-3"
            style={{
              fontSize: '0.75rem',
              color: 'rgba(255,255,255,0.4)',
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            Photos and videos uploaded by this profile will appear here.
          </p>
        </div>
      </div>
    </section>
  );
}
