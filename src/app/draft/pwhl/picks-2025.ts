// Auto-generated from xlsx in /root/.openclaw/media/inbound/
// Cross-verified against Wikipedia 2023-2025 PWHL Draft pages, PWHL official press releases, AP, CBC, College Hockey Inc, Star Tribune
// 2025 PWHL Draft: 48 picks, 6 rounds, 8 teams, 8 nationalities, 22 leagues
// 2023 nationality backfilled from Wikipedia + PWHL official press release (xref 90 players)
// Date: June 24, 2025 · Location: Hard Rock Hotel & Casino, Ottawa, Ontario, Canada

import type { PickStats } from '../types';

export interface PWHLPick {
  pick: number;
  round: number;
  overall: number;
  team: string;
  tradeNote?: string | null;
  player: string;
  position: 'F' | 'D' | 'C' | 'G' | null;
  league: string | null;
  nationality: string | null;  // ISO 3-letter code (USA, CAN, FIN, etc.)
}

export const PWHL_2025_PICKS: PWHLPick[] = [
  { pick: 1, round: 1, overall: 1, team: "New York Sirens", tradeNote: null, player: "Kristýna Kaltounková", position: "F", league: "Colgate University (NCAA)", nationality: "CZE" },
  { pick: 2, round: 1, overall: 2, team: "Boston Fleet", tradeNote: null, player: "Haley Winn", position: "D", league: "Clarkson University (NCAA)", nationality: "USA" },
  { pick: 3, round: 1, overall: 3, team: "New York Sirens", tradeNote: "via TOR", player: "Casey O'Brien", position: "F", league: "University of Wisconsin (NCAA)", nationality: "USA" },
  { pick: 4, round: 1, overall: 4, team: "Montréal Victoire", tradeNote: null, player: "Nicole Gosling", position: "D", league: "Clarkson University (NCAA)", nationality: "CAN" },
  { pick: 5, round: 1, overall: 5, team: "Ottawa Charge", tradeNote: null, player: "Rory Guilday", position: "D", league: "Cornell University (NCAA)", nationality: "USA" },
  { pick: 6, round: 1, overall: 6, team: "Minnesota Frost", tradeNote: null, player: "Kendall Cooper", position: "D", league: "Quinnipiac University (NCAA)", nationality: "CAN" },
  { pick: 7, round: 1, overall: 7, team: "PWHL Vancouver", tradeNote: null, player: "Michelle Karvinen", position: "F", league: "Frölunda HC (SDHL)", nationality: "FIN/DEN" },
  { pick: 8, round: 1, overall: 8, team: "PWHL Seattle", tradeNote: null, player: "Jenna Buglioni", position: "F", league: "Ohio State University (NCAA)", nationality: "CAN" },
  { pick: 1, round: 2, overall: 9, team: "New York Sirens", tradeNote: null, player: "Anne Cherkowski", position: "F", league: "Clarkson University (NCAA)", nationality: "CAN" },
  { pick: 2, round: 2, overall: 10, team: "Boston Fleet", tradeNote: null, player: "Ella Huber", position: "F", league: "University of Minnesota (NCAA)", nationality: "USA" },
  { pick: 3, round: 2, overall: 11, team: "Toronto Sceptres", tradeNote: null, player: "Emma Gentry", position: "F", league: "St. Cloud State University (NCAA)", nationality: "USA" },
  { pick: 4, round: 2, overall: 12, team: "Montréal Victoire", tradeNote: null, player: "Natalie Mlynkova", position: "F", league: "University of Minnesota (NCAA)", nationality: "CZE" },
  { pick: 5, round: 2, overall: 13, team: "Ottawa Charge", tradeNote: null, player: "Anna Shokhina", position: "F", league: "Dynamo-Neva St. Petersburg (ZhHL)", nationality: "RUS" },
  { pick: 6, round: 2, overall: 14, team: "Minnesota Frost", tradeNote: null, player: "Abby Hustler", position: "F", league: "St. Lawrence University (NCAA)", nationality: "CAN" },
  { pick: 7, round: 2, overall: 15, team: "PWHL Seattle", tradeNote: null, player: "Hannah Murphy", position: "G", league: "Colgate University (NCAA)", nationality: "CAN" },
  { pick: 8, round: 2, overall: 16, team: "Toronto Sceptres", tradeNote: "via VAN", player: "Kiara Zanon", position: "F", league: "Ohio State University (NCAA)", nationality: "USA" },
  { pick: 1, round: 3, overall: 17, team: "New York Sirens", tradeNote: null, player: "Makenna Webster", position: "F", league: "Ohio State University (NCAA)", nationality: "USA" },
  { pick: 2, round: 3, overall: 18, team: "Boston Fleet", tradeNote: null, player: "Olivia Mobley", position: "F", league: "University of Minnesota Duluth (NCAA)", nationality: "USA" },
  { pick: 3, round: 3, overall: 19, team: "PWHL Vancouver", tradeNote: "via TOR", player: "Nina Jobst-Smith", position: "D", league: "University of Minnesota Duluth (NCAA)", nationality: "GER/CAN" },
  { pick: 4, round: 3, overall: 20, team: "Montréal Victoire", tradeNote: null, player: "Skylar Irving", position: "F", league: "Northeastern University (NCAA)", nationality: "USA" },
  { pick: 5, round: 3, overall: 21, team: "Ottawa Charge", tradeNote: null, player: "Sarah Wozniewicz", position: "F", league: "University of Wisconsin (NCAA)", nationality: "CAN" },
  { pick: 6, round: 3, overall: 22, team: "Minnesota Frost", tradeNote: null, player: "Anna Segedi", position: "F", league: "St. Lawrence University (NCAA)", nationality: "USA/CHI" },
  { pick: 7, round: 3, overall: 23, team: "Toronto Sceptres", tradeNote: "via VAN", player: "Clara Van Wieren", position: "F", league: "University of Minnesota Duluth (NCAA)", nationality: "USA" },
  { pick: 8, round: 3, overall: 24, team: "PWHL Seattle", tradeNote: null, player: "Lily Delianedis", position: "F", league: "Cornell University (NCAA)", nationality: "USA" },
  { pick: 1, round: 4, overall: 25, team: "New York Sirens", tradeNote: null, player: "Dayle Ross", position: "D", league: "St. Cloud State University (NCAA)", nationality: "CAN" },
  { pick: 2, round: 4, overall: 26, team: "Boston Fleet", tradeNote: null, player: "Riley Brengman", position: "D", league: "Ohio State University (NCAA)", nationality: "USA" },
  { pick: 3, round: 4, overall: 27, team: "New York Sirens", tradeNote: "via TOR", player: "Maddi Wheeler", position: "F", league: "Ohio State University (NCAA)", nationality: "CAN" },
  { pick: 4, round: 4, overall: 28, team: "New York Sirens", tradeNote: "via MTL", player: "Callie Shanahan", position: "G", league: "Boston University (NCAA)", nationality: "USA" },
  { pick: 5, round: 4, overall: 29, team: "Ottawa Charge", tradeNote: null, player: "Peyton Hemp", position: "F", league: "University of Minnesota (NCAA)", nationality: "USA" },
  { pick: 6, round: 4, overall: 30, team: "Minnesota Frost", tradeNote: null, player: "Ava Rinker", position: "D", league: "University of Connecticut (NCAA)", nationality: "USA" },
  { pick: 7, round: 4, overall: 31, team: "PWHL Seattle", tradeNote: null, player: "Jada Habisch", position: "F", league: "University of Connecticut (NCAA)", nationality: "USA" },
  { pick: 8, round: 4, overall: 32, team: "PWHL Vancouver", tradeNote: null, player: "Brianna Brooks", position: "F", league: "Penn State University (NCAA)", nationality: "CAN" },
  { pick: 1, round: 5, overall: 33, team: "New York Sirens", tradeNote: null, player: "Anna Bargman", position: "F", league: "Yale University (NCAA)", nationality: "USA" },
  { pick: 2, round: 5, overall: 34, team: "Boston Fleet", tradeNote: null, player: "Abby Newhook", position: "F", league: "Boston College (NCAA)", nationality: "CAN" },
  { pick: 3, round: 5, overall: 35, team: "Toronto Sceptres", tradeNote: null, player: "Sara Hjalmarsson", position: "F", league: "Linköping HC (SDHL)", nationality: "SWE" },
  { pick: 4, round: 5, overall: 36, team: "Montréal Victoire", tradeNote: null, player: "Maya Labad", position: "F", league: "Quinnipiac University (NCAA)", nationality: "CAN" },
  { pick: 5, round: 5, overall: 37, team: "Ottawa Charge", tradeNote: null, player: "Sanni Ahola", position: "G", league: "St. Cloud State University (NCAA)", nationality: "FIN/DEN" },
  { pick: 6, round: 5, overall: 38, team: "Minnesota Frost", tradeNote: null, player: "Vanessa Upson", position: "F", league: "Mercyhurst University (NCAA)", nationality: "CAN" },
  { pick: 7, round: 5, overall: 39, team: "PWHL Vancouver", tradeNote: null, player: "Madison Samoskevich", position: "D", league: "Quinnipiac University (NCAA)", nationality: "USA" },
  { pick: 8, round: 5, overall: 40, team: "PWHL Seattle", tradeNote: null, player: "Lyndie Lobdell", position: "D", league: "Penn State University (NCAA)", nationality: "USA" },
  { pick: 1, round: 6, overall: 41, team: "New York Sirens", tradeNote: null, player: "Kaley Doyle", position: "G", league: "Quinnipiac University (NCAA)", nationality: "USA" },
  { pick: 2, round: 6, overall: 42, team: "Boston Fleet", tradeNote: null, player: "Amanda Thiele", position: "G", league: "Ohio State University (NCAA)", nationality: "USA" },
  { pick: 3, round: 6, overall: 43, team: "Toronto Sceptres", tradeNote: null, player: "Hanna Baskin", position: "D", league: "University of Minnesota Duluth (NCAA)", nationality: "USA" },
  { pick: 4, round: 6, overall: 44, team: "Montréal Victoire", tradeNote: null, player: "Tamara Giaquinto", position: "D", league: "Boston University (NCAA)", nationality: "CAN" },
  { pick: 5, round: 6, overall: 45, team: "Ottawa Charge", tradeNote: null, player: "Fanuza Kadirova", position: "F", league: "Dynamo-Neva St. Petersburg (ZhHL)", nationality: "RUS" },
  { pick: 6, round: 6, overall: 46, team: "Minnesota Frost", tradeNote: null, player: "Brooke Becker", position: "D", league: "Providence College (NCAA)", nationality: "USA" },
  { pick: 7, round: 6, overall: 47, team: "PWHL Seattle", tradeNote: null, player: "Olivia Wallin", position: "F", league: "University of Minnesota Duluth (NCAA)", nationality: "CAN" },
  { pick: 8, round: 6, overall: 48, team: "PWHL Vancouver", tradeNote: null, player: "Chanreet Bassi", position: "F", league: "University of British Columbia (U Sports)", nationality: "CAN" },
];

export const PWHL_2025_STATS: PickStats = {
  totalPicks: 48,
  realPicks: 48,
  forfeits: 0,
  uniqueTeams: 8,
  rounds: 6,
  nationalities: 8,
  leagues: 22,
};

export const PWHL_2025_EVENT = {
  title: "2025 PWHL Draft",
  subtitle: "6 rounds \u00b7 8 teams \u00b7 48 picks (Vancouver and Seattle expansion)",
  date: "June 24, 2025",
  location: "Hard Rock Hotel & Casino, Ottawa, Ontario, Canada",
};