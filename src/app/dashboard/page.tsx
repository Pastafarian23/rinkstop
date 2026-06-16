import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import { TierBadge } from '@/components/TierBadge';
import { FounderBadge } from '@/components/FounderBadge';
import UsernameBanner from '@/components/UsernameBanner';
import AccountTypeBadges from '@/components/AccountTypeBadges';
import AccountTypePicker from '@/components/AccountTypePicker';
import TypeSectionCard from '@/components/dashboard/TypeSectionCard';
import { loadDashboardTypeData } from '@/components/dashboard/dashboardTypeData';
import { isAccountType } from '@/components/dashboard/dashboardTypes';
import type { AccountType } from '@/components/dashboard/dashboardTypes';

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect('/login');

  // Hard safety net: any error inside the dashboard render must NOT 500 the user.
  // Instead, show a minimal fallback that tells them the dashboard hit a snag and
  // lets them back out. The real error is logged server-side (Vercel) for diagnosis.
  // This protects against e.g. a new migration dropping a column the page reads,
  // a transient Supabase hiccup, or a malformed Clerk session payload.
  try {
    return await renderDashboard(userId);
  } catch (err) {
    console.error('[dashboard] render failed:', err);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div
          style={{
            background: '#0f0f0f',
            border: '1px solid #1e1e1e',
            borderRadius: 12,
            padding: '1.75rem',
          }}
        >
          <h2
            style={{
              fontFamily: "'Bebas Neue', Impact, sans-serif",
              fontSize: '1.5rem',
              color: '#fff',
              letterSpacing: '0.04em',
              margin: '0 0 0.5rem',
            }}
          >
            Dashboard hit a snag
          </h2>
          <p style={{ color: '#aaa', fontSize: '0.9rem', margin: '0 0 1rem' }}>
            We couldn&rsquo;t load your dashboard just now. Your account and data
            are safe — try refreshing in a minute, or head back to the home page
            in the meantime.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Link
              href="/dashboard"
              style={{
                padding: '0.5rem 1rem',
                background: '#C8102E',
                color: '#fff',
                borderRadius: 6,
                textDecoration: 'none',
                fontSize: '0.85rem',
                fontWeight: 700,
              }}
            >
              Retry
            </Link>
            <Link
              href="/"
              style={{
                padding: '0.5rem 1rem',
                background: 'rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.8)',
                borderRadius: 6,
                textDecoration: 'none',
                fontSize: '0.85rem',
                fontWeight: 600,
              }}
            >
              Back to home
            </Link>
          </div>
        </div>
      </div>
    );
  }
}

async function renderDashboard(userId: string) {
  const user = await currentUser();
  const firstName = user?.firstName || '';
  const lastName = user?.lastName || '';
  const email = user?.emailAddresses?.[0]?.emailAddress || '';
  const avatarUrl = user?.imageUrl || '';

  // Profile completeness + tier
  let profile: any = null;
  try {
    const { data } = await supabaseAdmin
      .from('profiles')
      .select('bio, location, tier, is_founding_member, created_at, role, display_name, username')
      .eq('user_id', userId)
      .maybeSingle();
    profile = data;
  } catch (e) {
    console.error('[dashboard] profiles query failed:', e);
  }

  const isSuperAdmin = profile?.role === 'super_admin';
  const isFounder = isSuperAdmin;
  // For the OG founder, "Member since" should reflect when they actually started the project
  // (e.g. domain registration date), not when their Clerk account was created.
  const founderSince = 'February 2019';
  const memberSinceDate = isFounder
    ? founderSince
    : profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : null;

  // Account types (Phase 0.1 — multi-type).
  let accountTypeRows: Array<{ account_type: string; is_primary: boolean }> = [];
  try {
    const { data } = await supabaseAdmin
      .from('profile_account_types')
      .select('account_type, is_primary')
      .eq('user_id', userId);
    accountTypeRows = data || [];
  } catch (e) {
    console.error('[dashboard] profile_account_types query failed:', e);
  }

  const types: AccountType[] = (accountTypeRows || [])
    .map((r: { account_type: string }) => r.account_type)
    .filter(isAccountType);
  const primaryRow = (accountTypeRows || []).find((r: { is_primary: boolean }) => r.is_primary);
  const primary = (primaryRow?.account_type && isAccountType(primaryRow.account_type) ? primaryRow.account_type : null) as AccountType | null;

  // Per-type dashboard data. The query is wrapped so a missing table doesn't 500.
  const typeData = await loadDashboardTypeData(userId);

  const completeness: { field: string; done: boolean; href: string; hint: string }[] = [
    { field: 'Display name', done: !!(profile?.display_name || firstName), href: '/dashboard/profile', hint: 'Add your first and last name' },
    { field: 'Avatar', done: !!avatarUrl, href: '/dashboard/profile', hint: 'Upload a profile photo' },
    { field: 'Bio', done: !!profile?.bio, href: '/dashboard/profile', hint: 'Tell people who you are' },
    { field: 'Location', done: !!profile?.location, href: '/dashboard/profile', hint: 'Add your city so people nearby can find you' },
    { field: 'Account type', done: types.length > 0, href: '/dashboard/profile#account-types', hint: 'Tell us what you do in hockey' },
  ];
  const completenessPct = Math.round((completeness.filter(c => c.done).length / completeness.length) * 100);
  const firstMissing = completeness.find(c => !c.done);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {profile?.username ? null : (
        <UsernameBanner
          displayName={profile?.display_name || firstName || 'RinkStop Member'}
        />
      )}

      {/* Welcome card */}
      <div style={{
        background: '#0f0f0f',
        border: '1px solid #1e1e1e',
        borderRadius: 12,
        padding: '1.75rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Profile"
              style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '3px solid #C8102E' }}
            />
          ) : (
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: 'linear-gradient(135deg, #C8102E 0%, #8b0a1e 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '2rem',
              border: '3px solid #C8102E',
            }}>
              {firstName?.[0]?.toUpperCase() || '?'}
            </div>
          )}
          <div>
            <h2 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '1.75rem', color: '#fff', letterSpacing: '0.04em', margin: '0 0 0.25rem' }}>
              Welcome back, {firstName || 'RinkStop Member'}
            </h2>
            <p style={{ color: '#888', fontSize: '0.9rem', margin: 0 }}>{email}</p>
            <p style={{ color: '#555', fontSize: '0.8rem', margin: '0.5rem 0 0' }}>
              {memberSinceDate ? `Founder since ${memberSinceDate}` : 'Welcome to RinkStop'}
            </p>
            <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              {isFounder ? (
                <FounderBadge size="xs" foundingDate="February 7, 2019" />
              ) : (
                <>
                  <TierBadge tier={profile?.tier || 'free'} size="xs" />
                  {profile?.is_founding_member && (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '0.1rem 0.5rem', fontSize: 10, fontWeight: 700, letterSpacing: '0.05em',
                      textTransform: 'uppercase', borderRadius: 999,
                      background: 'rgba(255,184,28,0.12)', color: '#FFB81C',
                      border: '1px solid rgba(255,184,28,0.4)',
                    }}>⭐ Founding</span>
                  )}
                  {profile?.tier === 'free' ? (
                    <Link href="/pricing" style={{ fontSize: 11, color: '#FFB81C', textDecoration: 'none', fontWeight: 600 }}>
                      ✨ Upgrade →
                    </Link>
                  ) : (
                    <Link href="/dashboard/subscription" style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', textDecoration: 'none', fontWeight: 600 }}>
                      Manage subscription →
                    </Link>
                  )}
                </>
              )}
            </div>
            {types.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <AccountTypeBadges types={types} primary={primary} size="sm" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Profile completeness */}
      {completenessPct < 100 && firstMissing && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(255,184,28,0.08) 0%, rgba(20,184,166,0.04) 100%)',
          border: '1px solid rgba(255,184,28,0.2)',
          borderRadius: 12,
          padding: '1.25rem 1.5rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 240 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>Profile {completenessPct}% complete</span>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', margin: 0 }}>
                {firstMissing.hint}
              </p>
              <div style={{ marginTop: 10, height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ width: `${completenessPct}%`, height: '100%', background: 'linear-gradient(90deg, #FFB81C, #14B8A6)' }} />
              </div>
            </div>
            <Link
              href={firstMissing.href}
              style={{
                padding: '0.5rem 1rem', background: '#FFB81C', color: '#0a0a0a',
                borderRadius: 6, textDecoration: 'none', fontSize: '0.85rem', fontWeight: 700,
              }}
            >
              Complete profile →
            </Link>
          </div>
        </div>
      )}

      {/* Onboarding for users who haven't picked an account type yet */}
      {types.length === 0 && (
        <div
          id="account-types"
          style={{
            background: 'linear-gradient(135deg, rgba(20,184,166,0.06) 0%, rgba(96,165,250,0.04) 100%)',
            border: '1px solid rgba(20,184,166,0.25)',
            borderRadius: 12,
            padding: '1.75rem',
          }}
        >
          <h3
            style={{
              fontFamily: "'Bebas Neue', Impact, sans-serif",
              fontSize: '1.25rem',
              color: '#fff',
              letterSpacing: '0.05em',
              margin: '0 0 0.5rem',
            }}
          >
            WHAT DO YOU DO IN HOCKEY?
          </h3>
          <p
            style={{
              color: 'rgba(255,255,255,0.65)',
              fontSize: '0.9rem',
              margin: '0 0 1.25rem',
              maxWidth: 640,
            }}
          >
            Pick every role that fits you. We&rsquo;ll show you the right tools and shortcuts for each one.
          </p>
          <AccountTypePicker />
        </div>
      )}

      {/* Type-aware sections — primary first */}
      {types.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3
            style={{
              fontFamily: "'Bebas Neue', Impact, sans-serif",
              fontSize: '1.15rem',
              color: '#fff',
              letterSpacing: '0.05em',
              margin: '0.5rem 0 0',
            }}
          >
            YOUR HOCKEY ROLES
          </h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '1rem',
            }}
          >
            {types.map((t) => (
              <TypeSectionCard
                key={t}
                type={t}
                primary={primary}
                data={typeData}
                username={profile?.username ?? null}
              />
            ))}
          </div>
        </div>
      )}

      {/* Edit types shortcut — visible to everyone who has at least one type */}
      {types.length > 0 && (
        <div
          id="account-types"
          style={{
            background: '#0f0f0f',
            border: '1px solid #1e1e1e',
            borderRadius: 12,
            padding: '1.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: '1rem' }}>
            <h3
              style={{
                fontFamily: "'Bebas Neue', Impact, sans-serif",
                fontSize: '1.1rem',
                color: '#fff',
                letterSpacing: '0.05em',
                margin: 0,
              }}
            >
              MANAGE YOUR ROLES
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
              Multi-select is free. Add or remove roles anytime.
            </span>
          </div>
          <AccountTypePicker />
        </div>
      )}
    </div>
  );
}
