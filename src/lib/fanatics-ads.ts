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
}

export const FANATICS_ADS: Record<string, FanaticsAd> = {
  'colorado-avalanche': {
    teamSlug: 'colorado-avalanche',
    teamName: 'Colorado Avalanche',
    imageUrl: 'https://a.impactradius-go.com/display-ad/9674-3335342',
    affiliateLink: 'https://nhlshop.775j.net/c/7311498/3335342/9674',
    teamId: '3335342',
  },
  // TODO: Add remaining 31 teams as Arnel pastes the embed codes
};

export default FANATICS_ADS;