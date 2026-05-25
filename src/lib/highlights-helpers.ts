/**
 * Map RinkStop team names to highlightly team name formats for filtering highlights.
 * highlightly uses short names like "Golden Knights", "Avalanche", "Canadiens", "Hurricanes".
 */
export function mapTeamForHighlights(teamName: string | undefined): string | undefined {
  if (!teamName) return undefined;
  
  // Full team name → highlightly short name
  const nameMap: Record<string, string> = {
    'Vegas Golden Knights': 'Golden Knights',
    'Colorado Avalanche': 'Avalanche',
    'Montreal Canadiens': 'Canadiens',
    'Carolina Hurricanes': 'Hurricanes',
    'Toronto Maple Leafs': 'Maple Leafs',
    'Edmonton Oilers': 'Oilers',
    'Boston Bruins': 'Bruins',
    'New York Rangers': 'Rangers',
    'Los Angeles Kings': 'Kings',
    'San Jose Sharks': 'Sharks',
    'Anaheim Ducks': 'Ducks',
    'Calgary Flames': 'Flames',
    'Philadelphia Flyers': 'Flyers',
    'Pittsburgh Penguins': 'Penguins',
    'Washington Capitals': 'Capitals',
    'St. Louis Blues': 'Blues',
    'Florida Panthers': 'Panthers',
    'Tampa Bay Lightning': 'Lightning',
    'Winnipeg Jets': 'Jets',
    'Vancouver Canucks': 'Canucks',
    'New Jersey Devils': 'Devils',
    'New York Islanders': 'Islanders',
    'Buffalo Sabres': 'Sabres',
    'Arizona Coyotes': 'Coyotes',
    'Utah Hockey Club': 'Utah',
    'Nashville Predators': 'Predators',
    'Minnesota Wild': 'Wild',
    'Dallas Stars': 'Stars',
    'Columbus Blue Jackets': 'Blue Jackets',
    'Detroit Red Wings': 'Red Wings',
    'Chicago Blackhawks': 'Blackhawks',
    'Seattle Kraken': 'Kraken',
    'Ottawa Senators': 'Senators',
    'Vegas': 'Golden Knights',
    'Colorado': 'Avalanche',
    'Montreal': 'Canadiens',
    'Carolina': 'Hurricanes',
    'Boston': 'Bruins',
    'Edmonton': 'Oilers',
    'Toronto': 'Maple Leafs',
  };
  
  return nameMap[teamName] || teamName;
}

export function getTeamHighlightlyName(team: { name?: string } | null | undefined): string | undefined {
  if (!team?.name) return undefined;
  return mapTeamForHighlights(team.name);
}
