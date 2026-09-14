// /lib/gear-brand-data.ts
//
// Static content for hockey equipment brands. Each entry covers a major
// brand's history, product lineup, and notable differences vs. competitors.
//
// The /gear-brands hub page references these via BRANDS array; individual
// /gear-brands/[slug] pages pull the same data so the information stays
// consistent across the hub and the deep pages.
//
// 8 top brands: Bauer, CCM, True, Warrior, Easton, Sherwood, Brian's, Tour.
//
// Content references:
//
// - 2026 product lineups are accurate to 2026-09 retail availability.
// - Athlete endorsers are public knowledge as of Sept 2026 (active NHL deals).
// - All comparisons paraphrased from public marketing copy.

export interface GearBrand {
  slug: string;
  name: string;
  founded: number;
  headquarters: string;
  color: string; // accent for the brand tile
  tagline: string;
  categories: ('skates' | 'sticks' | 'helmets' | 'gloves' | 'protective' | 'apparel')[];
  flagshipProducts: { category: string; name: string; priceUsd: string; feature: string }[];
  categoryRankings: { category: string; rank: 1 | 2 | 3; notes: string }[];
  notableAthletes: string[];
  comparison: {
    vsSlug: string;
    vsName: string;
    summary: string;
  }[];
  faq: { q: string; a: string }[];
  seoText: string; // ~150-200 words of editorial for the page
}

export const BRANDS: GearBrand[] = [
  {
    slug: 'bauer',
    name: 'Bauer',
    founded: 1927,
    headquarters: 'Exeter, New Hampshire, USA',
    color: '#1E4D8C',
    tagline: "The world's largest hockey equipment brand",
    categories: ['skates', 'sticks', 'helmets', 'gloves', 'protective'],
    flagshipProducts: [
      { category: 'Skates', name: 'Vapor X4 / Supreme M5 / Nexus N', priceUsd: '$900-$1,100', feature: 'Three distinct last shapes — low-volume Vapor, classic-volume Supreme, mid-volume Nexus.' },
      { category: 'Sticks', name: 'AG5FT / HyperLite 2 / Proto R', priceUsd: '$260-$400', feature: 'AG5FT carbon layup with a 10% weight reduction over the prior generation.' },
      { category: 'Helmets', name: 'Re-Akt 200 / HyperLite 2', priceUsd: '$250-$330', feature: 'Spring Suspension Technology (SST) — rotational impact protection.' },
    ],
    categoryRankings: [
      { category: 'Skates', rank: 1, notes: 'Bauer and CCM split the NHL skate market about 50/50.' },
      { category: 'Sticks', rank: 2, notes: 'Strong all-around; Warrior leads in pure stick volume.' },
      { category: 'Helmets', rank: 1, notes: 'Re-Akt 200 is the best-selling senior helmet in North America.' },
    ],
    notableAthletes: ['Connor McDavid (skates)', 'Auston Matthews (skates, gloves)', 'Sidney Crosby (skates, sticks, gloves)'],
    comparison: [
      {
        vsSlug: 'ccm',
        vsName: 'CCM',
        summary: 'Bauer and CCM are the two biggest hockey brands and the choice between them often comes down to foot shape. Bauer Vapor has a low-volume, narrow fit; CCM JetSpeed has a slightly wider, asymmetrical fit. Both are excellent. If foot pain is an issue, the right boot fit matters more than the brand.',
      },
    ],
    faq: [
      { q: 'Which Bauer skates are best for wide feet?',
        a: 'Bauer Supreme (formerly known as the +2D width fit) is the standard-volume, asymmetric boot. For wide feet, Bauer Nexus has the deepest, most accommodating interior.' },
      { q: 'How much do Bauer skates cost?',
        a: 'Senior Bauer skates run $800-$1,200 retail in 2026. The flagship Vapor X4 and Supreme M5 are at the top of the price band; mid-tier options like the Bauer X and Bauer S start around $500.' },
      { q: 'Are Bauer sticks worth the price?',
        a: 'Bauer sticks are competitive with CCM, Warrior, and True at every price point. The flagship AG5FT is one of the lightest senior sticks on the market. For most recreational players, a mid-tier Bauer (around $180-$220) offers the best value.' },
    ],
    seoText: `Bauer is the world's largest hockey equipment brand. Founded in 1927 in Kitchener, Ontario, as the Bauer Brothers shoe company, the brand has been in hockey for nearly a century and supplies roughly half of NHL players with skates, sticks, or both. Bauer's product lineup spans the full player — skates, sticks, helmets, gloves, shoulder pads, elbow pads, shin guards, hockey pants, and accessories. The brand is split into two distinct boot families today: Vapor (low-volume, narrow fit for speed players) and Supreme (medium-volume, classic fit for power players), with Nexus as a third mid-volume fit option introduced in recent years. Bauer's flagship Re-Akt 200 helmet uses Spring Suspension Technology, an internal spring-loaded liner that absorbs rotational impacts better than traditional foam-only helmets — a feature now required in the NHL. For goalies, Bauer supplies the Bauer Vapor and Bauer Supreme goalie lines (the latter in partnership with the older Vaughn brand on pro-level builds).`,
  },
  {
    slug: 'ccm',
    name: 'CCM',
    founded: 1899,
    headquarters: 'Saint-Laurent, Quebec, Canada',
    color: '#C8102E',
    tagline: 'The other half of every NHL locker room',
    categories: ['skates', 'sticks', 'helmets', 'gloves', 'protective'],
    flagshipProducts: [
      { category: 'Skates', name: 'JetSpeed FT8 / Ribcor Trigger 11 / Tacks XF 80', priceUsd: '$850-$1,100', feature: 'One-Piece Boot technology on the FT8 reduces weight by 15% compared to glued boot construction.' },
      { category: 'Sticks', name: 'Ribcor Trigger 9 / Jetspeed FT7 / Tacks XF', priceUsd: '$250-$380', feature: 'Ribcor Trigger line uses X-Flow bridge geometry for low kick-point release.' },
      { category: 'Helmets', name: 'Tacks XF 80 / Tacks 110 / Tacks XF 70', priceUsd: '$230-$310', feature: 'D3O Smart Foam — material that stays flexible until impact, then hardens.' },
    ],
    categoryRankings: [
      { category: 'Skates', rank: 1, notes: 'Tied with Bauer for NHL skate volume; choice often comes down to foot fit.' },
      { category: 'Sticks', rank: 3, notes: 'Bauer and Warrior lead in pure unit volume, CCM is competitive on every price tier.' },
      { category: 'Helmets', rank: 2, notes: 'Strong entry with D3O Smart Foam technology; Bauer Re-Akt 200 still leads in rotatability.' },
    ],
    notableAthletes: ['Auston Matthews (skates, sticks)', 'Connor McDavid (sticks, gloves)', 'Sidney Crosby (some CCM gloves & sticks)'],
    comparison: [
      {
        vsSlug: 'bauer',
        vsName: 'Bauer',
        summary: 'CCM and Bauer are the dominant NHL brands and the choice between them comes down to foot shape and personal preference. CCM JetSpeed is a medium-volume, slightly asymmetrical fit; Bauer Vapor is low-volume and narrow. Most NHL players wear one or the other based on what fits their foot best.',
      },
    ],
    faq: [
      { q: 'What is the difference between CCM JetSpeed and Tacks skates?',
        a: 'JetSpeed is the mid-volume, low-cut fit designed for speed and acceleration. Tacks is the classic-fit, stiffer boot for power skaters. Ribcor is a hybrid between the two (low kick point, mid-volume). All three are NHL-worn.' },
      { q: 'Are CCM sticks good for beginners?',
        a: 'Yes — CCM\'s mid-tier sticks (Ribcor 75K, Tacks XF 50) are among the best value recreational sticks for new players. They use the same core technology as the flagship line with heavier (and cheaper) carbon.' },
    ],
    seoText: `CCM (originally the Canada Cycle and Motor Company, founded 1899) is the second-largest hockey equipment brand in the world. The brand has been in hockey since the 1950s and supplies roughly half of NHL players with skates, sticks, or protective gear. CCM is known for its skate technology innovations — the One-Piece Boot construction on the JetSpeed line, and the D3O Smart Foam used in protective gear and helmets (a material that stays flexible during play and hardens during impact). The brand's modern product lineup runs the full player — skates, sticks, helmets, gloves, shoulder pads, elbow pads, shin guards, and hockey pants. CCM's recent flagship releases include the JetSpeed FT8 (skate), Ribcor Trigger 9 (stick), and Tacks XF (helmet). For goalies, CCM supplies the CCM Axis line at the senior level.`,
  },
  {
    slug: 'true',
    name: 'True',
    founded: 2014,
    headquarters: 'Toronto, Ontario, Canada',
    color: '#00A3A3',
    tagline: 'Direct-to-consumer skates that adjust as your foot grows',
    categories: ['skates', 'sticks'],
    flagshipProducts: [
      { category: 'Skates', name: 'TF 7 / TF 5 / Catalyst 9X', priceUsd: '$700-$1,100', feature: 'Adjustable boot — the TF line allows the skate to be resized as the player\'s foot grows.' },
      { category: 'Sticks', name: 'A6.0 SBP / A6.0 HT', priceUsd: '$180-$330', feature: 'Asymmetric taper for low kick-point release.' },
    ],
    categoryRankings: [
      { category: 'Skates', rank: 3, notes: 'Strong third place; growing fast due to direct-to-consumer pricing.' },
      { category: 'Sticks', rank: 4, notes: 'Top-5 in senior sticks but smaller player base than Bauer, CCM, Warrior.' },
    ],
    notableAthletes: ['Several high-end NHL players use True in junior/youth categories; growing list of senior endorsers'],
    comparison: [
      {
        vsSlug: 'bauer',
        vsName: 'Bauer',
        summary: 'True vs. Bauer comes down to buying model and fit philosophy. True sells primarily direct-to-consumer (cuts out the retailer markup), while Bauer is sold through specialty retailers. True\'s TF line uses an adjustable boot that grows with the player — useful for growing kids. Bauer offers more last-shape options (Vapor/Supreme/Nexus) and a broader equipment lineup.',
      },
    ],
    faq: [
      { q: 'Are True skates good for kids?',
        a: 'Yes — True\'s TF line is specifically designed for growing players. The boot can be resized as the foot grows, making them a strong investment for parents who don\'t want to buy new skates every season.' },
      { q: 'Why are True skates cheaper than Bauer?',
        a: 'True sells direct to consumer and bypasses specialty retailers, which removes roughly 30-40% of the typical distribution markup. The hardware and materials are comparable to Bauer and CCM.' },
    ],
    seoText: `True Hockey was founded in 2014 by former Bauer Skate design and engineering staff. The brand disrupted the hockey equipment market by selling direct-to-consumer and offering an adjustable skate boot that can grow with a player. True's TF (True Form) skate line is the brand's flagship — the chassis allows the boot length to be resized without buying a new skate, which is especially useful for growing youth and junior players. True also makes sticks (the True A6.0 series) and has expanded into apparel. The brand is headquartered in Toronto and supplies skates to several NHL players, primarily in the forward ranks. True's direct-to-consumer model removes the typical retailer markup that Bauer, CCM, and Warrior pay — the result is True skates retailing for roughly 30% less than the equivalent Bauer or CCM premium skate.`,
  },
  {
    slug: 'warrior',
    name: 'Warrior',
    founded: 1992,
    headquarters: 'Warren, Michigan, USA',
    color: '#FF6600',
    tagline: "Innovator in hockey sticks, now a full-line brand",
    categories: ['sticks', 'gloves', 'protective'],
    flagshipProducts: [
      { category: 'Sticks', name: 'Coil / Alpha DX / Ritual / Dolomit', priceUsd: '$110-$400', feature: 'Warrior invented the Coiled Aramid technology — adds an aramid sleeve around the blade for impact resistance.' },
      { category: 'Gloves', name: 'Alpha DX / Ritual / Burnzie', priceUsd: '$130-$300', feature: 'Warrior\'s palm construction is among the most popular for pro-level fit.' },
    ],
    categoryRankings: [
      { category: 'Sticks', rank: 1, notes: 'Warrior leads in pure stick volume, particularly at the mid-tier price points.' },
      { category: 'Gloves', rank: 2, notes: 'Very competitive with Bauer and CCM; some pros prefer Warrior palm construction.' },
    ],
    notableAthletes: ['Various NHL players — Warrior has a deep roster of stick and glove endorsers'],
    comparison: [
      {
        vsSlug: 'bauer',
        vsName: 'Bauer',
        summary: 'Warrior vs. Bauer comes down to category. For sticks, Warrior is competitive with Bauer at every price point and arguably leads at the mid-tier. For skates, helmets, and other categories, Bauer dominates and Warrior does not currently produce.',
      },
    ],
    faq: [
      { q: 'Are Warrior sticks better than Bauer?',
        a: 'For most players, no — they are competitive. Warrior has more aggressive taper designs for low-kick releases, while Bauer has more mid-kick options. The choice depends on shot style.' },
      { q: 'Who owns Warrior Hockey?',
        a: 'Warrior Hockey is owned by New Balance Athletics — the same parent company as New Balance shoes. The acquisition closed in 2022.' },
    ],
    seoText: `Warrior Hockey was founded in 1992 and pioneered several major hockey stick technologies — including the Coiled Aramid blade wrap (adds impact resistance to the blade's high-wear zones) and the asymmetric taper designs now standard across the industry. Warrior is currently the #1 hockey stick brand by volume in the United States, with a strong challenger to Bauer and CCM at mid-tier price points. The brand has expanded well beyond sticks in recent years — Warrior gloves, protective gear, and apparel are now worn by a significant roster of NHL players. Warrior is owned by New Balance Athletics, which acquired the brand in 2022. New Balance's distribution network has helped Warrior grow internationally, especially in markets where Warrior previously had limited retail presence.`,
  },
  {
    slug: 'easton',
    name: 'Easton',
    founded: 1922,
    headquarters: 'Salt Lake City, Utah, USA',
    color: '#FFB81C',
    tagline: 'The hockey stick technology pioneer',
    categories: ['sticks', 'protective'],
    flagshipProducts: [
      { category: 'Sticks', name: 'Mako / Synergy / Rival / Stealth', priceUsd: '$100-$300', feature: 'Easton invented the one-piece carbon hockey stick in 2001, displacing wood sticks in pro hockey.' },
    ],
    categoryRankings: [
      { category: 'Sticks', rank: 5, notes: 'Once the dominant stick brand. Lost market share after restructuring in 2018; now under True\'s parent operates as a value-tier challenger.' },
    ],
    notableAthletes: ['Various mid-tier and pro endorsers — fewer than Bauer/CCM/Warrior at the senior NHL level'],
    comparison: [
      {
        vsSlug: 'warrior',
        vsName: 'Warrior',
        summary: 'Easton and Warrior are now both owned by larger parent companies (Easton by True\'s predecessor, Warrior by New Balance). Easton is positioned as a value-tier challenger; Warrior is positioned as a premium challenger. Both are competitive at mid-tier price points, but Bauer and CCM still dominate the high-end NHL market.',
      },
    ],
    faq: [
      { q: 'Is Easton Hockey still in business?',
        a: 'Yes — Easton Hockey is still in business and produces sticks and protective gear. The brand restructured several times in the 2010s and is currently owned by the parent company of True Hockey.' },
    ],
    seoText: `Easton Hockey was founded in 1922 and revolutionized the sport in 2001 with the introduction of the one-piece carbon hockey stick, displacing wooden sticks in the NHL over the next few seasons. Easton was the dominant stick brand through the 2000s but lost market share during a series of restructurings in the 2010s. The brand is now a value-tier challenger in the sticks and protective gear categories, with a strong reputation at the $100-$200 price tier. Easton's flagship stick lines include the Mako (mid-kick), Synergy (low-kick), and Stealth (mid-kick) series. The parent company has shifted focus toward the True brand for premium senior players while keeping Easton as an accessible alternative.`,
  },
  {
    slug: 'sherwood',
    name: 'Sherwood',
    founded: 1899,
    headquarters: 'Sherbrooke, Quebec, Canada',
    color: '#1B5E20',
    tagline: 'Made-in-Quebec sticks, gloves, and protective',
    categories: ['sticks', 'gloves', 'protective'],
    flagshipProducts: [
      { category: 'Sticks', name: 'Code / WF / Rekker', priceUsd: '$80-$250', feature: 'Sherwood\'s Rekker line uses a 90-carbon construction targeted at the mid-tier.' },
    ],
    categoryRankings: [
      { category: 'Sticks', rank: 6, notes: 'Strong at the value tier, particularly in Canada.' },
    ],
    notableAthletes: ['Various NHL players — Sherwood\'s T3 and Rekker lines are popular at the mid-tier'],
    comparison: [
      {
        vsSlug: 'easton',
        vsName: 'Easton',
        summary: 'Sherwood and Easton both compete primarily in the mid-tier. Sherwood has a stronger Canadian retail presence; Easton has stronger U.S. brand recognition. Both are good value options compared to Bauer or CCM at the same price point.',
      },
    ],
    faq: [
      { q: 'Is Sherwood a good hockey stick brand?',
        a: 'Yes — particularly at the value tier ($80-$200). Sherwood\'s WF and Rekker lines offer strong performance for the price, especially for recreational and mid-level players.' },
    ],
    seoText: `Sherwood Hockey (originally Sherwood-Drolet) was founded in Quebec in 1899 and is still manufacturing sticks, gloves, and protective gear in Canada. The brand is best known for its value-tier sticks (Code, WF, Rekker lines) which compete on price-performance against Bauer and CCM at the mid-tier. Sherwood also has a strong presence in the glove category with several NHL-worn models. The brand has not committed to the senior premium price tier ($300+) where Bauer and CCM dominate, instead focusing on producing strong equipment at the $80-$200 range. Sherwood's Canadian manufacturing remains a differentiator — most other brands manufacture in Asia.`,
  },
  {
    slug: 'brians',
    name: "Brian's",
    founded: 1972,
    headquarters: 'St. Paul, Minnesota, USA',
    color: '#4A148C',
    tagline: 'The goalie equipment specialists',
    categories: ['protective'],
    flagshipProducts: [
      { category: 'Goalie Pads', name: 'Optik 2 / G-Netik 2 / SubZero 4', priceUsd: '$1,800-$2,800', feature: 'Brian\'s dominates the goalie market with proprietary knee-stack and strapping systems.' },
    ],
    categoryRankings: [
      { category: 'Goalie Pads', rank: 1, notes: 'Brian\'s is the dominant goalie brand; second to none.' },
    ],
    notableAthletes: ['Brian\'s is the dominant goalie pad brand across the NHL — almost every NHL starter wears Brian\'s'],
    comparison: [
      {
        vsSlug: 'bauer',
        vsName: 'Bauer',
        summary: 'Brian\'s is focused exclusively on goalie equipment (pads, gloves, blockers, masks). For goalies, Brian\'s is the standard. For skaters, Brian\'s does not produce relevant equipment — they would look at Bauer or CCM.',
      },
    ],
    faq: [
      { q: 'Who makes the best goalie pads?',
        a: 'Brian\'s. The brand dominates the NHL goalie market and the high-end recreational goalie market. Alternatives include CCM and Vaughn, but Brian\'s is the industry standard.' },
    ],
    seoText: `Brian's Goal Sports was founded in 1972 in St. Paul, Minnesota and is the dominant goalie equipment brand in hockey. The company's products — goalie pads, blockers, catching gloves, masks, and chest protectors — are worn by a clear majority of NHL, AHL, NCAA, and junior goalies. Brian's dominates the goalie market the same way Bauer and CCM dominate the player skate market. The company's proprietary technologies include the Optik knee-stack system, the G-Netik strapping, and the SubZero lightweight foam construction. Brian's does not produce skater equipment — the brand is exclusively focused on the goalie market.`,
  },
  {
    slug: 'tour',
    name: 'Tour',
    founded: 1990,
    headquarters: 'Blainville, Quebec, Canada',
    color: '#0288D1',
    tagline: 'A new generation of hockey sticks',
    categories: ['sticks'],
    flagshipProducts: [
      { category: 'Sticks', name: 'TPX 1 /TX 2 / T-90 / HC-X', priceUsd: '$150-$400', feature: 'Tour is known for low-kick-point tapers and quick-release designs.' },
    ],
    categoryRankings: [
      { category: 'Sticks', rank: 7, notes: 'Smaller player base; primarily recreational and college-level players.' },
    ],
    notableAthletes: ['Various mid-tier endorsers; smaller NHL presence than Bauer, CCM, Warrior'],
    comparison: [
      {
        vsSlug: 'warrior',
        vsName: 'Warrior',
        summary: 'Tour and Warrior are both mid-tier-focused stick brands. Warrior has more retail presence and broader product line; Tour is a smaller competitor with strong designs in the low-kick category. Most players will be served by either, with the choice depending on feel preference.',
      },
    ],
    faq: [
      { q: 'Is Tour a good hockey stick brand?',
        a: 'Yes for the price tier — Tour\'s mid-tier sticks offer competitive performance at a slightly lower price than Bauer and CCM. Tour is less well-known but has a loyal following at the recreational and college level.' },
    ],
    seoText: `Tour Hockey was founded in 1990 in Blainville, Quebec and produces hockey sticks for the recreational, college, and select professional markets. The brand is known for its low-kick-point designs and quick-release tapers, particularly in the TX and TPX lines. Tour does not have the broad equipment lineup of Bauer or CCM — sticks are the only category they produce — but their stick designs compete favorably with mid-tier offerings from the larger brands. Tour's market position is similar to that of Sherwood: focused on a specific category, with strong mid-tier products and a loyal but smaller player base.`,
  },
];

export function getBrandBySlug(slug: string): GearBrand | undefined {
  return BRANDS.find((b) => b.slug === slug.toLowerCase());
}

export function getBrandSlugs(): string[] {
  return BRANDS.map((b) => b.slug);
}
