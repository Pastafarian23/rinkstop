'use client';

import { useState } from 'react';

type Props = {
  photos: string[];
  rinkName: string;
};

export default function RinkPhotoGallery({ photos, rinkName }: Props) {
  const [index, setIndex] = useState(0);
  const safe = Array.from(new Set(photos.filter(Boolean)));
  if (safe.length === 0) return null;
  const current = safe[index % safe.length];
  const prev = () => setIndex((index - 1 + safe.length) % safe.length);
  const next = () => setIndex((index + 1) % safe.length);

  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ position: 'relative', width: '100%', maxHeight: 400, borderRadius: 12, overflow: 'hidden', background: 'rgba(255,255,255,0.04)' }}>
        <img
          src={current}
          alt={`${rinkName} photo ${index + 1}`}
          referrerPolicy="no-referrer"
          style={{ width: '100%', maxHeight: 400, objectFit: 'cover', display: 'block' }}
        />
        {safe.length > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="Previous photo"
              style={{
                position: 'absolute', top: '50%', left: 8, transform: 'translateY(-50%)',
                background: 'rgba(0,0,0,0.55)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)',
                borderRadius: '999px', width: 36, height: 36, fontSize: 16, cursor: 'pointer',
              }}
            >
              ‹
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Next photo"
              style={{
                position: 'absolute', top: '50%', right: 8, transform: 'translateY(-50%)',
                background: 'rgba(0,0,0,0.55)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)',
                borderRadius: '999px', width: 36, height: 36, fontSize: 16, cursor: 'pointer',
              }}
            >
              ›
            </button>
          </>
        )}
      </div>
      {safe.length > 1 && (
        <div style={{ display: 'flex', gap: 8, marginTop: 8, overflowX: 'auto' }}>
          {safe.map((url, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Photo ${i + 1}`}
              style={{
                flex: '0 0 auto', width: 64, height: 48, borderRadius: 8, overflow: 'hidden',
                border: i === index ? '2px solid #fff' : '2px solid transparent',
                opacity: i === index ? 1 : 0.7, background: 'rgba(255,255,255,0.04)', cursor: 'pointer', padding: 0,
              }}
            >
              <img src={url} alt="" referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
