'use client';
import { useState } from 'react';

interface Props {
  abbr: string;
  city: string;
  fallbackColor?: string;
  size?: number;
}

export default function TeamLogo({ abbr, city, fallbackColor = '#041E42', size = 36 }: Props) {
  const [errored, setErrored] = useState(false);

  if (errored) {
    return (
      <div style={{
        width: size, height: size,
        borderRadius: '50%',
        background: fallbackColor,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
        fontWeight: 800, fontSize: `${size * 0.22}px`, color: '#fff',
      }}>
        {city[0]}
      </div>
    );
  }

  return (
    <img
      src={`https://assets.nhle.com/logos/nhl/svg/${abbr}_light.svg`}
      alt=""
      width={size}
      height={size}
      style={{ width: size, height: size, objectFit: 'contain', flexShrink: 0 }}
      onError={() => setErrored(true)}
    />
  );
}