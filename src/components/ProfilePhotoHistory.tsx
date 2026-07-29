interface PhotoHistoryEntry {
  id: string;
  url: string | null;
  set_at: string;
  replaced_at: string | null;
  removed_at: string | null;
  source: string;
}

interface ProfilePhotoHistoryProps {
  photos: PhotoHistoryEntry[];
  showLabel?: boolean;
  maxItems?: number;
}

/**
 * Photo history grid. Replaces the broken rendering in the legacy
 * page where non-current photos fell back to a purple default avatar
 * placeholder. This version:
 *  - Shows only entries with a valid URL (broken ones are filtered out upstream)
 *  - Renders the thumbnail if the URL resolves, or a subtle dark placeholder
 *    with the date label below (no purple avatar)
 *  - Marks the current photo with a red border + "Current" badge
 *  - Compact sizing for sidebar use (max 4 items)
 */
export default function ProfilePhotoHistory({
  photos,
  showLabel = true,
  maxItems = 4,
}: ProfilePhotoHistoryProps) {
  // Filter to only those with a usable URL; cap to maxItems.
  const visible = photos.filter((p) => !!p.url).slice(0, maxItems);

  if (visible.length === 0) return null;

  return (
    <div>
      {showLabel && (
        <div className="flex items-center justify-between mb-2.5">
          <h3
            className="font-sport uppercase"
            style={{
              fontSize: '0.75rem',
              letterSpacing: '0.12em',
              color: 'rgba(255,255,255,0.5)',
              margin: 0,
            }}
          >
            Photos
          </h3>
          {photos.length > maxItems && (
            <span
              style={{
                fontSize: '0.6875rem',
                color: 'rgba(255,255,255,0.4)',
              }}
            >
              +{photos.length - maxItems} more
            </span>
          )}
        </div>
      )}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '0.375rem',
        }}
      >
        {visible.map((p, i) => {
          const isCurrent = i === 0 && !p.removed_at;
          return (
            <div
              key={p.id}
              style={{
                position: 'relative',
                aspectRatio: '1 / 1',
                borderRadius: 6,
                overflow: 'hidden',
                background: 'rgba(255,255,255,0.04)',
                border: isCurrent ? '2px solid var(--red)' : '1px solid rgba(255,255,255,0.08)',
              }}
            >
              {p.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.url}
                  alt={isCurrent ? 'Current profile photo' : 'Previous profile photo'}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.6875rem',
                    color: 'rgba(255,255,255,0.25)',
                  }}
                  aria-hidden
                >
                  —
                </div>
              )}
              {isCurrent && (
                <div
                  style={{
                    position: 'absolute',
                    top: 2,
                    right: 2,
                    background: 'var(--gold)',
                    color: '#041E42',
                    fontSize: '0.5rem',
                    fontWeight: 800,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    padding: '0.0625rem 0.25rem',
                    borderRadius: 3,
                  }}
                >
                  Current
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
