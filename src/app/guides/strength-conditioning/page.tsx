import type { Metadata } from 'next';
import Link from 'next/link';
import { withDefaultOg } from '@/lib/metadata-defaults';

export const metadata: Metadata = {
  title: 'Hockey Strength and Conditioning Guide - Off-Ice Training for Hockey Players',
  description: 'Everything you need to know about hockey strength and conditioning: the muscle groups that matter most, in-season vs off-season training, age-appropriate programs, plyometrics, mobility, and how to balance on-ice and off-ice work.',
  openGraph: withDefaultOg({
    title: 'Hockey Strength and Conditioning Guide',
    description: 'Off-ice training for hockey: strength, conditioning, plyometrics, mobility, and age-appropriate programs.',
    type: 'article',
  }),
  alternates: { canonical: 'https://rinkstop.com/guides/strength-conditioning' },
};

export default function StrengthConditioningGuide() {
  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '0.75rem 1rem 4rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <Link href="/">Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/guides" style={{ color: '#555' }}>Guides</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>Strength and Conditioning</span>
      </nav>
      <span style={{ display: 'inline-block', fontSize: '0.5625rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '0.2rem 0.6rem', borderRadius: '4px', background: 'rgba(200,16,46,0.12)', color: '#C8102E', marginBottom: '0.75rem' }}>Guide</span>
      <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(2rem, 5vw, 2.75rem)', color: '#fff', letterSpacing: '0.04em', lineHeight: 1, margin: '0 0 0.75rem' }}>HOCKEY STRENGTH AND CONDITIONING GUIDE</h1>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>Off-ice training for hockey players - strength, conditioning, plyometrics, mobility, and age-appropriate programs that translate to better on-ice performance.</p>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'Article', headline: 'Hockey Strength and Conditioning Guide', description: 'Off-ice training for hockey: strength, conditioning, plyometrics, mobility, and age-appropriate programs.', author: { '@type': 'Organization', name: 'RinkStop' }, publisher: { '@type': 'Organization', name: 'RinkStop', url: 'https://rinkstop.com' }, datePublished: '2026-08-11' }) }} />

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>WHY OFF-ICE TRAINING MATTERS</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>Hockey players at every level benefit from structured off-ice training. The demands of the sport - repeated 30-45 second shifts of high-intensity skating, body contact, rapid direction changes - require a specific combination of strength, power, conditioning, and mobility that hockey practice alone doesn\'t fully develop.</p>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {[
            { label: 'Injury prevention', value: 'Off-ice training strengthens joints, tendons, and stabilizers. Players with consistent off-ice programs have measurably lower injury rates.' },
            { label: 'On-ice performance', value: 'Stronger players skate faster, shoot harder, and win more puck battles. Squat strength directly correlates with skating speed.' },
            { label: 'Recovery', value: 'Better-conditioned players recover faster between shifts, between games, and across a long season.' },
            { label: 'Longevity', value: 'Players who invest in off-ice training extend their careers with fewer injuries and better performance at older ages.' },
            { label: 'Body composition', value: 'Strength training builds lean muscle and reduces injury risk. Combined with proper nutrition, it optimizes body composition for the sport.' },
          ].map((row, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '1rem', padding: '0.625rem 0.875rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '4px' }}>
              <span style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 800 }}>{row.label}</span>
              <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.875rem', lineHeight: 1.55 }}>{row.value}</span>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>THE KEY TRAINING COMPONENTS</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>A complete hockey S and C program addresses five distinct components. Each develops a different physical capacity that contributes to on-ice performance:</p>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {[
            { name: 'Strength', desc: 'Maximal force production. Built through compound lifts (squats, deadlifts, presses) at moderate-to-heavy loads. Foundation for power and injury prevention.' },
            { name: 'Power', desc: 'Speed-strength. How quickly force can be produced. Built through explosive movements (jumps, Olympic lift variations, plyometrics). Critical for skating acceleration and shooting.' },
            { name: 'Conditioning', desc: 'Aerobic and anaerobic capacity. Built through interval training, sled work, bike sprints. Targets the specific demands of hockey shifts.' },
            { name: 'Mobility', desc: 'Joint range of motion and tissue flexibility. Built through dynamic warm-ups, static stretching, foam rolling.' },
            { name: 'Stability', desc: 'Core strength and balance. Built through planks, anti-rotation work, single-leg exercises.' },
          ].map((row, i) => (
            <div key={i} style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.875rem 1.125rem' }}>
              <div style={{ marginBottom: '0.4rem' }}>
                <h3 style={{ color: '#fff', fontSize: '1rem', fontWeight: 700, margin: 0 }}>{row.name}</h3>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', lineHeight: 1.55, margin: 0 }}>{row.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>THE BEST EXERCISES FOR HOCKEY</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>Hockey-specific training prioritizes exercises that build the capacities the sport demands:</p>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {[
            { name: 'Squat (back, front, single-leg)', desc: 'The single most important exercise. Builds the leg strength that powers the skating stride.' },
            { name: 'Deadlift (conventional and trap bar)', desc: 'Builds posterior chain strength (glutes, hamstrings, back). Important for power and injury prevention.' },
            { name: 'Lunge and split squat', desc: 'Single-leg strength with sport-specific loading. Improves balance and unilateral power.' },
            { name: 'Box jumps and broad jumps', desc: 'Develop explosive leg power. Translates directly to skating acceleration and jump power.' },
            { name: 'Med ball throws', desc: 'Rotational and upper-body power. Develops the explosive rotation used in shooting and checking.' },
            { name: 'Pull-ups and rows', desc: 'Upper body pulling strength. Builds the back muscles that support posture and shot power.' },
            { name: 'Loaded carries', desc: 'Farmer carries, sandbag carries, suitcase carries. Builds grip, core stability, and conditioning simultaneously.' },
            { name: 'Plank variations', desc: 'Core stability. The foundation for body contact absorption and edge control.' },
          ].map((row, i) => (
            <div key={i} style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.875rem 1.125rem' }}>
              <div style={{ marginBottom: '0.4rem' }}>
                <h3 style={{ color: '#fff', fontSize: '1rem', fontWeight: 700, margin: 0 }}>{row.name}</h3>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', lineHeight: 1.55, margin: 0 }}>{row.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>AGE-APPROPRIATE TRAINING</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>Training load should match physical development. The general principle: bodyweight movements and movement quality before external loading.</p>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {[
            { age: 'Under 8', focus: 'Fun, movement variety, bodyweight play', desc: 'Focus on running, jumping, climbing, balance games. No structured strength training.' },
            { age: '8-11', focus: 'Movement competence, basic bodyweight strength', desc: 'Introduce squats, lunges, push-ups, planks as part of warm-ups or PE-style activities.' },
            { age: '12-14', focus: 'Light external loading, technique emphasis', desc: 'Introduce light dumbbells and kettlebells. Movement quality is the priority.' },
            { age: '15-17', focus: 'Structured barbell training, progressive overload', desc: 'Begin barbell work with qualified coaching. Squat, deadlift, bench, overhead press.' },
            { age: '18+', focus: 'Periodized training, sport-specific work', desc: 'In-season maintenance, off-season hypertrophy and strength blocks. Conditioning tailored to position.' },
          ].map((row, i) => (
            <div key={i} style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.875rem 1.125rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
                <h3 style={{ color: '#fff', fontSize: '1rem', fontWeight: 700, margin: 0 }}>{row.age}</h3>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8125rem' }}>{row.focus}</span>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', lineHeight: 1.55, margin: 0 }}>{row.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>IN-SEASON VS OFF-SEASON</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>The training program changes based on the season. Trying to set personal records during a 30-game schedule is a recipe for injury and burnout.</p>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {[
            { phase: 'Off-season (3-4 months)', focus: 'Build strength, size, and conditioning base', desc: 'Higher volume, heavier loads. Strength gains are most achievable during this period.' },
            { phase: 'Pre-season (4-6 weeks)', focus: 'Convert strength to power, sharpen conditioning', desc: 'Lower weight, higher intent. Plyometrics and explosive movements become the focus.' },
            { phase: 'In-season (6 months)', focus: 'Maintain strength, manage fatigue', desc: 'Lower volume, moderate loads. Maintenance work. 2-3 short sessions per week.' },
          ].map((row, i) => (
            <div key={i} style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.875rem 1.125rem' }}>
              <div style={{ marginBottom: '0.4rem' }}>
                <h3 style={{ color: '#fff', fontSize: '1rem', fontWeight: 700, margin: 0 }}>{row.phase}</h3>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.8125rem', margin: '0 0 0.4rem' }}>{row.focus}</p>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', lineHeight: 1.55, margin: 0 }}>{row.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: "2.5rem" }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>EXPLORE THE DIRECTORY</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>Take what you've learned into the RinkStop directory.</p>
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          <Link href="/directory/coaches" style={{ display: "block", padding: "0.75rem 1rem", background: "var(--s2)", border: "1px solid var(--border)", borderRadius: "4px", color: "#C8102E", textDecoration: "none", fontSize: "0.9375rem" }}>Find strength coaches →</Link><Link href="/directory/brands?category=training" style={{ display: "block", padding: "0.75rem 1rem", background: "var(--s2)", border: "1px solid var(--border)", borderRadius: "4px", color: "#C8102E", textDecoration: "none", fontSize: "0.9375rem" }}>Browse training brands →</Link>
        </div>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>RELATED GUIDES</h2>
        <ul style={{ color: '#aaa', lineHeight: 1.7, fontSize: '0.9375rem', paddingLeft: '1.25rem' }}>
          <li style={{ marginBottom: '0.4rem' }}><Link href="/guides/off-ice-hockey-training" style={{ color: '#C8102E' }}>Off-Ice Training</Link></li>
          <li style={{ marginBottom: '0.4rem' }}><Link href="/guides/hockey-nutrition" style={{ color: '#C8102E' }}>Hockey Nutrition</Link></li>
          <li style={{ marginBottom: '0.4rem' }}><Link href="/guides/skating" style={{ color: '#C8102E' }}>Hockey Skating Guide</Link></li>
          <li style={{ marginBottom: '0.4rem' }}><Link href="/guides/shooting" style={{ color: '#C8102E' }}>Hockey Shooting Guide</Link></li>
        </ul>
      </section>
    </div>
  );
}
