import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
export async function generateMetadata(): Promise<Metadata> {
  return { title: 'Hockey in South Korea | RinkStop', description: 'South Korea hockey: find ice rinks, teams, and leagues. South Korean hockey in the KHL and Asia League.', alternates: { canonical: 'https://rinkstop.com/directory/south-korea' } };
}
export const dynamic = 'force-dynamic';
export default async function SouthKoreaPage() {
  const [{ data: rinks }, { data: teams }, { count: rinkCount }] = await Promise.all([
    supabase.from('rinks').select('id, slug, name, city, address, phone, website_url').eq('country', 'South Korea').eq('is_active', true).order('name').limit(50),
    supabase.from('teams').select('id, name, slug, logo_url').eq('country', 'South Korea').eq('is_active', true).order('name').limit(20),
    supabase.from('rinks').select('*', { count: 'exact', head: true }).eq('country', 'South Korea').eq('is_active', true),
  ]);
  const bg = '#0a0a0a', card = '#0f0f0f', border = '#1e1e1e', red = '#C8102E', textMain = '#fff', textMuted = '#888', textDim = '#555';
  return (
    <><div style={{ background: bg, color: textMain, minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ borderBottom: `1px solid ${border}`, background: '#0f0f0f' }}><div style={{ maxWidth: 1280, margin: '0 auto', padding: '12px 24px' }}><nav style={{ fontSize: 13, color: textDim }}><a href="/" style={{ color: textDim, textDecoration: 'none' }}>Home</a><span style={{ margin: '0 6px' }}>›</span><a href="/directory" style={{ color: textDim, textDecoration: 'none' }}>Directory</a><span style={{ margin: '0 6px' }}>›</span><span style={{ color: textMuted }}>South Korea</span></nav></div></div>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '80px 24px', textAlign: 'center' }}><h1 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: 'clamp(2.5rem, 8vw, 4rem)', color: textMain, letterSpacing: '0.04em', lineHeight: 1, marginBottom: 16 }}>HOCKEY IN SOUTH KOREA</h1><p style={{ color: textMuted, fontSize: 16, maxWidth: 520, margin: '0 auto' }}>{rinkCount ?? 0} ice rinks. Rapidly rising Asian hockey nation.</p></div>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px 80px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 48 }}>
          <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, padding: '20px', textAlign: 'center' }}><div style={{ fontSize: 32, fontWeight: 800, color: red }}>{rinkCount ?? 0}</div><div style={{ fontSize: 13, color: textMuted }}>Ice Rinks</div></div>
          <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, padding: '20px', textAlign: 'center' }}><div style={{ fontSize: 32, fontWeight: 800, color: red }}>{teams?.length ?? 0}</div><div style={{ fontSize: 13, color: textMuted }}>Teams</div></div>
          <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, padding: '20px', textAlign: 'center' }}><div style={{ fontSize: 32, fontWeight: 800, color: red }}>KHL</div><div style={{ fontSize: 13, color: textMuted }}>Top League</div></div>
        </div>
        {teams && teams.length > 0 && (<div style={{ marginBottom: 48 }}><h2 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: 28, letterSpacing: '0.04em', borderLeft: `4px solid ${red}`, paddingLeft: 16, marginBottom: 24, color: textMain }}>TEAMS IN SOUTH KOREA</h2><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>{teams.map(team => (<Link key={team.id} href={`/directory/teams/${team.slug || team.id}`} style={{ background: card, border: `1px solid ${border}`, borderRadius: 8, padding: '14px 16px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 12 }}><span style={{ fontSize: 14, fontWeight: 600, color: textMain }}>{team.name}</span></Link>))}</div></div>)}
        {rinks && rinks.length > 0 && (<div style={{ marginBottom: 48 }}><h2 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: 28, letterSpacing: '0.04em', borderLeft: `4px solid ${red}`, paddingLeft: 16, marginBottom: 24, color: textMain }}>ICE RINKS IN SOUTH KOREA</h2><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>{rinks.map(rink => (<div key={rink.id} style={{ background: card, border: `1px solid ${border}`, borderRadius: 10, padding: 20 }}><h3 style={{ fontSize: 15, fontWeight: 700, color: textMain, marginBottom: 4 }}>{rink.name}</h3><div style={{ fontSize: 13, color: textMuted, marginBottom: 8 }}>{rink.city ?? ''}</div>{rink.address && <div style={{ fontSize: 12, color: textDim, marginBottom: 4 }}>{rink.address}</div>}{rink.phone && <div style={{ fontSize: 12, color: textDim, marginBottom: 4 }}>📞 {rink.phone}</div>}{rink.website_url && <a href={rink.website_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: red, textDecoration: 'none' }}>🌐 Website →</a>}</div>))}</div></div>)}
        <div style={{ textAlign: 'center', marginTop: 48 }}><Link href="/directory" style={{ color: red, fontSize: 14 }}>← Browse all countries</Link></div>
      </div></div></>
  );
}
