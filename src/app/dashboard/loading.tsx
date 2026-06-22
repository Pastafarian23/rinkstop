import BrandSpinner from '@/components/BrandSpinner';

export default function DashboardLoading() {
  return (
    <div
      style={{
        minHeight: '60vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0a0a',
      }}
    >
      <BrandSpinner label="Loading your RinkStop dashboard…" />
    </div>
  );
}
