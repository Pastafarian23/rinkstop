// Country-aware closing phrase for the city page's "Browse the directory below for ..." sentence.
//
// The template used to hardcode "across Canada" for every non-US city, so Oslo, Mexico City,
// Jakarta and others said Canada. This returns the phrase for the city's own country.
//
// Rules:
// - United States keeps its existing wording, unchanged.
// - Any other country with a name uses "across <country>".
// - A missing or blank country name omits the "across ..." part instead of guessing a country.
// The phrase has no count, so there is no singular/plural branch.

export const US_BROWSE_COPY = 'leagues, teams, and rink details, plus links to upcoming games and standings.';

export function browseDirectoryCopy(countryName: string | null | undefined): string {
  if (countryName === 'United States') return US_BROWSE_COPY;
  const country = (countryName ?? '').trim();
  return country ? `leagues, teams, and rink details across ${country}.` : 'leagues, teams, and rink details.';
}
