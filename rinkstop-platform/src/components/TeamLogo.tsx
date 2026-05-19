'use client';
import Image from 'next/image';

interface Props {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  fallback?: string;
}

export default function TeamLogo({ src, alt, width = 36, height = 36, fallback }: Props) {
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      style={{ objectFit: 'contain', flexShrink: 0 }}
      onError={(e) => {
        const target = e.target as HTMLImageElement;
        if (fallback) {
          target.style.display = 'none';
        } else {
          target.style.display = 'none';
        }
      }}
      unoptimized
    />
  );
}