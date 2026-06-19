import StubPage from '@/components/StubPage';

export const metadata = { title: 'Games' };

export default function RefereeGamesStub() {
  return (
    <StubPage
      emoji="🟥"
      title="Game Assignments"
      summary="Your assigned games, with one-click accept/decline. Schedule, drive time estimates, game report submission — all from your phone."
      features={[
        'One-tap accept or decline',
        'Drive time estimate + map link',
        'Game report submission (penalty log, incidents)',
        'Certification tracking (USA Hockey, SafeSport)',
        'Pay tracking (game fees, mileage)',
      ]}
      eta="Q4 2026"
    />
  );
}