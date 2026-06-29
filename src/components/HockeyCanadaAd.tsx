'use client';

interface HockeyCanadaAdProps {
  size: '300x250' | '468x60';
  style?: React.CSSProperties;
  className?: string;
}

/**
 * Hockey Canada affiliate ad (impact.com partner ID 7311498).
 * Renders a static image + sponsored link, plus a 1x1 tracking pixel.
 * Test pages: /directory/canada, /directory/canada/ontario, /directory/canada/ontario/toronto.
 * Rollout pending approval.
 */
const HOCKEY_CANADA_ADS = {
  '300x250': {
    affiliateLink: 'https://hcs.sjv.io/c/7311498/3410285/12134?kw=2026_jersey',
    imageUrl: 'https://a.impactradius-go.com/display-ad/12134-3410285',
    trackingPixel: 'https://imp.pxf.io/i/7311498/3410285/12134',
    width: 300,
    height: 250,
    alt: 'Shop for 2026 Hockey Canada jerseys by Bauer',
  },
  '468x60': {
    affiliateLink: 'https://hcs.sjv.io/c/7311498/3410285/12134?kw=2026_jersey',
    imageUrl: 'https://a.impactradius-go.com/display-ad/12134-3410285',
    trackingPixel: 'https://imp.pxf.io/i/7311498/3410285/12134',
    width: 468,
    height: 60,
    alt: 'Shop for 2026 Hockey Canada jerseys by Bauer',
  },
};

export default function HockeyCanadaAd({ size, style, className }: HockeyCanadaAdProps) {
  const ad = HOCKEY_CANADA_ADS[size];

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        margin: size === '468x60' ? '0.75rem 0 0.5rem' : '1.5rem 0',
        ...style,
      }}
    >
      <a
        href={ad.affiliateLink}
        target="_blank"
        rel="noopener noreferrer sponsored"
        title={ad.alt}
      >
        <img
          src={ad.imageUrl}
          alt={ad.alt}
          width={ad.width}
          height={ad.height}
          style={{
            display: 'block',
            maxWidth: '100%',
            height: 'auto',
            borderRadius: '6px',
          }}
        />
      </a>
      {/* 1x1 conversion tracking pixel */}
      <img
        height={0}
        width={0}
        src={ad.trackingPixel}
        alt=""
        style={{ position: 'absolute', visibility: 'hidden', border: 0 }}
      />
    </div>
  );
}