import StubPage from '@/components/StubPage';

export const metadata = { title: 'Coach Feed' };

export default function CoachFeedStub() {
  return (
    <StubPage
      emoji="📣"
      title="Coach Feed"
      summary="See announcements, schedule changes, and team updates from your coach in one place. Practice reminders, game day lineups, last-minute cancellations — all in your feed."
      features={[
        'Push-style feed of coach announcements',
        'Schedule changes flagged with red dot',
        'Game-day lineup notifications',
        'Read receipts so coaches know who saw what',
        'Filter by announcement type (practice, game, social)',
      ]}
      eta="Q3 2026"
    />
  );
}