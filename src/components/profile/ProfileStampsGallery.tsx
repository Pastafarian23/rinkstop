import Link from 'next/link';
import { getPublicStampsForProfile } from '@/lib/profile/stamps-for-profile';

/**
 * <ProfileStampsGallery /> — Public stamp gallery for /profile/[slug].
 *
 * Surfaces the passport holder's stamped rinks (with attendance counts)
 * as a real, scannable gallery on the profile page. Before this, the
 * profile had:
 *   - "Joined 2026" metadata
 *   - "No bio yet" placeholder
 *   - "NO POSTS YET" empty feed
 * None of which communicate "this user has actually been to 12 rinks."
 *
 * After: a "Stamps" card with up to 8 visible rinks (linked to /directory),
 * a "+N more" overflow link, and a "View full passport →" footer CTA.
 *
 * Why this matters:
 *   The Hockey Passport's #1 conversion lever is the social proof that
 *   "this product looks good when used." Stamps on the public profile
 *   let visitors see what a stamped passport actually IS — rinks you've
 *   been to, leagues you've played in. The owner sees their stamps; the
 *   visitor sees what having a passport means.
 */

interface Props {
  holderUserId: string;
  /** Display name of the holder, used in the section title */
  displayName: string;
  /** URL to the holder's passport page (for the View full CTA) */
  passportUrl: string | null;
}

export default async function ProfileStampsGallery({
  holderUserId,
  displayName,
  passportUrl,
}: Props) {
  const result = await getPublicStampsForProfile(holderUserId);

  // No stamps → don't render anything. "No section ever says 'No data'".
  if (!result || result.rinkCount === 0) return null;

  const visible = result.rinks.slice(0, 8);
  const overflow = Math.max(0, result.rinks.length - visible.length);

  return (
    <section
      data-profile-stamps-gallery
      aria-label={`${displayName}'s stamped rinks`}
      style={{
        background: 'rgba(0,0,0,0.25)',
        border: '1px solid rgba(255,184,28,0.18)',
        borderRadius: 10,
        padding: '1.25rem 1.25rem 1rem',
        position: 'relative',
      }}
    >
      {/* Gold accent corner */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '40%',
          height: '3px',
          background: 'linear-gradient(90deg, transparent 0%, #FFB81C 100%)',
        }}
      />

      <div style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        marginBottom: '0.875rem',
        gap: '0.75rem',
        flexWrap: 'wrap',
      }}>
        <h2 style={{
          fontSize: '0.7rem',
          fontWeight: 800,
          letterSpacing: '0.22em',
          color: '#FFB81C',
          textTransform: 'uppercase',
          margin: 0,
        }}>
          Stamps ({result.rinkCount})
        </h2>
        {result.eventCount > 0 && (
          <span style={{
            fontSize: '0.7rem',
            color: 'rgba(255,255,255,0.55)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            fontWeight: 600,
          }}>
            + {result.eventCount} event{result.eventCount === 1 ? '' : 's'}
          </span>
        )}
      </div>

      <p style={{
        fontSize: '0.75rem',
        color: 'rgba(255,255,255,0.55)',
        margin: '0 0 0.875rem',
        lineHeight: 1.5,
      }}>
        Rinks {displayName.split(' ')[0]} has visited. Each stamp is verified at the rink.
      </p>

      <ul
        data-stamp-list
        style={{
          listStyle: 'none',
          margin: 0,
          padding: 0,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: '0.5rem',
        }}
      >
        {visible.map((rink) => (
          <li key={rink.id}>
            <Link
              href={`/directory/rinks/${rink.slug}`}
              data-stamp-rink={rink.slug}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 0.6rem',
                background: 'rgba(255,184,28,0.08)',
                border: '1px solid rgba(255,184,28,0.2)',
                borderRadius: 6,
                textDecoration: 'none',
                color: '#fff',
                fontSize: '0.8125rem',
                fontWeight: 600,
                transition: 'border-color 0.15s, background 0.15s',
              }}
            >
              {/* Gold stamp dot */}
              <span
                aria-hidden
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#FFB81C',
                  flexShrink: 0,
                  boxShadow: '0 0 6px rgba(255,184,28,0.5)',
                }}
              />
              <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {rink.name}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <div
        data-stamp-footer
        style={{
          marginTop: '0.875rem',
          paddingTop: '0.875rem',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '0.75rem',
          flexWrap: 'wrap',
        }}
      >
        {overflow > 0 && passportUrl && (
          <Link
            href={passportUrl}
            style={{
              fontSize: '0.8125rem',
              color: 'rgba(255,255,255,0.7)',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            + {overflow} more rink{overflow === 1 ? '' : 's'} →
          </Link>
        )}
        {passportUrl && (
          <Link
            href={passportUrl}
            data-stamp-view-passport
            style={{
              fontSize: '0.8125rem',
              fontWeight: 700,
              color: '#FFB81C',
              textDecoration: 'none',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            View full passport →
          </Link>
        )}
      </div>
    </section>
  );
}