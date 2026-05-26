// Data Source Router — Strict Priority Enforcement
// Hierarchy:
//   1st: NHL → NHL core facts (teams, schedules, scores, standings, rosters, stats)
//   1st: RinkStop Internal → Facilities (rinks, arenas, addresses, phone, websites)
//   2nd: ESPN → NHL headlines, recaps, summaries, backup display data
//   3rd: highlightly → Non-NHL only; NHL gap-fill only (DOES NOT overwrite NHL)

export type DataSource = 'nhl' | 'espn' | 'highlightly' | 'rinkstop';
export type DataType = 
  | 'team' | 'schedule' | 'score' | 'standings' | 'roster' | 'stats'
  | 'facility' | 'headline' | 'highlight' | 'recap';

interface SourcePriority {
  source: DataSource;
  priority: number;
}

// STRICT PRIORITY MAP — NHL always wins for NHL data
const DATA_TYPE_PRIORITIES: Record<DataType, SourcePriority[]> = {
  // NHL Core Facts — NHL is absolute authority
  team: [
    { source: 'nhl', priority: 1 },
    { source: 'rinkstop', priority: 2 }, // rinkstop only for team facilities
    { source: 'espn', priority: 3 },
    { source: 'highlightly', priority: 4 }, // only gap-fill
  ],
  schedule: [
    { source: 'nhl', priority: 1 },
    { source: 'espn', priority: 2 },
    { source: 'highlightly', priority: 3 }, // gap-fill only
  ],
  score: [
    { source: 'nhl', priority: 1 },
    { source: 'espn', priority: 2 },
    { source: 'highlightly', priority: 3 }, // gap-fill only
  ],
  standings: [
    { source: 'nhl', priority: 1 },
    { source: 'espn', priority: 2 },
    { source: 'highlightly', priority: 3 }, // gap-fill only
  ],
  roster: [
    { source: 'nhl', priority: 1 },
    { source: 'espn', priority: 2 },
    { source: 'highlightly', priority: 3 }, // gap-fill only
  ],
  stats: [
    { source: 'nhl', priority: 1 },
    { source: 'espn', priority: 2 },
    { source: 'highlightly', priority: 3 }, // gap-fill only
  ],

  // RinkStop owns all facility data
  facility: [
    { source: 'rinkstop', priority: 1 },
    { source: 'highlightly', priority: 2 }, // only if rinkstop has no data
  ],

  // ESPN for content/display
  headline: [
    { source: 'espn', priority: 1 },
    { source: 'nhl', priority: 2 },
    { source: 'highlightly', priority: 3 },
  ],
  recap: [
    { source: 'espn', priority: 1 },
    { source: 'nhl', priority: 2 },
    { source: 'highlightly', priority: 3 },
  ],
  highlight: [
    { source: 'highlightly', priority: 1 }, // highlights are highlightly's specialty
    { source: 'nhl', priority: 2 },
    { source: 'espn', priority: 3 },
  ],
};

// NHL leagues that must use NHL source only
const NHL_LEAGUE_IDS = ['49291', 'NHL', 'nhl', 49291]; // highlightly's NHL league ID
const NHL_COUNTRY_CODES = ['US', 'CA']; // NHL primarily covers US/Canada

export function isNHLLeague(leagueId: string | number): boolean {
  return NHL_LEAGUE_IDS.some(id => String(id) === String(leagueId));
}

export function isNHLCountry(countryCode: string): boolean {
  return NHL_COUNTRY_CODES.includes(countryCode.toUpperCase());
}

// Determine if data is NHL-related (must use NHL source)
export function isNHLContext(params: {
  leagueId?: string | number;
  countryCode?: string;
  teamSlug?: string;
}): boolean {
  if (params.leagueId && isNHLLeague(params.leagueId)) return true;
  if (params.countryCode && isNHLCountry(params.countryCode)) return true;
  // Check team slug for NHL team identifiers
  if (params.teamSlug) {
    const nhlTeamSlugs = ['nhl', 'usa', 'canada', 'united-states', 'canada-'];
    return nhlTeamSlugs.some(slug => params.teamSlug!.toLowerCase().includes(slug));
  }
  return false;
}

// Get priority-ordered sources for a data type
export function getSourcePriority(
  dataType: DataType,
  params?: { leagueId?: string | number; countryCode?: string; teamSlug?: string }
): SourcePriority[] {
  // Facility data always uses RinkStop first
  if (dataType === 'facility') {
    return DATA_TYPE_PRIORITIES.facility;
  }

  // For NHL context: NHL is always first, highlightly is last (gap-fill only)
  if (params && isNHLContext(params)) {
    const priorities = DATA_TYPE_PRIORITIES[dataType];
    // Ensure NHL is priority 1 for NHL context
    return priorities.map(p => ({
      source: p.source,
      priority: p.source === 'nhl' ? 1 : p.source === 'highlightly' ? 99 : p.priority,
    })).sort((a, b) => a.priority - b.priority);
  }

  // Non-NHL (non-facility, non-highlight): highlightly first, NHL as fallback
  const priorities = DATA_TYPE_PRIORITIES[dataType];
  return priorities.map(p => ({
    source: p.source,
    priority: p.source === 'highlightly' ? 1 : p.source === 'nhl' ? 98 : p.priority,
  })).sort((a, b) => a.priority - b.priority);
}

// Conflict resolution — NHL always wins for NHL data
export interface ConflictRecord {
  id: string;
  entityType: DataType;
  entityIdentifier: string;
  source1: DataSource;
  source2: DataSource;
  valueSource1: any;
  valueSource2: any;
  winner: DataSource;
  resolvedAt: string;
  resolutionNote: string;
}

export function resolveConflict(
  dataType: DataType,
  source1Data: any,
  source2Data: any,
  params?: { leagueId?: string | number; countryCode?: string }
): { winner: DataSource; data: any; conflict?: ConflictRecord } {
  
  // If NHL is involved, NHL ALWAYS wins
  const isNHL = params && isNHLContext(params);
  
  if (isNHL) {
    const nhlData = source1Data?._source === 'nhl' ? source1Data : source2Data;
    const otherData = source1Data?._source === 'nhl' ? source2Data : source1Data;

    if (JSON.stringify(nhlData) !== JSON.stringify(otherData)) {
      const conflict: ConflictRecord = {
        id: `conflict-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        entityType: dataType,
        entityIdentifier: params?.leagueId ? String(params.leagueId) : JSON.stringify(params),
        source1: source1Data?._source || 'unknown',
        source2: source2Data?._source || 'unknown',
        valueSource1: source1Data,
        valueSource2: source2Data,
        winner: 'nhl',
        resolvedAt: new Date().toISOString(),
        resolutionNote: 'NHL is authoritative source — highlightly/ESPN rejected for NHL data',
      };
      console.log('[CONFLICT NHL WINS]', JSON.stringify(conflict, null, 2));
      return { winner: 'nhl', data: nhlData, conflict };
    }

    return { winner: 'nhl', data: nhlData };
  }

  // Non-NHL: highlightly wins (it's the primary source)
  const highlightlyData = source1Data?._source === 'highlightly' ? source1Data : 
                          source2Data?._source === 'highlightly' ? source2Data : null;
  const otherData = highlightlyData === source1Data ? source2Data : source1Data;

  if (highlightlyData && JSON.stringify(highlightlyData) !== JSON.stringify(otherData)) {
    const conflict: ConflictRecord = {
      id: `conflict-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      entityType: dataType,
      entityIdentifier: params?.leagueId ? String(params.leagueId) : JSON.stringify(params),
      source1: source1Data?._source || 'unknown',
      source2: source2Data?._source || 'unknown',
      valueSource1: source1Data,
      valueSource2: source2Data,
      winner: 'highlightly',
      resolvedAt: new Date().toISOString(),
      resolutionNote: 'highlightly is primary source for non-NHL data',
    };
    console.log('[CONFLICT highlightly WINS]', JSON.stringify(conflict, null, 2));
    return { winner: 'highlightly', data: highlightlyData, conflict };
  }

  // Default: use first available
  return { winner: source1Data?._source || 'unknown', data: source1Data || otherData };
}

// Fetch with priority routing — respects hierarchy strictly
export async function fetchWithPriority<T>(
  dataType: DataType,
  fetchers: Record<DataSource, () => Promise<any>>,
  params?: { leagueId?: string | number; countryCode?: string; teamSlug?: string }
): Promise<{ data: T; source: DataSource }> {
  const priorities = getSourcePriority(dataType, params);

  for (const { source } of priorities) {
    if (!fetchers[source]) continue;
    
    try {
      const data = await fetchers[source]();
      if (data) {
        return { data: { ...data, _source: source } as T, source };
      }
    } catch (error) {
      console.warn(`[SOURCE_ROUTER] ${source} failed for ${dataType}:`, error);
      continue;
    }
  }

  throw new Error(`All sources failed for ${dataType}`);
}

// Normalize entity names for deduplication
export function normalizeEntityName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function isSameEntity(name1: string, name2: string): boolean {
  return normalizeEntityName(name1) === normalizeEntityName(name2);
}

// Log conflict to console (in production, would store to database)
export function logConflict(conflict: ConflictRecord): void {
  console.log('[DATA CONFLICT]', JSON.stringify({
    type: conflict.entityType,
    identifier: conflict.entityIdentifier,
    winner: conflict.winner,
    note: conflict.resolutionNote,
    timestamp: conflict.resolvedAt,
  }, null, 2));
}