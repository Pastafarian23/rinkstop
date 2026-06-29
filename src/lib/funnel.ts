/**
 * src/lib/funnel.ts
 *
 * Pure functions for computing conversion funnels from analytics_events rows.
 * No I/O. Testable in isolation.
 *
 * A "funnel" is an ordered list of event names representing a user journey:
 *   [top, ..., bottom]
 * The output is per-step counts of distinct user_ids who fired that event
 * in the window, plus conversion percentages.
 *
 * Examples (defined in BUSINESS_FUNNEL and PERSONAL_FUNNEL):
 *   claim_search_viewed -> claim_started -> claim_submitted -> claim_approved
 *   tool_viewed -> calculator_used -> pricing_viewed -> checkout_started
 */

export interface FunnelEventRow {
  name: string;
  user_id: string | null;
}

export interface FunnelStepResult {
  event: string;
  unique_users: number;
  pct_of_top: number;   // % of the top step's count (first step = 100)
  pct_of_prev: number | null; // % of previous step's count (first step = null)
}

export interface FunnelResult {
  label: string;
  steps: FunnelStepResult[];
  /** Step index (0-based) with the largest drop in pct_of_prev. null if <2 steps. */
  biggest_drop_index: number | null;
}

/** Roster/parent/coach funnel — pricing page is the conversion surface. */
export const PERSONAL_FUNNEL = {
  label: 'Free → Personal (parents/coaches)',
  steps: ['tool_viewed', 'calculator_used', 'pricing_viewed', 'checkout_started', 'checkout_completed'],
} as const;

/** Operator funnel — claim workflow is the conversion surface. */
export const BUSINESS_FUNNEL = {
  label: 'Free → Business (operators)',
  steps: ['claim_search_viewed', 'claim_started', 'claim_submitted', 'claim_approved', 'checkout_started', 'checkout_completed'],
} as const;

/**
 * Human-readable label for an event name. Falls back to the raw event name.
 */
export function eventLabel(name: string): string {
  const map: Record<string, string> = {
    tool_viewed: 'Tool viewed',
    calculator_used: 'Calculator used',
    pricing_viewed: 'Pricing page viewed',
    checkout_started: 'Checkout started',
    checkout_completed: 'Checkout completed',
    claim_search_viewed: 'Claim searched',
    claim_started: 'Claim started',
    claim_submitted: 'Claim submitted',
    claim_approved: 'Claim approved',
  };
  return map[name] ?? name;
}

/**
 * Compute the funnel result from a flat list of analytics_events rows.
 *
 * Rows are filtered by event name (matching the funnel's step list) before
 * counting. Rows with null user_id are dropped (anonymous events can't be
 * tracked through a funnel).
 *
 * @param rows Analytics events. Can be a superset of the funnel's events;
 *             non-matching events are ignored.
 * @param label Human-readable funnel label (e.g. "Free → Business").
 * @param steps Ordered list of event names in the funnel.
 */
export function computeFunnel(
  rows: FunnelEventRow[],
  label: string,
  steps: readonly string[],
): FunnelResult {
  const stepSet = new Set(steps);
  // user_id -> set of events fired by that user (within the funnel)
  const userEvents = new Map<string, Set<string>>();

  for (const row of rows) {
    if (!row.user_id) continue;
    if (!stepSet.has(row.name)) continue;
    let set = userEvents.get(row.user_id);
    if (!set) {
      set = new Set();
      userEvents.set(row.user_id, set);
    }
    set.add(row.name);
  }

  // For each step, count distinct users who fired that event AND all
  // previous steps (strict funnel: user must have passed through every
  // earlier step). This is the standard "funnel" definition — not the
  // looser "any user who fired event X" definition, which would inflate.
  const stepCounts: number[] = [];
  for (let i = 0; i < steps.length; i++) {
    let count = 0;
    for (const set of userEvents.values()) {
      let passedAll = true;
      for (let j = 0; j <= i; j++) {
        if (!set.has(steps[j])) {
          passedAll = false;
          break;
        }
      }
      if (passedAll) count++;
    }
    stepCounts.push(count);
  }

  const top = stepCounts[0] ?? 0;
  const stepResults: FunnelStepResult[] = steps.map((event, i) => {
    const count = stepCounts[i];
    const pctOfTop = top > 0 ? round1((count / top) * 100) : 0;
    const pctOfPrev = i === 0
      ? null
      : stepCounts[i - 1] > 0
        ? round1((count / stepCounts[i - 1]) * 100)
        : 0;
    return {
      event,
      unique_users: count,
      pct_of_top: pctOfTop,
      pct_of_prev: pctOfPrev,
    };
  });

  // Find biggest drop (largest pct_of_prev reduction between consecutive steps).
  // Skip the first step (pct_of_prev is null).
  let biggestDropIndex: number | null = null;
  let biggestDropPct = -Infinity;
  for (let i = 1; i < stepResults.length; i++) {
    const prev = stepResults[i - 1].pct_of_prev;
    const curr = stepResults[i].pct_of_prev;
    if (prev === null || curr === null) continue;
    const drop = prev - curr;
    if (drop > biggestDropPct) {
      biggestDropPct = drop;
      biggestDropIndex = i;
    }
  }

  return {
    label,
    steps: stepResults,
    biggest_drop_index: biggestDropIndex === -Infinity ? null : biggestDropIndex,
  };
}

/** Round to 1 decimal place. 0/0 returns 0, not NaN. */
function round1(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 10) / 10;
}