// Add more brands to the directory.
// Picks well-known brands with public knowledge, focusing on categories
// that are under-represented (helmets, neck guards) or popular (apparel).

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const NEW_BRANDS = [
  {
    name: 'Cascade',
    slug: 'cascade',
    category: 'accessories',
    country_of_origin: 'USA',
    description: 'Cascade Lacrosse (now Maverik Cascade) makes hockey helmets, including the popular M11 and CPV-R lines. Known for their custom-fit system used by NHL goalies.',
    website_url: 'https://cascadelacrosse.com',
  },
  {
    name: 'Maverik',
    slug: 'maverik',
    category: 'accessories',
    country_of_origin: 'USA',
    description: 'Maverik is a lacrosse brand that expanded into hockey with goalie masks and protective gear. Owned by the same parent as Cascade.',
    website_url: 'https://maveriksports.com',
  },
  {
    name: 'Reebok Hockey',
    slug: 'reebok-hockey',
    category: 'skates',
    country_of_origin: 'Canada',
    description: 'Reebok-CCM Hockey was a major hockey equipment brand from 2004 to 2017. Reebok-branded gear is no longer produced but remains iconic in the hockey world.',
    website_url: 'https://www.reebok.com',
  },
  {
    name: 'Under Armour Hockey',
    slug: 'under-armour-hockey',
    category: 'apparel',
    country_of_origin: 'USA',
    description: 'Under Armour makes a hockey-specific line of base layers, gloves, and apparel. Popular for their heat-regulating fabrics and moisture-wicking technology.',
    website_url: 'https://www.underarmour.com',
  },
  {
    name: 'BNQTEK',
    slug: 'bnqtek',
    category: 'accessories',
    country_of_origin: 'Canada',
    description: 'BNQTEK (formerly BNG) is a Canadian brand focused on hockey safety — best known for cut-resistant neck guards and slash guards worn by NHL players.',
    website_url: 'https://www.bnqtek.com',
  },
  {
    name: 'Tour Hockey',
    slug: 'tour-hockey',
    category: 'skates',
    country_of_origin: 'Canada',
    description: 'Tour Hockey makes entry-level and intermediate hockey skates, sticks, and protective gear. A popular choice for youth and recreational players.',
    website_url: 'https://www.tourhockey.com',
  },
  {
    name: 'Starter',
    slug: 'starter',
    category: 'apparel',
    country_of_origin: 'USA',
    description: 'Starter is a heritage sportswear brand famous for its throwback NHL jackets and hats. Now produces officially licensed retro hockey apparel.',
    website_url: 'https://www.starter.com',
  },
  {
    name: 'A-Game',
    slug: 'a-game',
    category: 'apparel',
    country_of_origin: 'USA',
    description: 'A-Game Hockey makes performance apparel and base layers for hockey players. Founded by former NHL players, focused on comfort and breathability during play.',
    website_url: 'https://www.agameshockey.com',
  },
  {
    name: 'TPS Hockey',
    slug: 'tps-hockey',
    category: 'sticks',
    country_of_origin: 'Canada',
    description: 'TPS Hockey (Toronto Playground Stick) was a leading hockey stick maker from the 1970s-2000s. Known for the TPS R7 and TPS X1. Now defunct but historic.',
    website_url: 'https://en.wikipedia.org/wiki/TPS_Hockey',
  },
  {
    name: 'Koho',
    slug: 'koho',
    category: 'sticks',
    country_of_origin: 'Finland',
    description: 'Koho was a Finnish hockey equipment brand famous for the Koivu (aspen) sticks in the 1980s-90s. Now part of the Sherwood hockey family.',
    website_url: 'https://en.wikipedia.org/wiki/Koho',
  },
];

let applied = 0;
let skipped = 0;
for (const brand of NEW_BRANDS) {
  const { data, error } = await supabase
    .from('brands')
    .insert(brand)
    .select('id, name')
    .single();
  if (error) {
    if (error.code === '23505') {
      console.log(`  ⚠️ ${brand.name} already exists`);
    } else {
      console.log(`  ❌ ${brand.name}: ${error.message}`);
    }
    skipped++;
  } else {
    console.log(`  ✅ ${brand.name}`);
    applied++;
  }
}

console.log(`\nAdded: ${applied}, Skipped: ${skipped}`);

const { count } = await supabase
  .from('brands')
  .select('*', { count: 'exact', head: true });
console.log(`Total brands now: ${count}`);
