// Country-code → IANA timezone lookup for public schedule rendering.
// Falls back to UTC if country unknown. This is intentionally simple —
// if a team schedules across timezones, override at the rink/event level later.

const COUNTRY_TO_TIMEZONE: Record<string, string> = {
  // Americas
  US: 'America/New_York',
  CA: 'America/Toronto',
  MX: 'America/Mexico_City',
  BR: 'America/Sao_Paulo',
  AR: 'America/Argentina/Buenos_Aires',
  CL: 'America/Santiago',
  // Europe
  GB: 'Europe/London',
  IE: 'Europe/Dublin',
  FR: 'Europe/Paris',
  DE: 'Europe/Berlin',
  ES: 'Europe/Madrid',
  IT: 'Europe/Rome',
  NL: 'Europe/Amsterdam',
  SE: 'Europe/Stockholm',
  FI: 'Europe/Helsinki',
  NO: 'Europe/Oslo',
  DK: 'Europe/Copenhagen',
  CH: 'Europe/Zurich',
  AT: 'Europe/Vienna',
  BE: 'Europe/Brussels',
  PL: 'Europe/Warsaw',
  CZ: 'Europe/Prague',
  SK: 'Europe/Bratislava',
  SI: 'Europe/Ljubljana',
  HU: 'Europe/Budapest',
  RO: 'Europe/Bucharest',
  BG: 'Europe/Sofia',
  HR: 'Europe/Zagreb',
  RS: 'Europe/Belgrade',
  UA: 'Europe/Kyiv',
  RU: 'Europe/Moscow',
  // Asia
  JP: 'Asia/Tokyo',
  KR: 'Asia/Seoul',
  CN: 'Asia/Shanghai',
  HK: 'Asia/Hong_Kong',
  TW: 'Asia/Taipei',
  SG: 'Asia/Singapore',
  MY: 'Asia/Kuala_Lumpur',
  TH: 'Asia/Bangkok',
  VN: 'Asia/Ho_Chi_Minh',
  ID: 'Asia/Jakarta',
  PH: 'Asia/Manila',
  IN: 'Asia/Kolkata',
  PK: 'Asia/Karachi',
  BD: 'Asia/Dhaka',
  AE: 'Asia/Dubai',
  SA: 'Asia/Riyadh',
  IL: 'Asia/Jerusalem',
  TR: 'Europe/Istanbul',
  // Oceania
  AU: 'Australia/Sydney',
  NZ: 'Pacific/Auckland',
};

export function timezoneForCountry(countryCode: string | null | undefined): string {
  if (!countryCode) return 'UTC';
  return COUNTRY_TO_TIMEZONE[countryCode.toUpperCase()] ?? 'UTC';
}