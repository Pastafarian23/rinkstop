// Auto-generated from xlsx in /root/.openclaw/media/inbound/
// Cross-verified against Wikipedia 2023-2026 PWHL Draft pages, PWHL official press releases, AP, CBC, College Hockey Inc, Star Tribune
// 2026 PWHL Draft: 72 picks, 6 rounds, 12 teams, 9 nationalities, 29 leagues
// 2023 nationality backfilled from Wikipedia + PWHL official press release (xref 90 players)
// Date: June 17, 2026 · Location: Fox Theatre, Detroit, Michigan

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

export const PWHL_2026_PICKS: PWHLPick[] = [
  { pick: 1, round: 1, overall: 1, team: "Vancouver Goldeneyes", tradeNote: null, player: "Caroline \"KK\" Harvey", position: "D", league: "University of Wisconsin (NCAA)", nationality: "USA" },
  { pick: 2, round: 1, overall: 2, team: "Seattle Torrent", tradeNote: null, player: "Abbey Murphy", position: "F", league: "University of Minnesota (NCAA)", nationality: "USA" },
  { pick: 3, round: 1, overall: 3, team: "PWHL Las Vegas", tradeNote: "via Detroit", player: "Tessa Janecke", position: "F", league: "Penn State University (NCAA)", nationality: "USA" },
  { pick: 4, round: 1, overall: 4, team: "PWHL San Jose", tradeNote: null, player: "Laila Edwards", position: "D", league: "University of Wisconsin (NCAA)", nationality: "USA" },
  { pick: 5, round: 1, overall: 5, team: "PWHL Las Vegas", tradeNote: null, player: "Lacey Eden", position: "F", league: "University of Wisconsin (NCAA)", nationality: "USA" },
  { pick: 6, round: 1, overall: 6, team: "PWHL Hamilton", tradeNote: null, player: "Nelli Laitinen", position: "D", league: "University of Minnesota (NCAA)", nationality: "FIN" },
  { pick: 7, round: 1, overall: 7, team: "New York Sirens", tradeNote: null, player: "Emma Peschel", position: "D", league: "Ohio State University (NCAA)", nationality: "USA" },
  { pick: 8, round: 1, overall: 8, team: "Toronto Sceptres", tradeNote: null, player: "Kirsten Simms", position: "F", league: "University of Wisconsin (NCAA)", nationality: "USA" },
  { pick: 9, round: 1, overall: 9, team: "Minnesota Frost", tradeNote: null, player: "Sara Swiderski", position: "D", league: "Ohio State University (NCAA)", nationality: "CAN" },
  { pick: 10, round: 1, overall: 10, team: "Boston Fleet", tradeNote: null, player: "Grace Dwyer", position: "D", league: "Cornell University (NCAA)", nationality: "USA" },
  { pick: 11, round: 1, overall: 11, team: "Ottawa Charge", tradeNote: null, player: "Vivian Jungels", position: "D", league: "University of Wisconsin (NCAA)", nationality: "USA" },
  { pick: 12, round: 1, overall: 12, team: "Montréal Victoire", tradeNote: null, player: "Petra Nieminen", position: "F", league: "Luleå (SDHL)", nationality: "FIN" },
  { pick: 13, round: 2, overall: 13, team: "PWHL Las Vegas", tradeNote: "via Vancouver", player: "Issy Wunder", position: "F", league: "Princeton University (NCAA)", nationality: "CAN" },
  { pick: 14, round: 2, overall: 14, team: "Seattle Torrent", tradeNote: null, player: "Sydney Morrow", position: "D", league: "University of Minnesota (NCAA)", nationality: "USA" },
  { pick: 15, round: 2, overall: 15, team: "PWHL Detroit", tradeNote: null, player: "Andrea Brändli", position: "G", league: "Frölunda HC (SDHL)", nationality: "SUI" },
  { pick: 16, round: 2, overall: 16, team: "PWHL San Jose", tradeNote: null, player: "Sloane Matthews", position: "F", league: "Ohio State University (NCAA)", nationality: "USA" },
  { pick: 17, round: 2, overall: 17, team: "Vancouver Goldeneyes", tradeNote: "via Las Vegas", player: "Thea Johansson", position: "F", league: "University of Minnesota Duluth (NCAA)", nationality: "SWE" },
  { pick: 18, round: 2, overall: 18, team: "PWHL Hamilton", tradeNote: null, player: "Jade Iginla", position: "F", league: "Brown University (NCAA)", nationality: "CAN" },
  { pick: 19, round: 2, overall: 19, team: "New York Sirens", tradeNote: null, player: "Elisa Holopainen", position: "F", league: "Frölunda HC (SDHL)", nationality: "FIN" },
  { pick: 20, round: 2, overall: 20, team: "Toronto Sceptres", tradeNote: null, player: "Jamie Nelson", position: "F", league: "University of Minnesota (NCAA)", nationality: "USA" },
  { pick: 21, round: 2, overall: 21, team: "Minnesota Frost", tradeNote: null, player: "Viivi Vainikka", position: "F", league: "Brynäs (SDHL)", nationality: "FIN" },
  { pick: 22, round: 2, overall: 22, team: "PWHL Detroit", tradeNote: "via Boston", player: "Casey Borgiel", position: "D", league: "Colgate University (NCAA)", nationality: "USA" },
  { pick: 23, round: 2, overall: 23, team: "Ottawa Charge", tradeNote: null, player: "Jordan Ray", position: "F", league: "Yale University (NCAA)", nationality: "USA" },
  { pick: 24, round: 2, overall: 24, team: "Montréal Victoire", tradeNote: null, player: "Avi Adam", position: "F", league: "Cornell University (NCAA)", nationality: "CAN" },
  { pick: 25, round: 3, overall: 25, team: "Vancouver Goldeneyes", tradeNote: null, player: "Jules Constantinople", position: "D", league: "Northeastern University (NCAA)", nationality: "USA" },
  { pick: 26, round: 3, overall: 26, team: "Seattle Torrent", tradeNote: null, player: "Emerson Jarvis", position: "F", league: "Quinnipiac University (NCAA)", nationality: "CAN" },
  { pick: 27, round: 3, overall: 27, team: "Boston Fleet", tradeNote: "via Detroit", player: "Leah Stecker", position: "D", league: "Penn State University (NCAA)", nationality: "USA" },
  { pick: 28, round: 3, overall: 28, team: "PWHL San Jose", tradeNote: null, player: "Tia Chan", position: "G", league: "University of Connecticut (NCAA)", nationality: "CAN" },
  { pick: 29, round: 3, overall: 29, team: "PWHL Las Vegas", tradeNote: null, player: "Josefin Bouveng", position: "F", league: "University of Minnesota (NCAA)", nationality: "SWE" },
  { pick: 30, round: 3, overall: 30, team: "PWHL Hamilton", tradeNote: null, player: "Elyssa Biederman", position: "F", league: "Colgate University (NCAA)", nationality: "USA" },
  { pick: 31, round: 3, overall: 31, team: "New York Sirens", tradeNote: null, player: "Carina DiAntonio", position: "F", league: "Yale University (NCAA)", nationality: "CAN" },
  { pick: 32, round: 3, overall: 32, team: "Toronto Sceptres", tradeNote: null, player: "Brooke Disher", position: "D", league: "Ohio State University (NCAA)", nationality: "CAN" },
  { pick: 33, round: 3, overall: 33, team: "Minnesota Frost", tradeNote: null, player: "Maddy Christian", position: "F", league: "Penn State University (NCAA)", nationality: "USA" },
  { pick: 34, round: 3, overall: 34, team: "PWHL Detroit", tradeNote: "via Boston", player: "MK O'Brien", position: "F", league: "University of Minnesota Duluth (NCAA)", nationality: "USA" },
  { pick: 35, round: 3, overall: 35, team: "Ottawa Charge", tradeNote: null, player: "Tereza Pištěková", position: "F", league: "SDE (SDHL)", nationality: "CZE" },
  { pick: 36, round: 3, overall: 36, team: "Montréal Victoire", tradeNote: null, player: "Zoe Uens", position: "D", league: "Quinnipiac University (NCAA)", nationality: "CAN" },
  { pick: 37, round: 4, overall: 37, team: "Vancouver Goldeneyes", tradeNote: null, player: "Katelyn DeSa", position: "G", league: "Penn State University (NCAA)", nationality: "USA" },
  { pick: 38, round: 4, overall: 38, team: "Seattle Torrent", tradeNote: null, player: "Grace Elliott", position: "F", league: "University of British Columbia (U Sports)", nationality: "CAN" },
  { pick: 39, round: 4, overall: 39, team: "PWHL Detroit", tradeNote: null, player: "Kyla Josifovic", position: "F", league: "University of Connecticut (NCAA)", nationality: "CAN" },
  { pick: 40, round: 4, overall: 40, team: "PWHL San Jose", tradeNote: null, player: "Lily Shannon", position: "F", league: "Northeastern University (NCAA)", nationality: "USA" },
  { pick: 41, round: 4, overall: 41, team: "PWHL Las Vegas", tradeNote: null, player: "Saskia Maurer", position: "G", league: "SC Bern (SWHL)", nationality: "SUI" },
  { pick: 42, round: 4, overall: 42, team: "PWHL Hamilton", tradeNote: null, player: "Megan Woodworth", position: "F", league: "University of Connecticut (NCAA)", nationality: "CAN" },
  { pick: 43, round: 4, overall: 43, team: "New York Sirens", tradeNote: null, player: "Katelyn Roberts", position: "F", league: "Penn State University (NCAA)", nationality: "USA" },
  { pick: 44, round: 4, overall: 44, team: "Toronto Sceptres", tradeNote: null, player: "Jane Kuehl", position: "F", league: "Princeton University (NCAA)", nationality: "USA" },
  { pick: 45, round: 4, overall: 45, team: "Minnesota Frost", tradeNote: null, player: "Tova Henderson", position: "D", league: "University of Minnesota Duluth (NCAA)", nationality: "CAN" },
  { pick: 46, round: 4, overall: 46, team: "Boston Fleet", tradeNote: null, player: "Jaden Bogden", position: "F", league: "Northeastern University (NCAA)", nationality: "CAN" },
  { pick: 47, round: 4, overall: 47, team: "Ottawa Charge", tradeNote: null, player: "Tory Mariano", position: "D", league: "Northeastern University (NCAA)", nationality: "USA" },
  { pick: 48, round: 4, overall: 48, team: "Montréal Victoire", tradeNote: null, player: "Hailey MacLeod", position: "G", league: "Ohio State University (NCAA)", nationality: "CAN" },
  { pick: 49, round: 5, overall: 49, team: "PWHL Las Vegas", tradeNote: "via Vancouver", player: "Kendall Butze", position: "D", league: "Penn State University (NCAA)", nationality: "USA" },
  { pick: 50, round: 5, overall: 50, team: "Seattle Torrent", tradeNote: null, player: "Gracie Gilkyson", position: "D", league: "Yale University (NCAA)", nationality: "CAN" },
  { pick: 51, round: 5, overall: 51, team: "PWHL Detroit", tradeNote: null, player: "Sena Catterall", position: "F", league: "Clarkson University (NCAA)", nationality: "CAN" },
  { pick: 52, round: 5, overall: 52, team: "PWHL San Jose", tradeNote: null, player: "Mckenna Van Gelder", position: "F", league: "Cornell University (NCAA)", nationality: "CAN" },
  { pick: 53, round: 5, overall: 53, team: "PWHL Las Vegas", tradeNote: null, player: "Alexis Petford", position: "F", league: "Colgate University (NCAA)", nationality: "CAN" },
  { pick: 54, round: 5, overall: 54, team: "PWHL Hamilton", tradeNote: null, player: "Emma-Sofie Nordström", position: "G", league: "St. Lawrence University (NCAA)", nationality: "DEN" },
  { pick: 55, round: 5, overall: 55, team: "New York Sirens", tradeNote: null, player: "Grace Wolfe", position: "D", league: "St. Cloud State University (NCAA)", nationality: "USA" },
  { pick: 56, round: 5, overall: 56, team: "Toronto Sceptres", tradeNote: null, player: "Emerson O'Leary", position: "F", league: "Princeton University (NCAA)", nationality: "USA" },
  { pick: 57, round: 5, overall: 57, team: "Minnesota Frost", tradeNote: null, player: "Darya Gredzen", position: "G", league: "Biryusa Krasnoyarsk (ZhHL)", nationality: "RUS" },
  { pick: 58, round: 5, overall: 58, team: "Boston Fleet", tradeNote: null, player: "Jenna Goodwin", position: "F", league: "Frölunda HC (SDHL)", nationality: "CAN" },
  { pick: 59, round: 5, overall: 59, team: "Ottawa Charge", tradeNote: null, player: "Neena Brick", position: "F", league: "MoDo (SDHL)", nationality: "CAN" },
  { pick: 60, round: 5, overall: 60, team: "Montréal Victoire", tradeNote: null, player: "Erica Rieder", position: "D", league: "Luleå (SDHL)", nationality: "CAN" },
  { pick: 61, round: 6, overall: 61, team: "Vancouver Goldeneyes", tradeNote: null, player: "Ashley Messier", position: "D", league: "University of Minnesota Duluth (NCAA)", nationality: "CAN" },
  { pick: 62, round: 6, overall: 62, team: "Seattle Torrent", tradeNote: null, player: "Gabriella Durante", position: "G", league: "Real Torino (Italy)", nationality: "CAN/ITA" },
  { pick: 63, round: 6, overall: 63, team: "PWHL Detroit", tradeNote: null, player: "Georgia Schiff", position: "F", league: "Cornell University (NCAA)", nationality: "USA" },
  { pick: 64, round: 6, overall: 64, team: "PWHL San Jose", tradeNote: null, player: "Reichen Kirchmair", position: "F", league: "Providence College (NCAA)", nationality: "CAN" },
  { pick: 65, round: 6, overall: 65, team: "PWHL Las Vegas", tradeNote: null, player: "Sydney Healey", position: "F", league: "Boston University (NCAA)", nationality: "CAN" },
  { pick: 66, round: 6, overall: 66, team: "PWHL Hamilton", tradeNote: null, player: "Mya Vaslet", position: "F", league: "Penn State University (NCAA)", nationality: "CAN" },
  { pick: 67, round: 6, overall: 67, team: "New York Sirens", tradeNote: null, player: "Naomi Boucher", position: "F", league: "Yale University (NCAA)", nationality: "CAN" },
  { pick: 68, round: 6, overall: 68, team: "Toronto Sceptres", tradeNote: null, player: "Alyssa Regalado", position: "D", league: "Cornell University (NCAA)", nationality: "CAN" },
  { pick: 69, round: 6, overall: 69, team: "Minnesota Frost", tradeNote: null, player: "Lara Beecher", position: "F", league: "Clarkson University (NCAA)", nationality: "USA" },
  { pick: 70, round: 6, overall: 70, team: "Boston Fleet", tradeNote: null, player: "Maeve Kelly", position: "D", league: "Boston University (NCAA)", nationality: "USA" },
  { pick: 71, round: 6, overall: 71, team: "Ottawa Charge", tradeNote: null, player: "Taylor Otremba", position: "F", league: "Minnesota State University (NCAA)", nationality: "USA" },
  { pick: 72, round: 6, overall: 72, team: "Montréal Victoire", tradeNote: null, player: "Emilie Lavoie", position: "F", league: "Concordia University (U Sports)", nationality: "CAN" },
];

export const PWHL_2026_STATS: PickStats = {
  totalPicks: 72,
  realPicks: 72,
  forfeits: 0,
  uniqueTeams: 12,
  rounds: 6,
  nationalities: 9,
  leagues: 29,
};

export const PWHL_2026_EVENT = {
  title: "2026 PWHL Draft",
  subtitle: "6 rounds \u00b7 12 teams \u00b7 72 picks (4 expansion teams join: Hamilton, Las Vegas, San Jose, Detroit)",
  date: "June 17, 2026",
  location: "Fox Theatre, Detroit, Michigan",
};