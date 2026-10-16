import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Game on RinkStop';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Simple test — no external calls
export default async function Image({ params }: { params: { id: string } }) {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#0D1117',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 64,
          fontWeight: 900,
          color: '#fff',
          fontFamily: 'system-ui',
        }}
      >
        Game OG Test — {params.id?.slice(0, 8)}
      </div>
    ),
    { ...size }
  );
}
