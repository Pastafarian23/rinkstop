import type { TierName } from '@/lib/pricing';
import { TIERS, formatTierPricePerYear } from '@/lib/pricing';

/**
 * Entity → recommended tier mapping.
 *
 * Mirrors src/components/ClaimThisListing.tsx DEFAULT_TIER_BY_ENTITY so
 * the price shown on the sign-up page matches the price shown on the
 * directory page CTAs. Keep in sync.
 *
 * Each entry is the CHEAPEST paid tier that unlocks a claim for that
 * entity type. Users can still pick a different tier after sign-up
 * (e.g., Club Pro instead of Club Starter) — this is just the default.
 */
const ENTITY_TO_TIER: Record<string, TierName> = {
  rink: 'business_listing',
  team: 'club_starter',
  league: 'club_starter',
  player: 'verified_identity',
};

const ENTITY_LABEL: Record<string, { singular: string; what: string }> = {
  rink: { singular: 'rink', what: 'your rink' },
  team: { singular: 'team', what: 'your team' },
  league: { singular: 'league', what: 'your league' },
  player: { singular: 'player', what: 'your player profile' },
};

export interface ClaimIntentCardProps {
  entity: string;
  entityName: string;
  tier: TierName;
  /** Optional: tier the user might want to consider upgrading to (highlighted in card). */
  upgradeTier?: TierName | null;
}

/**
 * Tier card shown above the Clerk SignUp form when the user landed via
 * a claim intent deep link (?intent=claim&entity=...&name=...&tier=...).
 *
 * Renders:
 *  - The entity they want to claim (so the user can verify it's the right one)
 *  - The recommended tier with price, tagline, and top features
 *  - An optional upgrade suggestion (tier above the recommended one)
 *  - A "Create account to claim" line that reassures the user the price is
 *    shown BEFORE they sign up
 *
 * Static server component (no client state). Designed to live above the
 * Clerk SignUp form without disrupting Clerk's own UI.
 */
export function ClaimIntentCard({ entity, entityName, tier, upgradeTier = null }: ClaimIntentCardProps) {
  const t = TIERS[tier];
  const label = ENTITY_LABEL[entity] ?? ENTITY_LABEL.team;
  const upgradeT = upgradeTier ? TIERS[upgradeTier] : null;

  return (
    <div
      data-testid="claim-intent-card"
      style={{
        background: 'rgba(255, 184, 28, 0.06)',
        border: '1px solid rgba(255, 184, 28, 0.35)',
        borderRadius: 10,
        padding: '1.1rem 1.25rem',
        marginBottom: '1.25rem',
        color: '#fff',
      }}
    >
      {/* Header: what they're claiming */}
      <div style={{ marginBottom: '0.85rem' }}>
        <div
          style={{
            fontSize: '0.65rem',
            fontWeight: 800,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: '#FFB81C',
            marginBottom: '0.35rem',
          }}
        >
          Claiming {label.singular}
        </div>
        <div
          style={{
            fontSize: '1.05rem',
            fontWeight: 700,
            color: '#fff',
            lineHeight: 1.3,
            marginBottom: '0.4rem',
            wordBreak: 'break-word',
          }}
        >
          {entityName}
        </div>
        <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.4 }}>
          You&rsquo;ll need a RinkStop account to finish this claim.
        </div>
      </div>

      {/* Recommended tier card */}
      <div
        style={{
          background: '#0f0f0f',
          border: '1px solid rgba(255, 184, 28, 0.25)',
          borderRadius: 8,
          padding: '0.85rem 1rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            gap: '0.75rem',
            flexWrap: 'wrap',
            marginBottom: '0.4rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: '0.95rem',
                fontWeight: 700,
                color: '#fff',
              }}
            >
              {t.label}
            </span>
            <span
              style={{
                fontSize: '0.625rem',
                fontWeight: 800,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: '#FFB81C',
                background: 'rgba(255, 184, 28, 0.12)',
                padding: '0.15rem 0.45rem',
                borderRadius: 4,
              }}
            >
              Required
            </span>
          </div>
          <div
            style={{
              fontSize: '1.1rem',
              fontWeight: 800,
              color: '#FFB81C',
              whiteSpace: 'nowrap',
            }}
          >
            {formatTierPricePerYear(tier)}
          </div>
        </div>

        {t.tagline ? (
          <div
            style={{
              fontSize: '0.8125rem',
              color: 'rgba(255,255,255,0.7)',
              lineHeight: 1.4,
              marginBottom: '0.6rem',
            }}
          >
            {t.tagline}
          </div>
        ) : null}

        {t.features && t.features.length > 0 ? (
          <ul
            style={{
              margin: 0,
              padding: 0,
              listStyle: 'none',
              display: 'grid',
              gap: '0.3rem',
            }}
          >
            {t.features.slice(0, 5).map((f) => (
              <li
                key={f}
                style={{
                  display: 'flex',
                  gap: '0.4rem',
                  alignItems: 'flex-start',
                  fontSize: '0.8125rem',
                  color: 'rgba(255,255,255,0.85)',
                  lineHeight: 1.4,
                }}
              >
                <span style={{ color: '#14B8A6', flexShrink: 0, fontWeight: 700 }}>✓</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {/* Optional upgrade suggestion */}
      {upgradeT ? (
        <div
          style={{
            marginTop: '0.6rem',
            fontSize: '0.75rem',
            color: 'rgba(255,255,255,0.55)',
            lineHeight: 1.4,
            textAlign: 'center',
          }}
        >
          Need more? {upgradeT.label} at {formatTierPricePerYear(upgradeTier!)} unlocks more
          listings and features. You can upgrade any time after sign-up.
        </div>
      ) : null}

      {/* Footnote — what the price actually includes */}
      <div
        style={{
          marginTop: '0.75rem',
          fontSize: '0.7rem',
          color: 'rgba(255,255,255,0.4)',
          textAlign: 'center',
          lineHeight: 1.4,
        }}
      >
        Create your free account below &mdash; you&rsquo;ll pay for {label.what} after email
        verification.
      </div>
    </div>
  );
}

/**
 * Validate the claim-intent query params and return a parsed intent, or
 * null if the request is not a claim flow.
 *
 * Returns null when:
 *  - intent != 'claim'
 *  - entity is not one of {rink, team, league, player}
 *  - tier is provided but not a valid TierName
 *  - entityName is missing or unreasonably long (DoS protection)
 */
export function parseClaimIntent(
  sp: Record<string, string | string[] | undefined> | undefined,
): { entity: string; entityName: string; tier: TierName; upgradeTier: TierName | null } | null {
  if (!sp) return null;
  if (String(sp.intent) !== 'claim') return null;

  const entity = String(sp.entity ?? '').toLowerCase();
  if (!ENTITY_TO_TIER[entity]) return null;

  const rawName = sp.name;
  const entityName = (Array.isArray(rawName) ? rawName[0] : rawName ?? '').trim();
  if (!entityName || entityName.length > 200) return null;

  // Tier: use the query param if it's valid, otherwise fall back to the
  // entity's default. This lets deep links override (e.g. ?tier=club_pro
  // when a user has already decided to go Pro).
  const rawTier = sp.tier;
  const requestedTier = Array.isArray(rawTier) ? rawTier[0] : rawTier;
  const tier: TierName = requestedTier && requestedTier in TIERS ? (requestedTier as TierName) : ENTITY_TO_TIER[entity];

  // Optional upgrade tier. Suggests the next tier up from the recommended
  // one, but only if the caller explicitly provided one (we don't want to
  // auto-recommend Club Pro to someone who clicked Club Starter).
  const rawUpgrade = sp.upgrade;
  const requestedUpgrade = Array.isArray(rawUpgrade) ? rawUpgrade[0] : rawUpgrade;
  const upgradeTier: TierName | null =
    requestedUpgrade && requestedUpgrade in TIERS && requestedUpgrade !== tier
      ? (requestedUpgrade as TierName)
      : null;

  return { entity, entityName, tier, upgradeTier };
}
