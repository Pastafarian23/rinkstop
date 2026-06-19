import StubPage from '@/components/StubPage';

export const metadata = { title: 'Schedule' };

export default function ScheduleStub() {
  return (
    <StubPage
      emoji="📅"
      title="Schedule"
      summary="A single calendar that shows every event relevant to you: games, practices, tryouts, tournaments. Filter by team, by event type, by date range."
      features={[
        'Role-filtered events (coach sees practice+game, parent sees kid\'s events, ref sees assignments)',
        'Month / week / day views',
        'ICS export to Apple Calendar, Google Calendar, Outlook',
        'Conflict detection across multiple teams',
        'Map links to venues',
      ]}
      eta="Q3 2026"
    />
  );
}