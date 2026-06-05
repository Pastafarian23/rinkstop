/**
 * SEO helpers for indexability decisions
 *
 * Used by directory pages to decide whether to expose a `noindex` meta tag.
 * Google Helpful Content Update penalizes thin/duplicate content, so we mark
 * pages that don't meet minimum content thresholds as noindex to protect the
 * authority of the high-quality pages in the index.
 */

export type IndexDecision = {
  indexable: boolean;
  reason: string;
  /** unique-content score 0-100; higher = more unique */
  uniquenessScore: number;
};

const NOINDEX = 'noindex,follow';
const INDEX = 'index,follow';

/**
 * Minimum content thresholds per page type. Pages below threshold are noindexed.
 * Numbers calibrated against the current average content depth of each page type.
 */
export const THRESHOLDS = {
  /** City page: must have at least one unique local content block + listings */
  city: { minListings: 1, minUniqueWordCount: 100 },
  /** State/province page: should have content + multiple cities */
  state: { minCities: 3, minUniqueWordCount: 200 },
  /** Country page: should have content + at least one rink/team */
  country: { minListings: 1, minUniqueWordCount: 150 },
  /** Team page: needs name + at least some metadata */
  team: { minFields: 2, minUniqueWordCount: 80 },
  /** Rink page: needs name + at least city/country/amenity */
  rink: { minFields: 2, minUniqueWordCount: 80 },
  /** Player page: needs name + at least one of team/position/nationality */
  player: { minFields: 1, minUniqueWordCount: 60 },
  /** League page: needs name + at least one team */
  league: { minTeams: 1, minUniqueWordCount: 80 },
} as const;

/**
 * Decide if a city/state page is indexable.
 * @param listingsCount Number of rinks/teams/players listed on the page
 * @param uniqueWordCount Words in the page body that are not in the template chrome
 * @param hasHockeySceneContent Whether the page has the unique "hockey scene" intro
 */
export function cityPageDecision(
  listingsCount: number,
  uniqueWordCount: number,
  hasHockeySceneContent = false
): IndexDecision {
  const t = THRESHOLDS.city;
  if (listingsCount === 0) {
    return { indexable: false, reason: `0 listings on page`, uniquenessScore: 0 };
  }
  if (listingsCount < t.minListings) {
    return { indexable: false, reason: `only ${listingsCount} listing(s)`, uniquenessScore: 10 };
  }
  if (uniqueWordCount < t.minUniqueWordCount) {
    return {
      indexable: false,
      reason: `thin content (${uniqueWordCount} unique words < ${t.minUniqueWordCount})`,
      uniquenessScore: 20,
    };
  }
  if (!hasHockeySceneContent && uniqueWordCount < 300) {
    return {
      indexable: false,
      reason: `no unique hockey-scene content (${uniqueWordCount} words)`,
      uniquenessScore: 40,
    };
  }
  return {
    indexable: true,
    reason: `ok (${listingsCount} listings, ${uniqueWordCount} unique words)`,
    uniquenessScore: Math.min(100, 50 + uniqueWordCount / 10),
  };
}

export function statePageDecision(
  citiesCount: number,
  listingsCount: number,
  uniqueWordCount: number
): IndexDecision {
  const t = THRESHOLDS.state;
  if (citiesCount === 0) {
    return { indexable: false, reason: '0 cities', uniquenessScore: 0 };
  }
  if (citiesCount < t.minCities && listingsCount === 0) {
    return { indexable: false, reason: `${citiesCount} cities, 0 listings`, uniquenessScore: 10 };
  }
  if (uniqueWordCount < t.minUniqueWordCount) {
    return {
      indexable: false,
      reason: `thin state content (${uniqueWordCount} words < ${t.minUniqueWordCount})`,
      uniquenessScore: 25,
    };
  }
  return {
    indexable: true,
    reason: `ok (${citiesCount} cities, ${listingsCount} listings, ${uniqueWordCount} words)`,
    uniquenessScore: Math.min(100, 40 + uniqueWordCount / 10),
  };
}

export function countryPageDecision(
  listingsCount: number,
  uniqueWordCount: number
): IndexDecision {
  const t = THRESHOLDS.country;
  if (listingsCount === 0 && uniqueWordCount < 300) {
    return {
      indexable: false,
      reason: `no rinks/teams and thin content (${uniqueWordCount} words)`,
      uniquenessScore: 0,
    };
  }
  if (uniqueWordCount < t.minUniqueWordCount) {
    return {
      indexable: false,
      reason: `thin content (${uniqueWordCount} words)`,
      uniquenessScore: 15,
    };
  }
  return {
    indexable: true,
    reason: `ok (${listingsCount} listings, ${uniqueWordCount} words)`,
    uniquenessScore: Math.min(100, 40 + uniqueWordCount / 10),
  };
}

export function teamPageDecision(
  fieldCount: number,
  uniqueWordCount: number
): IndexDecision {
  const t = THRESHOLDS.team;
  if (fieldCount < t.minFields) {
    return { indexable: false, reason: `missing fields (${fieldCount})`, uniquenessScore: 5 };
  }
  if (uniqueWordCount < t.minUniqueWordCount) {
    return {
      indexable: false,
      reason: `thin content (${uniqueWordCount} words < ${t.minUniqueWordCount})`,
      uniquenessScore: 20,
    };
  }
  return {
    indexable: true,
    reason: `ok (${fieldCount} fields, ${uniqueWordCount} words)`,
    uniquenessScore: Math.min(100, 50 + uniqueWordCount / 10),
  };
}

export function rinkPageDecision(
  fieldCount: number,
  uniqueWordCount: number
): IndexDecision {
  const t = THRESHOLDS.rink;
  if (fieldCount < t.minFields) {
    return { indexable: false, reason: `missing fields (${fieldCount})`, uniquenessScore: 5 };
  }
  if (uniqueWordCount < t.minUniqueWordCount) {
    return {
      indexable: false,
      reason: `thin content (${uniqueWordCount} words < ${t.minUniqueWordCount})`,
      uniquenessScore: 20,
    };
  }
  return {
    indexable: true,
    reason: `ok (${fieldCount} fields, ${uniqueWordCount} words)`,
    uniquenessScore: Math.min(100, 50 + uniqueWordCount / 10),
  };
}

export function playerPageDecision(
  fieldCount: number,
  uniqueWordCount: number
): IndexDecision {
  const t = THRESHOLDS.player;
  if (fieldCount < t.minFields) {
    return { indexable: false, reason: `missing fields (${fieldCount})`, uniquenessScore: 5 };
  }
  if (uniqueWordCount < t.minUniqueWordCount) {
    return {
      indexable: false,
      reason: `thin content (${uniqueWordCount} words < ${t.minUniqueWordCount})`,
      uniquenessScore: 20,
    };
  }
  return {
    indexable: true,
    reason: `ok (${fieldCount} fields, ${uniqueWordCount} words)`,
    uniquenessScore: Math.min(100, 50 + uniqueWordCount / 10),
  };
}

export function leaguePageDecision(
  teamsCount: number,
  uniqueWordCount: number
): IndexDecision {
  const t = THRESHOLDS.league;
  if (teamsCount < t.minTeams) {
    return { indexable: false, reason: `0 teams in league`, uniquenessScore: 5 };
  }
  if (uniqueWordCount < t.minUniqueWordCount) {
    return {
      indexable: false,
      reason: `thin content (${uniqueWordCount} words < ${t.minUniqueWordCount})`,
      uniquenessScore: 20,
    };
  }
  return {
    indexable: true,
    reason: `ok (${teamsCount} teams, ${uniqueWordCount} words)`,
    uniquenessScore: Math.min(100, 50 + uniqueWordCount / 10),
  };
}

/** Helper to convert a decision to the meta tag string */
export function robotsMeta(decision: IndexDecision): string {
  return decision.indexable ? INDEX : NOINDEX;
}
