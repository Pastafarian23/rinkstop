// ─── Location Content Library ────────────────────────────────────────────────
// Hardcoded editorial content for countries and cities with hockey presence.

export const COUNTRY_CONTENT: Record<string, {
  name: string;
  flag: string;
  description: string;
  cities: Record<string, { name: string; description: string }>;
}> = {
  Philippines: {
    name: 'Philippines',
    flag: '🇵🇭',
    description:
      "Hockey in the Philippines is a growing sport driven by expat communities and a small but passionate local base. Three organized programs operate in Manila, Cebu, and Davao, serving both adults and youth.",
    cities: {
      Manila: {
        name: 'Manila',
        description:
          "The capital hosts the largest hockey community with the Manila Ice Hockey League. Games are held primarily at the SM Mall of Asia Ice Palace, the country's only full-size indoor rink.",
      },
      Cebu: {
        name: 'Cebu',
        description:
          "Home to several youth programs and the Cebu Youth Hockey community. Arnel Larracas coaches there — bringing North American youth hockey methods to Southeast Asia and growing the sport one generation at a time.",
      },
      Davao: {
        name: 'Davao',
        description:
          "A small but dedicated group, the Davao Arctic Wolves represent the city in regional competitions and help spread hockey awareness across the southern Philippines.",
      },
    },
  },
  Canada: {
    name: 'Canada',
    flag: '🇨🇦',
    description:
      "Hockey's spiritual home. Every province has organized minor hockey leagues and community rinks, making Canada the world's most hockey-dense nation per capita.",
    cities: {},
  },
  USA: {
    name: 'USA',
    flag: '🇺🇸',
    description:
      "The NHL's largest market with youth hockey programs in every state. From NHL powerhouses to community outdoor rinks, hockey is woven into American sports culture.",
    cities: {},
  },
  Sweden: {
    name: 'Sweden',
    flag: '🇸🇪',
    description:
      "A hockey superpower, Sweden's national program consistently produces world-class talent. The Swedish Hockey League (SHL) is one of Europe's top professional circuits.",
    cities: {},
  },
  Finland: {
    name: 'Finland',
    flag: '🇫🇮',
    description:
      "Finland punches far above its weight in international hockey, producing elite players from a small population. The Liiga is Europe's premier development ground for Finnish talent.",
    cities: {},
  },
  Russia: {
    name: 'Russia',
    flag: '🇷🇺',
    description:
      "Russia is a hockey powerhouse with a deep tradition of producing technical, creative players. The KHL is one of the world's top professional leagues.",
    cities: {},
  },
  Czechia: {
    name: 'Czechia',
    flag: '🇨🇿',
    description:
      "The Czech Republic has a strong hockey heritage, producing legendary players and hosting regular international tournaments. The Extraliga is Central Europe's top competitive league.",
    cities: {},
  },
  Germany: {
    name: 'Germany',
    flag: '🇩🇪',
    description:
      "Germany's DEL is one of Europe's strongest single-country leagues, and the national team regularly competes at the highest international levels.",
    cities: {},
  },
  Switzerland: {
    name: 'Switzerland',
    flag: '🇨🇭',
    description:
      "Swiss hockey combines precision and physicality. The National League is highly competitive, and Switzerland regularly fields a top-tier national team.",
    cities: {},
  },
};

// Fallback generic description for countries not in the library
export function getCountryDescription(country: string): string {
  return `Hockey is played in ${country} through various local leagues, community programs, and regional competitions. Visit RinkStop to discover teams, rinks, and youth programs in ${country}.`;
}

// Fallback generic city description
export function getCityDescription(city: string, country: string): string {
  return `Hockey in ${city}, ${country} — find local teams, rinks, and youth programs on RinkStop.`;
}