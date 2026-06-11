import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: "USA Hockey's ADM Explained: What the American Development Model Means for Your Kid | RinkStop",
  description: "A parent's guide to USA Hockey's American Development Model (ADM) — what the 8 stages look like, the 10 guiding principles, and why early specialization hurts long-term development.",
  openGraph: {
    title: "USA Hockey's ADM Explained | RinkStop",
    description: "The American Development Model — what it is, what the stages mean, and what it means for your kid's hockey journey.",
    type: 'article',
  },
  alternates: { canonical: 'https://rinkstop.com/guides/youth/usa-hockey-adm-explained' },
};

export default function USAHockeyADMExplained() {
  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '0.75rem 1rem 4rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <Link href="/">Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/guides" style={{ color: '#555' }}>Guides</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/guides/youth" style={{ color: '#555' }}>Youth</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>USA Hockey&apos;s ADM Explained</span>
      </nav>

      <span style={{ display: 'inline-block', fontSize: '0.5625rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '0.2rem 0.6rem', borderRadius: '4px', background: 'rgba(200,16,46,0.12)', color: '#C8102E', marginBottom: '0.75rem' }}>
        Parents
      </span>
      <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(2rem, 5vw, 2.75rem)', color: '#fff', letterSpacing: '0.04em', lineHeight: 1, margin: '0 0 0.75rem' }}>
        USA HOCKEY&apos;S ADM EXPLAINED
      </h1>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
        What the American Development Model is, why it was created, what the stages mean, and how to use it as a parent to make better decisions about your kid&apos;s hockey path.
      </p>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: "USA Hockey's ADM Explained | RinkStop",
        description: "A parent's guide to USA Hockey's American Development Model — what the 8 stages look like, the 10 guiding principles, and why early specialization hurts.",
        author: { '@type': 'Organization', name: 'RinkStop' },
        publisher: { '@type': 'Organization', name: 'RinkStop', url: 'https://rinkstop.com' },
        datePublished: '2026-06-11',
      }) }} />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
          { '@type': 'Question', name: 'What is the ADM in youth hockey?', acceptedAnswer: { '@type': 'Answer', text: 'The American Development Model (ADM) is USA Hockey\'s nationwide framework for athlete development. It organizes youth hockey into 8 age-based stages and is built on 10 guiding principles, including age-appropriate training, multi-sport sampling, and long-term development over early specialization.' } },
          { '@type': 'Question', name: 'When did USA Hockey create the ADM?', acceptedAnswer: { '@type': 'Answer', text: 'USA Hockey introduced the ADM in 2009, and the U.S. Olympic Committee adopted it before the 2014 Winter Games. It represented a major shift away from the old model of rigid age brackets and early specialization toward an athlete-centered, fun-first approach.' } },
          { '@type': 'Question', name: 'At what age should a kid specialize in hockey?', acceptedAnswer: { '@type': 'Answer', text: 'The ADM recommends waiting until 14-16 years old for high-level specialization. Research consistently shows that early specialization in a single sport increases injury risk, contributes to burnout, and does not improve long-term performance. Multi-sport athletes through age 12-13 tend to develop into better hockey players than single-sport specialists.' } },
          { '@type': 'Question', name: 'Is the ADM just for elite players?', acceptedAnswer: { '@type': 'Answer', text: 'No — the ADM is designed for every kid who plays hockey, from Learn to Play all the way through high-level development. Its core message is that fun, multi-sport sampling, and age-appropriate training produce better long-term outcomes for all players, not just the ones aiming for the NHL.' } },
          { '@type': 'Question', name: 'How does the ADM differ from Hockey Canada\u2019s model?', acceptedAnswer: { '@type': 'Answer', text: 'Hockey Canada runs a parallel framework called the Long-Term Player Development (LTPD) model. Both are built on the same foundation: player-centered, age-appropriate, multi-sport, and fun-first. The stages have slightly different names and age ranges, but the principles are nearly identical. Both are based on the international Long-Term Athlete Development framework.' } },
        ],
      }) }} />

      {/* Intro */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>WHAT IS THE ADM?</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>
          The American Development Model (ADM) is USA Hockey&apos;s nationwide framework for how kids should be introduced to hockey and how they should progress through it. It was instituted in 2009 and adopted by the U.S. Olympic Committee before the 2014 Winter Games.
        </p>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>
          The core idea is simple: <strong style={{ color: '#fff' }}>most kids were being asked to specialize too early, in environments that were too competitive, and they were burning out or quitting by 13.</strong> The ADM was built on research showing that the opposite approach — fun-first, multi-sport, age-appropriate training — produces better hockey players <em>and</em> keeps more kids in the game.
        </p>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '0', fontSize: '0.9375rem' }}>
          The ADM is built on <strong style={{ color: '#fff' }}>10 guiding principles</strong> and organized into <strong style={{ color: '#fff' }}>8 age-based stages</strong>. The two together form the roadmap most USA Hockey associations now follow when they design their programs.
        </p>
      </section>

      {/* The 10 Principles */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>THE 10 GUIDING PRINCIPLES</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>
          The ADM is anchored in 10 principles derived from research in youth sports science, motor development, and coaching. They&apos;re not a checklist — they&apos;re a philosophy. When you read them, you&apos;ll notice a throughline: development, not winning, comes first.
        </p>

        <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '1.25rem 1.5rem', marginBottom: '1rem' }}>
          <div style={{ display: 'grid', gap: '0.625rem' }}>
            {[
              'Every athlete deserves the opportunity to be part of a fun, engaging, and developmentally appropriate experience.',
              'All youth should develop confidence and competence in fundamental movement skills before sport-specific skills.',
              'Youth of all ages, abilities, and aspirations should engage in programs that promote physical fitness and psychosocial wellbeing.',
              'An early-sampling approach enhances and promotes a broad range of experiences in sports and physical activity.',
              'Well-rounded, multi-sport athletes have the highest potential to achieve long-term success.',
              'Highly specialized training in hockey should not begin until 14-16 years of age.',
              'Quality coaches using sound pedagogical approaches are fundamental to athlete development.',
              'Coach development and education must be aligned with athlete development at every stage.',
              'Development should be holistic — technical, tactical, physical, and mental — with these factors treated as deeply interdependent.',
              'Hockey for Life: instill a love of the game that lasts beyond competitive years.',
            ].map((p, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '32px 1fr', gap: '0.75rem', padding: '0.625rem 0', borderBottom: i < 9 ? '1px solid rgba(255,255,255,0.05)' : 'none', alignItems: 'start' }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 800, color: '#C8102E' }}>{i + 1}</p>
                <p style={{ fontSize: '0.875rem', color: '#bbb', lineHeight: 1.55 }}>{p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The 8 Stages */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>THE 8 STAGES OF THE ADM</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>
          The ADM organizes a player&apos;s journey from first steps on the ice to adulthood into 8 stages. Each stage has a specific focus, a recommended practice-to-game ratio, and a development goal.
        </p>

        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {[
            { stage: 'Stage 1', code: '6U (Mite Mini)', age: 'Ages 5-6', focus: 'Fundamental movement. Skating only. No structured competition. The goal is to make ice fun so the kid wants to come back.', practices: '50-60 ice sessions/yr, mostly practices' },
            { stage: 'Stage 2', code: '8U (Mite)', age: 'Ages 7-8', focus: 'Refine fundamental movement. Introduce basic puck skills. Cross-ice games (full-ice at this age is developmentally wrong). No tryouts, no scorekeeping.', practices: '50-60 sessions/yr, 16-20 cross-ice game days' },
            { stage: 'Stage 3', code: '10U (Squirt)', age: 'Ages 9-10', focus: 'The "golden age" begins. Master fine motor skills and puck control. First introduction to competitive structure. Still half-ice recommended at this level in many associations.', practices: '95-100 sessions/yr, 20-25 games' },
            { stage: 'Stage 4', code: '12U (Peewee)', age: 'Ages 11-12', focus: 'Sports-specific skill development. Begin tactical play and team concepts. No body checking at this age. Some associations introduce competitive tryouts here.', practices: '105-120 sessions/yr, 30-35 games' },
            { stage: 'Stage 5', code: '14U (Bantam)', age: 'Ages 13-14', focus: 'Body checking introduced at competitive levels. Position-specific training. Mental skills and team leadership. Peak skill acquisition window.', practices: '~120+ sessions/yr, 35-45 games' },
            { stage: 'Stage 6', code: '16U (Midget Minor)', age: 'Ages 15-16', focus: 'High-level competition. Strength and conditioning become central. First real recruiting exposure for college and junior pathways.', practices: '~150+ sessions/yr' },
            { stage: 'Stage 7', code: '18U (Midget Major)', age: 'Ages 17-18', focus: 'Final youth stage. Junior, college, and high school pathways fully diverge. Players are now expected to manage their own development.', practices: '~150+ sessions/yr' },
            { stage: 'Stage 8', code: 'Adult', age: '18+', focus: 'Hockey for life. Adult leagues, college club, beer league, coaching, officiating, or simply recreational skating. The game is meant to last a lifetime.', practices: 'Self-directed' },
          ].map(s => (
            <div key={s.stage} style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', padding: '1rem 1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                <p style={{ fontSize: '0.6875rem', fontWeight: 800, color: '#C8102E', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.stage}</p>
                <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff' }}>{s.code}</p>
                <p style={{ fontSize: '0.75rem', color: '#777' }}>{s.age}</p>
              </div>
              <p style={{ fontSize: '0.8125rem', color: '#aaa', lineHeight: 1.6, marginBottom: '0.375rem' }}>{s.focus}</p>
              <p style={{ fontSize: '0.75rem', color: '#666', fontStyle: 'italic' }}>{s.practices}</p>
            </div>
          ))}
        </div>
      </section>

      {/* What it means for parents */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>WHAT THIS MEANS FOR YOU AS A PARENT</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>
          The ADM gives you a framework for making decisions that aren&apos;t obvious from the outside. Three takeaways that matter most:
        </p>

        <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '1rem' }}>
          {[
            { title: 'Don\'t specialize early.', desc: 'The single most evidence-backed principle in the ADM is that early specialization hurts. Kids who play multiple sports through age 12-13 develop better athleticism, have fewer injuries, and burn out less often. If your kid is being asked to quit soccer to focus on hockey at age 9, that program is not following the ADM.' },
            { title: 'Practice-to-game ratio matters.', desc: 'Younger kids should be practicing far more than they play games. A 6U schedule of 60 practices and 16 game days is right. A 10U schedule of 100 sessions should be 75 practices and 25 games. If your association is running 50 games and 30 practices for 10U, the development model is upside down.' },
            { title: 'Fun is the metric.', desc: 'USA Hockey\'s director of player development has said it directly: "Hockey has to be fun at every age." The biggest predictor of long-term participation isn\'t talent or tier — it\'s whether the kid is still having fun at 13. Watch for signs of burnout and be willing to dial back. There\'s no development pathway that runs through misery.' },
          ].map(item => (
            <div key={item.title} style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', padding: '1rem 1.25rem' }}>
              <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff', marginBottom: '0.375rem' }}>{item.title}</p>
              <p style={{ fontSize: '0.8125rem', color: '#888', lineHeight: 1.6 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* International note */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>THE INTERNATIONAL PICTURE</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>
          The ADM is the U.S. implementation of a broader international framework called Long-Term Athlete Development (LTAD), originally developed by Sport Canada. Hockey Canada runs a parallel model called the Long-Term Player Development (LTPD) framework. The IIHF (International Ice Hockey Federation) endorses the same principles.
        </p>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>
          The upshot: if you move between countries, or your kid plays in an international tournament, the underlying philosophy is the same. The age-group names differ (Hockey Canada uses FUNdamentals, Learn to Play, Learn to Train, Train to Train, etc.), but the principles — multi-sport sampling, age-appropriate training, fun-first, late specialization — are universal.
        </p>
        <p style={{ color: '#999', fontSize: '0.875rem', lineHeight: 1.6 }}>
          For parents, this means the ADM isn&apos;t a U.S.-only quirk. It&apos;s the global consensus on how kids should learn hockey, supported by research from the IOC, NHL, and IIHF.
        </p>
      </section>

      {/* Related */}
      <section style={{ marginTop: '3rem', padding: '1.5rem', background: 'rgba(200,16,46,0.06)', border: '1px solid rgba(200,16,46,0.15)', borderRadius: '10px' }}>
        <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>Related guides</p>
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          <Link href="/guides/hockey-parents-handbook" style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
            Hockey Parent&apos;s Handbook →
          </Link>
          <Link href="/guides/youth/house-vs-travel-hockey" style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
            House vs Travel Hockey →
          </Link>
          <Link href="/guides/youth-to-junior-hockey" style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
            From Youth to Junior Hockey →
          </Link>
        </div>
      </section>
    </div>
  );
}
