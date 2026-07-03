// Auto-generated from xlsx in /root/.openclaw/media/inbound/
// Cross-verified against Wikipedia 2023-2024 PWHL Draft pages, PWHL official press releases, AP, CBC, College Hockey Inc, Star Tribune
// 2024 PWHL Draft: 42 picks, 7 rounds, 6 teams, 8 nationalities, 21 leagues
// 2023 nationality backfilled from Wikipedia + PWHL official press release (xref 90 players)
// Date: June 10, 2024 · Location: Roy Wilkins Auditorium, Saint Paul, Minnesota

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

export const PWHL_2024_PICKS: PWHLPick[] = [
  { pick: 1, round: 1, overall: 1, team: "New York", tradeNote: null, player: "Sarah Fillier", position: "F", league: "Princeton University (NCAA)", nationality: "CAN" },
  { pick: 2, round: 1, overall: 2, team: "Ottawa", tradeNote: null, player: "Danielle Serdachny", position: "F", league: "Colgate University (NCAA)", nationality: "CAN" },
  { pick: 3, round: 1, overall: 3, team: "Minnesota", tradeNote: null, player: "Claire Thompson", position: "D", league: "Team Sonnet (PWHPA)", nationality: "CAN" },
  { pick: 4, round: 1, overall: 4, team: "Boston", tradeNote: null, player: "Hannah Bilka", position: "F", league: "Ohio State University (NCAA)", nationality: "USA" },
  { pick: 5, round: 1, overall: 5, team: "Montreal", tradeNote: null, player: "Cayla Barnes", position: "D", league: "Ohio State University (NCAA)", nationality: "USA" },
  { pick: 6, round: 1, overall: 6, team: "Toronto", tradeNote: null, player: "Julia Gosling", position: "F", league: "St. Lawrence University (NCAA)", nationality: "CAN" },
  { pick: 1, round: 2, overall: 7, team: "Boston", tradeNote: "via NY", player: "Daniela Pejšová", position: "D", league: "Luleå HF (SDHL)", nationality: "CZE" },
  { pick: 2, round: 2, overall: 8, team: "Ottawa", tradeNote: null, player: "Ronja Savolainen", position: "D", league: "Luleå HF (SDHL)", nationality: "FIN" },
  { pick: 3, round: 2, overall: 9, team: "Minnesota", tradeNote: null, player: "Britta Curl", position: "F", league: "University of Wisconsin (NCAA)", nationality: "USA" },
  { pick: 4, round: 2, overall: 10, team: "New York", tradeNote: "via BOS", player: "Maja Nylén Persson", position: "D", league: "Brynäs IF (SDHL)", nationality: "SWE" },
  { pick: 5, round: 2, overall: 11, team: "Montreal", tradeNote: null, player: "Jennifer Gardiner", position: "F", league: "Ohio State University (NCAA)", nationality: "CAN" },
  { pick: 6, round: 2, overall: 12, team: "Toronto", tradeNote: null, player: "Megan Carter", position: "D", league: "Northeastern University (NCAA)", nationality: "CAN" },
  { pick: 1, round: 3, overall: 13, team: "New York", tradeNote: null, player: "Noora Tulus", position: "F", league: "Luleå HF (SDHL)", nationality: "FIN" },
  { pick: 2, round: 3, overall: 14, team: "Ottawa", tradeNote: null, player: "Gwyneth Philips", position: "G", league: "Northeastern University (NCAA)", nationality: "USA" },
  { pick: 3, round: 3, overall: 15, team: "Minnesota", tradeNote: null, player: "Klára Hymlárová", position: "F", league: "St. Cloud University (NCAA)", nationality: "CZE" },
  { pick: 4, round: 3, overall: 16, team: "New York", tradeNote: "via BOS", player: "Allyson Simpson", position: "D", league: "Colgate University (NCAA)", nationality: "USA" },
  { pick: 5, round: 3, overall: 17, team: "Montreal", tradeNote: null, player: "Abigail Boreen", position: "F", league: "PWHL Minnesota", nationality: "USA" },
  { pick: 6, round: 3, overall: 18, team: "Toronto", tradeNote: null, player: "Izzy Daniel", position: "F", league: "Cornell University (NCAA)", nationality: "USA" },
  { pick: 1, round: 4, overall: 19, team: "New York", tradeNote: null, player: "Gabby Rosenthal", position: "F", league: "Ohio State University (NCAA)", nationality: "USA" },
  { pick: 2, round: 4, overall: 20, team: "Ottawa", tradeNote: null, player: "Stephanie Markowski", position: "D", league: "Ohio State University (NCAA)", nationality: "CAN" },
  { pick: 3, round: 4, overall: 21, team: "Minnesota", tradeNote: null, player: "Brooke McQuigge", position: "F", league: "Clarkson University (NCAA)", nationality: "CAN" },
  { pick: 4, round: 4, overall: 22, team: "Boston", tradeNote: null, player: "Sydney Bard", position: "D", league: "Colgate University (NCAA)", nationality: "USA" },
  { pick: 5, round: 4, overall: 23, team: "Montreal", tradeNote: null, player: "Dara Greig", position: "F", league: "Colgate University (NCAA)", nationality: "CAN/USA" },
  { pick: 6, round: 4, overall: 24, team: "Toronto", tradeNote: null, player: "Lauren Bernard", position: "D", league: "Ohio State University (NCAA)", nationality: "USA" },
  { pick: 1, round: 5, overall: 25, team: "New York", tradeNote: null, player: "Elle Hartje", position: "F", league: "Yale University (NCAA)", nationality: "USA" },
  { pick: 2, round: 5, overall: 26, team: "Ottawa", tradeNote: null, player: "Mannon McMahon", position: "F", league: "University of Minnesota Duluth (NCAA)", nationality: "USA" },
  { pick: 3, round: 5, overall: 27, team: "Minnesota", tradeNote: null, player: "Dominique Petrie", position: "F", league: "Clarkson University (NCAA)", nationality: "USA" },
  { pick: 4, round: 5, overall: 28, team: "New York", tradeNote: "via BOS", player: "Kayle Osborne", position: "G", league: "Colgate University (NCAA)", nationality: "CAN" },
  { pick: 5, round: 5, overall: 29, team: "Montreal", tradeNote: null, player: "Anna Wilgren", position: "D", league: "University of Wisconsin (NCAA)", nationality: "USA" },
  { pick: 6, round: 5, overall: 30, team: "Toronto", tradeNote: null, player: "Noemi Neubauerova", position: "F", league: "Brynäs IF (SDHL)", nationality: "CZE" },
  { pick: 1, round: 6, overall: 31, team: "New York", tradeNote: null, player: "Emmy Fecteau", position: "F", league: "Concordia University (U Sports)", nationality: "CAN" },
  { pick: 2, round: 6, overall: 32, team: "Ottawa", tradeNote: null, player: "Anna Meixner", position: "F", league: "Brynäs IF (SDHL)", nationality: "AUT" },
  { pick: 3, round: 6, overall: 33, team: "Minnesota", tradeNote: null, player: "Mae Batherson", position: "D", league: "St. Lawrence University (NCAA)", nationality: "CAN" },
  { pick: 4, round: 6, overall: 34, team: "Boston", tradeNote: null, player: "Shay Maloney", position: "F", league: "Leksand IF (SDHL)", nationality: "USA" },
  { pick: 5, round: 6, overall: 35, team: "Montreal", tradeNote: null, player: "Anna Kjellbin", position: "D", league: "Luleå HF (SDHL)", nationality: "SWE" },
  { pick: 6, round: 6, overall: 36, team: "Toronto", tradeNote: null, player: "Anneke Linser", position: "F", league: "Djurgårdens IF (SDHL)", nationality: "USA" },
  { pick: 1, round: 7, overall: 37, team: "Boston", tradeNote: "via NY", player: "Ilona Markova", position: "F", league: "Agidel Ufa (ZhHL)", nationality: "RUS" },
  { pick: 2, round: 7, overall: 38, team: "Ottawa", tradeNote: null, player: "Madeline Wethington", position: "D", league: "University of Minnesota (NCAA)", nationality: "USA" },
  { pick: 3, round: 7, overall: 39, team: "Minnesota", tradeNote: null, player: "Katy Knoll", position: "F", league: "Northeastern University (NCAA)", nationality: "USA" },
  { pick: 4, round: 7, overall: 40, team: "Boston", tradeNote: null, player: "Hadley Hartmetz", position: "D", league: "Ohio State University (NCAA)", nationality: "USA" },
  { pick: 5, round: 7, overall: 41, team: "Montreal", tradeNote: null, player: "Amanda Kessel", position: "F", league: "Team adidas (PWHPA)", nationality: "USA" },
  { pick: 6, round: 7, overall: 42, team: "Toronto", tradeNote: null, player: "Raygan Kirk", position: "G", league: "Ohio State University (NCAA)", nationality: "CAN" },
];

export const PWHL_2024_STATS: PickStats = {
  totalPicks: 42,
  realPicks: 42,
  forfeits: 0,
  uniqueTeams: 6,
  rounds: 7,
  nationalities: 8,
  leagues: 21,
};

export const PWHL_2024_EVENT = {
  title: "2024 PWHL Draft",
  subtitle: "7 rounds \u00b7 6 teams \u00b7 42 picks",
  date: "June 10, 2024",
  location: "Roy Wilkins Auditorium, Saint Paul, Minnesota",
};