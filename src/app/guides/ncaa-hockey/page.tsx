import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'NCAA Hockey Guide — D-I, D-III, ACHA & Recruiting',
  description: 'Everything hockey players, parents, and coaches need to know about NCAA hockey: Division I and III eligibility, ACHA alternatives, the recruiting timeline, scholarship limits, and how to get noticed.',
  openGraph: {
    title: 'NCAA Hockey Guide — D-I, D-III, ACHA & Recruiting',
    description: 'NCAA Division I, Division III, and ACHA hockey — eligibility, recruiting, scholarships, and how to play college hockey.',
    type: 'article',
  },
  alternates: { canonical: 'https://rinkstop.com/guides/ncaa-hockey' },
};

export default function NCAAHockeyGuide() {
  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '0.75rem 1rem 4rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <Link href="/">Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/guides" style={{ color: '#555' }}>Guides</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>NCAA Hockey</span>
      </nav>
      <span style={{ display: 'inline-block', fontSize: '0.5625rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '0.2rem 0.6rem', borderRadius: '4px', background: 'rgba(200,16,46,0.12)', color: '#C8102E', marginBottom: '0.75rem' }}>Guide</span>
      <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(2rem, 5vw, 2.75rem)', color: '#fff', letterSpacing: '0.04em', lineHeight: 1, margin: '0 0 0.75rem' }}>NCAA HOCKEY GUIDE</h1>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>Everything you need to know about playing college hockey in the United States — Division I, Division III, ACHA, eligibility, recruiting, and scholarships.</p>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'Article', headline: 'NCAA Hockey Guide', description: 'NCAA Division I, Division III, and ACHA hockey — eligibility, recruiting, scholarships, and how to play college hockey.', author: { '@type': 'Organization', name: 'RinkStop' }, publisher: { '@type': 'Organization', name: 'RinkStop', url: 'https://rinkstop.com' }, datePublished: '2026-08-11' }) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [
        { '@type': 'Question', name: 'What is the difference between NCAA Division I and Division III hockey?', acceptedAnswer: { '@type': 'Answer', text: 'NCAA Division I is the highest level of college hockey. D-I programs offer athletic scholarships (up to 18 per team for men, 18 per team for women under the new 2022 settlement), have a 25-scholarship cap, and play 30-40 games per season. NCAA Division III does not offer athletic scholarships, has smaller rosters, plays 25-30 games per season, and is more academically focused. Both are governed by NCAA eligibility rules, but D-III has more flexibility around recruiting contact.' } },
        { '@type': 'Question', name: 'What is ACHA hockey?', acceptedAnswer: { '@type': 'Answer', text: 'ACHA (American Collegiate Hockey Association) is the governing body for club hockey at the college level. ACHA Division I and II programs are NOT NCAA; they operate as club sports with school funding that varies widely. ACHA teams can offer limited scholarships at the school\'s discretion. Many top ACHA programs compete at a level comparable to NCAA D-III and produce professional players, but the path is different: no NCAA eligibility center required, no initial-eligibility standards, and recruiting contact rules are more relaxed.' } },
        { '@type': 'Question', name: 'When should I start the NCAA recruiting process?', acceptedAnswer: { '@type': 'Answer', text: 'D-I men: contact begins January 1 of junior year of high school. Official visits start August 1 before senior year. Verbal offers typically come in spring of junior year. D-I women: contact begins September 1 of junior year. D-III: contact begins after sophomore year and is largely unrestricted by the NCAA. Junior hockey (USHL, NAHL) is the most common path to D-I; many D-I players spend 1-2 years in junior before college.' } },
        { '@type': 'Question', name: 'What are the NCAA eligibility requirements?', acceptedAnswer: { '@type': 'Answer', text: 'To play NCAA D-I or D-II, you must register with the NCAA Eligibility Center, complete 16 core courses in high school (4 English, 3 math, 2 science, etc.), meet the minimum GPA (2.3 for D-I, 2.2 for D-II), achieve a qualifying SAT/ACT score, and graduate. D-III has its own academic standards set by each school. International students have additional requirements. Core courses must be completed before full-time college enrollment.' } },
        { '@type': 'Question', name: 'How do I get noticed by college hockey coaches?', acceptedAnswer: { '@type': 'Answer', text: 'Five steps: (1) Build a highlight reel (3-5 minutes, top plays first, captioned with jersey number and date). (2) Create an NCSA or similar recruiting profile. (3) Send personalized emails to coaches at target schools (10-20 per week is reasonable). (4) Attend college hockey camps and showcases where D-I, D-III, and ACHA coaches recruit. (5) Play at the highest competitive level you can — junior hockey (USHL, NAHL, NCDC, BCHL, AJHL), prep school, or high school at a known program. Stats matter less than skating, compete level, and coachability.' } },
      ]}) }} />

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>THE NCAA HOCKEY LANDSCAPE</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>College hockey in the United States runs across three tiers. Knowing the difference helps you target the right programs for your skill level, academics, and budget.</p>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {[
            { name: 'NCAA Division I', count: '64 men\'s, 44 women\'s programs', scholarship: '18 scholarships per team (men, post-2022 settlement), 18 (women)', cost: '~$60K-80K/year (scholarships common but rarely full-ride)', who: 'Top junior, prep, and high school players', note: 'Highest level. Most players come through USHL, NAHL, NCDC, BCHL, or major prep schools. Combine-level athletes.' },
            { name: 'NCAA Division III', count: '~90 men\'s, ~80 women\'s programs', scholarship: 'No athletic scholarships (academic aid only)', cost: '~$55K-75K/year (financial aid + academic merit)', who: 'Strong high school or lower-junior players', note: 'Competitive, more academically focused. Recruiting contact rules are more flexible. Excellent option for late-bloomers and strong students.' },
            { name: 'ACHA (club hockey)', count: '~450 programs across 3 divisions', scholarship: 'School-funded, varies (most no athletic aid)', cost: '~$40K-70K/year + club dues ($2K-8K)', who: 'Any skilled player; many former D-I / D-III caliber', note: 'Club sport, not NCAA. Top ACHA D-I and D-II teams play at D-III-equivalent level. No NCAA Eligibility Center required. Many former NHLers played ACHA in college.' },
          ].map((row, i) => (
            <div key={i} style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '6px', padding: '1rem 1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 auto' }}>
                  <h3 style={{ color: '#fff', fontSize: '1.0625rem', fontWeight: 700, marginBottom: '0.4rem' }}>{row.name}</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.25rem 0.75rem', fontSize: '0.8125rem', color: 'rgba(255,255,255,0.55)', marginBottom: '0.5rem' }}>
                    <span style={{ color: 'rgba(255,255,255,0.35)' }}>Programs:</span><span>{row.count}</span>
                    <span style={{ color: 'rgba(255,255,255,0.35)' }}>Scholarships:</span><span>{row.scholarship}</span>
                    <span style={{ color: 'rgba(255,255,255,0.35)' }}>Cost:</span><span>{row.cost}</span>
                    <span style={{ color: 'rgba(255,255,255,0.35)' }}>Who plays:</span><span>{row.who}</span>
                  </div>
                  <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', lineHeight: 1.55, margin: 0 }}>{row.note}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>ELIGIBILITY 101</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>NCAA eligibility is the gate every D-I and D-II recruit must pass. Here's the checklist, in priority order.</p>
        <ol style={{ color: '#aaa', lineHeight: 1.7, fontSize: '0.9375rem', paddingLeft: '1.25rem' }}>
          <li style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#fff' }}>Register with the NCAA Eligibility Center</strong> by start of junior year. The registration fee is ~$100; fee waivers are available for students on free/reduced lunch.</li>
          <li style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#fff' }}>Complete 16 NCAA-approved core courses</strong> by graduation: 4 English, 3 math (Algebra I + higher), 2 natural science, 1 social science, plus additional college-prep units. Your high school counselor can confirm which courses qualify.</li>
          <li style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#fff' }}>Earn a minimum core-course GPA</strong>: 2.3 for D-I, 2.2 for D-II. Note: this is core-course GPA, not overall GPA — failing an elective won't hurt you, but failing a core course will.</li>
          <li style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#fff' }}>Achieve a qualifying test score</strong> on the SAT or ACT. The sliding scale pairs your GPA with a minimum test score; full chart at ncaa.org. Most D-I hockey recruits have a 1000+ SAT or 21+ ACT.</li>
          <li style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#fff' }}>Graduate from high school</strong> with a diploma (not a GED in most cases).</li>
          <li style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#fff' }}>Amateur status</strong>: no professional contracts, no payment above actual expenses for playing hockey. Junior hockey is exempt; CHL (OHL/WHL/QMJHL) is the exception — playing CHL makes you ineligible for NCAA D-I.</li>
        </ol>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', marginTop: '0.75rem' }}>D-III eligibility is set by each school (no NCAA Eligibility Center required). ACHA has no NCAA eligibility requirements.</p>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>THE RECRUITING TIMELINE</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>Recruiting windows for NCAA D-I hockey are tightly regulated. The NCAA calendar is more restrictive than other sports — coaches can't just call you anytime. Knowing the calendar is half the battle.</p>
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          {[
            { age: '14-15 (Freshman)', action: 'Build the foundation. Play at the highest level you can. No D-I contact allowed yet.' },
            { age: '16 (Sophomore)', action: 'D-I men: still no contact, but coaches can answer your emails. D-III: contact allowed. Start building a highlight reel.' },
            { age: '17 (Junior, Jan 1)', action: 'D-I men: contact period begins. Coaches can call, text, email. D-I women: contact begins September 1 of junior year.' },
            { age: '17-18 (Junior/Senior summer)', action: 'D-I official visits open August 1 before senior year. Verbal offers and commitments happen spring/summer of junior year. Recruiting heats up at showcases (USA Hockey NTDP, Beantown Classic, NAHL Top Prospects).' },
            { age: '18 (Senior, signing day)', action: 'NCAA signing period for hockey is November 13 - April 15. D-I National Letter of Intent (NLI) program is the formal commitment.' },
          ].map((row, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '1rem', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '4px' }}>
              <span style={{ color: '#C8102E', fontSize: '0.8125rem', fontWeight: 700 }}>{row.age}</span>
              <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.875rem', lineHeight: 1.5 }}>{row.action}</span>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>HOW TO GET NOTICED</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>There is no single path. Most recruited D-I players came through one of four channels. The 80/20 of recruiting: <strong style={{ color: '#fff' }}>skating ability, compete level, and coachability are what get you noticed — not stats or awards.</strong></p>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {[
            { name: 'Junior hockey (USHL, NAHL, NCDC, BCHL, AJHL)', desc: 'Tier 1 (USHL) and Tier 2 (NAHL) USA Hockey leagues. The NCDC is the USHL\'s development league. Canadian junior leagues (BCHL, AJHL) keep NCAA eligibility. Most D-I recruits play 1-2 years of junior before college.' },
            { name: 'Prep school (USHL, NCDC, NEPSAC, AAA)', desc: 'Top-tier prep schools: Shattuck-St. Mary\'s, Avon Old Farms, Salisbury, Kimball Union, Salisbury, Cushing, etc. Some USHL teams run draft-eligible programs. Most D-I players come through this path or junior.' },
            { name: 'Showcases and camps', desc: 'College hockey prospect camps (held on campus, summer), Beantown Classic, NAHL Top Prospects, USHL Combine. These are the events where D-I, D-III, and ACHA coaches recruit heavily.' },
            { name: 'NCSA recruiting profile + direct outreach', desc: 'Create an NCSA profile (free tier is fine), upload your highlight reel and stats, and email coaches at target schools. Personalized emails (mentioning their program\'s playing style, your fit, etc.) get far more responses than generic ones.' },
          ].map((row, i) => (
            <div key={i} style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.875rem 1.125rem' }}>
              <h3 style={{ color: '#fff', fontSize: '0.9375rem', fontWeight: 700, marginBottom: '0.3rem' }}>{row.name}</h3>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', lineHeight: 1.55, margin: 0 }}>{row.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>SCHOLARSHIPS AND COSTS</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>Hockey is one of the few NCAA sports where full-ride scholarships are rare. Most D-I players get partial aid; a small percentage get full rides. Cost is real — plan for it.</p>
        <ul style={{ color: '#aaa', lineHeight: 1.7, fontSize: '0.9375rem', paddingLeft: '1.25rem' }}>
          <li style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#fff' }}>D-I men (post-2022 settlement):</strong> each program gets 18 scholarships (the equivalent of full rides), but coaches split them — a typical D-I roster of 26 players might see 8-10 on full scholarship, 10-12 on partial, the rest walk-on or academic aid only.</li>
          <li style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#fff' }}>D-I women:</strong> 18 scholarships per team. The post-2022 settlement equalized the limits with men. Most D-I women programs offer partial-to-full aid to a majority of the roster.</li>
          <li style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#fff' }}>D-III:</strong> no athletic scholarships. Academic merit, need-based aid, and school-specific scholarships are how families pay.</li>
          <li style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#fff' }}>ACHA:</strong> athletic aid varies by school — most offer nothing, some offer partial, a few offer full rides. Many ACHA players fund the program partly through club dues.</li>
        </ul>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>FINDING THE RIGHT FIT</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>Browse NCAA, ACHA, and junior programs in the directory:</p>
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          <Link href="/directory/teams?level=college" style={{ display: 'block', padding: '0.75rem 1rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '4px', color: '#C8102E', textDecoration: 'none', fontSize: '0.9375rem' }}>→ NCAA D-I and D-III college teams</Link>
          <Link href="/directory/teams?level=junior" style={{ display: 'block', padding: '0.75rem 1rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '4px', color: '#C8102E', textDecoration: 'none', fontSize: '0.9375rem' }}>→ USHL, NAHL, NCDC, BCHL junior teams</Link>
          <Link href="/learn/hockey-positions-explained" style={{ display: 'block', padding: '0.75rem 1rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '4px', color: '#C8102E', textDecoration: 'none', fontSize: '0.9375rem' }}>→ Hockey Positions Explained (recruiting context)</Link>
          <Link href="/guides/hockey-tryout-guide" style={{ display: 'block', padding: '0.75rem 1rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '4px', color: '#C8102E', textDecoration: 'none', fontSize: '0.9375rem' }}>→ Hockey Tryout Guide (camps, showcases, tryouts)</Link>
        </div>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>RELATED GUIDES</h2>
        <ul style={{ color: '#aaa', lineHeight: 1.7, fontSize: '0.9375rem', paddingLeft: '1.25rem' }}>
          <li style={{ marginBottom: '0.4rem' }}><Link href="/guides/hockey-tryout-guide" style={{ color: '#C8102E' }}>Hockey Tryout Guide</Link> — camps, showcases, and tryout prep</li>
          <li style={{ marginBottom: '0.4rem' }}><Link href="/guides/hockey-positions-explained" style={{ color: '#C8102E' }}>Hockey Positions Explained</Link> — every position, role, and deployment</li>
          <li style={{ marginBottom: '0.4rem' }}><Link href="/guides/hockey-cost-explained" style={{ color: '#C8102E' }}>Hockey Cost Explained</Link> — the real numbers at every level</li>
          <li style={{ marginBottom: '0.4rem' }}><Link href="/guides/hockey-development-explained" style={{ color: '#C8102E' }}>Hockey Development Explained</Link> — pathways from youth to college to pro</li>
          <li style={{ marginBottom: '0.4rem' }}><Link href="/guides/youth-to-junior-hockey" style={{ color: '#C8102E' }}>Youth to Junior Hockey</Link> — making the leap to USHL/NAHL</li>
        </ul>
      </section>
    </div>
  );
}
