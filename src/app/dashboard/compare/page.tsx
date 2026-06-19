import StubPage from '@/components/StubPage';

export const metadata = { title: 'Compare' };

export default function CompareStub() {
  return (
    <StubPage
      emoji="⚖️"
      title="Player Compare"
      summary="Side-by-side stats for two or more players. Goals, assists, games played, plus-vs-minus, penalty minutes, ice time. Save comparisons for later."
      features={[
        'Up to 4 players side-by-side',
        'Career + season + last-10-games views',
        'Sortable stat columns',
        'Save and share comparisons',
        'Head-to-head matchup history',
      ]}
      eta="Q3 2026"
    />
  );
}