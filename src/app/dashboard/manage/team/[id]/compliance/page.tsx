import StubPage from '@/components/StubPage';

export const metadata = { title: 'Compliance' };

export default function TeamComplianceStub() {
  return (
    <StubPage
      emoji="📄"
      title="Compliance Documents"
      summary="Track every required document for every player and coach on your team. Birth certificates, waivers, USA Hockey registration numbers, concussion baseline tests — with expiry alerts."
      features={[
        'Per-player doc tracking (USA Hockey #, birth cert, waiver, medical release)',
        'Per-coach doc tracking (background check, SafeSport cert)',
        'File upload via Supabase Storage (private, signed URLs)',
        'Expiry alerts: 30 / 14 / 7 days before',
        'Bulk upload for returning players',
        'Compliance status dot (🟢 🟡 🔴) on the Roster page',
      ]}
      eta="Q3 2026"
    />
  );
}