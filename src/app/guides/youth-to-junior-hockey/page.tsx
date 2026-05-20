import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'From Youth to Junior Hockey | RinkStop',
  description: 'What it takes to make the jump from youth travel hockey to junior leagues  --  NCAA, CHL, USHL, NAHL, and the junior-to-pro pathway explained.',
  openGraph: { title: 'From Youth to Junior Hockey | RinkStop', description: 'What it takes to make the jump from youth travel hockey to junior leagues.', type: 'article' },
  alternates: { canonical: 'https://rinkstop.com/guides/youth-to-junior-hockey' },
};

export default function YouthToJunior() {
  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '0.75rem 1rem 4rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <Link href="/">Home</Link><span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/guides" style={{ color: '#555' }}>Guides</Link><span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>Youth to Junior Hockey</span>
      </nav>
      <span style={{ display: 'inline-block', fontSize: '0.5625rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '0.2rem 0.6rem', borderRadius: '4px', background: 'rgba(200,16,46,0.12)', color: '#C8102E', marginBottom: '0.75rem' }}>Pathway</span>
      <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(2rem, 5vw, 2.75rem)', color: '#fff', letterSpacing: '0.04em', lineHeight: 1, margin: '0 0 0.75rem' }}>FROM YOUTH TO JUNIOR HOCKEY</h1>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>What it takes to make the jump from youth travel hockey to junior leagues  --  NCAA, CHL, USHL, NAHL, and the junior-to-pro pathway explained.</p>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'Article', headline: 'From Youth to Junior Hockey', description: 'What it takes to make the jump from youth travel hockey to junior leagues.', author: { '@type': 'Organization', name: 'RinkStop' }, publisher: { '@type': 'Organization', name: 'RinkStop', url: 'https://rinkstop.com' }, datePublished: '2026-05-16' }) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [
        { '@type': 'Question', name: 'What age can you try out for junior hockey?', acceptedAnswer: { '@type': 'Answer', text: 'Most players begin the junior hockey pathway at ages 16-18, after completing their Bantam (14U) season. Some elite 16-year-olds make AAA travel teams that compete at a junior level. The USHL allows players to be drafted at 16; most players in the league are 17-20. NCAA allows players to commit as early as sophomore year of high school for a future start date.' } },
        { '@type': 'Question', name: 'What is the best junior hockey league for NCAA prospects?', acceptedAnswer: { '@type': 'Answer', text: 'The USHL (United States Hockey League) is widely considered the top developmental league for NCAA prospects. It is the only Tier I junior league in the US  --  meaning it carries more status in the NCAA recruiting process. The NAHL is Tier II and can develop players but NCAA scouts generally prioritize USHL players. The Canadian CHL leagues (OHL, WHL, QMJHL) also develop players but players who play in CHL are ineligible for NCAA Div I.' } },
        { '@type': 'Question', name: 'How much does it cost to play junior hockey?', acceptedAnswer: { '@type': 'Answer', text: 'Costs vary significantly by league. USHL: full travel, equipment, and tuition covered by the team (it\'s a paid developmental league). NAHL: many players pay a participation fee of $3,000-$12,000 per season plus travel. Canadian WHL/OHL/QMJHL: team pays all major expenses  --  players receive a stipend. Before committing, understand your total cost including equipment, travel, housing if applicable, and lost work time for parents.' } },
      ]}) }} />

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>THE JUNIOR HOCKEY LANDSCAPE</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>Junior hockey is not a single thing  --  it\'s a system of leagues with different purposes, cost structures, and NCAA eligibility implications. Understanding the map before you commit to a path is critical.</p>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {[
            { name: 'USHL (United States Hockey League)', tier: 'Tier I', pay: 'PAID  --  full scholarship', age: '16-20', ncaa: '✅ NCAA-eligible', note: 'Best developmental path for NCAA Div I. 25+ teams. Tryouts in spring.' },
            { name: 'NAHL (North American Hockey League)', tier: 'Tier II', pay: 'Player-paid ($3k-$12k/yr)', age: '16-20', ncaa: '✅ NCAA-eligible', note: 'Good development path. 30+ teams. Many players use NAHL as stepping stone to USHL.' },
            { name: 'USPHL Premier', tier: 'Tier III', pay: 'Player-paid', age: '16-20', ncaa: '✅ NCAA-eligible', note: 'Lower tier. Best for players not ready for Tier I/II. Still NCAA-eligible.' },
            { name: 'OHL (Ontario Hockey League)', tier: 'CHL', pay: 'Stipend + scholarship', age: '16-20', ncaa: '❌ NOT NCAA-eligible', note: 'Major Junior. Canadian league. Elite development but forfeits NCAA eligibility.' },
            { name: 'WHL (Western Hockey League)', tier: 'CHL', pay: 'Stipend + scholarship', age: '16-20', ncaa: '❌ NOT NCAA-eligible', note: 'Major Junior. Western Canada. Same rules as OHL  --  no NCAA.' },
            { name: 'QMJHL (Quebec Major Junior)', tier: 'CHL', pay: 'Stipend + scholarship', age: '16-20', ncaa: '❌ NOT NCAA-eligible', note: 'Major Junior. Quebec. Produces many NHL players. No NCAA eligibility.' },
          ].map(l => (
            <div key={l.name} style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '1.125rem 1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff', marginBottom: '0.25rem' }}>{l.name}</p>
                  <p style={{ fontSize: '0.75rem', color: '#555' }}>{l.note}</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: l.pay.includes('PAID') ? '#009650' : '#C8102E', background: 'rgba(255,255,255,0.04)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>{l.pay}</span>
                  <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#888', background: 'rgba(255,255,255,0.04)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>{l.age}</span>
                  <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: l.ncaa.includes('✅') ? '#009650' : '#C8102E', background: 'rgba(255,255,255,0.04)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>{l.ncaa}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <p style={{ fontSize: '0.8125rem', color: '#555', marginTop: '0.75rem', lineHeight: 1.6, background: 'rgba(200,16,46,0.05)', border: '1px solid rgba(200,16,46,0.12)', borderRadius: '8px', padding: '0.875rem 1rem' }}>
          <strong style={{ color: '#999' }}>Critical NCAA rule:</strong> Playing in any CHL league (OHL, WHL, QMJHL)  --  even for one game  --  permanently forfeits NCAA Div I and II eligibility. USHL, NAHL, and USPHL are all NCAA-eligible as long as you don&apos;t exceed age and amateurism rules.
        </p>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>WHAT IT TAKES  --  COMPETENCY CHECKLIST</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>Not every youth hockey player is ready for junior  --  and that\'s fine. Here\'s what junior coaches are looking for:</p>
        <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '1.25rem 1.5rem' }}>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {[
              { skill: 'Skating ability', level: 'Elite', desc: 'Speed, acceleration, edge control, and agility. If you\'re not among the fastest players in your league, you won\'t be in a junior top line.' },
              { skill: 'Hockey IQ', level: 'Advanced', desc: 'Reading plays, positioning, anticipatory awareness. Junior coaches look for players who see the game two plays ahead.' },
              { skill: 'Shot quality', level: 'Above average', desc: 'Releases, accuracy, velocity. At minimum, a wrist shot that can beat a junior goalie clean from the circle.' },
              { skill: 'Competing level', level: 'Elite', desc: 'Every shift is a battle. Junior hockey requires a compete level that\'s a step above youth  --  boards are checked harder, loose pucks are fought for.' },
              { skill: 'Body contact / checking', level: 'Developed', desc: 'Ability to deliver and absorb contact. If you&apos;re not checking at youth level by Bantam, you&apos;re behind the development curve.' },
              { skill: 'Academics', level: 'C- or better', desc: 'NCAA requires a minimum 2.0 GPA. Most programs expect higher. Hockey smarts and school smarts travel together.' },
            ].map(s => (
              <div key={s.skill} style={{ display: 'grid', gridTemplateColumns: '150px 80px 1fr', gap: '0.75rem', padding: '0.875rem', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', alignItems: 'center' }}>
                <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#fff' }}>{s.skill}</p>
                <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#C8102E', textAlign: 'center' }}>{s.level}</p>
                <p style={{ fontSize: '0.8125rem', color: '#888', lineHeight: 1.5 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>THE PATH  --  SPRING TRYOUTS TO JUNIOR</h2>
        <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '1.25rem 1.5rem' }}>
          <div style={{ display: 'grid', gap: '1rem' }}>
            {[
              { season: 'January-March (Year before)', event: 'Spring tournament season', detail: 'Play your best hockey. This is when most scouts are watching. Ask your coach to create a highlight video if you don\'t have one.' },
              { season: 'March-April', event: 'Research leagues and camps', detail: 'Identify 5-8 teams you want to try out for. Most USHL and NAHL teams hold spring tryout camps in May. Register early  --  spots fill.' },
              { season: 'May-June', event: 'Spring tryout camps', detail: 'Most USHL/NAHL teams hold 3-5 day camps. Costs $200-$500 to attend. This is your direct access to coaching staff  --  perform there.' },
              { season: 'July', event: 'Main camp invitations', detail: 'Top performers at spring camps earn invitations to main camp in late summer. Main camp is the final evaluation before roster decisions.' },
              { season: 'August', event: 'Main camp + roster decisions', detail: 'Final rosters are typically set by late August. If you don\'t make a roster, ask coaches for specific areas to improve for next year.' },
              { season: 'September', event: 'Season begins', detail: 'Junior seasons run September through March. If you\'re 17 turning 18 that year, this is your best developmental window.' },
            ].map(s => (
              <div key={s.season} style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '1rem', alignItems: 'flex-start' }}>
                <p style={{ fontSize: '0.6875rem', fontWeight: 800, color: '#C8102E', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.season}</p>
                <div>
                  <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#fff', marginBottom: '0.25rem' }}>{s.event}</p>
                  <p style={{ fontSize: '0.8125rem', color: '#888', lineHeight: 1.55 }}>{s.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div style={{ background: 'var(--s2)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '1.5rem', textAlign: 'center', marginTop: '2rem' }}>
        <p style={{ color: '#666', fontSize: '0.875rem', marginBottom: '0.75rem' }}>More guides</p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/guides/hockey-parents-handbook" style={{ padding: '0.625rem 1.25rem', background: '#C8102E', borderRadius: '6px', color: '#fff', fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none' }}>Hockey Parent&apos;s Handbook</Link>
          <Link href="/guides/hockey-positions" style={{ padding: '0.625rem 1.25rem', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: '#fff', fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none' }}>Hockey Positions</Link>
        </div>
      </div>
    </div>
  );
}