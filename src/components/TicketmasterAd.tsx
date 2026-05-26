'use client';

interface TicketmasterAdProps {
  size: '300x250' | '468x60';
  style?: React.CSSProperties;
  className?: string;
}

const TICKETMASTER_ADS = {
  '300x250': {
    teamId: '410527',
    imageUrl: 'https://a.impactradius-go.com/display-ad/4272-410527',
    affiliateLink: 'https://ticketmaster.evyy.net/c/7311498/410527/4272?u=https%3A%2F%2Fwww.ticketmaster.com%2Fnhl',
    width: 300,
    height: 250,
  },
  '468x60': {
    teamId: '410529',
    imageUrl: 'https://a.impactradius-go.com/display-ad/4272-410529',
    affiliateLink: 'https://ticketmaster.evyy.net/c/7311498/410529/4272?u=https%3A%2F%2Fwww.ticketmaster.com%2Fnhl',
    width: 468,
    height: 60,
  },
};

export default function TicketmasterAd({ size, style, className }: TicketmasterAdProps) {
  const ad = TICKETMASTER_ADS[size];

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        margin: size === '468x60' ? '0.75rem 0 0.5rem' : '1rem 0',
        ...style,
      }}
    >
      <a
        href={ad.affiliateLink}
        target="_blank"
        rel="noopener noreferrer sponsored"
        title="Get NHL tickets on Ticketmaster"
      >
        <img
          src={ad.imageUrl}
          alt="Ticketmaster NHL Tickets"
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
    </div>
  );
}
