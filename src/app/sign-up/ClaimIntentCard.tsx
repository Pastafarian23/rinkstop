import type { TierName } from '@/lib/pricing';
import { TIERS, formatTierPricePerYear } from '@/lib/pricing';

/**
 * Which tier the claim funnels SHOW — NOT which tier is required.
 *
 * 2026-10-30 (Arnel-flagged): this map is what produced "Claim a team —
 * $99, Required" on the sign-up page, while the claim page header said
 * "Claiming is free". Both were on screen at the same time.
 *
 * THE TRUTH: claiming is FREE. `LISTING_CLAIMS_PER_TIER` in src/lib/pricing.ts
 * grants `free` → 1 claim and `org_free` → 1 claim. A person or a club can
 * claim one listing with no card on file.
 *
 * What the paid tiers buy is TOOLS (photos, lead capture, payments, multiple
 * team workspaces, reporting) — never the ability to claim.
 *
 * So the funnel should show the FREE tier as required, and offer the paid
 * tier as an optional upgrade. The map below is therefore keyed to the free
 * tier for every entity type.
 */
const ENTITY_TO_TIER: Record<string, TierName> = {
  rink: 'free',
  team: 'free',
  league: 'free',
  player: 'free',
};

/**
 * The optional paid tier offered AFTER the free claim, per entity type.
 * Shown as "Want more?" — never as "Required".
 */
const ENTITY_TO_UPGRADE: Record<string, TierName> = {
  rink: 'org_plus',
  team: 'org_plus',
  league: 'org_plus',
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
  upgradeTier?: TierName | null;
}

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
            <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>
              {t.label}
            </span>
            <span
              style={{
                fontSize: '0.625rem',
                fontWeight: 800,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: '#14B8A6',
                background: 'rgba(20, 184, 166, 0.12)',
                padding: '0.15rem 0.45rem',
                borderRadius: 4,
              }}
            >
              Free
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
          Optional: {upgradeT.label} at {formatTierPricePerYear(upgradeTier!)} unlocks more
          listings and features. You can upgrade any time after sign-up — claiming
          works either way.
        </div>
      ) : null}

      <div
        style={{
          marginTop: '0.75rem',
          fontSize: '0.7rem',
          color: 'rgba(255,255,255,0.4)',
          textAlign: 'center',
          lineHeight: 1.4,
        }}
      >
        Create your free account below. Claiming is free — no card needed, and
        you&rsquo;ll only pay if you later choose a plan for extra tools.
      </div>
    </div>
  );
}

export function parseClaimIntent(
  sp: Record<string, string | string[] | undefined> | undefined,
): { entity: string; entityName: string; tier: TierName; upgradeTier: TierName | null } | null {
  if (!sp) return null;

  const merged: Record<string, string> = {};

  for (const [k, v] of Object.entries(sp)) {
    if (typeof v === 'string') merged[k] = v;
    else if (Array.isArray(v) && v.length > 0 && typeof v[0] === 'string') merged[k] = v[0];
  }

  const redirectRaw = merged.redirect_url;
  if (redirectRaw) {
    try {
      const qIndex = redirectRaw.indexOf('?');
      if (qIndex >= 0) {
        const queryString = redirectRaw.slice(qIndex + 1);
        for (const [k, v] of new URLSearchParams(queryString)) {
          merged[k] = v;
        }
      }
    } catch {
      // ignore malformed redirect_url
    }
  }

  if (merged.intent !== 'claim') return null;

  const entity = (merged.entity ?? '').toLowerCase();
  if (!ENTITY_TO_TIER[entity]) return null;

  const entityName = (merged.name ?? '').trim();
  if (!entityName || entityName.length > 200) return null;

  const requestedTier = merged.tier;
  const tier: TierName =
    requestedTier && requestedTier in TIERS ? (requestedTier as TierName) : ENTITY_TO_TIER[entity];

  // The upgrade tier defaults to the optional paid tier for this entity.
  // A caller can override it explicitly via `upgrade=`.
  const requestedUpgrade = merged.upgrade;
  const upgradeTier: TierName | null =
    requestedUpgrade && requestedUpgrade in TIERS && requestedUpgrade !== tier
      ? (requestedUpgrade as TierName)
      : ENTITY_TO_UPGRADE[entity] !== tier
        ? ENTITY_TO_UPGRADE[entity]
        : null;

  return { entity, entityName, tier, upgradeTier };
}
