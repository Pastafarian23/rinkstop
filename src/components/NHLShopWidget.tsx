'use client';

interface NHLShopWidgetProps {
  teamName: string;
  teamSlug: string;
  primaryColor: string;
  secondaryColor?: string;
  affiliateLink?: string;
  adImageUrl?: string;
}

export default function NHLShopWidget({
  teamName,
  teamSlug,
  primaryColor,
  secondaryColor = '#FFFFFF',
  affiliateLink,
  adImageUrl,
}: NHLShopWidgetProps) {
  const shopLink = affiliateLink && affiliateLink !== '#'
    ? affiliateLink
    : `https://www.nhlshop.com/?utm_source=rinkstop&utm_medium=referral&utm_campaign=${teamSlug}`;

  // If we have a Fanatics ad image, render the full ad unit (image is pre-linked)
  if (adImageUrl) {
    return (
      <div
        className="w-full rounded-xl overflow-hidden shadow-lg my-8"
        style={{
          background: `linear-gradient(135deg, ${primaryColor}22 0%, ${primaryColor}11 100%)`,
          border: `1px solid ${primaryColor}44`,
        }}
      >
        <a
          href={shopLink}
          target="_blank"
          rel="noopener noreferrer sponsored"
          style={{ display: 'block', textDecoration: 'none' }}
        >
          <img
            src={adImageUrl}
            alt={`Shop ${teamName} Jersey`}
            width={600}
            height={600}
            style={{
              width: '100%',
              maxWidth: '600px',
              display: 'block',
              margin: '0 auto',
              borderRadius: '12px',
            }}
          />
          <div
            style={{
              textAlign: 'center',
              padding: '0.5rem',
              fontSize: '0.6875rem',
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: `rgba(255,255,255,0.4)`,
            }}
          >
            Sponsored · NHL Shop
          </div>
        </a>
      </div>
    );
  }

  // Fallback: generic shop widget (existing design)
  return (
    <div
      className="w-full rounded-xl overflow-hidden shadow-lg my-8"
      style={{
        background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}CC 100%)`,
      }}
    >
      <div className="px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: secondaryColor }}
          >
            <svg viewBox="0 0 64 64" className="w-10 h-10" fill={primaryColor}>
              <path d="M32 8 L20 14 L12 24 L12 48 L20 56 L44 56 L52 48 L52 24 L44 14 Z" />
              <path d="M24 14 L20 20 L20 44 L24 50 L40 50 L44 44 L44 20 L40 14 Z" fill={secondaryColor} />
              <rect x="26" y="22" width="12" height="16" rx="1" fill={primaryColor} />
            </svg>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: secondaryColor }}>
              Official Partner
            </p>
            <h3 className="text-xl font-bold" style={{ color: secondaryColor }}>
              Shop {teamName} Gear
            </h3>
            <p className="text-sm" style={{ color: secondaryColor + 'CC' }}>
              Jerseys · Equipment · Fan Gear
            </p>
          </div>
        </div>
        <a
          href={shopLink}
          target="_blank"
          rel="noopener noreferrer"
          className="px-6 py-3 rounded-lg font-semibold text-sm uppercase tracking-wide transition-transform hover:scale-105 active:scale-95"
          style={{
            backgroundColor: secondaryColor,
            color: primaryColor,
          }}
        >
          Shop Now →
        </a>
      </div>
      <div className="h-1 w-full" style={{ backgroundColor: secondaryColor + '40' }} />
    </div>
  );
}