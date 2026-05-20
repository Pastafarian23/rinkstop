#!/bin/bash
# Generates static pages for countries with no known active ice hockey
# These pages exist for SEO indexing — they explain the sport isn't established there

declare -a COUNTRIES=(
  "Ethiopia:🇪🇹:East Africa"
  "Kenya:🇰🇪:East Africa"
  "Nigeria:🇳🇬:West Africa"
  "Ghana:🇬🇭:West Africa"
  "Uganda:🇺🇬:East Africa"
  "Tanzania:🇹🇿:East Africa"
  "Zambia:🇿🇲:Southern Africa"
  "Mozambique:🇲🇿:Southern Africa"
  "Angola:🇦🇴:Southern Africa"
  "Cameroon:🇨🇲:Central Africa"
  "Ivory Coast:🇨🇮:West Africa"
  "Senegal:🇸🇳:West Africa"
  "Botswana:🇧🇼:Southern Africa"
  "Zimbabwe:🇿🇼:Southern Africa"
  "India:🇮🇳:South Asia"
  "Pakistan:🇵🇰:South Asia"
  "Bangladesh:🇧🇩:South Asia"
  "Sri Lanka:🇱🇰:South Asia"
  "Nepal:🇳🇵:South Asia"
  "Myanmar:🇲🇲:Southeast Asia"
  "Vietnam:🇻🇳:Southeast Asia"
  "Indonesia:🇮🇩:Southeast Asia"
  "Malaysia:🇲🇾:Southeast Asia"
  "Ecuador:🇪🇨:South America"
  "Peru:🇵🇪:South America"
  "Bolivia:🇧🇴:South America"
  "Paraguay:🇵🇾:South America"
  "Guatemala:🇬🇹:Central America"
  "Costa Rica:🇨🇷:Central America"
  "Panama:🇵🇦:Central America"
  "Jamaica:🇯🇲:Caribbean"
  "Trinidad and Tobago:🇹🇹:Caribbean"
)

BASE_DIR="src/app/directory"
FLAG_DIR="src/app/directory/flags"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR/../rinkstop-platform"

mkdir -p "$PROJECT_DIR/$BASE_DIR"
mkdir -p "$PROJECT_DIR/$FLAG_DIR"

for entry in "${COUNTRIES[@]}"; do
  IFS=':' read -r COUNTRY FLAG REGION <<< "$entry"
  SLUG=$(echo "$COUNTRY" | sed 's/[^a-zA-Z0-9]/-/g' | tr '[:upper:]' '[:lower:]' | sed 's/--/-/g' | sed 's/^-//' | sed 's/-$//')
  DIR="$PROJECT_DIR/$BASE_DIR/$SLUG"

  mkdir -p "$DIR"

  # metadata.ts
  cat > "$DIR/metadata.ts" << METADEOF
import type { Metadata } from 'next';
export const metadata: Metadata = {
  title: 'Hockey in $COUNTRY | RinkStop',
  description: 'Ice hockey is not currently established in $COUNTRY. The sport remains developing in $REGION. Help us feature $COUNTRY hockey — reach out to RinkStop.',
  alternates: { canonical: 'https://rinkstop.com/directory/$SLUG' },
};
METADEOF

  # page.tsx
  cat > "$DIR/page.tsx" << PAGEEOF
import type { Metadata } from 'next';
import { metadata as siteMetadata } from './metadata';
export { siteMetadata as metadata };
import Link from 'next/link';

export default function ${SLUG^//-/}Page() {
  return (
    <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <Link href="/" style={{ color: '#555' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/directory" style={{ color: '#555' }}>Directory</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/directory/countries" style={{ color: '#555' }}>Countries</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>$COUNTRY</span>
      </nav>

      <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>$FLAG</div>
        <h1 className="font-sport" style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', color: '#fff', letterSpacing: '0.02em', marginBottom: '1rem' }}>
          HOCKEY IN $COUNTRY
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto 2rem', lineHeight: 1.7 }}>
          Ice hockey is not currently established in $COUNTRY. The sport remains developing in $REGION.
        </p>
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.95rem', maxWidth: '520px', margin: '0 auto 2.5rem', lineHeight: 1.7 }}>
          If you know of any ice hockey activity in $COUNTRY — youth programs, expat leagues, indoor rinks, or anything related — we'd love to feature it on RinkStop. The sport has to start somewhere.
        </p>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '3rem' }}>
          <Link href="/directory/countries" style={{
            display: 'inline-block',
            background: 'var(--s2)',
            color: 'rgba(255,255,255,0.7)',
            padding: '0.6rem 1.5rem',
            borderRadius: '4px',
            fontWeight: 600,
            fontSize: '0.875rem',
            textDecoration: 'none',
            border: '1px solid var(--border)',
          }}>
            ← Browse All Countries
          </Link>
          <Link href="/add-listing" style={{
            display: 'inline-block',
            background: '#C8102E',
            color: '#fff',
            padding: '0.6rem 1.5rem',
            borderRadius: '4px',
            fontWeight: 700,
            fontSize: '0.875rem',
            textDecoration: 'none',
          }}>
            Submit a Hockey Tip →
          </Link>
        </div>

        <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '2rem', maxWidth: '500px', margin: '0 auto', textAlign: 'left' }}>
          <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.2rem', letterSpacing: '0.04em', color: 'rgba(255,255,255,0.5)', marginBottom: '1rem' }}>
            WANT TO HELP GROW HOCKEY IN $COUNTRY?
          </h2>
          <ul style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem', lineHeight: 2, paddingLeft: '1.2rem', listStyle: 'disc' }}>
            <li>Know an indoor rink we haven't listed? Tell us.</li>
            <li>Running a youth or expat program? We'll add it free.</li>
            <li>Want to bring hockey equipment to $COUNTRY? We'd love to connect you with organizations doing that work.</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
PAGEEOF

  echo "✅ Created $DIR"
done

echo ""
echo "🎉 Done! Generated ${#COUNTRIES[@]} country pages."
echo "📁 Location: $PROJECT_DIR/$BASE_DIR/"
echo ""
echo "Next: Run 'npm run build' or commit and deploy."