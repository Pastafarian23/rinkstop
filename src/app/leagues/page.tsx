// /leagues is a legacy top-level path. The directory of all leagues
// actually lives at /directory/leagues (with a country-scoped view under
// /leagues/[country]/[league] for individual league pages). We redirect
// /leagues to the unified /directory/leagues index.
import { redirect } from 'next/navigation';

export default function LeaguesIndex() {
  redirect('/directory/leagues');
}
