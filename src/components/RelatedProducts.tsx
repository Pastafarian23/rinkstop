import Link from 'next/link';

interface RelatedProduct {
  title: string;
  description: string;
  href: string;
  cta: string;
  accent: 'gold' | 'red' | 'teal';
}

const STYLES: Record<RelatedProduct['accent'], { bg: string; border: string; cta: string; iconBg: string }> = {
  gold: {
    bg: 'linear-gradient(135deg, rgba(255,184,28,0.10) 0%, rgba(200,16,46,0.06) 100%)',
    border: '1px solid rgba(255,184,28,0.35)',
    cta: '#FFB81C',
    iconBg: 'rgba(255,184,28,0.18)',
  },
  red: {
    bg: 'linear-gradient(135deg, rgba(200,16,46,0.10) 0%, rgba(255,184,28,0.06) 100%)',
    border: '1px solid rgba(200,16,46,0.35)',
    cta: '#FF8FA0',
    iconBg: 'rgba(200,16,46,0.18)',
  },
  teal: {
    bg: 'linear-gradient(135deg, rgba(20,184,166,0.10) 0%, rgba(255,184,28,0.06) 100%)',
    border: '1px solid rgba(20,184,166,0.35)',
    cta: '#5EEAD4',
    iconBg: 'rgba(20,184,166,0.18)',
  },
};

/**
 * <RelatedProducts /> — Cross-link the three product surfaces so visitors
 * who land on one product page know about the other two.
 *
 * Without this, /pricing, /dataset-license, and /learn/best-hockey-gear are
 * three isolated funnels. A hockey parent on /pricing might also want the
 * Best Hockey Gear guide; an analytics startup on /dataset-license might
 * also want a paid profile. Linking them costs nothing and recovers some
 * traffic that would otherwise bounce.
 *
 * Renders as a 1-3 column grid that collapses to a single column on mobile.
 */
export default function RelatedProducts({ products }: { products: RelatedProduct[] }) {
  return (
    <section
      data-related-products
      aria-label="Other RinkStop products"
      style={{
        margin: '3rem auto 0',
        padding: '0 1.5rem',
        maxWidth: 1080,
      }}
    >
      <h2
        style={{
          fontSize: '0.75rem',
          fontWeight: 800,
          letterSpacing: '0.18em',
          color: 'rgba(255,255,255,0.45)',
          textTransform: 'uppercase',
          margin: '0 0 1rem',
          textAlign: 'center',
        }}
      >
        Other ways to use RinkStop
      </h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${Math.min(products.length, 3)}, 1fr)`,
          gap: '1rem',
        }}
        className="related-products-grid"
      >
        {products.map((p) => {
          const s = STYLES[p.accent];
          return (
            <Link
              key={p.href}
              href={p.href}
              data-related-cta={p.href}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.6rem',
                padding: '1.25rem 1.25rem 1.1rem',
                background: s.bg,
                border: s.border,
                borderRadius: 10,
                textDecoration: 'none',
                color: 'inherit',
                transition: 'transform 0.15s',
              }}
            >
              <h3
                style={{
                  fontSize: '1.0625rem',
                  fontWeight: 800,
                  color: '#fff',
                  margin: 0,
                  lineHeight: 1.25,
                }}
              >
                {p.title}
              </h3>
              <p
                style={{
                  fontSize: '0.875rem',
                  color: 'rgba(255,255,255,0.65)',
                  margin: 0,
                  lineHeight: 1.5,
                  flex: 1,
                }}
              >
                {p.description}
              </p>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  color: s.cta,
                  marginTop: '0.25rem',
                }}
              >
                {p.cta}
                <span aria-hidden>→</span>
              </span>
            </Link>
          );
        })}
      </div>
      {/* Mobile fallback: single column when grid doesn't fit */}
      <style>{`
        @media (max-width: 760px) {
          [data-related-products] > div {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}