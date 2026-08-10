import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Hockey Equipment Guide — Skates, Sticks, Protective Gear & More | RinkStop',
  description: 'A complete guide to hockey equipment for players, parents, and goalies. Skates, sticks, helmets, pads, and how to choose the right gear at every level.',
  keywords: ['hockey equipment', 'hockey skates', 'hockey sticks', 'hockey gear', 'hockey helmet', 'goalie equipment'],
  alternates: { canonical: 'https://rinkstop.com/learn/hockey-equipment-guide' },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Hockey Equipment Guide — A Complete Guide for Players and Parents',
    description: 'Skates, sticks, helmets, pads, and how to choose the right gear at every level of hockey.',
    type: 'article',
    url: 'https://rinkstop.com/learn/hockey-equipment-guide',
    siteName: 'RinkStop',
  },
};

export default function HockeyEquipmentGuidePage() {
  return (
    <main style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1rem 4rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1.5rem' }}>
        <Link href="/" style={{ color: '#555' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/learn" style={{ color: '#555' }}>Learn</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>Hockey Equipment Guide</span>
      </nav>

      <h1 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 'clamp(2rem, 5vw, 3rem)', color: '#041E42', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
        HOCKEY EQUIPMENT GUIDE
      </h1>
      <p style={{ color: '#444', fontSize: '1.05rem', marginBottom: '2rem', lineHeight: 1.5 }}>
        A complete guide to every piece of equipment a hockey player needs — from skates and sticks to helmets, pads, and the specialized gear goalies rely on.
      </p>

      <div style={{ color: '#1a1a1a', lineHeight: 1.8, fontSize: '1rem' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>The basics: what every skater needs</h2>
        <p style={{ marginBottom: '1rem' }}>
          Every hockey player wears the same essential protective equipment, regardless of position or level. The list is longer than it looks — a full set of gear runs between $300 and $1,500 new, depending on the brand and level.
        </p>
        <ul style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li><strong>Helmet</strong> with full cage or half-visor (mandatory in most organized play)</li>
          <li><strong>Mouthguard</strong> (required at most levels, recommended everywhere)</li>
          <li><strong>Shoulder pads</strong></li>
          <li><strong>Elbow pads</strong></li>
          <li><strong>Hockey gloves</strong></li>
          <li><strong>Hockey pants</strong> (also called breezers)</li>
          <li><strong>Shin guards</strong></li>
          <li><strong>Hockey socks</strong> (to hold the shin guards)</li>
          <li><strong>Jersey and socks</strong> (team-issued or matching)</li>
          <li><strong>Hockey skates</strong></li>
          <li><strong>Hockey stick</strong></li>
          <li><strong>Athletic supporter and cup</strong></li>
        </ul>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Skates: the single most important piece</h2>
        <p style={{ marginBottom: '1rem' }}>
          Skates are the one piece of equipment that has the biggest impact on how a player skates. A $100 pair of skates from a big-box store is not the same as a properly fitted pair from a hockey shop. The fit matters more than the brand.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          For kids who are still growing, the standard advice is to buy a half-size large and leave room to grow — but not so much that the foot slides inside the boot. For adult players, fit should be snug: the heel locked in place, the toes lightly touching the front of the boot when standing, with about 1/4 inch of space when the knee is fully flexed.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          Sharpening matters too. A new pair of skates comes with a factory edge, but most players sharpen every 15–20 hours of ice time. Skipping sharpening leads to slipping on turns and poor edge work.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Sticks: flex, curve, and length</h2>
        <p style={{ marginBottom: '1rem' }}>
          The three things that matter on a hockey stick are flex (how much it bends), curve (the shape of the blade), and length (cut to fit the player). Getting these right makes a noticeable difference in shooting and stickhandling.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>Flex:</strong> a common rule is flex rating at roughly half the player&rsquo;s body weight in pounds. A 160-pound player benefits from a stick in the 75–85 flex range. Stiffer sticks deliver harder shots but require more strength; whippy sticks are easier to load.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <strong>Curve:</strong> the blade curve affects how the puck lifts and where it goes. Mid-curve sticks (like the P92 / Ovechkin curve) are the most versatile and the most popular at every level. Deeper curves generate more shot power but are harder to control.
        </p>
        <p style={{ marginBottom: '1.5rem' }}>
          <strong>Length:</strong> skates should be worn when measuring. With skates on, the stick should reach somewhere between the chin and the nose when held vertically. Cutting a stick too short is one of the most common beginner mistakes.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Helmets and safety</h2>
        <p style={{ marginBottom: '1rem' }}>
          Hockey is the only major team sport where fighting is part of the game at the professional level, and concussions are a real risk at every level. A properly fitted helmet is non-negotiable.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          Look for a helmet certified by HECC (Hockey Equipment Certification Council) or CSA (Canadian Standards Association). The certification sticker is usually on the back or inside of the helmet. Replace any helmet that takes a major impact — the foam inside compresses on impact and does not fully recover.
        </p>
        <p style={{ marginBottom: '1.5rem' }}>
          Fit: the helmet should sit level on the head (not tilted back), with about one finger width between the eyebrows and the front edge. The chin strap should be snug. Most players size up if they&rsquo;re between two sizes.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Protective gear sizing</h2>
        <p style={{ marginBottom: '1rem' }}>
          Shoulder pads, elbow pads, shin guards, and hockey pants should fit snugly without restricting movement. The general test: bend over and touch your toes. If anything digs in, pinches, or shifts position, the fit is wrong.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          For goalies, the gear is a different world — chest protectors, blocker and glove, leg pads that weigh 8–10 pounds each. Goalies wear 30+ pounds of equipment and the sizing is more specialized. Most serious goalies buy used leg pads to start, then upgrade as they grow into the position.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>How much does hockey equipment cost?</h2>
        <p style={{ marginBottom: '1rem' }}>
          New players often underestimate the cost. Here&rsquo;s a realistic range for a full set of gear at entry level (youth or adult novice):
        </p>
        <ul style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li><strong>Recreational (used or off-brand):</strong> $200–$400 total</li>
          <li><strong>Entry-level new (CCM, Bauer, Warrior, etc.):</strong> $500–$800</li>
          <li><strong>Mid-tier:</strong> $800–$1,500</li>
          <li><strong>Pro / elite tier:</strong> $1,500–$3,000+</li>
        </ul>
        <p style={{ marginBottom: '1.5rem' }}>
          Skates are usually the most expensive single piece. A new pair runs $150–$900. Sticks are the recurring cost: composite sticks are $80–$250 and typically last 6–18 months depending on use.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Where to buy</h2>
        <p style={{ marginBottom: '1rem' }}>
          Local hockey shops are still the best place for skates and helmets — proper fit requires trying gear on. For sticks, shoulder pads, gloves, and most other equipment, online retailers (Pure Hockey, Hockey Monkey, Ice Warehouse) often have better prices and wider selection. Used gear marketplaces (SidelineSwap, Play It Again Sports) can save 50–70% on lightly used equipment.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>What to upgrade first</h2>
        <p style={{ marginBottom: '1rem' }}>
          If you have to prioritize, the equipment hierarchy by impact on play is roughly:
        </p>
        <ol style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li><strong>Skates</strong> — fit and quality here affect every stride</li>
          <li><strong>Helmet</strong> — safety first, and a poor fit causes headaches and distraction</li>
          <li><strong>Stick</strong> — flex and curve matter for shooting and stickhandling</li>
          <li><strong>Gloves</strong> — fit and protection, in that order</li>
          <li><strong>Shin guards</strong> — coverage is more important than brand</li>
          <li><strong>Shoulder pads and pants</strong> — fit and mobility</li>
        </ol>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Care and maintenance</h2>
        <p style={{ marginBottom: '1rem' }}>
          Equipment lasts longer if you take care of it. Wipe down skates after each use, dry them with the guards off, and store them with blade covers on. Hang shoulder pads and pants to dry. Keep gloves loose so the padding isn&rsquo;t compressed. Replace laces when they show wear — a snapped lace mid-shift can mean a missed game.
        </p>
        <p style={{ marginBottom: '1.5rem' }}>
          Composite sticks should be stored in moderate temperature. Extreme cold or heat weakens the resin. Don&rsquo;t leave a stick in a hot car.
        </p>

        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#041E42', letterSpacing: '0.04em', marginTop: '2.5rem', marginBottom: '1rem' }}>Disclosure</h2>
        <p style={{ marginBottom: '1.5rem', fontSize: '0.9rem', color: '#666' }}>
          RinkStop is supported in part by advertising. Advertising does not influence our editorial content. See our <Link href="/advertise" style={{ color: '#C8102E' }}>advertising policy</Link> and <Link href="/editorial-policy" style={{ color: '#C8102E' }}>editorial policy</Link> for the full disclosure.
        </p>
      </div>
    </main>
  );
}
