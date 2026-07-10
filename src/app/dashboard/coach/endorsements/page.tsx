// src/app/dashboard/coach/endorsements/page.tsx
// Coach views endorsements they've issued.

import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { redirect } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export const dynamic = 'force-dynamic';

export default async function CoachEndorsementsPage() {
  const session = await auth();
  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);
  if (!session.userId) redirect('/login?redirect_url=/dashboard/coach/endorsements');

  const { data: coach } = await supabaseAdmin
    .from('coach_profiles')
    .select('id')
    .eq('profile_id', userId)
    .maybeSingle();

  if (!coach) {
    return (
      <main className="min-h-screen bg-[#041E42] text-white">
        <div className="max-w-3xl mx-auto px-5 py-10">
          <h1 className="font-sport text-2xl mb-4">MY ENDORSEMENTS</h1>
          <p className="text-white/70">
            Create your coach profile first.{' '}
            <a href="/dashboard/coach/profile" className="text-[#FFB81C] underline">
              Coach profile
            </a>
            .
          </p>
        </div>
      </main>
    );
  }

  const { data: rows } = await supabaseAdmin
    .from('coach_endorsements')
    .select(`
      id, endorsement_type, text, visibility, status, created_at,
      player:players(id, first_name, last_name, slug)
    `)
    .eq('coach_id', coach.id)
    .order('created_at', { ascending: false })
    .limit(200);

  function pickOne<T>(v: T | T[] | null | undefined): T | null {
    if (v == null) return null;
    if (Array.isArray(v)) return v[0] ?? null;
    return v;
  }

  const TYPE_LABELS: Record<string, string> = {
    skills: 'Skills',
    character: 'Character',
    leadership: 'Leadership',
    eligible_for_next_level: 'Eligible for next level',
    rec_ready: 'Recruitment ready',
    other: 'Other',
  };

  return (
    <main className="min-h-screen bg-[#041E42] text-white">
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '2rem 1.25rem 4rem' }}>
        <nav style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.75rem' }}>
          <Link href="/dashboard" style={{ color: 'rgba(255,255,255,0.5)' }}>Dashboard</Link>
          <span style={{ margin: '0 0.4rem' }}>›</span>
          <Link href="/dashboard/coach" style={{ color: 'rgba(255,255,255,0.5)' }}>Coach</Link>
          <span style={{ margin: '0 0.4rem' }}>›</span>
          <span style={{ color: 'rgba(255,255,255,0.4)' }}>My endorsements</span>
        </nav>

        <h1
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
            letterSpacing: '0.04em',
            marginBottom: '0.5rem',
          }}
        >
          MY ENDORSEMENTS
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9375rem', marginBottom: '1.5rem' }}>
          Endorsements you&apos;ve issued about players. To endorse a new player, visit their player profile page.
        </p>

        {(!rows || rows.length === 0) ? (
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem' }}>
            No endorsements yet.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {rows.map((row) => {
              const playerObj = pickOne(row.player);
              const playerName = playerObj ? `${playerObj.first_name ?? ''} ${playerObj.last_name ?? ''}`.trim() || 'Player' : 'Player';
              const playerHref = playerObj?.slug ? `/directory/players/${playerObj.slug}` : null;
              const typeLabel = TYPE_LABELS[row.endorsement_type] ?? row.endorsement_type;
              return (
                <div
                  key={row.id}
                  style={{
                    padding: '0.875rem 1rem',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 8,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4, flexWrap: 'wrap', gap: 8 }}>
                    <p style={{ fontWeight: 600, color: '#fff', margin: 0 }}>
                      {playerHref ? (
                        <Link href={playerHref} style={{ color: '#fff', textDecoration: 'none' }}>
                          {playerName}
                        </Link>
                      ) : (
                        playerName
                      )}
                    </p>
                    <span style={{
                      fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                      letterSpacing: '0.06em', padding: '2px 8px', borderRadius: 4,
                      background: row.status === 'active' ? 'rgba(0,150,80,0.18)' : 'rgba(255,255,255,0.08)',
                      color: row.status === 'active' ? '#009650' : 'rgba(255,255,255,0.5)',
                    }}>
                      {typeLabel} · {row.status}
                    </span>
                  </div>
                  <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.875rem', lineHeight: 1.55, margin: '0.25rem 0 0 0' }}>
                    {row.text}
                  </p>
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.6875rem', marginTop: '0.5rem' }}>
                    {new Date(row.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })}
                    {row.visibility === 'private' && ' · private'}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}