import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'House vs Travel Hockey: How to Choose the Right Level',
  description: 'A parent\'s guide to house vs travel hockey — what each level means in USA Hockey\'s tier system, what it costs, time commitment, and how to pick the right fit for your kid.',
  openGraph: {
    title: 'House vs Travel Hockey: How to Choose the Right Level',
    description: 'House vs travel hockey explained — USA Hockey tiers, costs, time, and how to decide for your kid.',
    type: 'article',
  },
  alternates: { canonical: 'https://rinkstop.com/guides/youth/house-vs-travel-hockey' },
};

export default function HouseVsTravelHockey() {
  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '0.75rem 1rem 4rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <Link href="/">Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/guides" style={{ color: '#555' }}>Guides</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/guides/youth" style={{ color: '#555' }}>Youth</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>House vs Travel Hockey</span>
      </nav>

      <span style={{ display: 'inline-block', fontSize: '0.5625rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '0.2rem 0.6rem', borderRadius: '4px', background: 'rgba(200,16,46,0.12)', color: '#C8102E', marginBottom: '0.75rem' }}>
        Parents
      </span>
      <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(2rem, 5vw, 2.75rem)', color: '#fff', letterSpacing: '0.04em', lineHeight: 1, margin: '0 0 0.75rem' }}>
        HOUSE VS TRAVEL HOCKEY
      </h1>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
        How to pick the right level for your kid. Covers USA Hockey's tier system, what house and travel actually cost, time commitment, and the questions worth asking before signing up.
      </p>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: 'House vs Travel Hockey: How to Choose the Right Level | RinkStop',
        description: "A parent's guide to house vs travel hockey — what each level means in USA Hockey's tier system, what it costs, time commitment, and how to pick the right fit.",
        author: { '@type': 'Organization', name: 'RinkStop' },
        publisher: { '@type': 'Organization', name: 'RinkStop', url: 'https://rinkstop.com' },
        datePublished: '2026-06-11',
      }) }} />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
          { '@type': 'Question', name: 'What is the difference between house and travel hockey?', acceptedAnswer: { '@type': 'Answer', text: 'House hockey is recreational, no tryouts, and teams are formed by draft within a local association. Travel hockey is tryout-based and the team plays games outside its home association — covering A through AAA tiers. House is lower cost and lower time commitment. Travel is more competitive, more expensive, and more time-intensive.' } },
          { '@type': 'Question', name: 'How much does travel hockey cost per year?', acceptedAnswer: { '@type': 'Answer', text: 'Travel hockey typically runs $3,000 to $10,000+ per year once you add up registration, ice time, tournaments, equipment, and travel. Lower-tier travel (A, AA) is on the lower end. AAA / Tier 1 is on the high end. House and in-town rec leagues are typically $300 to $1,500 for the season.' } },
          { '@type': 'Question', name: 'Should my kid play house or travel hockey?', acceptedAnswer: { '@type': 'Answer', text: 'It depends on your kid\'s interest level, your family\'s schedule, your budget, and your goals. There is no "right" answer. Most kids — and the majority of NHL players — start in house/rec and move up as their interest and skill grow. Many kids play house their whole childhood and love it. Travel is worth it when the kid is asking for it, not when the parent is pushing it.' } },
          { '@type': 'Question', name: 'What age should a kid start travel hockey?', acceptedAnswer: { '@type': 'Answer', text: 'Most kids start travel around 10U (Squirt, ages 9-10) — that\'s the first age where most associations introduce tryouts. Some associations start at 8U (Mite). USA Hockey\'s American Development Model recommends against high-level specialization before age 14, so travel at younger ages is best treated as fun competition, not a development pipeline.' } },
          { '@type': 'Question', name: 'Is house hockey worth it?', acceptedAnswer: { '@type': 'Answer', text: 'Yes — for most kids, house hockey is the right starting point and a great long-term home. It\'s cheaper, lower-pressure, and gives kids a chance to play with their friends. Many adult rec players today came up through house. The biggest predictor of whether a kid stays in hockey long-term is whether they\'re having fun, not the tier they play at.' } },
        ],
      }) }} />

      {/* Intro */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>THE SHORT VERSION</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>
          "House" and "travel" are the two main paths in USA Hockey. <strong style={{ color: '#fff' }}>House is recreational</strong> — no tryouts, teams are drafted locally, kids play against other teams in the same association or town, and the schedule is gentle. <strong style={{ color: '#fff' }}>Travel is competitive</strong> — tryouts determine placement, the team plays in leagues and tournaments outside the home association, and the schedule is intense.
        </p>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '0', fontSize: '0.9375rem' }}>
          Neither is "better." They serve different goals. The right choice depends on your kid, your family, and what you want out of the sport. The rest of this guide walks through the system, the costs, the time, and how to think about it.
        </p>
      </section>

      {/* USA Hockey Tier System */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>THE USA HOCKEY TIER SYSTEM</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>
          USA Hockey (the national governing body) organizes youth hockey into age divisions and four skill tiers. The terms "house" and "travel" don't appear in the official tier names, but they're how parents and coaches actually talk about the system.
        </p>

        <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '1.25rem 1.5rem', marginBottom: '1rem' }}>
          <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff', marginBottom: '0.75rem' }}>The four tiers</p>
          <div style={{ display: 'grid', gap: '0.625rem' }}>
            {[
              { tier: 'Tier 1', name: 'AAA', desc: 'Highest level. National tournaments, top development pipelines. Tryouts required. Often out-of-state players.' },
              { tier: 'Tier 2', name: 'AA / A', desc: 'Competitive. District-bounded tryouts (most players must live in the association\'s district). Strong development path.' },
              { tier: 'Tier 3', name: 'B / A (lower)', desc: 'Lower competitive level. Tryouts in many associations, but skill range is wider. Sometimes called "select" or "B".' },
              { tier: 'House / Rec', name: 'Developmental', desc: 'No tryouts. Teams formed by draft. Everyone plays. Local games only. The default starting point for most kids.' },
            ].map(t => (
              <div key={t.tier} style={{ display: 'grid', gridTemplateColumns: '110px 110px 1fr', gap: '1rem', padding: '0.75rem', background: 'rgba(255,255,255,0.035)', borderRadius: '6px', alignItems: 'center' }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#C8102E' }}>{t.tier}</p>
                <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#fff' }}>{t.name}</p>
                <p style={{ fontSize: '0.8125rem', color: '#999', lineHeight: 1.5 }}>{t.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <p style={{ color: '#999', fontSize: '0.875rem', lineHeight: 1.6 }}>
          "Travel" is the umbrella term for anything above house. If a coach says "travel hockey," they could mean anything from B-level all the way up to AAA. The cost and time commitment scale with the tier.
        </p>
      </section>

      {/* Age divisions */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>AGE DIVISIONS</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>
          USA Hockey moved to numbered age divisions (8U, 10U, 12U, etc.) in 2016, but most people still use the old names (Mite, Squirt, Peewee, Bantam, Midget). Both refer to the same age groups.
        </p>

        <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '1.25rem 1.5rem', marginBottom: '1rem' }}>
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            {[
              { code: '6U / 8U', old: 'Mini Mite / Mite', age: 'Ages 5-8' },
              { code: '10U', old: 'Squirt', age: 'Ages 9-10' },
              { code: '12U', old: 'Peewee', age: 'Ages 11-12' },
              { code: '14U', old: 'Bantam', age: 'Ages 13-14' },
              { code: '16U', old: 'Midget Minor', age: 'Ages 15-16' },
              { code: '18U', old: 'Midget Major', age: 'Ages 17-18' },
            ].map(a => (
              <div key={a.code} style={{ display: 'grid', gridTemplateColumns: '90px 1fr 1fr', gap: '0.75rem', padding: '0.625rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)', alignItems: 'center' }}>
                <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#fff' }}>{a.code}</p>
                <p style={{ fontSize: '0.8125rem', color: '#999' }}>{a.old}</p>
                <p style={{ fontSize: '0.75rem', color: '#777', textAlign: 'right' }}>{a.age}</p>
              </div>
            ))}
          </div>
        </div>

        <p style={{ color: '#999', fontSize: '0.875rem', lineHeight: 1.6 }}>
          <strong style={{ color: '#ccc' }}>Body checking:</strong> Not allowed at 12U and below. Legal at 14U and up at competitive tiers. Most associations run 12U as non-contact regardless of tier.
        </p>
      </section>

      {/* House vs Travel Comparison */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>HOUSE VS TRAVEL: SIDE BY SIDE</h2>

        <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '1.25rem 1.5rem', marginBottom: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', padding: '0.625rem 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Factor</p>
            <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#C8102E', textTransform: 'uppercase', letterSpacing: '0.08em' }}>House</p>
            <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Travel</p>
          </div>
          {[
            ['Tryouts', 'No', 'Yes'],
            ['Season cost', '$300 – $1,500', '$3,000 – $10,000+'],
            ['Practices per week', '1 – 2', '3 – 5'],
            ['Games per season', '15 – 25', '30 – 60+ (plus tournaments)'],
            ['Travel required', 'Local', 'Regional + tournaments'],
            ['Time commitment', '3 – 5 hrs/week', '10 – 20 hrs/week'],
            ['Coach focus', 'Fun + development', 'Development + competition'],
            ['Body checking', 'No', 'At 14U and up'],
            ['Best for', 'New players, casual players, kids with other commitments', 'Committed players, kids aiming for high school/junior hockey'],
          ].map((row, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', padding: '0.625rem 0', borderBottom: i < 8 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
              <p style={{ fontSize: '0.8125rem', color: '#999' }}>{row[0]}</p>
              <p style={{ fontSize: '0.8125rem', color: '#bbb' }}>{row[1]}</p>
              <p style={{ fontSize: '0.8125rem', color: '#bbb' }}>{row[2]}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How to Decide */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>HOW TO DECIDE</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>
          There's no universal right answer. These are the questions worth sitting with as a family:
        </p>

        <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '1rem' }}>
          {[
            { q: 'Is your kid asking to play more?', a: 'If yes — that\'s the signal. Travel is for kids who want more hockey. If your kid is happy with the current schedule, house is a great fit.' },
            { q: 'What does your family schedule look like?', a: 'Travel at 10U is typically 3-4 practices a week plus 1-2 games plus 3-5 tournaments. That\'s most weekends from September to March. If you have other kids in other activities, or you value family weekends, house is gentler.' },
            { q: 'What\'s your realistic budget?', a: 'Be honest. Travel at $5,000-$8,000 a year is a real line item. If a tournament-heavy year would strain the family, house or in-town rec is the better answer.' },
            { q: 'What are your kid\'s goals?', a: 'If they dream of high school varsity, junior hockey, or college hockey, the development path goes through travel. If they love the sport and want to play for life — including as an adult — house and rec can get them there too.' },
            { q: 'What does the local association offer?', a: 'Some associations have strong house programs and weak travel. Others are the reverse. A great house program is often better than a struggling AAA team. Visit practices, talk to other parents.' },
          ].map(item => (
            <div key={item.q} style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', padding: '1rem 1.25rem' }}>
              <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff', marginBottom: '0.375rem' }}>{item.q}</p>
              <p style={{ fontSize: '0.8125rem', color: '#888', lineHeight: 1.6 }}>{item.a}</p>
            </div>
          ))}
        </div>

        <p style={{ color: '#999', fontSize: '0.875rem', lineHeight: 1.6 }}>
          <strong style={{ color: '#ccc' }}>A note on pressure:</strong> Youth hockey has a culture where travel is treated as the "serious" path and house is treated as a way-station. That framing is backwards. Most NHL players touched a puck before they were five and had fun with it for years before anyone talked to them about tryouts. The kids who burn out at 13 are almost always the ones who were pushed into competitive hockey before they were ready. Let your kid lead.
        </p>
      </section>

      {/* Canada note */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>A NOTE FOR CANADIAN FAMILIES</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '0', fontSize: '0.9375rem' }}>
          Hockey Canada uses a parallel structure but with different terminology. "House" in Canada is the same recreational tier. "Rep" (short for "representative") is the equivalent of travel, and tiers run from A through AAA. The age groups also use old names: Novice (7-8), Atom (9-10), Peewee (11-12), Bantam (13-14), Midget (15-17), Juvenile (18-19). Hockey Canada runs a parallel development framework called LTPD (Long-Term Player Development) that's similar in spirit to USA Hockey's ADM.
        </p>
      </section>

      {/* Related */}
      <section style={{ marginTop: '3rem', padding: '1.5rem', background: 'rgba(200,16,46,0.06)', border: '1px solid rgba(200,16,46,0.15)', borderRadius: '10px' }}>
        <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>Find a program near you</p>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '0.75rem' }}>
          Browse the RinkStop directory for youth hockey programs, rinks, and associations in your area.
        </p>
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          <Link href="/directory/leagues" style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
            Browse leagues →
          </Link>
          <Link href="/directory/rinks" style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
            Find rinks →
          </Link>
          <Link href="/guides/youth/usa-hockey-adm-explained" style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
            Read: USA Hockey's ADM explained →
          </Link>
        </div>
      </section>
    </div>
  );
}
