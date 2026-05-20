/**
 * Seed RinkStop Brands
 * Run: node scripts/seed-brands.js
 */
const { createClient } = require('@supabase/supabase-js');

const URL = 'https://yszheonqyyskkjoxoexk.supabase.co';
const KEY = '***REMOVED***';
const supabase = createClient(URL, KEY);

const BRANDS = [
  // ── EQUIPMENT (sticks, helmets, gear) ─────────────────────────────────────
  {
    name: 'CCM',
    slug: 'ccm',
    category: 'equipment',
    country_of_origin: 'Canada',
    website_url: 'https://ccmhockey.com',
    logo_url: null,
    description: 'Canada Cycle & Motor Co. — one of the oldest hockey equipment brands, producing skates, sticks, and gear since 1899. Official supplier to NCAA and junior leagues.',
    is_active: true,
  },
  {
    name: 'Bauer',
    slug: 'bauer',
    category: 'skates',
    country_of_origin: 'Canada',
    website_url: 'https://bauer.com',
    logo_url: null,
    description: "Bauer Hockey is the world's leading manufacturer of hockey skates, sticks, helmets, and protective gear, founded in 1927 in Kitchener, Ontario.",
    is_active: true,
  },
  {
    name: 'True',
    slug: 'true',
    category: 'skates',
    country_of_origin: 'Canada',
    website_url: 'https://truesports.com',
    logo_url: null,
    description: 'True Sports is an NHL-approved equipment brand specializing in high-performance carbon-fiber skates and sticks, known for their precision custom fit.',
    is_active: true,
  },
  {
    name: 'Warrior',
    slug: 'warrior',
    category: 'sticks',
    country_of_origin: 'USA',
    website_url: 'https://warriorsports.com',
    logo_url: null,
    description: 'Warrior Sports designs elite hockey sticks, helmets, and gear used by NHL players worldwide. Known for the Warrior Alpha line and innovative shaft technologies.',
    is_active: true,
  },
  {
    name: 'Easton',
    slug: 'easton',
    category: 'sticks',
    country_of_origin: 'USA',
    website_url: 'https://eastonsports.com',
    logo_url: null,
    description: 'Easton Sports pioneered the first composite hockey stick and continues to produce top-tier sticks, helmets, and protective equipment for elite and amateur players.',
    is_active: true,
  },
  {
    name: 'Fisher',
    slug: 'fisher',
    category: 'pads',
    country_of_origin: 'Canada',
    website_url: 'https://fisherhockey.com',
    logo_url: null,
    description: 'Fisher Goal Gear specializes in goalie pads and equipment, known for their lightweight designs and superior leg padding used by pro netminders.',
    is_active: true,
  },
  {
    name: 'Vaughn',
    slug: 'vaughn',
    category: 'pads',
    country_of_origin: 'USA',
    website_url: 'https://vaughnhockey.com',
    logo_url: null,
    description: 'Vaughn Hockey is a family-owned goalie equipment specialist producing pads, blockers, catchers, and chest protectors for goalies at all levels since 1947.',
    is_active: true,
  },
  {
    name: "Brian's",
    slug: 'brians',
    category: 'pads',
    country_of_origin: 'Canada',
    website_url: 'https://brianshockey.com',
    logo_url: null,
    description: "Brian's Hockey is a boutique goalie equipment manufacturer producing highly customizable pads, blockers, and catchers, prized by professional netminders for their precise fit.",
    is_active: true,
  },
  {
    name: 'CCM Goalie',
    slug: 'ccm-goalie',
    category: 'pads',
    country_of_origin: 'Canada',
    website_url: 'https://ccmhockey.com/goalie',
    logo_url: null,
    description: "CCM's dedicated goalie line offers premium pads, blockers, and catchers combining traditional construction with modern materials for pro-level performance.",
    is_active: true,
  },
  {
    name: 'Bauer Goalie',
    slug: 'bauer-goalie',
    category: 'pads',
    country_of_origin: 'Canada',
    website_url: 'https://bauer.com/goalie',
    logo_url: null,
    description: "Bauer's goalie division produces goal pads, chest protectors, gloves, and blockers trusted by NHL and international goalies, incorporating cutting-edge padding technology.",
    is_active: true,
  },

  // ── SKATES & FOOTWEAR ─────────────────────────────────────────────────────
  {
    name: 'Graf',
    slug: 'graf',
    category: 'skates',
    country_of_origin: 'Switzerland',
    website_url: 'https://graf-skates.com',
    logo_url: null,
    description: 'Graf Skate of Switzerland handcrafts high-end hockey skates with a reputation for exceptional fit and Swiss precision, used by professionals worldwide.',
    is_active: true,
  },
  {
    name: 'Hadfield',
    slug: 'hadfield',
    category: 'skates',
    country_of_origin: 'Canada',
    website_url: 'https://hadfieldsports.com',
    logo_url: null,
    description: 'Hadfield Sports has produced quality hockey skates and goalie equipment from Canada for decades, known for durability and value at the minor and senior hockey levels.',
    is_active: true,
  },
  {
    name: 'Touhu',
    slug: 'touhu',
    category: 'skates',
    country_of_origin: 'Finland',
    website_url: 'https://touhu.fi',
    logo_url: null,
    description: 'Finnish brand Touhu manufactures performance hockey skates blending Nordic engineering with aggressive blade geometry, popular in Liiga and internationally.',
    is_active: true,
  },

  // ── APPAREL & ACCESSORIES ─────────────────────────────────────────────────
  {
    name: 'Fanatics',
    slug: 'fanatics',
    category: 'apparel',
    country_of_origin: 'USA',
    website_url: 'https://fanatics.com',
    logo_url: null,
    description: "Fanatics is the world's largest online retailer of licensed sports merchandise, offering jerseys, apparel, and memorabilia across all major pro sports leagues.",
    is_active: true,
  },
  {
    name: 'NHL.com Shop',
    slug: 'nhl-shop',
    category: 'apparel',
    country_of_origin: 'USA',
    website_url: 'https://shop.nhl.com',
    logo_url: null,
    description: 'The official NHL online store, offering authentic jerseys, apparel, gear, and collectibles for all 32 NHL teams and the league itself.',
    is_active: true,
  },
  {
    name: 'CCM Apparel',
    slug: 'ccm-apparel',
    category: 'apparel',
    country_of_origin: 'Canada',
    website_url: 'https://ccmhockey.com/apparel',
    logo_url: null,
    description: "CCM's off-ice apparel line features hockey-themed streetwear, practice wear, and lifestyle clothing for players and fans beyond the rink.",
    is_active: true,
  },
  {
    name: 'Bauer Apparel',
    slug: 'bauer-apparel',
    category: 'apparel',
    country_of_origin: 'Canada',
    website_url: 'https://bauer.com/apparel',
    logo_url: null,
    description: "Bauer's lifestyle and performance apparel collection includes hoodies, t-shirts, joggers, and base layers for players who train and travel in hockey brand style.",
    is_active: true,
  },
  {
    name: 'White Rhino',
    slug: 'white-rhino',
    category: 'apparel',
    country_of_origin: 'Canada',
    website_url: 'https://whiterhino.ca',
    logo_url: null,
    description: 'White Rhino is a Canadian hockey streetwear brand combining bold graphics with premium fabrics, creating head-turning hoodies, tees, and accessories for the hockey lifestyle.',
    is_active: true,
  },
  {
    name: 'Howies',
    slug: 'howies',
    category: 'accessories',
    country_of_origin: 'USA',
    website_url: 'https://howieshockeytape.com',
    logo_url: null,
    description: "Howies Hockey Tape is an institution in hockey locker rooms, producing the iconic white and black tape used on sticks, plus socks, tape, and small accessories.",
    is_active: true,
  },
  {
    name: 'Zinc',
    slug: 'zinc',
    category: 'accessories',
    country_of_origin: 'Canada',
    website_url: 'https://zincsports.com',
    logo_url: null,
    description: 'Zinc Sports makes the popular Zinc Black face paint used by hockey players for intimidation, along with eye black, shin guards, and performance accessories.',
    is_active: true,
  },

  // ── PROTECTIVE GEAR ────────────────────────────────────────────────────────
  {
    name: 'Shock Doctor',
    slug: 'shock-doctor',
    category: 'accessories',
    country_of_origin: 'USA',
    website_url: 'https://shockdoctor.com',
    logo_url: null,
    description: 'Shock Doctor is the leader in sports mouthguards and protective gear, producing custom-fit mouthguards, thigh guards, wrist supports, and compression shorts.',
    is_active: true,
  },
  {
    name: 'Mission',
    slug: 'mission',
    category: 'accessories',
    country_of_origin: 'USA',
    website_url: 'https://missionsports.com',
    logo_url: null,
    description: 'Mission Sports produces the EXO-Series mouthguards, headgear, and protective accessories designed for lacrosse, hockey, and other contact sports.',
    is_active: true,
  },
  {
    name: 'Oakley',
    slug: 'oakley',
    category: 'accessories',
    country_of_origin: 'USA',
    website_url: 'https://oakley.com',
    logo_url: null,
    description: 'Oakley is a premium eyewear and protective gear brand offering sport-optimized goggles and sunglasses used by hockey players seeking superior impact protection and clarity.',
    is_active: true,
  },

  // ── LIFESTYLE & OFF-ICE ───────────────────────────────────────────────────
  {
    name: 'Heaton',
    slug: 'heaton',
    category: 'apparel',
    country_of_origin: 'USA',
    website_url: 'https://heatonbc.com',
    logo_url: null,
    description: 'Heaton Hockey is a lifestyle apparel brand merging hockey culture with streetwear aesthetics, producing premium hoodies, tees, and accessories for players and fans.',
    is_active: true,
  },
  {
    name: 'Hockeyaby',
    slug: 'hockeyaby',
    category: 'apparel',
    country_of_origin: 'Canada',
    website_url: 'https://hockeyaby.com',
    logo_url: null,
    description: 'Hockeyaby is a Canadian hockey lifestyle brand known for creative hockey-themed streetwear and accessories that celebrate the game off the ice.',
    is_active: true,
  },
  {
    name: 'Old Ranch',
    slug: 'old-ranch',
    category: 'apparel',
    country_of_origin: 'USA',
    website_url: 'https://oldranchhockey.com',
    logo_url: null,
    description: 'Old Ranch Hockey creates rustic, Americana-inspired hockey apparel and decor, channeling old-school rink nostalgia into modern streetwear and gifts.',
    is_active: true,
  },
  {
    name: 'Barkwax',
    slug: 'barkwax',
    category: 'accessories',
    country_of_origin: 'USA',
    website_url: 'https://barkwax.com',
    logo_url: null,
    description: 'Barkwax crafts hockey-scented soy candles, wax melts, and gift sets — the perfect gift for hockey enthusiasts who want their home to smell like a locker room.',
    is_active: true,
  },

  // ── TEAM EQUIPMENT & ICE MAINTENANCE ────────────────────────────────────
  {
    name: 'Zamboni',
    slug: 'zamboni',
    category: 'sticks',
    country_of_origin: 'USA',
    website_url: 'https://zamboni.com',
    logo_url: null,
    description: 'Zamboni is the iconic ice resurfacing machine manufacturer, producing the world\'s most recognized ice resurfacer used in arenas worldwide, plus refrigeration and arena equipment.',
    is_active: true,
  },
  {
    name: 'Fortress',
    slug: 'fortress',
    category: 'sticks',
    country_of_origin: 'Canada',
    website_url: 'https://fortressfastenings.com',
    logo_url: null,
    description: 'Fortress Fastenings produces heavy-duty bench and arena equipment including team benches, penalty benches, dasher boards hardware, and arena railing systems.',
    is_active: true,
  },
];

async function seed() {
  console.log(`Seeding ${BRANDS.length} brands...\n`);

  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  for (const brand of BRANDS) {
    const { data: existing } = await supabase
      .from('brands')
      .select('id')
      .eq('slug', brand.slug)
      .maybeSingle();

    if (existing) {
      console.log(`⏭️  SKIP: ${brand.name} (already exists)`);
      skipped++;
      continue;
    }

    const { data, error } = await supabase
      .from('brands')
      .insert(brand)
      .select()
      .single();

    if (error) {
      console.log(`❌ ERROR: ${brand.name} — ${error.message}`);
      errors++;
    } else {
      console.log(`✅ INSERTED: ${data.name} [${data.category}]`);
      inserted++;
    }
  }

  console.log(`\n───────────────`);
  console.log(`✅ Inserted: ${inserted}`);
  console.log(`⏭️  Skipped:  ${skipped}`);
  console.log(`❌ Errors:   ${errors}`);
}

seed().catch(console.error);