import StubPage from '@/components/StubPage';

export const metadata = { title: 'Plans' };

export default function PlansStub() {
  return (
    <StubPage
      emoji="📋"
      title="Practice Plans"
      summary="Build, save, and share practice plans. Drag-and-drop drills, attach video clips, sync with CoachBoard.pro for visual diagrams."
      features={[
        'Drag-and-drop plan builder',
        'Drill library (300+ pre-loaded, age-filtered)',
        'Integration with CoachBoard.pro for visual diagrams',
        'Share plans with assistant coaches and parents',
        'Time-tracking vs. plan (did you actually run it in 60 min?)',
      ]}
      eta="Q4 2026"
    />
  );
}