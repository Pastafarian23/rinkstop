'use client';
interface Props { isOwner: boolean; username: string; userId: string; }
export default function ProfileFeed(_props: Props) {
  return (
    <div style={{ padding: '1rem', color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem' }}>
      Posts feed temporarily disabled for debugging.
    </div>
  );
}
