import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Off-Ice Training for Hockey Players',
  description: 'The best dryland exercises to build explosive power, edge strength, and durability for hockey players. No ice required  --  train like the pros.',
  openGraph: { title: 'Off-Ice Training for Hockey Players', description: 'The best dryland exercises to build explosive power, edge strength, and durability.', type: 'article' },
  alternates: { canonical: 'https://rinkstop.com/guides/off-ice-hockey-training' },
};

export default function OffIceTraining() {
  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '0.75rem 1rem 4rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <Link href="/">Home</Link><span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/guides" style={{ color: '#555' }}>Guides</Link><span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>Off-Ice Training</span>
      </nav>
      <span style={{ display: 'inline-block', fontSize: '0.5625rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '0.2rem 0.6rem', borderRadius: '4px', background: 'rgba(200,16,46,0.12)', color: '#C8102E', marginBottom: '0.75rem' }}>Training</span>
      <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(2rem, 5vw, 2.75rem)', color: '#fff', letterSpacing: '0.04em', lineHeight: 1, margin: '0 0 0.75rem' }}>OFF-ICE TRAINING FOR HOCKEY PLAYERS</h1>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>Build explosive power, edge strength, and durability  --  without touching the ice. The complete off-ice training system for hockey players.</p>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'Article', headline: 'Off-Ice Training for Hockey Players', description: 'The best dryland exercises to build explosive power, edge strength, and durability for hockey players.', author: { '@type': 'Organization', name: 'RinkStop' }, publisher: { '@type': 'Organization', name: 'RinkStop', url: 'https://rinkstop.com' }, datePublished: '2026-05-16' }) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [
        { '@type': 'Question', name: 'What is the best off-ice training for hockey players?', acceptedAnswer: { '@type': 'Answer', text: 'The best off-ice training for hockey players combines explosive power work (jump squats, box jumps), core stability (planks, Pallof press), Single-leg strength (Bulgarian split squats, lunges), and conditioning intervals. Hockey is a sport of quick bursts followed by recovery  --  your training should reflect that pattern.' } },
        { '@type': 'Question', name: 'How often should hockey players train off-ice?', acceptedAnswer: { '@type': 'Answer', text: 'Most hockey players benefit from 3-4 off-ice training sessions per week during the season, and 4-5 during the off-season. Each session should be 45-75 minutes. Avoid training the day after a heavy game  --  your body needs 48 hours to recover from game-day load.' } },
        { '@type': 'Question', name: 'Do hockey players need to do cardio for off-ice training?', acceptedAnswer: { '@type': 'Answer', text: 'Yes  --  but not steady-state cardio. Hockey is anaerobic. Off-ice conditioning should be intervals: 30-second all-out sprints followed by 90 seconds rest, repeated 8-12 times. This replicates the shift pattern of a hockey game better than jogging.' } },
      ]}) }} />

      {[
        { title: 'EXPLOSIVE POWER', subtitle: 'The foundation of hockey speed', drills: [
          { name: 'Jump Squats', sets: '4×8', desc: 'Squat to a box, explode up and land softly. Focus on triple extension  --  ankles, knees, hips. This is the most hockey-specific strength movement.', tip: 'Use a box height of 12-20 inches depending on ability.' },
          { name: 'Box Jumps', sets: '4×6', desc: 'Stand in front of a sturdy box. Jump and land fully on top of the box, step down, reset. Builds explosive starting power  --  used on every faceoff and every stride.', tip: 'Land with full foot contact. Never step down from height  --  always step.' },
          { name: 'Single-Leg Broad Jumps', sets: '3×5/leg', desc: 'Leap as far as possible off one leg, land, then immediately repeat. Builds unilateral explosive power for skating stride.', tip: 'Keep landing knee tracking over toes  --  no caving inward.' },
          { name: 'Medicine Ball Slams', sets: '4×10', desc: 'From standing, explosively lift the med ball overhead and slam it into the ground. Builds hip hinge power used in slap shots and body checks.', tip: 'Drive through the hips, not the arms. The arms are just the delivery system.' },
        ]},
        { title: 'CORE STABILITY', subtitle: 'Stabilizes everything from wrist shots to checks', drills: [
          { name: 'Plank Variations', sets: '3×45sec', desc: 'Standard plank, side plank, and plank with shoulder taps. Hold each position rigid  --  no sagging hips. Core stiffness is what prevents lost balance on every check and cut.', tip: 'Exhale forcefully during plank holds. This activates the transverse abdominis.' },
          { name: 'Pallof Press', sets: '3×8/side', desc: 'Press a resistance band straight out from your chest while resisting rotation. The most anti-rotation core exercise  --  directly translates to staying upright on contact.', tip: 'Hold the finish position for 2 seconds before resetting.' },
          { name: 'Dead Bug', sets: '3×6/side', desc: 'Lie on back, extend opposite arm and leg while keeping lower back pressed into floor. Builds anti-extension and coordination  --  critical for core stability at high speed.', tip: 'Keep the lower back flush with the floor throughout every rep.' },
          { name: 'Bird Dog', sets: '3×8/side', desc: 'On all fours, extend opposite arm and leg simultaneously. Builds coordination, balance, and core endurance for a position that requires constant stability.', tip: 'Hold the fully extended position for 2 seconds before returning.' },
        ]},
        { title: 'SINGLE-LEG STRENGTH', subtitle: 'Skating is inherently unilateral', drills: [
          { name: 'Bulgarian Split Squats', sets: '3×8/leg', desc: 'Rear foot elevated on a bench. Lower until rear knee nearly touches ground, drive back up. The single-leg exercise that best replicates the skating stride load.', tip: 'Keep front knee tracking over toes  --  no caving inward at the bottom.' },
          { name: 'Walking Lunges', sets: '3×12/leg', desc: 'Long step forward, lower until both knees are at 90 degrees. Drive through the front heel to step. Builds the quad and glute strength behind every skating stride.', tip: 'Keep torso upright  --  a forward lean shifts load off the glutes.' },
          { name: 'Single-Leg RDL (Romanian Deadlift)', sets: '3×6/leg', desc: 'Stand on one leg, hinge at the hip and lower a weight toward the floor, keeping back flat. Builds hamstring and glute strength for stride power and injury prevention.', tip: 'The non-working leg should stay in line with the torso  --  not flaring out.' },
          { name: 'Skater Squats', sets: '3×8/leg', desc: 'Lateral jump to one leg, squat to near-touch the floor, explode to the other side. Builds lateral power and single-leg stability  --  directly applicable to crossovers and tight turns.', tip: 'Land soft with a slight knee bend  --  don\'t lock out at the bottom.' },
        ]},
        { title: 'CONDITIONING', subtitle: 'Hockey is anaerobic  --  train like it', drills: [
          { name: 'Sprint Intervals', sets: '10×30sec ON / 90sec rest', desc: 'All-out sprint for 30 seconds, rest 90 seconds. Repeat 10 times. This replicates the shift work-to-rest pattern of hockey better than any other conditioning method.', tip: 'If you can finish all 10 sprints feeling fresh, you\'re not going hard enough.' },
          { name: 'Battle Ropes', sets: '6×20sec', desc: 'Alternating waves or slams with heavy battle ropes. Builds upper body and core conditioning while improving grip strength  --  critical for stick handling.', tip: 'Maintain a hip-hinged position throughout. Standing tall wastes energy.' },
          { name: 'Cycle Assault Bike Intervals', sets: '8×20sec ON / 100sec rest', desc: 'All-out on the assault bike for 20 seconds, rest 100 seconds. The bike\'s load distribution closely mimics the glycolytic demand of hockey shifts.', tip: 'Aim for maximum calories burned in each 20-second window.' },
        ]},
      ].map(section => (
        <section key={section.title} style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '0.375rem' }}>{section.title}</h2>
          <p style={{ fontSize: '0.8125rem', color: '#555', marginBottom: '1rem' }}>{section.subtitle}</p>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {section.drills.map(d => (
              <div key={d.name} style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '1.125rem 1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '0.5rem' }}>
                  <p style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>{d.name}</p>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--gold)', background: 'rgba(200,16,46,0.08)', padding: '0.2rem 0.6rem', borderRadius: '4px', flexShrink: 0 }}>{d.sets}</span>
                </div>
                <p style={{ fontSize: '0.875rem', color: '#888', lineHeight: 1.65, marginBottom: '0.5rem' }}>{d.desc}</p>
                <p style={{ fontSize: '0.75rem', color: '#555', fontStyle: 'italic' }}>💡 {d.tip}</p>
              </div>
            ))}
          </div>
        </section>
      ))}

      <div style={{ background: 'var(--s2)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '1.5rem', textAlign: 'center', marginTop: '2rem' }}>
        <p style={{ color: '#666', fontSize: '0.875rem', marginBottom: '0.75rem' }}>Explore more hockey guides</p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/guides/hockey-stick-guide" style={{ padding: '0.625rem 1.25rem', background: '#C8102E', borderRadius: '6px', color: '#fff', fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none' }}>Hockey Stick Guide</Link>
          <Link href="/guides/hockey-positions" style={{ padding: '0.625rem 1.25rem', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: '#fff', fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none' }}>Hockey Positions</Link>
        </div>
      </div>
    </div>
  );
}