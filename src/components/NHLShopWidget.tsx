'use client';

interface NHLShopWidgetProps {
  teamName: string;
  teamSlug: string;
  primaryColor: string;
  secondaryColor?: string;
  affiliateLink?: string;
}

export default function NHLShopWidget({
  teamName,
  teamSlug,
  primaryColor,
  secondaryColor = '#FFFFFF',
  affiliateLink = '#',
}: NHLShopWidgetProps) {
  // Build team-specific NHL Shop link if not provided
  const shopLink = affiliateLink !== '#' 
    ? affiliateLink 
    : `https://www.nhlshop.com/?utm_source=rinkstop&utm_medium=referral&utm_campaign=${teamSlug}`;

  return (
    <div 
      className="w-full rounded-xl overflow-hidden shadow-lg my-8"
      style={{
        background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}CC 100%)`
      }}
    >
      <div className="px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Left: Team Icon + Text */}
        <div className="flex items-center gap-4">
          {/* Jersey Icon Placeholder */}
          <div 
            className="w-16 h-16 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: secondaryColor }}
          >
            <svg 
              viewBox="0 0 64 64" 
              className="w-10 h-10"
              fill={primaryColor}
            >
              {/* Hockey Jersey Silhouette */}
              <path d="M32 8 L20 14 L12 24 L12 48 L20 56 L44 56 L52 48 L52 24 L44 14 Z" />
              <path d="M24 14 L20 20 L20 44 L24 50 L40 50 L44 44 L44 20 L40 14 Z" fill={secondaryColor} />
              <rect x="26" y="22" width="12" height="16" rx="1" fill={primaryColor} />
            </svg>
          </div>
          
          {/* Text Content */}
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

        {/* Right: CTA Button */}
        <a
          href={shopLink}
          target="_blank"
          rel="noopener noreferrer"
          className="px-6 py-3 rounded-lg font-semibold text-sm uppercase tracking-wide transition-transform hover:scale-105 active:scale-95"
          style={{ 
            backgroundColor: secondaryColor,
            color: primaryColor
          }}
        >
          Shop Now →
        </a>
      </div>
      
      {/* Footer strip */}
      <div 
        className="h-1 w-full"
        style={{ backgroundColor: secondaryColor + '40' }}
      />
    </div>
  );
}