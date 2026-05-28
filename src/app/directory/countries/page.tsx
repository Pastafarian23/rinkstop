import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Hockey by Country | RinkStop',
  description: 'Browse ice hockey programs, teams, and rinks by country. From North American powerhouses to emerging markets worldwide.',
};

// Complete list of all 195 countries (193 UN member states + 2 observers)
const ALL_COUNTRIES: Array<{
  country: string;
  flag: string;
  hasHockey: boolean;
  leagues?: string;
  note?: string;
  region: string;
}> = [
  // NORTH AMERICA (23)
  { country: 'United States', flag: '🇺🇸', hasHockey: true, leagues: 'NHL, NCAA, USHL, NAHL, AHL', note: 'Fastest-growing hockey market', region: 'North America' },
  { country: 'Canada', flag: '🇨🇦', hasHockey: true, leagues: 'NHL, OHL, WHL, QMJHL, BCHL', note: "Hockey's birthplace", region: 'North America' },
  { country: 'Mexico', flag: '🇲🇽', hasHockey: true, leagues: 'LNHHB', note: 'Growing hockey presence', region: 'North America' },
  { country: 'Antigua and Barbuda', flag: '🇦🇬', hasHockey: false, region: 'North America' },
  { country: 'Bahamas', flag: '🇧🇸', hasHockey: false, region: 'North America' },
  { country: 'Barbados', flag: '🇧🇧', hasHockey: false, region: 'North America' },
  { country: 'Belize', flag: '🇧🇿', hasHockey: false, region: 'North America' },
  { country: 'Costa Rica', flag: '🇨🇷', hasHockey: false, region: 'North America' },
  { country: 'Cuba', flag: '🇨🇺', hasHockey: false, region: 'North America' },
  { country: 'Dominica', flag: '🇩🇲', hasHockey: false, region: 'North America' },
  { country: 'Dominican Republic', flag: '🇩🇴', hasHockey: false, region: 'North America' },
  { country: 'El Salvador', flag: '🇸🇻', hasHockey: false, region: 'North America' },
  { country: 'Grenada', flag: '🇬🇩', hasHockey: false, region: 'North America' },
  { country: 'Guatemala', flag: '🇬🇹', hasHockey: false, region: 'North America' },
  { country: 'Haiti', flag: '🇭🇹', hasHockey: false, region: 'North America' },
  { country: 'Honduras', flag: '🇭🇳', hasHockey: false, region: 'North America' },
  { country: 'Jamaica', flag: '🇯🇲', hasHockey: false, region: 'North America' },
  { country: 'Nicaragua', flag: '🇳🇮', hasHockey: false, region: 'North America' },
  { country: 'Panama', flag: '🇵🇦', hasHockey: false, region: 'North America' },
  { country: 'Saint Kitts and Nevis', flag: '🇰🇳', hasHockey: false, region: 'North America' },
  { country: 'Saint Lucia', flag: '🇱🇨', hasHockey: false, region: 'North America' },
  { country: 'Saint Vincent and the Grenadines', flag: '🇻🇨', hasHockey: false, region: 'North America' },
  { country: 'Trinidad and Tobago', flag: '🇹🇹', hasHockey: false, region: 'North America' },

  // SOUTH AMERICA (12)
  { country: 'Argentina', flag: '🇦🇷', hasHockey: true, leagues: 'Argentine Hockey League', note: '5 ice rinks', region: 'South America' },
  { country: 'Bolivia', flag: '🇧🇴', hasHockey: false, region: 'South America' },
  { country: 'Brazil', flag: '🇧🇷', hasHockey: true, leagues: 'Brazilian Hockey League', note: '8 ice rinks', region: 'South America' },
  { country: 'Chile', flag: '🇨🇱', hasHockey: true, leagues: 'Liga Hockey Chile', note: '4 ice rinks', region: 'South America' },
  { country: 'Colombia', flag: '🇨🇴', hasHockey: false, region: 'South America' },
  { country: 'Ecuador', flag: '🇪🇨', hasHockey: false, region: 'South America' },
  { country: 'Guyana', flag: '🇬🇾', hasHockey: false, region: 'South America' },
  { country: 'Paraguay', flag: '🇵🇾', hasHockey: false, region: 'South America' },
  { country: 'Peru', flag: '🇵🇪', hasHockey: false, region: 'South America' },
  { country: 'Suriname', flag: '🇸🇷', hasHockey: false, region: 'South America' },
  { country: 'Uruguay', flag: '🇺🇾', hasHockey: false, region: 'South America' },
  { country: 'Venezuela', flag: '🇻🇪', hasHockey: false, region: 'South America' },

  // EUROPE (44)
  { country: 'Albania', flag: '🇦🇱', hasHockey: false, region: 'Europe' },
  { country: 'Austria', flag: '🇦🇹', hasHockey: true, leagues: 'ICEHL, EBEL', note: 'Alpine hockey tradition', region: 'Europe' },
  { country: 'Belarus', flag: '🇧🇾', hasHockey: true, leagues: 'Extraleague', note: 'Strong regional presence', region: 'Europe' },
  { country: 'Belgium', flag: '🇧🇪', hasHockey: false, region: 'Europe' },
  { country: 'Bosnia and Herzegovina', flag: '🇧🇦', hasHockey: false, region: 'Europe' },
  { country: 'Bulgaria', flag: '🇧🇬', hasHockey: false, region: 'Europe' },
  { country: 'Croatia', flag: '🇭🇷', hasHockey: false, region: 'Europe' },
  { country: 'Cyprus', flag: '🇨🇾', hasHockey: true, leagues: 'Cyprus Ice Hockey Federation', note: 'Developing program', region: 'Europe' },
  { country: 'Czech Republic', flag: '🇨🇿', hasHockey: true, leagues: 'Extraliga, 1. Liga', note: 'Rich hockey tradition', region: 'Europe' },
  { country: 'Denmark', flag: '🇩🇰', hasHockey: true, leagues: 'Metal Ligaen', note: 'Strong international results', region: 'Europe' },
  { country: 'Estonia', flag: '🇪🇪', hasHockey: false, region: 'Europe' },
  { country: 'Finland', flag: '🇫🇮', hasHockey: true, leagues: 'Liiga, Mestis, Jr. A', note: 'Per-capita hockey power', region: 'Europe' },
  { country: 'France', flag: '🇫🇷', hasHockey: true, leagues: 'Ligue Magnus', note: 'Growing NHL interest', region: 'Europe' },
  { country: 'Georgia', flag: '🇬🇪', hasHockey: true, leagues: 'Georgian Ice Hockey Federation', note: 'Emerging program', region: 'Europe' },
  { country: 'Germany', flag: '🇩🇪', hasHockey: true, leagues: 'DEL, DEL2, Oberliga', note: 'Growing NHL pipeline', region: 'Europe' },
  { country: 'Greece', flag: '🇬🇷', hasHockey: false, region: 'Europe' },
  { country: 'Hungary', flag: '🇭🇺', hasHockey: true, leagues: 'Erste Liga', note: 'National league development', region: 'Europe' },
  { country: 'Iceland', flag: '🇮🇸', hasHockey: true, leagues: 'Icelandic Hockey League', note: 'Small but active community', region: 'Europe' },
  { country: 'Ireland', flag: '🇮🇪', hasHockey: false, region: 'Europe' },
  { country: 'Italy', flag: '🇮🇹', hasHockey: true, leagues: 'Serie A', note: 'Mediterranean hockey hub', region: 'Europe' },
  { country: 'Kosovo', flag: '🇽🇰', hasHockey: true, leagues: 'Kosovo Ice Hockey Federation', note: 'Developing program', region: 'Europe' },
  { country: 'Latvia', flag: '🇱🇻', hasHockey: true, leagues: 'Optibet Latvian Hockey League', note: 'Passionate hockey nation', region: 'Europe' },
  { country: 'Lithuania', flag: '🇱🇹', hasHockey: false, region: 'Europe' },
  { country: 'Luxembourg', flag: '🇱🇺', hasHockey: false, region: 'Europe' },
  { country: 'Malta', flag: '🇲🇨', hasHockey: false, region: 'Europe' },
  { country: 'Moldova', flag: '🇲🇩', hasHockey: false, region: 'Europe' },
  { country: 'Monaco', flag: '🇲🇨', hasHockey: false, region: 'Europe' },
  { country: 'Montenegro', flag: '🇲🇪', hasHockey: false, region: 'Europe' },
  { country: 'Netherlands', flag: '🇳🇱', hasHockey: true, leagues: 'Eredivisie', note: 'Dutch hockey progressing', region: 'Europe' },
  { country: 'North Macedonia', flag: '🇲🇰', hasHockey: false, region: 'Europe' },
  { country: 'Norway', flag: '🇳🇴', hasHockey: true, leagues: 'Fjordkraft-Ligaen', note: 'Rapidly improving program', region: 'Europe' },
  { country: 'Poland', flag: '🇵🇱', hasHockey: true, leagues: 'Polska Hokej Liga', note: 'Central European hockey', region: 'Europe' },
  { country: 'Portugal', flag: '🇵🇹', hasHockey: true, leagues: 'Campeonato Nacional', note: 'Iberian hockey league', region: 'Europe' },
  { country: 'Romania', flag: '🇷🇴', hasHockey: false, region: 'Europe' },
  { country: 'Russia', flag: '🇷🇺', hasHockey: true, leagues: 'KHL, MHL, VHL', note: "World's premier league outside NHL", region: 'Europe' },
  { country: 'Serbia', flag: '🇷🇸', hasHockey: false, region: 'Europe' },
  { country: 'Slovakia', flag: '🇸🇰', hasHockey: true, leagues: 'SLKHL, 1. Liga', note: 'Consistent NHL talent producer', region: 'Europe' },
  { country: 'Slovenia', flag: '🇸🇮', hasHockey: false, region: 'Europe' },
  { country: 'Spain', flag: '🇪🇸', hasHockey: true, leagues: 'Liga ES', note: 'Growing in Mediterranean regions', region: 'Europe' },
  { country: 'Sweden', flag: '🇸🇪', hasHockey: true, leagues: 'SHL, Hockeyallsvenskan, J20', note: 'Top player development system', region: 'Europe' },
  { country: 'Switzerland', flag: '🇨🇭', hasHockey: true, leagues: 'NL, SL', note: 'High-quality league', region: 'Europe' },
  { country: 'Ukraine', flag: '🇺🇦', hasHockey: false, region: 'Europe' },
  { country: 'United Kingdom', flag: '🇬🇧', hasHockey: true, leagues: 'EIHL, NIHL', note: 'UK hockey expanding', region: 'Europe' },
  { country: 'Andorra', flag: '🇦🇩', hasHockey: false, region: 'Europe' },
  { country: 'Liechtenstein', flag: '🇱🇮', hasHockey: false, region: 'Europe' },
  { country: 'San Marino', flag: '🇸🇲', hasHockey: false, region: 'Europe' },
  { country: 'Vatican City', flag: '🇻🇦', hasHockey: false, region: 'Europe' },

  // ASIA (48)
  { country: 'Afghanistan', flag: '🇦🇫', hasHockey: false, region: 'Asia' },
  { country: 'Armenia', flag: '🇦🇲', hasHockey: false, region: 'Asia' },
  { country: 'Azerbaijan', flag: '🇦🇿', hasHockey: false, region: 'Asia' },
  { country: 'Bahrain', flag: '🇧🇭', hasHockey: false, region: 'Asia' },
  { country: 'Bangladesh', flag: '🇧🇩', hasHockey: false, region: 'Asia' },
  { country: 'Bhutan', flag: '🇧🇹', hasHockey: false, region: 'Asia' },
  { country: 'Brunei', flag: '🇧🇳', hasHockey: false, region: 'Asia' },
  { country: 'Cambodia', flag: '🇰🇭', hasHockey: false, region: 'Asia' },
  { country: 'China', flag: '🇨🇳', hasHockey: true, leagues: 'CWHL', note: 'Fastest-growing market', region: 'Asia' },
  { country: 'Hong Kong', flag: '🇭🇰', hasHockey: true, leagues: 'Hong Kong Hockey League', note: 'Active expatriate community', region: 'Asia' },
  { country: 'India', flag: '🇮🇳', hasHockey: true, leagues: 'IHL', note: 'Emerging market', region: 'Asia' },
  { country: 'Indonesia', flag: '🇮🇩', hasHockey: false, region: 'Asia' },
  { country: 'Iran', flag: '🇮🇷', hasHockey: false, region: 'Asia' },
  { country: 'Iraq', flag: '🇮🇶', hasHockey: false, region: 'Asia' },
  { country: 'Israel', flag: '🇮🇱', hasHockey: true, leagues: 'Israeli Hockey League', note: 'Small but growing', region: 'Asia' },
  { country: 'Japan', flag: '🇯🇵', hasHockey: true, leagues: 'BHL, JHML', note: "Asia's most developed program", region: 'Asia' },
  { country: 'Jordan', flag: '🇯🇴', hasHockey: false, region: 'Asia' },
  { country: 'Kazakhstan', flag: '🇰🇿', hasHockey: true, leagues: 'Kazakhstan Hockey League', note: 'Central Asian hockey', region: 'Asia' },
  { country: 'Kuwait', flag: '🇰🇼', hasHockey: false, region: 'Asia' },
  { country: 'Kyrgyzstan', flag: '🇰🇬', hasHockey: false, region: 'Asia' },
  { country: 'Laos', flag: '🇱🇦', hasHockey: false, region: 'Asia' },
  { country: 'Lebanon', flag: '🇱🇧', hasHockey: false, region: 'Asia' },
  { country: 'Malaysia', flag: '🇲🇾', hasHockey: true, leagues: 'Malaysia Ice Hockey League', note: 'Small but active community', region: 'Asia' },
  { country: 'Maldives', flag: '🇲🇻', hasHockey: false, region: 'Asia' },
  { country: 'Mongolia', flag: '🇲🇳', hasHockey: false, region: 'Asia' },
  { country: 'Myanmar', flag: '🇲🇲', hasHockey: false, region: 'Asia' },
  { country: 'Nepal', flag: '🇳🇵', hasHockey: false, region: 'Asia' },
  { country: 'North Korea', flag: '🇰🇵', hasHockey: false, region: 'Asia' },
  { country: 'Oman', flag: '🇴🇲', hasHockey: false, region: 'Asia' },
  { country: 'Pakistan', flag: '🇵🇰', hasHockey: false, region: 'Asia' },
  { country: 'Palestine', flag: '🇵🇸', hasHockey: false, region: 'Asia' },
  { country: 'Philippines', flag: '🇵🇭', hasHockey: true, leagues: 'MAHL', note: 'Tropical hockey growth', region: 'Asia' },
  { country: 'Qatar', flag: '🇶🇦', hasHockey: false, region: 'Asia' },
  { country: 'Saudi Arabia', flag: '🇸🇦', hasHockey: false, region: 'Asia' },
  { country: 'Singapore', flag: '🇸🇬', hasHockey: true, leagues: 'SHL Singapore', note: 'City-state hockey', region: 'Asia' },
  { country: 'South Korea', flag: '🇰🇷', hasHockey: true, leagues: 'KHL, Asia League', note: 'Rapidly rising program', region: 'Asia' },
  { country: 'Sri Lanka', flag: '🇱🇰', hasHockey: false, region: 'Asia' },
  { country: 'Syria', flag: '🇸🇾', hasHockey: false, region: 'Asia' },
  { country: 'Taiwan', flag: '🇹🇼', hasHockey: false, region: 'Asia' },
  { country: 'Tajikistan', flag: '🇹🇯', hasHockey: false, region: 'Asia' },
  { country: 'Thailand', flag: '🇹🇭', hasHockey: true, leagues: 'THL', note: 'Southeast Asian hockey', region: 'Asia' },
  { country: 'Timor-Leste', flag: '🇹🇱', hasHockey: false, region: 'Asia' },
  { country: 'Turkey', flag: '🇹🇷', hasHockey: true, leagues: 'Turkish Ice Hockey Federation', note: 'Developing program', region: 'Asia' },
  { country: 'Turkmenistan', flag: '🇹🇲', hasHockey: false, region: 'Asia' },
  { country: 'United Arab Emirates', flag: '🇦🇪', hasHockey: true, leagues: 'UAE Ice Hockey League', note: 'Expat-driven growth', region: 'Asia' },
  { country: 'Uzbekistan', flag: '🇺🇿', hasHockey: false, region: 'Asia' },
  { country: 'Vietnam', flag: '🇻🇳', hasHockey: false, region: 'Asia' },
  { country: 'Yemen', flag: '🇾🇪', hasHockey: false, region: 'Asia' },

  // AFRICA (54)
  { country: 'Algeria', flag: '🇩🇿', hasHockey: false, region: 'Africa' },
  { country: 'Angola', flag: '🇦🇴', hasHockey: false, region: 'Africa' },
  { country: 'Benin', flag: '🇧🇯', hasHockey: false, region: 'Africa' },
  { country: 'Botswana', flag: '🇧🇼', hasHockey: false, region: 'Africa' },
  { country: 'Burkina Faso', flag: '🇧🇫', hasHockey: false, region: 'Africa' },
  { country: 'Burundi', flag: '🇧🇮', hasHockey: false, region: 'Africa' },
  { country: 'Cabo Verde', flag: '🇨🇻', hasHockey: false, region: 'Africa' },
  { country: 'Cameroon', flag: '🇨🇲', hasHockey: false, region: 'Africa' },
  { country: 'Central African Republic', flag: '🇨🇫', hasHockey: false, region: 'Africa' },
  { country: 'Chad', flag: '🇹🇩', hasHockey: false, region: 'Africa' },
  { country: 'Comoros', flag: '🇰🇲', hasHockey: false, region: 'Africa' },
  { country: 'Congo', flag: '🇨🇬', hasHockey: false, region: 'Africa' },
  { country: 'Democratic Republic of the Congo', flag: '🇨🇩', hasHockey: false, region: 'Africa' },
  { country: 'Djibouti', flag: '🇩🇯', hasHockey: false, region: 'Africa' },
  { country: 'Egypt', flag: '🇪🇬', hasHockey: false, region: 'Africa' },
  { country: 'Equatorial Guinea', flag: '🇬🇶', hasHockey: false, region: 'Africa' },
  { country: 'Eritrea', flag: '🇪🇷', hasHockey: false, region: 'Africa' },
  { country: 'Eswatini', flag: '🇸🇿', hasHockey: false, region: 'Africa' },
  { country: 'Ethiopia', flag: '🇪🇹', hasHockey: false, region: 'Africa' },
  { country: 'Gabon', flag: '🇬🇦', hasHockey: false, region: 'Africa' },
  { country: 'Gambia', flag: '🇬🇲', hasHockey: false, region: 'Africa' },
  { country: 'Ghana', flag: '🇬🇭', hasHockey: false, region: 'Africa' },
  { country: 'Guinea', flag: '🇬🇳', hasHockey: false, region: 'Africa' },
  { country: 'Guinea-Bissau', flag: '🇬🇼', hasHockey: false, region: 'Africa' },
  { country: 'Ivory Coast', flag: '🇨🇮', hasHockey: false, region: 'Africa' },
  { country: 'Kenya', flag: '🇰🇪', hasHockey: false, region: 'Africa' },
  { country: 'Lesotho', flag: '🇱🇸', hasHockey: false, region: 'Africa' },
  { country: 'Liberia', flag: '🇱🇷', hasHockey: false, region: 'Africa' },
  { country: 'Libya', flag: '🇱🇾', hasHockey: false, region: 'Africa' },
  { country: 'Madagascar', flag: '🇲🇬', hasHockey: false, region: 'Africa' },
  { country: 'Malawi', flag: '🇲🇼', hasHockey: false, region: 'Africa' },
  { country: 'Mali', flag: '🇲🇱', hasHockey: false, region: 'Africa' },
  { country: 'Mauritania', flag: '🇲🇷', hasHockey: false, region: 'Africa' },
  { country: 'Mauritius', flag: '🇲🇺', hasHockey: false, region: 'Africa' },
  { country: 'Morocco', flag: '🇲🇦', hasHockey: false, region: 'Africa' },
  { country: 'Mozambique', flag: '🇲🇿', hasHockey: false, region: 'Africa' },
  { country: 'Namibia', flag: '🇳🇦', hasHockey: false, region: 'Africa' },
  { country: 'Niger', flag: '🇳🇪', hasHockey: false, region: 'Africa' },
  { country: 'Nigeria', flag: '🇳🇬', hasHockey: false, region: 'Africa' },
  { country: 'Rwanda', flag: '🇷🇼', hasHockey: false, region: 'Africa' },
  { country: 'Sao Tome and Principe', flag: '🇸🇹', hasHockey: false, region: 'Africa' },
  { country: 'Senegal', flag: '🇸🇳', hasHockey: false, region: 'Africa' },
  { country: 'Seychelles', flag: '🇸🇨', hasHockey: false, region: 'Africa' },
  { country: 'Sierra Leone', flag: '🇸🇱', hasHockey: false, region: 'Africa' },
  { country: 'Somalia', flag: '🇸🇴', hasHockey: false, region: 'Africa' },
  { country: 'South Africa', flag: '🇿🇦', hasHockey: true, leagues: 'SAHL', note: 'African hockey initiative', region: 'Africa' },
  { country: 'South Sudan', flag: '🇸🇸', hasHockey: false, region: 'Africa' },
  { country: 'Sudan', flag: '🇸🇩', hasHockey: false, region: 'Africa' },
  { country: 'Tanzania', flag: '🇹🇿', hasHockey: false, region: 'Africa' },
  { country: 'Togo', flag: '🇹🇬', hasHockey: false, region: 'Africa' },
  { country: 'Tunisia', flag: '🇹🇳', hasHockey: false, region: 'Africa' },
  { country: 'Uganda', flag: '🇺🇬', hasHockey: false, region: 'Africa' },
  { country: 'Zambia', flag: '🇿🇲', hasHockey: false, region: 'Africa' },
  { country: 'Zimbabwe', flag: '🇿🇼', hasHockey: false, region: 'Africa' },

  // OCEANIA (14)
  { country: 'Australia', flag: '🇦🇺', hasHockey: true, leagues: 'AIHL', note: 'Growing Down Under', region: 'Oceania' },
  { country: 'Fiji', flag: '🇫🇯', hasHockey: false, region: 'Oceania' },
  { country: 'Kiribati', flag: '🇰🇮', hasHockey: false, region: 'Oceania' },
  { country: 'Marshall Islands', flag: '🇲🇭', hasHockey: false, region: 'Oceania' },
  { country: 'Micronesia', flag: '🇫🇲', hasHockey: false, region: 'Oceania' },
  { country: 'Nauru', flag: '🇳🇷', hasHockey: false, region: 'Oceania' },
  { country: 'New Zealand', flag: '🇳🇿', hasHockey: true, leagues: 'NZIHL', note: 'Oceania hockey entry point', region: 'Oceania' },
  { country: 'Palau', flag: '🇵🇼', hasHockey: false, region: 'Oceania' },
  { country: 'Papua New Guinea', flag: '🇵🇬', hasHockey: false, region: 'Oceania' },
  { country: 'Samoa', flag: '🇼🇸', hasHockey: false, region: 'Oceania' },
  { country: 'Solomon Islands', flag: '🇸🇧', hasHockey: false, region: 'Oceania' },
  { country: 'Tonga', flag: '🇹🇴', hasHockey: false, region: 'Oceania' },
  { country: 'Tuvalu', flag: '🇹🇻', hasHockey: false, region: 'Oceania' },
  { country: 'Vanuatu', flag: '🇻🇺', hasHockey: false, region: 'Oceania' },
];

const hockeyNations = ALL_COUNTRIES.filter(c => c.hasHockey);
const noHockeyNations = ALL_COUNTRIES.filter(c => !c.hasHockey);
const regions = ['North America', 'South America', 'Europe', 'Asia', 'Africa', 'Oceania'];
const slugify = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export default function CountriesPage() {
  return (
    <main style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', padding: '0 16px 80px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 0 32px', textAlign: 'center' }}>
        <h1 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: 'clamp(2.5rem, 8vw, 3.5rem)', letterSpacing: '0.04em', marginBottom: 8, color: '#fff' }}>
          HOCKEY BY COUNTRY
        </h1>
        <p style={{ color: '#888', fontSize: '1rem', maxWidth: 600, margin: '0 auto' }}>
          Explore ice hockey programs, teams, and rinks worldwide. {ALL_COUNTRIES.length} countries indexed.
        </p>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ marginBottom: 48 }}>
          <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#C8102E', letterSpacing: '0.04em', marginBottom: 24, borderBottom: '2px solid #1e1e1e', paddingBottom: 12 }}>
            🏒 COUNTRIES WITH ICE HOCKEY ({hockeyNations.length})
          </h2>
          {regions.filter(r => hockeyNations.some(c => c.region === r)).map(region => {
            const regionCountries = hockeyNations.filter(c => c.region === region);
            return (
              <div key={region} style={{ marginBottom: 32 }}>
                <h3 style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#666', marginBottom: 12 }}>{region}</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
                  {regionCountries.map(n => (
                    <Link key={n.country} href={`/directory/${slugify(n.country)}`} style={{ background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: 8, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
                      <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>{n.flag}</span>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#fff', marginBottom: 2 }}>{n.country}</div>
                        {n.leagues && <div style={{ fontSize: '0.7rem', color: '#888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.leagues}</div>}
                      </div>
                      <span style={{ fontSize: '0.65rem', color: '#C8102E', fontWeight: 600, flexShrink: 0 }}>VIEW →</span>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginBottom: 48 }}>
          <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#555', letterSpacing: '0.04em', marginBottom: 24, borderBottom: '1px solid #1e1e1e', paddingBottom: 12 }}>
            ❄️ COUNTRIES WITHOUT ESTABLISHED ICE HOCKEY ({noHockeyNations.length})
          </h2>
          {regions.filter(r => noHockeyNations.some(c => c.region === r)).map(region => {
            const regionCountries = noHockeyNations.filter(c => c.region === region);
            return (
              <div key={region} style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#444', marginBottom: 10 }}>{region}</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
                  {regionCountries.map(n => (
                    <Link key={n.country} href={`/directory/${slugify(n.country)}`} style={{ background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: 6, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', opacity: 0.7 }}>
                      <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{n.flag}</span>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: '#fff' }}>{n.country}</div>
                      </div>
                      <span style={{ fontSize: '0.6rem', color: '#555', flexShrink: 0 }}>INFO →</span>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: 12, padding: '28px 32px', textAlign: 'center', marginTop: 48 }}>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', marginBottom: 16 }}>
            Help us grow hockey worldwide. Know a team, rink, or league not listed?
          </p>
          <Link href="/add-listing" style={{ display: 'inline-block', background: '#C8102E', color: '#fff', padding: '12px 28px', borderRadius: 6, fontWeight: 700, fontSize: '0.9rem', textDecoration: 'none' }}>
            + Add Hockey to Any Country →
          </Link>
        </div>
      </div>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'ItemList', name: 'Hockey by Country - RinkStop', description: `Directory of ice hockey programs in ${hockeyNations.length} countries worldwide.`, numberOfItems: ALL_COUNTRIES.length, itemListElement: ALL_COUNTRIES.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.country, url: `https://rinkstop.com/directory/${slugify(c.country)}`, ...(c.hasHockey ? { description: `Ice hockey programs: ${c.leagues || 'Active'}` } : { description: 'No established ice hockey programs yet' }) })) }) }} />
    </main>
  );
}