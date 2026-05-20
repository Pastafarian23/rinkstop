import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Eating for Hockey Performance | RinkStop',
  description: 'Nutrition strategies for hockey players: pre-game meals, hydration, and recovery eating. How to fuel for explosive shifts and fast recovery.',
  openGraph: { title: 'Eating for Hockey Performance | RinkStop', description: 'Nutrition strategies for hockey players: pre-game meals, hydration, and recovery eating.', type: 'article' },
  alternates: { canonical: 'https://rinkstop.com/guides/hockey-nutrition' },
};

export default function HockeyNutrition() {
  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '0.75rem 1rem 4rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <Link href="/">Home</Link><span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/guides" style={{ color: '#555' }}>Guides</Link><span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>Eating for Performance</span>
      </nav>
      <span style={{ display: 'inline-block', fontSize: '0.5625rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '0.2rem 0.6rem', borderRadius: '4px', background: 'rgba(200,16,46,0.12)', color: '#C8102E', marginBottom: '0.75rem' }}>Training</span>
      <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(2rem, 5vw, 2.75rem)', color: '#fff', letterSpacing: '0.04em', lineHeight: 1, margin: '0 0 0.75rem' }}>EATING FOR HOCKEY PERFORMANCE</h1>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>Nutrition strategies for hockey players: pre-game meals, hydration, and recovery eating. How to fuel for explosive shifts and fast recovery.</p>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'Article', headline: 'Eating for Hockey Performance', description: 'Nutrition strategies for hockey players: pre-game meals, hydration, and recovery eating.', author: { '@type': 'Organization', name: 'RinkStop' }, publisher: { '@type': 'Organization', name: 'RinkStop', url: 'https://rinkstop.com' }, datePublished: '2026-05-16' }) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [
        { '@type': 'Question', name: 'What should hockey players eat before a game?', acceptedAnswer: { '@type': 'Answer', text: 'Eat a carb-focused meal 3-4 hours before game time: pasta, rice, bread, lean protein, and vegetables. Avoid high-fat foods (they slow digestion), high-fiber foods (they cause bloating), and new foods your body hasn\'t processed before. In the 1-2 hours before the game, stick to light, easily digested carbs: a banana, a granola bar, white bread with honey.' } },
        { '@type': 'Question', name: 'How much water should a hockey player drink before a game?', acceptedAnswer: { '@type': 'Answer', text: 'Drink 16-20oz of water in the 2 hours before the game. During the game, you lose fluid through sweat and breathing  --  aim to drink 4-8oz at each break between periods. A hockey player can lose 2-4lbs of water weight during a game, especially in a hot arena. Dehydration reduces reaction time and endurance  --  it\'s the single easiest performance variable to fix.' } },
        { '@type': 'Question', name: 'What should hockey players eat after a game?', acceptedAnswer: { '@type': 'Answer', text: 'Within 30-60 minutes after a game, eat a recovery meal with both carbs and protein in a 3:1 to 4:1 ratio (carb:protein). Chocolate milk is the classic  --  it has this ratio and is backed by research. Other options: a turkey sandwich, Greek yogurt with granola, or a protein smoothie with banana and oats. The window after exertion is when your muscles absorb nutrients most efficiently.' } },
      ]}) }} />

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>HOW HOCKEY BURNS FUEL</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>Understanding how hockey uses energy helps you understand why nutrition matters for this sport specifically.</p>
        <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '1rem' }}>
          {[
            { system: 'ATP-PC (Immediate)', duration: '10-15 seconds', example: 'A single stride, a faceoff, a shot', color: '#C8102E', fill: 'High-sugar foods the day before. No carbs needed during game.' },
            { system: 'Anaerobic Glycolysis (Short-term)', duration: '30 sec - 2 min', example: 'A full shift (30-50 seconds of hard skating)', color: '#FF6B00', fill: 'Carbohydrates. No fat or protein needed during activity.' },
            { system: 'Aerobic (Long-term)', duration: '2+ minutes', example: 'Game-day endurance, practice, off-ice training', color: '#009650', fill: 'Balanced carb + protein + fat meals across the day.' },
          ].map(s => (
            <div key={s.system} style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '1.125rem 1.25rem' }}>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ width: 12, height: 12, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#fff' }}>{s.system}</p>
                <span style={{ fontSize: '0.75rem', color: '#555', marginLeft: 'auto' }}>{s.duration}</span>
              </div>
              <p style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.375rem' }}>Example: {s.example}</p>
              <p style={{ fontSize: '0.75rem', color: '#555' }}><strong style={{ color: '#777' }}>Fuel source:</strong> {s.fill}</p>
            </div>
          ))}
        </div>
        <p style={{ fontSize: '0.8125rem', color: '#666', lineHeight: 1.65, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '0.875rem 1rem' }}>
          <strong style={{ color: '#999' }}>Key takeaway:</strong> Hockey is a sport of repeated anaerobic bursts with limited rest. Your nutrition strategy should prioritize carbohydrate fueling for game day (your primary energy system) and protein for muscle repair and recovery.
        </p>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>GAME DAY EATING TIMELINE</h2>
        <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '1.25rem 1.5rem' }}>
          <div style={{ display: 'grid', gap: '1rem' }}>
            {[
              { time: '3-4 hours before', label: 'Big pre-game meal', icon: '🍝', desc: 'Pasta, rice, bread, lean protein (chicken, fish), vegetables. Avoid high fat and high fiber.', carb: '60-80g carbs, 30-40g protein' },
              { time: '1-2 hours before', label: 'Light carb snack', icon: '🍌', desc: 'Banana, granola bar, white bread with honey, sports drink. Easy to digest, quick energy.', carb: '30-50g carbs' },
              { time: 'Warm-up', label: 'Hydration + small sip', icon: '💧', desc: 'Sip water through warm-up. Don\'t overhydrate immediately before  --  sloshing stomach is uncomfortable.', carb: '4-8oz water' },
              { time: 'Between periods', label: 'Quick hydration', icon: '🥤', desc: 'Water or a light sports drink. If you feel energy dropping, a small piece of fruit (grapes, banana) can help.', carb: 'Small fruit, 8oz water' },
              { time: 'Immediately after', label: 'Recovery window', icon: '🥛', desc: 'Chocolate milk, protein smoothie, or a carb+protein meal within 30-60 minutes. Chocolate milk has a 3:1 carb:protein ratio.', carb: '30-60g carbs + 20-30g protein' },
              { time: 'Within 2 hours', label: 'Full recovery meal', icon: '🍗', desc: 'Real food meal with carbs, protein, and vegetables. This is your main replenishment for the day.', carb: '60-100g carbs, 40-60g protein' },
            ].map(m => (
              <div key={m.time} style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '1rem', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ fontSize: '0.6875rem', fontWeight: 800, color: '#C8102E', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.25rem' }}>{m.time}</p>
                  <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#fff' }}>{m.label}</p>
                </div>
                <div>
                  <p style={{ fontSize: '0.8125rem', color: '#888', marginBottom: '0.25rem' }}>{m.desc}</p>
                  <p style={{ fontSize: '0.75rem', color: '#555' }}>{m.carb}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>HYDRATION</h2>
        <p style={{ color: '#aaa', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.9375rem' }}>Dehydration is the silent performance killer. Even 1-2% body weight loss through fluid loss impairs performance. Hockey players lose significant fluid through sweat, respiratory losses during high-intensity shifts, and arena heat. Most players start every game at least mildly dehydrated.</p>
        <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '1.25rem 1.5rem' }}>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {[
              { tip: 'Weigh yourself before and after games', result: 'The easiest way to track fluid loss: if you\'re 3lbs lighter after a game, drink 24oz of water for every pound lost.' },
              { tip: 'Add electrolytes', result: 'Water alone isn\'t enough  --  you lose sodium, potassium, and magnesium in sweat. A sports drink or electrolyte tablet during extended games prevents cramping.' },
              { tip: 'Avoid alcohol', result: 'Alcohol is both a diuretic and impairs next-day recovery. Even one drink the night before a game reduces reaction time.' },
              { tip: 'Morning of game day', result: 'Drink 16-20oz of water when you wake up. Continue sipping through the morning. You should be urinating clear by game time.' },
            ].map(t => (
              <div key={t.tip} style={{ padding: '0.875rem', background: 'rgba(255,255,255,0.04)', borderRadius: '8px' }}>
                <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#fff', marginBottom: '0.375rem' }}>{t.tip}</p>
                <p style={{ fontSize: '0.8125rem', color: '#888', lineHeight: 1.5 }}>{t.result}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>SUPPLEMENTS WORTH CONSIDERING</h2>
        <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '1.25rem 1.5rem' }}>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {[
              { name: 'Whey Protein', why: 'Fast-absorbing protein for post-workout recovery window. 20-30g within 60 minutes of training.', evidence: 'Strong evidence for muscle protein synthesis' },
              { name: 'Creatine Monohydrate', why: 'Improves explosive power output, especially in repeated sprint performance. Takes 2-3 weeks to fully load.', evidence: 'Strong evidence for anaerobic power' },
              { name: 'Beta-Alanine', why: 'Improves buffering capacity  --  delays muscle fatigue during high-intensity efforts. Benefits show after 2-3 weeks of daily use.', evidence: 'Moderate evidence for high-intensity performance' },
              { name: 'Vitamin D + Calcium', why: 'Supports bone health  --  hockey players are at risk for stress fractures. Most players are deficient in vitamin D.', evidence: 'Good evidence for bone density' },
            ].map(s => (
              <div key={s.name} style={{ display: 'grid', gridTemplateColumns: '1fr 140px 140px', gap: '0.75rem', padding: '0.875rem', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', alignItems: 'center' }}>
                <div><p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#fff', marginBottom: '0.25rem' }}>{s.name}</p><p style={{ fontSize: '0.75rem', color: '#888' }}>{s.why}</p></div>
                <p style={{ fontSize: '0.6875rem', color: '#555', textAlign: 'right' }}>Evidence:</p>
                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#009650', textAlign: 'right' }}>{s.evidence}</p>
              </div>
            ))}
          </div>
        </div>
        <p style={{ fontSize: '0.75rem', color: '#444', marginTop: '0.75rem', lineHeight: 1.6 }}>Always check with your doctor before starting supplements. WADA/USADA compliance is the athlete&apos;s responsibility  --  verify every product at globaldrogena.org.</p>
      </section>

      <div style={{ background: 'var(--s2)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '1.5rem', textAlign: 'center', marginTop: '2rem' }}>
        <p style={{ color: '#666', fontSize: '0.875rem', marginBottom: '0.75rem' }}>More guides</p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/guides/off-ice-hockey-training" style={{ padding: '0.625rem 1.25rem', background: '#C8102E', borderRadius: '6px', color: '#fff', fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none' }}>Off-Ice Training</Link>
          <Link href="/guides/hockey-parents-handbook" style={{ padding: '0.625rem 1.25rem', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: '#fff', fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none' }}>Hockey Parent&apos;s Handbook</Link>
        </div>
      </div>
    </div>
  );
}