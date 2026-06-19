import StubPage from '@/components/StubPage';

export const metadata = { title: 'Bookings' };

export default function BookingsStub() {
  return (
    <StubPage
      emoji="🏟️"
      title="Bookings"
      summary="Public-facing booking widget for your rink. Public skates, lessons, ice time slots. Customers book and pay online; you manage availability from one screen."
      features={[
        'Public booking widget for your rink page',
        'Recurring slot templates (e.g. "Tuesday 7pm Public Skate")',
        'Capacity limits + waitlist',
        'Stripe payment at booking time',
        'Email/SMS reminders 24h before',
        'Refunds + cancellations policy',
      ]}
      eta="Q4 2026"
    />
  );
}