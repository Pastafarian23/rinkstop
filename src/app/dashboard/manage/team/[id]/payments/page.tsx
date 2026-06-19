import StubPage from '@/components/StubPage';

export const metadata = { title: 'Team Payments' };

export default function TeamPaymentsStub() {
  return (
    <StubPage
      emoji="💳"
      title="Team Payments"
      summary="Track incoming dues from every player, plus outgoing team expenses (ice time, referees, jerseys, tournament fees). Manual entry or Stripe online payments — your choice."
      features={[
        'Per-player dues tracker (paid / partial / overdue)',
        'Family discounts + sibling rates',
        'Outgoing expense log (ice, refs, jerseys, tournament fees)',
        'Stripe Connect for online payment collection',
        'CSV export for your accountant',
        'Email reminders to parents with unpaid balances',
      ]}
      eta="Day 5 — shipping next"
      backHref="/dashboard"
      backLabel="Back to dashboard"
    />
  );
}