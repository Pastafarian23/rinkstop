/**
 * src/components/profile/UnifiedProfileLink.tsx
 *
 * A link from a legacy directory page to the person's canonical unified
 * profile.
 *
 * WHY
 *   The unified profile is only useful if the pages that already exist can
 *   reach it. Every existing public URL — `/directory/players/<slug>`,
 *   `/directory/coaches/<id>`, `/players/<uuid>` — keeps its own URL, its
 *   own canonical tag and its own content. This component adds ONE link to
 *   the canonical profile and changes nothing else.
 *
 * BEHAVIOR
 *   • Renders NOTHING when the feature flag is off, when the source record
 *     has no person, or when the person has no profile slug. The page then
 *     looks exactly as it did before.
 *   • Never renders for an account profile — an account URL IS the canonical
 *     profile, so there is nothing to link to.
 *
 * NO OWNERSHIP
 *   This component creates no claim, asserts no owner, and writes nothing.
 */

import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import { isPersonIdentityEnabled } from '@/lib/person-identity';

export interface UnifiedProfileLinkProps {
  /** The source namespace, e.g. 'rinkstop_players'. */
  source: string;
  /** The source row's primary key, as TEXT. */
  sourceId: string;
  /** Optional override for the link text. */
  label?: string;
  /** Render as a plain button rather than a text link. */
  variant?: 'inline' | 'button';
}

/**
 * Resolve the canonical profile path for a source record.
 *
 * Returns null when there is no canonical profile for this record.
 */
export async function getCanonicalProfilePath(
  source: string,
  sourceId: string,
): Promise<string | null> {
  if (!isPersonIdentityEnabled()) return null;

  const { data, error } = await supabaseAdmin
    .from('person_sources')
    .select('person_id')
    .eq('source', source)
    .eq('source_id', String(sourceId))
    .maybeSingle();

  if (error || !data) return null;

  const { data: person, error: personError } = await supabaseAdmin
    .from('persons')
    .select('slug, identity_state')
    .eq('id', (data as any).person_id)
    .maybeSingle();

  if (personError || !person) return null;

  // A merged-away person has no profile of its own — the survivor's is
  // canonical, and the merged-away person's path is an obsolete alias.
  if ((person as any).identity_state === 'merged') return null;

  const slug = (person as any).slug as string | null;
  return slug ? `/profile/${slug}` : null;
}

export default async function UnifiedProfileLink({
  source,
  sourceId,
  label = 'View unified profile',
  variant = 'inline',
}: UnifiedProfileLinkProps) {
  const path = await getCanonicalProfilePath(source, sourceId);
  if (!path) return null;

  if (variant === 'button') {
    return (
      <Link
        href={path}
        data-unified-profile-link={source}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '0.5rem 0.9rem',
          borderRadius: 8,
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.16)',
          color: '#fff',
          fontSize: '0.8125rem',
          fontWeight: 600,
          textDecoration: 'none',
        }}
      >
        {label} →
      </Link>
    );
  }

  return (
    <Link
      href={path}
      data-unified-profile-link={source}
      style={{
        color: '#FFB81C',
        fontSize: '0.8125rem',
        fontWeight: 600,
        textDecoration: 'none',
      }}
    >
      {label} →
    </Link>
  );
}
