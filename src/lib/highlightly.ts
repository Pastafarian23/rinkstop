// Highlightly Hockey API client
// Base URL: https://hockey.highlightly.net

const HIGHLIGHTLY_BASE_URL = 'https://hockey.highlightly.net';
const HIGHLIGHTLY_RAPIDAPI_HOST = 'hockey-highlights-api.p.rapidapi.com';

export interface HighlightlyConfig {
  apiKey: string;
  rapidApiKey?: string; // Alternative key via RapidAPI
}

export interface HighlightlyCountry {
  id: number;
  name: string;
  code: string; // ISO 3166-1 alpha-2
  flag?: string;
}

export interface HighlightlyLeague {
  id: number;
  name: string;
  countryCode: string;
  countryName: string;
  logo?: string;
  type?: 'senior' | 'junior' | 'women';
}

export interface HighlightlyTeam {
  id: number;
  name: string;
  shortName?: string;
  logo?: string;
  countryCode: string;
  leagueId: number;
  leagueName: string;
}

export interface HighlightlyMatch {
  id: number;
  homeTeam: HighlightlyTeam;
  awayTeam: HighlightlyTeam;
  startTime: string; // ISO 8601
  status: 'scheduled' | 'live' | 'finished' | 'postponed' | 'cancelled';
  homeScore?: number;
  awayScore?: number;
  period?: string;
  periodTime?: string;
  leagueId: number;
  leagueName: string;
  countryCode: string;
  venue?: string;
  highlightsUrl?: string;
}

export interface HighlightlyStanding {
  rank: number;
  team: {
    id: number;
    name: string;
    logo?: string;
  };
  played: number;
  wins: number;
  losses: number;
  overtimeLosses?: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  leagueId: number;
  leagueName: string;
}

export interface HighlightlyHighlight {
  id: number;
  title: string;
  description?: string;
  videoUrl: string;
  thumbnailUrl?: string;
  date: string;
  leagueId: number;
  leagueName: string;
  countryCode: string;
  teamIds?: number[];
  tags?: string[];
  verified: boolean;
}

// API Client Class
export class HighlightlyClient {
  private apiKey: string;
  private rapidApiKey?: string;
  private baseUrl: string;

  constructor(config: HighlightlyConfig) {
    this.apiKey = config.apiKey;
    this.rapidApiKey = config.rapidApiKey;
    this.baseUrl = HIGHLIGHTLY_BASE_URL;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.rapidApiKey) {
      headers['x-rapidapi-key'] = this.rapidApiKey;
      headers['x-rapidapi-host'] = HIGHLIGHTLY_RAPIDAPI_HOST;
    } else {
      headers['x-rapidapi-key'] = this.apiKey;
      headers['x-rapidapi-host'] = HIGHLIGHTLY_RAPIDAPI_HOST;
    }

    return headers;
  }

  private async fetch<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    const response = await fetch(url.toString(), {
      headers: this.getHeaders(),
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Highlightly API error ${response.status}: ${error}`);
    }

    const json = await response.json();
    // Highantly returns { data: [...] } or just [...] depending on endpoint
    return json.data ?? json;
  }

  // Countries
  async getCountries(): Promise<HighlightlyCountry[]> {
    return this.fetch<HighlightlyCountry[]>('/countries');
  }

  async getCountry(code: string): Promise<HighlightlyCountry | null> {
    try {
      return await this.fetch<HighlightlyCountry>(`/countries/${code}`);
    } catch {
      return null;
    }
  }

  // Leagues
  async getLeagues(params?: {
    countryCode?: string;
    leagueName?: string;
    limit?: number;
  }): Promise<HighlightlyLeague[]> {
    const queryParams: Record<string, string> = {};
    if (params?.countryCode) queryParams['countryCode'] = params.countryCode;
    if (params?.leagueName) queryParams['leagueName'] = params.leagueName;
    if (params?.limit) queryParams['limit'] = String(params.limit);

    return this.fetch<HighlightlyLeague[]>('/leagues', queryParams);
  }

  async getLeague(id: number): Promise<HighlightlyLeague | null> {
    try {
      return await this.fetch<HighlightlyLeague>(`/leagues/${id}`);
    } catch {
      return null;
    }
  }

  // Teams
  async getTeams(params?: {
    leagueId?: number;
    countryCode?: string;
    limit?: number;
  }): Promise<HighlightlyTeam[]> {
    const queryParams: Record<string, string> = {};
    if (params?.leagueId) queryParams['leagueId'] = String(params.leagueId);
    if (params?.countryCode) queryParams['countryCode'] = params.countryCode;
    if (params?.limit) queryParams['limit'] = String(params.limit);

    return this.fetch<HighlightlyTeam[]>('/teams', queryParams);
  }

  async getTeam(id: number): Promise<HighlightlyTeam | null> {
    try {
      return await this.fetch<HighlightlyTeam>(`/teams/${id}`);
    } catch {
      return null;
    }
  }

  async getTeamStats(id: number, season?: string): Promise<any> {
    const queryParams: Record<string, string> = {};
    if (season) queryParams['season'] = season;
    return this.fetch(`/teams/${id}/stats`, queryParams);
  }

  // Matches
  // Note: Highantly `/matches` doesn't support dateFrom/dateTo — use leagueId or teamId filters instead
  async getMatches(params?: {
    leagueId?: number;
    teamId?: number;
    limit?: number;
  }): Promise<HighlightlyMatch[]> {
    const queryParams: Record<string, string> = {};
    if (params?.leagueId) queryParams['leagueId'] = String(params.leagueId);
    if (params?.teamId) queryParams['teamId'] = String(params.teamId);
    if (params?.limit) queryParams['limit'] = String(params.limit);

    return this.fetch<HighlightlyMatch[]>('/matches', queryParams);
  }

  async getMatch(id: number): Promise<HighlightlyMatch | null> {
    try {
      return await this.fetch<HighlightlyMatch>(`/matches/${id}`);
    } catch {
      return null;
    }
  }

  // Standings
  async getStandings(params?: {
    leagueId: number;
    season?: string;
  }): Promise<HighlightlyStanding[]> {
    const queryParams: Record<string, string> = {};
    if (params?.leagueId) queryParams['leagueId'] = String(params.leagueId);
    if (params?.season) queryParams['season'] = params.season;

    return this.fetch<HighlightlyStanding[]>('/standings', queryParams);
  }

  // Highlights
  // Note: Highantly `/highlights` doesn't support dateFrom/dateTo — use leagueId or teamId
  async getHighlights(params?: {
    leagueId?: number;
    teamId?: number;
    limit?: number;
  }): Promise<HighlightlyHighlight[]> {
    const queryParams: Record<string, string> = {};
    if (params?.leagueId) queryParams['leagueId'] = String(params.leagueId);
    if (params?.teamId) queryParams['teamId'] = String(params.teamId);
    if (params?.limit) queryParams['limit'] = String(params.limit);

    return this.fetch<HighlightlyHighlight[]>('/highlights', queryParams);
  }
}

// Singleton instance (initialized when API key is available)
let highlightlyClient: HighlightlyClient | null = null;

export function getHighlightlyClient(apiKey?: string): HighlightlyClient | null {
  if (!apiKey) {
    apiKey = process.env.HIGHLIGHTLY_API_KEY;
  }

  if (!apiKey) {
    console.warn('Highlightly API key not configured. Set HIGHLIGHTLY_API_KEY in environment.');
    return null;
  }

  if (!highlightlyClient) {
    highlightlyClient = new HighlightlyClient({
      apiKey,
      rapidApiKey: process.env.HIGHLIGHTLY_RAPIDAPI_KEY,
    });
  }

  return highlightlyClient;
}

// Check if a league/country is NHL (to skip Highlightly for NHL)
export function isNHLLeague(leagueId: number | string): boolean {
  const nhlLeagueIds = ['NHL', 'nhl', 1];
  return nhlLeagueIds.includes(leagueId as any);
}

// Non-NHL country codes that Highlightly covers well
export const HIGHLIGHTLY_SUPPORTED_COUNTRIES = [
  'SE', // Sweden
  'FI', // Finland
  'DE', // Germany
  'CZ', // Czech Republic
  'SK', // Slovakia
  'RU', // Russia
  'CH', // Switzerland
  'AT', // Austria
  'GB', // United Kingdom
  'NO', // Norway
  'DK', // Denmark
  'BY', // Belarus
  'LV', // Latvia
  'KZ', // Kazakhstan
  'JP', // Japan
  'KR', // South Korea
  'CN', // China
];

export function isSupportedCountry(code: string): boolean {
  return HIGHLIGHTLY_SUPPORTED_COUNTRIES.includes(code.toUpperCase());
}