// Fanatics/NHL Shop affiliate ads for all 32 NHL teams
// Image: Impact CDN image URL
// Link: Impact affiliate redirect link
// teamId: Impact publisher team ID

export interface FanaticsAd {
  teamSlug: string;
  teamName: string;
  imageUrl: string;
  affiliateLink: string;
  teamId: string;
  adWidth?: number;
  adHeight?: number;
}

export const FANATICS_ADS: Record<string, FanaticsAd> = {
  'colorado-avalanche': {
    teamSlug: 'colorado-avalanche',
    teamName: 'Colorado Avalanche',
    imageUrl: 'https://a.impactradius-go.com/display-ad/9674-1844314',
    affiliateLink: 'https://nhlshop.775j.net/c/7311498/1844314/9674',
    teamId: '1844314',
    adWidth: 300,
    adHeight: 250,
  },
  // TODO: Add remaining 31 teams as Arnel pastes the embed codes
};

export default FANATICS_ADS;