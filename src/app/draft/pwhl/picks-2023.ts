// Auto-generated from xlsx in /root/.openclaw/media/inbound/
// Cross-verified against Wikipedia 2023-2023 PWHL Draft pages, PWHL official press releases, AP, CBC, College Hockey Inc, Star Tribune
// 2023 PWHL Draft: 90 picks, 15 rounds, 6 teams, 9 nationalities, 0 leagues
// 2023 nationality backfilled from Wikipedia + PWHL official press release (xref 90 players)
// Date: September 18, 2023 · Location: CBC's Toronto Headquarters, Toronto, Ontario, Canada

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

export const PWHL_2023_PICKS: PWHLPick[] = [
  { pick: 1, round: 1, overall: 1, team: "Minnesota", tradeNote: null, player: "Taylor Heise", position: "F", league: null, nationality: "USA" },
  { pick: 2, round: 1, overall: 2, team: "Toronto", tradeNote: null, player: "Jocelyne Larocque", position: "D", league: null, nationality: "CAN" },
  { pick: 3, round: 1, overall: 3, team: "Boston", tradeNote: null, player: "Alina Müller", position: "C", league: null, nationality: "SUI" },
  { pick: 4, round: 1, overall: 4, team: "New York", tradeNote: null, player: "Ella Shelton", position: "D", league: null, nationality: "CAN" },
  { pick: 5, round: 1, overall: 5, team: "Ottawa", tradeNote: null, player: "Savannah Harmon", position: "D", league: null, nationality: "USA" },
  { pick: 6, round: 1, overall: 6, team: "Montreal", tradeNote: null, player: "Erin Ambrose", position: "D", league: null, nationality: "CAN" },
  { pick: 7, round: 2, overall: 7, team: "Montreal", tradeNote: null, player: "Kristin O'Neill", position: "F", league: null, nationality: "CAN" },
  { pick: 8, round: 2, overall: 8, team: "Ottawa", tradeNote: null, player: "Ashton Bell", position: "D", league: null, nationality: "CAN" },
  { pick: 9, round: 2, overall: 9, team: "New York", tradeNote: null, player: "Jaime Bourbonnais", position: "D", league: null, nationality: "CAN" },
  { pick: 10, round: 2, overall: 10, team: "Boston", tradeNote: null, player: "Sophie Jaques", position: "D", league: null, nationality: "CAN" },
  { pick: 11, round: 2, overall: 11, team: "Toronto", tradeNote: null, player: "Emma Maltais", position: "F", league: null, nationality: "CAN" },
  { pick: 12, round: 2, overall: 12, team: "Minnesota", tradeNote: null, player: "Nicole Hensley", position: "G", league: null, nationality: "USA" },
  { pick: 13, round: 3, overall: 13, team: "Minnesota", tradeNote: null, player: "Grace Zumwinkle", position: "F", league: null, nationality: "USA" },
  { pick: 14, round: 3, overall: 14, team: "Toronto", tradeNote: null, player: "Kristen Campbell", position: "G", league: null, nationality: "CAN" },
  { pick: 15, round: 3, overall: 15, team: "Boston", tradeNote: null, player: "Jamie Lee Rattray", position: "F", league: null, nationality: "CAN" },
  { pick: 16, round: 3, overall: 16, team: "New York", tradeNote: null, player: "Jessie Eldridge", position: "F", league: null, nationality: "CAN" },
  { pick: 17, round: 3, overall: 17, team: "Ottawa", tradeNote: null, player: "Jincy Dunne", position: "D", league: null, nationality: null },
  { pick: 18, round: 3, overall: 18, team: "Montreal", tradeNote: null, player: "Maureen Murphy", position: "F", league: null, nationality: "USA" },
  { pick: 19, round: 4, overall: 19, team: "Montreal", tradeNote: null, player: "Dominika Lásková", position: "D", league: null, nationality: "CZE" },
  { pick: 20, round: 4, overall: 20, team: "Ottawa", tradeNote: null, player: "Gabbie Hughes", position: "F", league: null, nationality: "USA" },
  { pick: 21, round: 4, overall: 21, team: "New York", tradeNote: null, player: "Chloé Aurard", position: "F", league: null, nationality: "FRA" },
  { pick: 22, round: 4, overall: 22, team: "Boston", tradeNote: null, player: "Loren Gabel", position: "F", league: null, nationality: "CAN" },
  { pick: 23, round: 4, overall: 23, team: "Toronto", tradeNote: null, player: "Natalie Spooner", position: "F", league: null, nationality: "CAN" },
  { pick: 24, round: 4, overall: 24, team: "Minnesota", tradeNote: null, player: "Maggie Flaherty", position: "D", league: null, nationality: "USA" },
  { pick: 25, round: 5, overall: 25, team: "Minnesota", tradeNote: null, player: "Susanna Tapani", position: "C", league: null, nationality: "FIN" },
  { pick: 26, round: 5, overall: 26, team: "Toronto", tradeNote: null, player: "Jesse Compher", position: "F", league: null, nationality: "USA" },
  { pick: 27, round: 5, overall: 27, team: "Boston", tradeNote: null, player: "Hannah Brandt", position: "C", league: null, nationality: "USA" },
  { pick: 28, round: 5, overall: 28, team: "New York", tradeNote: null, player: "Élizabeth Giguère", position: "F", league: null, nationality: "CAN" },
  { pick: 29, round: 5, overall: 29, team: "Ottawa", tradeNote: null, player: "Hayley Scamurra", position: "F", league: null, nationality: "USA" },
  { pick: 30, round: 5, overall: 30, team: "Montreal", tradeNote: null, player: "Kati Tabin", position: "D", league: null, nationality: "CAN" },
  { pick: 31, round: 6, overall: 31, team: "Montreal", tradeNote: null, player: "Kennedy Marchment", position: "F", league: null, nationality: "CAN" },
  { pick: 32, round: 6, overall: 32, team: "Ottawa", tradeNote: null, player: "Daryl Watts", position: "C", league: null, nationality: "CAN" },
  { pick: 33, round: 6, overall: 33, team: "New York", tradeNote: null, player: "Corinne Schroeder", position: "G", league: null, nationality: "CAN" },
  { pick: 34, round: 6, overall: 34, team: "Boston", tradeNote: null, player: "Jessica DiGirolamo", position: "D", league: null, nationality: null },
  { pick: 35, round: 6, overall: 35, team: "Toronto", tradeNote: null, player: "Kali Flanagan", position: "D", league: null, nationality: "USA" },
  { pick: 36, round: 6, overall: 36, team: "Minnesota", tradeNote: null, player: "Clair DeGeorge", position: "F", league: null, nationality: "USA" },
  { pick: 37, round: 7, overall: 37, team: "Minnesota", tradeNote: null, player: "Natalie Buchbinder", position: "D", league: null, nationality: "USA" },
  { pick: 38, round: 7, overall: 38, team: "Toronto", tradeNote: null, player: "Victoria Bach", position: "F", league: null, nationality: "CAN" },
  { pick: 39, round: 7, overall: 39, team: "Boston", tradeNote: null, player: "Theresa Schafzahl", position: "F", league: null, nationality: "AUT" },
  { pick: 40, round: 7, overall: 40, team: "New York", tradeNote: null, player: "Jill Saulnier", position: "F", league: null, nationality: "CAN" },
  { pick: 41, round: 7, overall: 41, team: "Ottawa", tradeNote: null, player: "Aneta Tejralová", position: "D", league: null, nationality: "CZE" },
  { pick: 42, round: 7, overall: 42, team: "Montreal", tradeNote: null, player: "Tereza Vanišová", position: "F", league: null, nationality: "CZE" },
  { pick: 43, round: 8, overall: 43, team: "Montreal", tradeNote: null, player: "Madison Bizal", position: "D", league: null, nationality: "USA" },
  { pick: 44, round: 8, overall: 44, team: "Ottawa", tradeNote: null, player: "Kateřina Mrázová", position: "C", league: null, nationality: "CZE" },
  { pick: 45, round: 8, overall: 45, team: "New York", tradeNote: null, player: "Brooke Hobson", position: "D", league: null, nationality: "CAN" },
  { pick: 46, round: 8, overall: 46, team: "Boston", tradeNote: null, player: "Emily Brown", position: "D", league: null, nationality: "USA" },
  { pick: 47, round: 8, overall: 47, team: "Toronto", tradeNote: null, player: "Brittany Howard", position: "F", league: null, nationality: "CAN" },
  { pick: 48, round: 8, overall: 48, team: "Minnesota", tradeNote: null, player: "Denisa Křížová", position: "F", league: null, nationality: "CZE" },
  { pick: 49, round: 9, overall: 49, team: "Minnesota", tradeNote: null, player: "Sidney Morin", position: "D", league: null, nationality: "USA" },
  { pick: 50, round: 9, overall: 50, team: "Toronto", tradeNote: null, player: "Allie Munroe", position: "D", league: null, nationality: "CAN" },
  { pick: 51, round: 9, overall: 51, team: "Boston", tradeNote: null, player: "Taylor Girard", position: "F", league: null, nationality: "USA" },
  { pick: 52, round: 9, overall: 52, team: "New York", tradeNote: null, player: "Jade Downie-Landry", position: "F", league: null, nationality: "CAN" },
  { pick: 53, round: 9, overall: 53, team: "Ottawa", tradeNote: null, player: "Zoe Boyd", position: "D", league: null, nationality: "CAN" },
  { pick: 54, round: 9, overall: 54, team: "Montreal", tradeNote: null, player: "Gabrielle David", position: "C", league: null, nationality: "CAN" },
  { pick: 55, round: 10, overall: 55, team: "Montreal", tradeNote: null, player: "Maude Poulin-Labelle", position: "D", league: null, nationality: "CAN" },
  { pick: 56, round: 10, overall: 56, team: "Ottawa", tradeNote: null, player: "Kristin Della Rovere", position: "C", league: null, nationality: "CAN" },
  { pick: 57, round: 10, overall: 57, team: "New York", tradeNote: null, player: "Paetyn Levis", position: "F", league: null, nationality: "USA" },
  { pick: 58, round: 10, overall: 58, team: "Boston", tradeNote: null, player: "Emma Söderberg", position: "G", league: null, nationality: "SWE" },
  { pick: 59, round: 10, overall: 59, team: "Toronto", tradeNote: null, player: "Mellissa Channell", position: "D", league: null, nationality: "CAN" },
  { pick: 60, round: 10, overall: 60, team: "Minnesota", tradeNote: null, player: "Sophia Kunin", position: "F", league: null, nationality: "USA" },
  { pick: 61, round: 11, overall: 61, team: "Minnesota", tradeNote: null, player: "Amanda Leveille", position: "G", league: null, nationality: "CAN" },
  { pick: 62, round: 11, overall: 62, team: "Toronto", tradeNote: null, player: "Maggie Connors", position: "F", league: null, nationality: "CAN" },
  { pick: 63, round: 11, overall: 63, team: "Boston", tradeNote: null, player: "Sophie Shirley", position: "F", league: null, nationality: "CAN" },
  { pick: 64, round: 11, overall: 64, team: "New York", tradeNote: null, player: "Abbey Levy", position: "G", league: null, nationality: "USA" },
  { pick: 65, round: 11, overall: 65, team: "Ottawa", tradeNote: null, player: "Lexie Adzija", position: "F", league: null, nationality: "CAN" },
  { pick: 66, round: 11, overall: 66, team: "Montreal", tradeNote: null, player: "Jillian Dempsey", position: "F", league: null, nationality: "USA" },
  { pick: 67, round: 12, overall: 67, team: "Montreal", tradeNote: null, player: "Claire Dalton", position: "C", league: null, nationality: "CAN" },
  { pick: 68, round: 12, overall: 68, team: "Ottawa", tradeNote: null, player: "Sandra Abstreiter", position: "G", league: null, nationality: "GER" },
  { pick: 69, round: 12, overall: 69, team: "New York", tradeNote: null, player: "Olivia Zafuto", position: "D", league: null, nationality: "USA" },
  { pick: 70, round: 12, overall: 70, team: "Boston", tradeNote: null, player: "Shiann Darkangelo", position: "F", league: null, nationality: "USA" },
  { pick: 71, round: 12, overall: 71, team: "Toronto", tradeNote: null, player: "Rebecca Leslie", position: "F", league: null, nationality: "CAN" },
  { pick: 72, round: 12, overall: 72, team: "Minnesota", tradeNote: null, player: "Michela Cava", position: "C", league: null, nationality: "CAN" },
  { pick: 73, round: 13, overall: 73, team: "Minnesota", tradeNote: null, player: "Liz Schepers", position: "C", league: null, nationality: "USA" },
  { pick: 74, round: 13, overall: 74, team: "Toronto", tradeNote: null, player: "Hannah Miller", position: "F", league: null, nationality: "CAN" },
  { pick: 75, round: 13, overall: 75, team: "Boston", tradeNote: null, player: "Emma Buckles", position: "D", league: null, nationality: "CAN" },
  { pick: 76, round: 13, overall: 76, team: "New York", tradeNote: null, player: "Kayla Vespa", position: "F", league: null, nationality: "CAN" },
  { pick: 77, round: 13, overall: 77, team: "Ottawa", tradeNote: null, player: "Amanda Boulier", position: "D", league: null, nationality: "USA" },
  { pick: 78, round: 13, overall: 78, team: "Montreal", tradeNote: null, player: "Élaine Chuli", position: "G", league: null, nationality: null },
  { pick: 79, round: 14, overall: 79, team: "Montreal", tradeNote: null, player: "Ann-Sophie Bettez", position: "F", league: null, nationality: "CAN" },
  { pick: 80, round: 14, overall: 80, team: "Ottawa", tradeNote: null, player: "Caitrin Lonergan", position: "F", league: null, nationality: "USA" },
  { pick: 81, round: 14, overall: 81, team: "New York", tradeNote: null, player: "Emma Woods", position: "F", league: null, nationality: "CAN" },
  { pick: 82, round: 14, overall: 82, team: "Boston", tradeNote: null, player: "Tatum Skaggs", position: "F", league: null, nationality: "USA" },
  { pick: 83, round: 14, overall: 83, team: "Toronto", tradeNote: null, player: "Alexa Vasko", position: "F", league: null, nationality: "CAN" },
  { pick: 84, round: 14, overall: 84, team: "Minnesota", tradeNote: null, player: "Minttu Tuominen", position: "D", league: null, nationality: "FIN" },
  { pick: 85, round: 15, overall: 85, team: "Minnesota", tradeNote: null, player: "Sydney Brodt", position: "F", league: null, nationality: "USA" },
  { pick: 86, round: 15, overall: 86, team: "Toronto", tradeNote: null, player: "Olivia Knowles", position: "D", league: null, nationality: "CAN" },
  { pick: 87, round: 15, overall: 87, team: "Boston", tradeNote: null, player: "Jessica Healey", position: "D", league: null, nationality: "CAN" },
  { pick: 88, round: 15, overall: 88, team: "New York", tradeNote: null, player: "Alexandra Labelle", position: "F", league: null, nationality: "CAN" },
  { pick: 89, round: 15, overall: 89, team: "Ottawa", tradeNote: null, player: "Audrey-Ann Veillette", position: "F", league: null, nationality: "CAN" },
  { pick: 90, round: 15, overall: 90, team: "Montreal", tradeNote: null, player: "Lina Ljungblom", position: "C", league: null, nationality: "SWE" },
];

export const PWHL_2023_STATS: PickStats = {
  totalPicks: 90,
  realPicks: 90,
  forfeits: 0,
  uniqueTeams: 6,
  rounds: 15,
  nationalities: 9,
  leagues: 0,
};

export const PWHL_2023_EVENT = {
  title: "2023 PWHL Draft",
  subtitle: "The inaugural PWHL Draft \u2014 6 teams, 90 picks over 15 rounds",
  date: "September 18, 2023",
  location: "CBC's Toronto Headquarters, Toronto, Ontario, Canada",
};