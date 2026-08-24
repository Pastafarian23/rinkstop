import { TIERS, formatTierPricePerYear, type TierName } from '@/lib/pricing';
import { ClaimUpgradeButton } from './ClaimUpgradeButton';

export interface ClaimIntentPanelProps {
  /** Entity kind: rink, team, league, player */
  entity: string;
  /** Display name of the entity being claimed */
  entityName: string;
  /** Recommended tier for this claim (cheapest paid that unlocks it) */
  recommendedTier: TierName;
  /** Optional upgrade tier suggestion (rendered as a "Need more?" link) */
  upgradeTier?: TierName | null;
  /** The user's current tier (for comparison copy) */
  currentTier: string;
  /** Whether the user is hitting the cap on their current tier */
  atCap: boolean;
  /** Whether the user is on free tier */
  isFree: boolean;
  /** Whether a free-tier user has exhausted their 1 free claim */
  freeUserAtCap: boolean;
  /** Entity id (used for resume after checkout) */
  entityId?: string;
}

/**
 * Phase 3 claim-intent panel on /dashboard/claims.
 *
 * Renders when a user lands on /dashboard/claims with ?intent=claim&entity=...&name=...
 * (the natural next step after signing up via the /sign-up tier card flow).
 *
 * Goal: reduce the claim funnel to 2 clicks:
 *   1. Land on /dashboard/claims (tier card + status timeline visible)
 *   2. Click "Claim and upgrade" → Stripe Checkout → return to claim form
 *
 * No /pricing detour, no re-pick entity.
 *
 * Server component. The interactive button is a separate client component.
 */
export function ClaimIntentPanel({
  entity,
  entityName,
  recommendedTier,
  upgradeTier = null,
  currentTier,
  atCap,
  isFree,
  freeUserAtCap,
  entityId,
}: ClaimIntentPanelProps) {
  const t = TIERS[recommendedTier];
  const upgradeT = upgradeTier ? TIERS[upgradeTier] : null;
  const needsUpgrade = (isFree && freeUserAtCap) || atCap || currentTier === recommendedTier === false;

  let statusLine: string;
  let statusColor: string;
  if (isFree && freeUserAtCap) {
    statusLine = `You've used your 1 free claim. Upgrade to ${t.label} to claim more listings.`;
    statusColor = '#FFB81C';
  } else if (isFree) {
    statusLine = `Claiming is free. Verify your identity (free, ~60 seconds) to add a 'Verified owner' badge to your listing.`;
    statusColor = '#14B8A6';
  } else if (atCap) {
    statusLine = `You've hit the ${currentTier} claim limit. Upgrade to ${t.label} for more claims, or contact sales for Federation custom volume.`;
    statusColor = '#FF6B7A';
  } else if (currentTier === 'verified_identity' || currentTier === 'business_listing' || currentTier === 'club_starter') {
    statusLine = `Your ${currentTier} tier covers this claim. Confirm to continue.`;
    statusColor = '#14B8A6';
  } else {
    statusLine = `Confirm to claim. Upgrade to ${t.label} for additional tools.`;
    statusColor = '#FFB81C';
  }

  return (
    <div
      data-testid="claim-intent-panel"
      style={{
        background: 'linear-gradient(135deg, rgba(255,184,28,0.08) 0%, rgba(20,184,166,0.04) 100%)',
        border: '2px solid rgba(255,184,28,0.4)',
        borderRadius: 14,
        padding: '1.5rem 1.75rem',
        marginBottom: '1.5rem',
        color: '#fff',
      }}
    >
      {/* Header: what they're claiming */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div
          style={{
            fontSize: '0.7rem',
            fontWeight: 800,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: '#FFB81C',
            marginBottom: '0.4rem',
          }}
        >
          ✦ Claiming {entity}
        </div>
        <div
          style={{
            fontSize: '1.25rem',
            fontWeight: 700,
            color: '#fff',
            lineHeight: 1.3,
            marginBottom: '0.5rem',
            wordBreak: 'break-word',
          }}
        >
          {entityName}
        </div>
        <div style={{ fontSize: '0.875rem', color: statusColor, lineHeight: 1.4, fontWeight: 500 }}>
          {statusLine}
        </div>
      </div>

      {/* Tier card */}
      <div
        style={{
          background: '#0a0a0a',
          border: '1px solid rgba(255,184,28,0.25)',
          borderRadius: 10,
          padding: '1.1rem 1.25rem',
          marginBottom: '1.25rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            gap: '0.75rem',
            flexWrap: 'wrap',
            marginBottom: '0.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>
              {t.label}
            </span>
            <span
              style={{
                fontSize: '0.625rem',
                fontWeight: 800,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: '#FFB81C',
                background: 'rgba(255,184,28,0.12)',
                padding: '0.2rem 0.5rem',
                borderRadius: 4,
              }}
            >
              Required
            </span>
          </div>
          <div
            style={{
              fontSize: '1.35rem',
              fontWeight: 800,
              color: '#FFB81C',
              whiteSpace: 'nowrap',
            }}
          >
            {formatTierPricePerYear(recommendedTier)}
          </div>
        </div>

        {t.tagline ? (
          <div
            style={{
              fontSize: '0.875rem',
              color: 'rgba(255,255,255,0.7)',
              lineHeight: 1.5,
              marginBottom: '0.75rem',
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
              gap: '0.4rem',
            }}
          >
            {t.features.slice(0, 5).map((f) => (
              <li
                key={f}
                style={{
                  display: 'flex',
                  gap: '0.5rem',
                  alignItems: 'flex-start',
                  fontSize: '0.85rem',
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

      {/* Status timeline */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div
          style={{
            fontSize: '0.7rem',
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.5)',
            marginBottom: '0.65rem',
          }}
        >
          Your claim flow
        </div>
        <ol
          style={{
            margin: 0,
            padding: 0,
            listStyle: 'none',
            display: 'grid',
            gap: '0.5rem',
            counterReset: 'phase3step',
          }}
        >
          <TimelineStep n={1} label="Create account" status="done" />
          <TimelineStep
            n={2}
            label={`Upgrade to ${t.label}`}
            status={(isFree && freeUserAtCap) || atCap ? 'current' : 'done'}
          />
          <TimelineStep n={3} label="Submit claim form" status="next" />
          <TimelineStep n={4} label="We review (24 hours for paid)" status="next" />
        </ol>
      </div>

      {/* Action button */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        {(isFree && freeUserAtCap) || atCap ? (
          <ClaimUpgradeButton
            tier={recommendedTier}
            entity={entity}
            entityId={entityId}
            entityName={entityName}
            label={`Claim & upgrade to ${t.label} — ${formatTierPricePerYear(recommendedTier)}`}
          />
        ) : (
          <a
            href="#submit-claim-form"
            style={{
              display: 'inline-block',
              background: '#FFB81C',
              color: '#0a0a0a',
              padding: '0.85rem 1.5rem',
              borderRadius: 8,
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: '0.95rem',
              textAlign: 'center',
              letterSpacing: '0.02em',
            }}
          >
            Continue to claim form →
          </a>
        )}
        {upgradeT ? (
          <a
            href={`/pricing?tier=${upgradeTier}${entityId ? `&entity=${entity}&id=${encodeURIComponent(entityId)}&name=${encodeURIComponent(entityName)}` : ''}`}
            style={{
              display: 'inline-block',
              background: 'transparent',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.2)',
              padding: '0.85rem 1.5rem',
              borderRadius: 8,
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '0.9rem',
              textAlign: 'center',
            }}
          >
            Compare to {upgradeT.label} — {formatTierPricePerYear(upgradeTier)}
          </a>
        ) : null}
      </div>
    </div>
  );
}

function TimelineStep({
  n,
  label,
  status,
}: {
  n: number;
  label: string;
  status: 'done' | 'current' | 'next';
}) {
  const styleMap = {
    done: { bg: '#14B8A6', color: '#0a0a0a', label: '✓' },
    current: { bg: '#FFB81C', color: '#0a0a0a', label: String(n) },
    next: { bg: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', label: String(n) },
  };
  const s = styleMap[status];

  return (
    <li
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.65rem',
        fontSize: '0.85rem',
        color: status === 'next' ? 'rgba(255,255,255,0.5)' : '#fff',
        fontWeight: status === 'current' ? 700 : 500,
      }}
    >
      <span
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          background: s.bg,
          color: s.color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.75rem',
          fontWeight: 800,
          flexShrink: 0,
        }}
      >
        {s.label}
      </span>
      <span>{label}</span>
    </li>
  );
}

/**
 * Parse claim intent from searchParams. Mirrors the parser in
 * src/app/sign-up/ClaimIntentCard.tsx but doesn't need to look inside
 * redirect_url (the user is already on /dashboard/claims directly).
 *
 * Returns null when:
 *  - intent != 'claim'
 *  - entity is not one of {rink, team, league, player}
 *  - entityName is missing
 */
export function parseClaimIntentForClaims(
  sp: { intent?: string; entity?: string; id?: string; name?: string; tier?: string; upgrade?: string } | undefined,
): { entity: string; entityId: string; entityName: string; recommendedTier: TierName; upgradeTier: TierName | null } | null {
  if (!sp) return null;
  if (sp.intent !== 'claim') return null;

  const entity = (sp.entity ?? '').toLowerCase();
  // Match the same entity set as src/app/sign-up/ClaimIntentCard.tsx
  const ENTITY_TO_TIER: Record<string, TierName> = {
    rink: 'business_listing',
    team: 'club_starter',
    league: 'club_starter',
    player: 'verified_identity',
  };
  if (!ENTITY_TO_TIER[entity]) return null;

  const entityName = (sp.name ?? '').trim();
  if (!entityName || entityName.length > 200) return null;

  const entityId = (sp.id ?? '').trim();

  const requestedTier = sp.tier;
  const recommendedTier: TierName =
    requestedTier && requestedTier in TIERS ? (requestedTier as TierName) : ENTITY_TO_TIER[entity];

  const requestedUpgrade = sp.upgrade;
  const upgradeTier: TierName | null =
    requestedUpgrade && requestedUpgrade in TIERS && requestedUpgrade !== recommendedTier
      ? (requestedUpgrade as TierName)
      : null;

  return { entity, entityId, entityName, recommendedTier, upgradeTier };
}