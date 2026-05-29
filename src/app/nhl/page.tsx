import type { Metadata } from 'next';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import Breadcrumb from '@/components/Breadcrumb';

export const metadata: Metadata = {
  title: 'NHL Hub — Teams, Standings, Schedules & Hockey News | RinkStop',
  description: 'Complete NHL coverage: all 32 teams, standings, schedules, player stats, arena guides, and hockey news. Your central hub for professional hockey.',
};

const NHL_TEAMS = [
  { name: 'Boston Bruins', slug: 'boston-bruins', conf: 'Eastern', division: 'Atlantic' },
  { name: 'Buffalo Sabres', slug: 'buffalo-sabres', conf: 'Eastern', division: 'Atlantic' },
  { name: 'Calgary Flames', slug: 'calgary-flames', conf: 'Western', division: 'Pacific' },
  { name: 'Carolina Hurricanes', slug: 'carolina-hurricanes', conf: 'Eastern', division: 'Metropolitan' },
  { name: 'Chicago Blackhawks', slug: 'chicago-blackhawks', conf: 'Western', division: 'Central' },
  { name: 'Colorado Avalanche', slug: 'colorado-avalanche', conf: 'Western', division: 'Central' },
  { name: 'Columbus Blue Jackets', slug: 'columbus-blue-jackets', conf: 'Eastern', division: 'Metropolitan' },
  { name: 'Dallas Stars', slug: 'dallas-stars', conf: 'Western', division: 'Central' },
  { name: 'Detroit Red Wings', slug: 'detroit-red-wings', conf: 'Eastern', division: 'Atlantic' },
  { name: 'Edmonton Oilers', slug: 'edmonton-oilers', conf: 'Western', division: 'Pacific' },
  { name: 'Florida Panthers', slug: 'florida-panthers', conf: 'Eastern', division: 'Atlantic' },
  { name: 'Los Angeles Kings', slug: 'los-angeles-kings', conf: 'Western', division: 'Pacific' },
  { name: 'Minnesota Wild', slug: 'minnesota-wild', conf: 'Western', division: 'Central' },
  { name: 'Montreal Canadiens', slug: 'montreal-canadiens', conf: 'Eastern', division: 'Atlantic' },
  { name: 'Nashville Predators', slug: 'nashville-predators', conf: 'Western', division: 'Central' },
  { name: 'New Jersey Devils', slug: 'new-jersey-devils', conf: 'Eastern', division: 'Metropolitan' },
  { name: 'New York Islanders', slug: 'new-york-islanders', conf: 'Eastern', division: 'Metropolitan' },
  { name: 'New York Rangers', slug: 'new-york-rangers', conf: 'Eastern', division: 'Metropolitan' },
  { name: 'Ottawa Senators', slug: 'ottawa-senators', conf: 'Eastern', division: 'Atlantic' },
  { name: 'Philadelphia Flyers', slug: 'philadelphia-flyers', conf: 'Eastern', division: 'Metropolitan' },
  { name: 'Phoenix Coyotes', slug: 'arizona-coyotes', conf: 'Western', division: 'Pacific' },
  { name: 'Pittsburgh Penguins', slug: 'pittsburgh-penguins', conf: 'Eastern', division: 'Metropolitan' },
  { name: 'San Jose Sharks', slug: 'san-jose-sharks', conf: 'Western', division: 'Pacific' },
  { name: 'Seattle Kraken', slug: 'seattle-kraken', conf: 'Western', division: 'Pacific' },
  { name: 'St. Louis Blues', slug: 'st-louis-blues', conf: 'Western', division: 'Central' },
  { name: 'Tampa Bay Lightning', slug: 'tampa-bay-lightning', conf: 'Eastern', division: 'Atlantic' },
  { name: 'Toronto Maple Leafs', slug: 'toronto-maple-leafs', conf: 'Eastern', division: 'Atlantic' },
  { name: 'Utah Hockey Club', slug: 'utah-hockey-club', conf: 'Western', division: 'Central' },
  { name: 'Vancouver Canucks', slug: 'vancouver-canucks', conf: 'Western', division: 'Pacific' },
  { name: 'Vegas Golden Knights', slug: 'vegas-golden-knights', conf: 'Western', division: 'Pacific' },
  { name: 'Washington Capitals', slug: 'washington-capitals', conf: 'Eastern', division: 'Metropolitan' },
  { name: 'Winnipeg Jets', slug: 'winnipeg-jets', conf: 'Western', division: 'Central' },
];

const ARIZONA_TEAM = { name: 'Arizona Coyotes', slug: 'arizona-coyotes', conf: 'Western', division: 'Pacific' };

export default async function NHLHubPage() {
  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'NHL' },
  ];

  return (
    <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem 4rem' }}>
      <Breadcrumb items={breadcrumbItems} />

      {/* Hero */}
      <section style={{ marginBottom: '3rem', textAlign: 'center', padding: '3rem 1rem', background: 'linear-gradient(135deg, #041E42 0%, #0a2d5c 100%)', borderRadius: '12px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.05, backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.15em', color: '#C8102E', marginBottom: '0.75rem', textTransform: 'uppercase' }}>Professional Hockey Authority</div>
          <h1 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 'clamp(2.5rem, 6vw, 4rem)', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>NHL HUB</h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1.0625rem', maxWidth: '600px', margin: '0 auto 1.5rem', lineHeight: 1.7 }}>
            Your central destination for all 32 NHL teams, standings, schedules, player stats, and arena guides.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/directory/nhl" style={{ padding: '0.625rem 1.25rem', background: '#C8102E', color: '#fff', borderRadius: '6px', fontWeight: 700, fontSize: '0.875rem', textDecoration: 'none' }}>NHL Teams Directory</Link>
            <Link href="/directory/games" style={{ padding: '0.625rem 1.25rem', background: 'rgba(255,255,255,0.1)', color: '#fff', borderRadius: '6px', fontWeight: 700, fontSize: '0.875rem', textDecoration: 'none' }}>NHL Schedules</Link>
          </div>
        </div>
      </section>

      {/* About NHL */}
      <section style={{ marginBottom: '3rem', background: 'var(--s2)', padding: '2rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.75rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>ABOUT THE NHL</h2>
        <p style={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.8, marginBottom: '1rem' }}>
          The <strong style={{ color: '#fff' }}>National Hockey League (NHL)</strong> is the premier professional ice hockey league in North America, featuring 32 teams across the United States and Canada. Founded in 1917, the NHL has grown into one of the world's most prestigious sports leagues, showcasing elite talent from around the globe.
        </p>
        <p style={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.8, marginBottom: '1rem' }}>
          From the <Link href="/hockey/united-states" style={{ color: '#C8102E' }}>United States</Link> to <Link href="/hockey/canada" style={{ color: '#C8102E' }}>Canada</Link>, NHL teams represent some of the most passionate hockey markets in the world. The league culminates each June with the <strong style={{ color: '#fff' }}>Stanley Cup Finals</strong>, one of sports' most storied championships.
        </p>
        <p style={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.8 }}>
          Whether you're tracking your favorite team's standings, finding arena information, or exploring player statistics, RinkStop's NHL Hub connects you to everything professional hockey has to offer.
        </p>
      </section>

      {/* Eastern Conference */}
      <section style={{ marginBottom: '3rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.75rem', color: '#fff', letterSpacing: '0.04em', margin: 0 }}>EASTERN CONFERENCE</h2>
          <div style={{ flex: 1, height: '2px', background: 'linear-gradient(90deg, #C8102E, transparent)' }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {/* Atlantic Division */}
          <div style={{ background: 'var(--s2)', borderRadius: '8px', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.06)' }}>
            <h3 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.125rem', color: '#C8102E', letterSpacing: '0.04em', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>ATLANTIC DIVISION</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {['boston-bruins','buffalo-sabres','detroit-red-wings','florida-panthers','montreal-canadiens','ottawa-senators','toronto-maple-leafs','tampa-bay-lightning'].map(slug => {
                const team = NHL_TEAMS.find(t => t.slug === slug);
                return team ? (
                  <Link key={slug} href={`/teams/nhl/${slug}`} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem', borderRadius: '4px', color: '#fff', textDecoration: 'none', transition: 'background 0.15s' }}
                    
                    >
                    <span style={{ fontSize: '1rem' }}>🏒</span>
                    <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{team.name}</span>
                  </Link>
                ) : null;
              })}
            </div>
          </div>

          {/* Metropolitan Division */}
          <div style={{ background: 'var(--s2)', borderRadius: '8px', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.06)' }}>
            <h3 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.125rem', color: '#C8102E', letterSpacing: '0.04em', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>METROPOLITAN DIVISION</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {['carolina-hurricanes','columbus-blue-jackets','new-jersey-devils','new-york-islanders','new-york-rangers','philadelphia-flyers','pittsburgh-penguins','washington-capitals'].map(slug => {
                const team = NHL_TEAMS.find(t => t.slug === slug);
                return team ? (
                  <Link key={slug} href={`/teams/nhl/${slug}`} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem', borderRadius: '4px', color: '#fff', textDecoration: 'none', transition: 'background 0.15s' }}
                    
                    >
                    <span style={{ fontSize: '1rem' }}>🏒</span>
                    <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{team.name}</span>
                  </Link>
                ) : null;
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Western Conference */}
      <section style={{ marginBottom: '3rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.75rem', color: '#fff', letterSpacing: '0.04em', margin: 0 }}>WESTERN CONFERENCE</h2>
          <div style={{ flex: 1, height: '2px', background: 'linear-gradient(90deg, #041E42, transparent)' }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {/* Central Division */}
          <div style={{ background: 'var(--s2)', borderRadius: '8px', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.06)' }}>
            <h3 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.125rem', color: '#041E42', letterSpacing: '0.04em', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>CENTRAL DIVISION</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {['chicago-blackhawks','colorado-avalanche','dallas-stars','minnesota-wild','nashville-predators','st-louis-blues','utah-hockey-club','winnipeg-jets'].map(slug => {
                const team = slug === 'utah-hockey-club' ? ARIZONA_TEAM : NHL_TEAMS.find(t => t.slug === slug);
                return team ? (
                  <Link key={slug} href={`/teams/nhl/${slug}`} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem', borderRadius: '4px', color: '#fff', textDecoration: 'none', transition: 'background 0.15s' }}
                    
                    >
                    <span style={{ fontSize: '1rem' }}>🏒</span>
                    <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{team.name}</span>
                  </Link>
                ) : null;
              })}
            </div>
          </div>

          {/* Pacific Division */}
          <div style={{ background: 'var(--s2)', borderRadius: '8px', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.06)' }}>
            <h3 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.125rem', color: '#041E42', letterSpacing: '0.04em', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>PACIFIC DIVISION</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {['calgary-flames','edmonton-oilers','los-angeles-kings','san-jose-sharks','seattle-kraken','vegas-golden-knights','vancouver-canucks'].map(slug => {
                const team = NHL_TEAMS.find(t => t.slug === slug);
                return team ? (
                  <Link key={slug} href={`/teams/nhl/${slug}`} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem', borderRadius: '4px', color: '#fff', textDecoration: 'none', transition: 'background 0.15s' }}
                    
                    >
                    <span style={{ fontSize: '1rem' }}>🏒</span>
                    <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{team.name}</span>
                  </Link>
                ) : null;
              })}
              <Link href="/teams/nhl/arizona-coyotes" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem', borderRadius: '4px', color: '#fff', textDecoration: 'none', transition: 'background 0.15s' }}
                
                >
                <span style={{ fontSize: '1rem' }}>🏒</span>
                <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>Arizona Coyotes</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* NHL Quick Links */}
      <section style={{ marginBottom: '3rem', background: 'var(--s2)', padding: '2rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.75rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1.25rem' }}>EXPLORE NHL</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
          {[
            { href: '/directory/nhl', icon: '🏒', label: 'NHL Teams', desc: 'All 32 team directories' },
            { href: '/directory/games', icon: '📅', label: 'NHL Schedules', desc: 'Upcoming games & results' },
            { href: '/directory/players', icon: '⭐', label: 'Player Stats', desc: 'Career statistics & info' },
            { href: '/directory/leagues', icon: '🏆', label: 'NHL & Related Leagues', desc: 'AHL, international feeds' },
            { href: '/learn', icon: '📚', label: 'Learn Hockey', desc: 'Rules, positions, skating' },
            { href: '/hockey/united-states', icon: '🌍', label: 'US Hockey', desc: 'Hockey across America' },
          ].map(item => (
            <Link key={item.href} href={item.href} style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', textDecoration: 'none', transition: 'background 0.15s' }}
              
              >
              <span style={{ fontSize: '1.5rem' }}>{item.icon}</span>
              <div>
                <div style={{ fontWeight: 700, color: '#fff', marginBottom: '0.25rem' }}>{item.label}</div>
                <div style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.5)' }}>{item.desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Schema markup */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          "name": "NHL Hub | RinkStop",
          "description": "Complete NHL coverage: all 32 teams, standings, schedules, player stats, arena guides, and hockey news.",
          "url": "https://rinkstop.com/nhl",
          "mainEntity": {
            "@type": "Organization",
            "name": "National Hockey League",
            "alternateName": "NHL",
            "url": "https://www.nhl.com",
            "sameAs": [
              "https://twitter.com/NHL",
              "https://www.instagram.com/nhl/",
              "https://www.youtube.com/user/NHL"
            ]
          },
          "breadcrumb": {
            "@type": "BreadcrumbList",
            "itemListElement": [
              { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://rinkstop.com" },
              { "@type": "ListItem", "position": 2, "name": "NHL", "item": "https://rinkstop.com/nhl" }
            ]
          }
        })
      }} />
    </main>
  );
}