import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Hockey Tryout Guide',
  description: 'How to prepare for hockey tryouts at every level — youth, high school, junior, college, and adult league. What to expect, what to bring, and how to stand out.',
  openGraph: {
    title: 'Hockey Tryout Guide',
    description: 'How to prepare for hockey tryouts at every level — youth, high school, junior, college, and adult league.',
    type: 'article',
  },
  alternates: { canonical: 'https://rinkstop.com/guides/hockey-tryout-guide' },
};

export default function HockeyTryoutGuide() {
  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '0.75rem 1rem 4rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <Link href="/">Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/guides" style={{ color: '#555' }}>Guides</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>Hockey Tryout Guide</span>
      </nav>
      <span style={{ display: 'inline-block', fontSize: '0.5625rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '0.2rem 0.6rem', borderRadius: '4px', background: 'rgba(200,16,46,0.12)', color: '#C8102E', marginBottom: '0.75rem' }}>Guide</span>
      <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(2rem, 5vw, 2.75rem)', color: '#fff', letterSpacing: '0.04em', lineHeight: 1, margin: '0 0 0.75rem' }}>HOCKEY TRYOUT GUIDE</h1>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>How to prepare for hockey tryouts at every level — youth, high school, junior, college, and adult league. What to expect, what to bring, and how to stand out.</p>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'Article', headline: 'Hockey Tryout Guide', description: 'How to prepare for hockey tryouts at every level.', author: { '@type': 'Organization', name: 'RinkStop' }, publisher: { '@type': 'Organization', name: 'RinkStop', url: 'https://rinkstop.com' }, datePublished: '2026-08-11' }) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [
        { '@type': 'Question', name: 'When should I start preparing for hockey tryouts?', acceptedAnswer: { '@type': 'Answer', text: 'Most competitive tryouts run in August and September for fall/winter seasons. Begin off-ice training 6-8 weeks before tryouts — that means starting in June or July for a typical fall tryout. Late starters can still make a competitive team if they focus on the highest-leverage skills (skating speed, conditioning, compete level).' } },
        { '@type': 'Question', name: 'What should I bring to a hockey tryout?', acceptedAnswer: { '@type': 'Answer', text: 'Bring: full equipment (helmet, gloves, skates, stick, pads, jock/jill, hockey pants, shin guards, shoulder pads, elbow pads, mouthguard), water bottle, light snack, and a small towel. Label your equipment with your name. Arrive 30-45 minutes early to allow for dressing and warm-up. Coaches do not expect a bag full of extras — they expect you to be on the ice, warmed up, and ready when the tryout starts.' } },
        { '@type': 'Question', name: 'How long is a typical hockey tryout?', acceptedAnswer: { '@type': 'Answer', text: 'Most tryouts run 1-3 days. A single-day tryout is common for youth-house and adult-league levels. Travel and AAA tryouts typically run 2-3 days with multiple on-ice sessions. Junior and college tryouts may run 3-5 days with on-ice, off-ice testing, and interviews. Plan to be available for the full duration of the tryout; missing a day often disqualifies a player regardless of skill.' } },
        { '@type': 'Question', name: 'What do coaches look for at tryouts?', acceptedAnswer: { '@type': 'Answer', text: 'In order: (1) Skating ability — speed, acceleration, edge control, backward skating. (2) Hockey IQ — positioning, anticipation, decision-making. (3) Compete level — battle for loose pucks, win board battles, finish checks. (4) Skill execution — clean passes, accurate shots, soft hands. (5) Coachability — listen to instructions, adjust quickly, take corrections. Coaches can teach skill; they can\'t teach compete level or hockey IQ.' } },
        { '@type': 'Question', name: 'How do I get noticed at a tryout?', acceptedAnswer: { '@type': 'Answer', text: 'Three things: (1) Be the hardest worker in the warm-up — coaches evaluate effort before skill. (2) Make the simple play — early tryouts are no time for fancy dangles. Pass tape-to-tape, win battles along the boards, take the open shot. (3) Be coachable — when a coach gives a correction, acknowledge it and show the change on the next shift. Players who keep making the same mistake after being corrected lose spots.' } },
      ]}) }} />

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>THE TRYOUT LANDSCAPE</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>Tryouts vary dramatically by level. Knowing what to expect helps you calibrate effort, prep, and mental approach. Most leagues publish tryout dates, fees, and format on their team page — browse the <Link href="/directory/teams" style={{ color: '#C8102E' }}>team directory</Link> to find listings near you.</p>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {[
            { name: 'Youth house / rec', format: '1 day, 1-2 sessions', cost: '$0-50', who: 'Ages 4-14, beginner to intermediate', note: 'Low-stakes. Most leagues place every player who registers. Focus on having fun and learning.' },
            { name: 'Travel hockey (A/AA/AAA)', format: '1-2 days, 3-4 sessions', cost: '$0-100', who: 'Ages 8-18, intermediate to advanced', note: 'Competitive. Coaches rank players across multiple sessions. Cuts happen after final session.' },
            { name: 'High school (varsity/JV)', format: '1-3 days, 4-6 sessions', cost: '$0', who: 'Ages 14-18, school-enrolled', note: 'Open tryouts in most states. Some schools have closed tryouts — coach invite only.' },
            { name: 'Junior (USHL/NAHL/NAHL)', format: '3-5 days, full schedule', cost: 'Travel only', who: 'Ages 16-20, elite amateur', note: 'Most competitive amateur tryout in the US. Players travel from across the country. Spring tryouts are main entry point.' },
            { name: 'College (NCAA D1/D3)', format: '2-3 days, on-ice + interviews', cost: 'Travel only', who: 'Ages 18-22, recruited/eligible', note: 'Most NCAA Division I programs recruit, not run open tryouts. D3 and ACHA run open tryouts.' },
            { name: 'Adult league (rec/competitive)', format: '1 evening, 1-2 sessions', cost: '$0-50', who: 'Ages 18+, all skill levels', note: 'Friendly. Most leagues cap roster size and use sessions to balance teams.' },
          ].map(t => (
            <div key={t.name} style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '1.125rem 1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff', marginBottom: '0.25rem' }}>{t.name}</p>
                  <p style={{ fontSize: '0.75rem', color: '#555' }}>{t.note}</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#C8102E', background: 'rgba(255,255,255,0.04)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>{t.format}</span>
                  <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#888', background: 'rgba(255,255,255,0.04)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>{t.cost}</span>
                  <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#666', background: 'rgba(255,255,255,0.04)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>{t.who}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>PRE-TRYOUT PREPARATION (6-8 WEEKS)</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>Use the 6-8 week window before tryouts to peak. Don't try new skills cold — tighten what you already know.</p>
        <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '1.25rem 1.5rem' }}>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {[
              { week: '8 weeks out', focus: 'Cardio base', detail: '4-5 days/week of zone-2 cardio. Long bike rides, jogs, or steady-state skating. Build aerobic base. Avoid intensity work — that comes later.' },
              { week: '6 weeks out', focus: 'Skating mechanics', detail: 'On-ice sessions 3-4 days/week. Focus on edges, crossovers, transitions, and backwards skating. Goal: clean technique under fresh legs.' },
              { week: '4 weeks out', focus: 'Intensity + skills', detail: 'Add interval training (sprints, repeated shifts). Stick-handling in tight spaces. Shooting off the catch. Begin video review of your own shifts.' },
              { week: '2 weeks out', focus: 'Taper', detail: 'Reduce training volume by ~30%. Maintain intensity but drop total volume. Sleep more. Hydrate. The goal is to arrive at tryouts rested, not fatigued.' },
              { week: '1 week out', focus: 'Sharpening', detail: '2-3 light on-ice sessions. Full gear practice. Skate sharpening. Wash and prep all equipment. Mental prep: visualize successful shifts.' },
              { week: 'Tryout day', focus: 'Execution', detail: 'Eat 2-3 hours before. Arrive early. Warm up properly. Compete. Be coachable. Shake hands after — coaches remember poise.' },
            ].map(w => (
              <div key={w.week} style={{ display: 'grid', gridTemplateColumns: '130px 150px 1fr', gap: '0.75rem', padding: '0.875rem', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', alignItems: 'flex-start' }}>
                <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#C8102E' }}>{w.week}</p>
                <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#fff' }}>{w.focus}</p>
                <p style={{ fontSize: '0.8125rem', color: '#888', lineHeight: 1.5 }}>{w.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>TRYOUT DAY: WHAT TO BRING</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>Equipment checklist. Show up with the full kit in working order.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
          {[
            { item: 'Helmet', note: 'CSA or HECC certified. No cracks. Chin strap adjusted.' },
            { item: 'Skates', note: 'Sharpened within 2 weeks of tryout. Bake-fit if needed.' },
            { item: 'Stick', note: 'Two sticks — pre-taped. One in your bag, one ready.' },
            { item: 'Mouthguard', note: 'Boil-and-bite or custom. Non-negotiable.' },
            { item: 'Jock / Jill', note: 'With cup or pelvic protector. Skate-cut for goalies.' },
            { item: 'Hockey pants', note: 'Belt snug. Coverage to mid-thigh.' },
            { item: 'Shin guards', note: 'Knee wing centered on kneecap. Straps snug.' },
            { item: 'Shoulder pads', note: 'Cap over shoulder. Sternum covered.' },
            { item: 'Elbow pads', note: 'Cover from bicep to forearm.' },
            { item: 'Gloves', note: 'Cuff fits under jersey sleeve. Not too tight.' },
            { item: 'Hockey socks', note: 'Two pairs — fresh in bag, one in use.' },
            { item: 'Practice jersey', note: 'Light, dark contrasting. Some leagues assign pinnies.' },
          ].map(g => (
            <div key={g.item} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', padding: '0.875rem 1rem' }}>
              <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#fff', marginBottom: '0.25rem' }}>{g.item}</p>
              <p style={{ fontSize: '0.75rem', color: '#888', lineHeight: 1.4 }}>{g.note}</p>
            </div>
          ))}
        </div>
        <p style={{ fontSize: '0.8125rem', color: '#555', marginTop: '0.75rem', lineHeight: 1.6, background: 'rgba(200,16,46,0.05)', border: '1px solid rgba(200,16,46,0.12)', borderRadius: '8px', padding: '0.875rem 1rem' }}>
          <strong style={{ color: '#999' }}>Pro tip:</strong> Label every piece — helmet, gloves, stick, pants, jock, water bottle. Rinks lose equipment by the bagful during tryouts. Use a paint pen or vinyl labels.
        </p>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>WHAT COACHES LOOK FOR (RANKED)</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>Across every level — house through junior — coaches evaluate the same five things. The order shifts slightly by level, but the top three are universal.</p>
        <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '1.25rem 1.5rem' }}>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {[
              { rank: '1', skill: 'Skating', weight: '30%', detail: 'Edge control, acceleration, top speed, backward skating. The fastest skater in tryouts gets noticed first. The slowest skater needs to be elite at everything else.' },
              { rank: '2', skill: 'Compete level', weight: '25%', detail: 'Battle for loose pucks. Win board battles. Finish checks. Skate through traffic. Coaches can\'t teach compete — they recruit it.' },
              { rank: '3', skill: 'Hockey IQ', weight: '20%', detail: 'Positioning without the puck. Anticipation of play. Smart decisions under pressure. Look for the open player; make the safe play.' },
              { rank: '4', skill: 'Skill execution', weight: '15%', detail: 'Clean passes tape-to-tape. Accurate shots. Soft hands in traffic. Important but developable — coaches can teach skill.' },
              { rank: '5', skill: 'Coachability', weight: '10%', detail: 'Listen to instructions. Apply corrections on the next shift. Support teammates. Avoid showboating. Coaches remember poise, not goals.' },
            ].map(c => (
              <div key={c.skill} style={{ display: 'grid', gridTemplateColumns: '40px 140px 70px 1fr', gap: '0.75rem', padding: '0.875rem', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', alignItems: 'center' }}>
                <p style={{ fontSize: '1.125rem', fontWeight: 800, color: '#C8102E', textAlign: 'center', margin: 0 }}>{c.rank}</p>
                <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#fff' }}>{c.skill}</p>
                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#888', textAlign: 'center' }}>{c.weight}</p>
                <p style={{ fontSize: '0.8125rem', color: '#888', lineHeight: 1.5 }}>{c.detail}</p>
              </div>
            ))}
          </div>
        </div>
        <p style={{ fontSize: '0.8125rem', color: '#555', marginTop: '0.75rem', lineHeight: 1.6, background: 'rgba(200,16,46,0.05)', border: '1px solid rgba(200,16,46,0.12)', borderRadius: '8px', padding: '0.875rem 1rem' }}>
          <strong style={{ color: '#999' }}>The 80/20 rule:</strong> Skating and compete level together account for 55% of the coach&apos;s evaluation. If you can only work on two things in the 6-8 week window, work on those.
        </p>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>HOW TO FIND TRYOUTS</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>Tryouts are listed by the team or league. RinkStop&apos;s directory has 3,243+ teams across 240+ leagues — filter by level, country, and age to find tryouts near you.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
          <Link href="/directory/teams?level=pro" style={{ display: 'block', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', padding: '0.875rem 1rem', textDecoration: 'none' }}>
            <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#fff', marginBottom: '0.25rem' }}>Pro teams</p>
            <p style={{ fontSize: '0.75rem', color: '#888', lineHeight: 1.4 }}>NHL, AHL, KHL, PWHL, top European leagues</p>
          </Link>
          <Link href="/directory/teams?level=junior" style={{ display: 'block', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', padding: '0.875rem 1rem', textDecoration: 'none' }}>
            <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#fff', marginBottom: '0.25rem' }}>Junior teams</p>
            <p style={{ fontSize: '0.75rem', color: '#888', lineHeight: 1.4 }}>USHL, NAHL, OHL, WHL, QMJHL, USPHL</p>
          </Link>
          <Link href="/directory/teams?level=college" style={{ display: 'block', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', padding: '0.875rem 1rem', textDecoration: 'none' }}>
            <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#fff', marginBottom: '0.25rem' }}>College teams</p>
            <p style={{ fontSize: '0.75rem', color: '#888', lineHeight: 1.4 }}>NCAA D1/D3, ACHA, U SPORTS, NAIA</p>
          </Link>
          <Link href="/directory/teams?level=adult" style={{ display: 'block', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', padding: '0.875rem 1rem', textDecoration: 'none' }}>
            <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#fff', marginBottom: '0.25rem' }}>Adult leagues</p>
            <p style={{ fontSize: '0.75rem', color: '#888', lineHeight: 1.4 }}>Beer leagues, rec leagues, club hockey</p>
          </Link>
        </div>
        <p style={{ fontSize: '0.8125rem', color: '#555', marginTop: '0.75rem', lineHeight: 1.6 }}>
          For youth players, browse the <Link href="/directory/youth-hockey" style={{ color: '#C8102E' }}>youth hockey directory</Link> for travel and house programs with tryouts in your area.
        </p>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>AFTER THE TRYOUT</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>Whether you make the team or not, the tryout is a learning experience. Use it as data.</p>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {[
            { scenario: 'If you make the team', action: 'Confirm your spot within the deadline. Pay any deposits. Add the schedule to your calendar. Reach out to incoming teammates via the team page. Begin the off-season training plan with your coach.' },
            { scenario: 'If you were cut', action: 'Ask the coach for feedback — most will give you 5-10 minutes if you ask respectfully. Identify the weakest area (skating, compete, hockey IQ) and build a 3-month plan. Look for other teams in the same age group; many players make a team on their second or third tryout.' },
            { scenario: 'If you were waitlisted', action: 'Stay in touch with the coach. Keep training. Cuts often happen after the first week of the season when players quit. A strong follow-up email 2 weeks into the season can land you a spot.' },
          ].map(s => (
            <div key={s.scenario} style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '1.125rem 1.25rem' }}>
              <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>{s.scenario}</p>
              <p style={{ fontSize: '0.8125rem', color: '#aaa', lineHeight: 1.6 }}>{s.action}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>RELATED GUIDES</h2>
        <ul style={{ color: '#aaa', lineHeight: 1.8, marginLeft: '1.5rem' }}>
          <li><Link href="/guides/hockey-positions" style={{ color: '#C8102E' }}>Hockey Positions Explained</Link> — know your role before the coach assigns it</li>
          <li><Link href="/guides/hockey-nutrition" style={{ color: '#C8102E' }}>Hockey Nutrition Guide</Link> — what to eat the day of tryouts</li>
          <li><Link href="/guides/off-ice-hockey-training" style={{ color: '#C8102E' }}>Off-Ice Hockey Training</Link> — the 6-8 week prep plan in detail</li>
          <li><Link href="/tools/hockey-cost-calculator" style={{ color: '#C8102E' }}>Hockey Cost Calculator</Link> — what to budget for the season</li>
          <li><Link href="/guides/youth-to-junior-hockey" style={{ color: '#C8102E' }}>From Youth to Junior Hockey</Link> — the next step after travel hockey</li>
        </ul>
      </section>
    </div>
  );
}
