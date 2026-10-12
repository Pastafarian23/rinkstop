// src/lib/currency.ts
//
// Single source of truth for the country-to-currency mapping used across
// RinkStop team/organization features. The home page and pricing pages
// always display in USD; the Stripe checkout lets the user pick any
// supported currency. This helper exists for the *in-product* team and
// organization transactions (practices, tryouts, camps, registration fees)
// where the default should be the team's local currency, with USD as the
// explicit fallback option.
//
// Per Arnel's 2026-10-12 directive:
//   - Main site pricing (home, /pricing, /dataset-license, ad packages): USD
//   - Stripe checkout: user picks currency
//   - Local transactions (team, organization): default to local currency,
//     USD as optional fallback in the dropdown
//
// Country names here match the values stored in team_workspaces.country
// (and rinks.country, leagues.country). Keys are lowercased for
// case-insensitive lookup. If a country is missing from this map, the
// caller should fall back to USD — DO NOT add new entries casually,
// since picking the wrong default currency is worse than picking USD.

/**
 * Map a country name to its ISO 4217 currency code.
 * Returns null if the country is not in the map (caller should fall back to USD).
 *
 * Keys are lowercased. Values are uppercase ISO 4217 codes.
 */
export function countryToCurrency(country: string | null | undefined): string | null {
  if (!country) return null;
  const key = country.trim().toLowerCase();
  return COUNTRY_TO_CURRENCY[key] ?? null;
}

/**
 * Curated list of currencies shown in the team-program currency dropdown.
 * The team's local currency is always first; USD is always included as
 * the explicit fallback; the rest are common currencies teams use for
 * cross-border or expat transactions.
 *
 * Order matters — this is the order users see in the dropdown.
 */
export const COMMON_CURRENCIES: ReadonlyArray<{ code: string; label: string }> = [
  { code: 'USD', label: 'USD — US Dollar' },
  { code: 'EUR', label: 'EUR — Euro' },
  { code: 'GBP', label: 'GBP — British Pound' },
  { code: 'CAD', label: 'CAD — Canadian Dollar' },
  { code: 'AUD', label: 'AUD — Australian Dollar' },
  { code: 'CHF', label: 'CHF — Swiss Franc' },
  { code: 'SEK', label: 'SEK — Swedish Krona' },
  { code: 'NOK', label: 'NOK — Norwegian Krone' },
  { code: 'DKK', label: 'DKK — Danish Krone' },
  { code: 'CZK', label: 'CZK — Czech Koruna' },
  { code: 'PLN', label: 'PLN — Polish Zloty' },
  { code: 'JPY', label: 'JPY — Japanese Yen' },
  { code: 'KRW', label: 'KRW — South Korean Won' },
  { code: 'CNY', label: 'CNY — Chinese Yuan' },
  { code: 'HKD', label: 'HKD — Hong Kong Dollar' },
  { code: 'SGD', label: 'SGD — Singapore Dollar' },
  { code: 'INR', label: 'INR — Indian Rupee' },
  { code: 'THB', label: 'THB — Thai Baht' },
  { code: 'MYR', label: 'MYR — Malaysian Ringgit' },
  { code: 'IDR', label: 'IDR — Indonesian Rupiah' },
  { code: 'PHP', label: 'PHP — Philippine Peso' },
  { code: 'VND', label: 'VND — Vietnamese Dong' },
  { code: 'MXN', label: 'MXN — Mexican Peso' },
  { code: 'BRL', label: 'BRL — Brazilian Real' },
  { code: 'ARS', label: 'ARS — Argentine Peso' },
  { code: 'CLP', label: 'CLP — Chilean Peso' },
  { code: 'ZAR', label: 'ZAR — South African Rand' },
  { code: 'NZD', label: 'NZD — New Zealand Dollar' },
  { code: 'AED', label: 'AED — UAE Dirham' },
  { code: 'SAR', label: 'SAR — Saudi Riyal' },
  { code: 'TRY', label: 'TRY — Turkish Lira' },
  { code: 'ILS', label: 'ILS — Israeli Shekel' },
];

/**
 * Build the currency options list for a dropdown, with the team's local
 * currency first (if known), then the curated common-currencies list with
 * USD always included.
 *
 * If the local currency is already in the common list, it appears once at
 * the top. If it's not (e.g. KZT, TWD, UAH), it's prepended so users see
 * their local currency as the default.
 */
export function buildCurrencyOptions(localCurrency: string | null): Array<{ code: string; label: string }> {
  const local = localCurrency?.toUpperCase() || null;
  if (local && !COMMON_CURRENCIES.some((c) => c.code === local)) {
    return [
      { code: local, label: `${local} — Local currency` },
      ...COMMON_CURRENCIES,
    ];
  }
  if (local) {
    return [
      { code: local, label: `${local} — Local currency (default)` },
      ...COMMON_CURRENCIES.filter((c) => c.code !== local),
    ];
  }
  return [...COMMON_CURRENCIES];
}

// ---------------------------------------------------------------------------
// Country → Currency map
// ---------------------------------------------------------------------------
//
// Source: ISO 3166 country names (matching team_workspaces.country / rinks.country)
// cross-referenced with ISO 4217 currency codes. Lowercased keys for
// case-insensitive lookup.
//
// To add a country: append an entry. Do not remove entries — older
// workspaces may still reference them, and removing a mapping silently
// reverts affected teams to USD.

const COUNTRY_TO_CURRENCY: Record<string, string> = {
  // North America
  'united states': 'USD',
  'usa': 'USD',
  'us': 'USD',
  'united states of america': 'USD',
  'america': 'USD',
  'canada': 'CAD',
  'mexico': 'MXN',

  // Europe — Eurozone
  'germany': 'EUR',
  'france': 'EUR',
  'spain': 'EUR',
  'italy': 'EUR',
  'portugal': 'EUR',
  'netherlands': 'EUR',
  'belgium': 'EUR',
  'austria': 'EUR',
  'ireland': 'EUR',
  'finland': 'EUR',
  'greece': 'EUR',
  'slovakia': 'EUR',
  'slovenia': 'EUR',
  'estonia': 'EUR',
  'latvia': 'EUR',
  'lithuania': 'EUR',
  'luxembourg': 'EUR',
  'malta': 'EUR',
  'cyprus': 'EUR',

  // Europe — non-Eurozone
  'united kingdom': 'GBP',
  'uk': 'GBP',
  'great britain': 'GBP',
  'england': 'GBP',
  'scotland': 'GBP',
  'wales': 'GBP',
  'northern ireland': 'GBP',
  'switzerland': 'CHF',
  'sweden': 'SEK',
  'norway': 'NOK',
  'denmark': 'DKK',
  'iceland': 'ISK',
  'czechia': 'CZK',
  'czech republic': 'CZK',
  'poland': 'PLN',
  'hungary': 'HUF',
  'romania': 'RON',
  'bulgaria': 'BGN',
  'croatia': 'EUR',
  'serbia': 'RSD',
  'ukraine': 'UAH',
  'russia': 'RUB',
  'belarus': 'BYN',
  'turkey': 'TRY',

  // Asia
  'japan': 'JPY',
  'south korea': 'KRW',
  'korea, republic of': 'KRW',
  'korea': 'KRW',
  'china': 'CNY',
  "people's republic of china": 'CNY',
  'hong kong': 'HKD',
  'taiwan': 'TWD',
  'singapore': 'SGD',
  'malaysia': 'MYR',
  'thailand': 'THB',
  'indonesia': 'IDR',
  'philippines': 'PHP',
  'vietnam': 'VND',
  'india': 'INR',
  'pakistan': 'PKR',
  'bangladesh': 'BDT',
  'sri lanka': 'LKR',
  'nepal': 'NPR',
  'kazakhstan': 'KZT',
  'uzbekistan': 'UZS',
  'united arab emirates': 'AED',
  'uae': 'AED',
  'saudi arabia': 'SAR',
  'qatar': 'QAR',
  'kuwait': 'KWD',
  'bahrain': 'BHD',
  'oman': 'OMR',
  'israel': 'ILS',

  // Oceania
  'australia': 'AUD',
  'new zealand': 'NZD',

  // South America
  'brazil': 'BRL',
  'argentina': 'ARS',
  'chile': 'CLP',
  'colombia': 'COP',
  'peru': 'PEN',
  'uruguay': 'UYU',
  'paraguay': 'PYG',
  'bolivia': 'BOB',
  'ecuador': 'USD',
  'venezuela': 'VES',

  // Africa
  'south africa': 'ZAR',
  'egypt': 'EGP',
  'morocco': 'MAD',
  'tunisia': 'TND',
  'kenya': 'KES',
  'nigeria': 'NGN',
  'ghana': 'GHS',
  'ethiopia': 'ETB',
};
