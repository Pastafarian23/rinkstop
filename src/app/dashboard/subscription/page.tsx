import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import { TierBadge, FoundingMemberBadge } from '@/components/TierBadge';
import ManageSubscriptionClient from './ManageSubscriptionClient';
import { formatTierPricePerYear } from '@/lib/pricing';

export const dynamic = 'force-dynamic';

const TIER_LABELS: Record<string, string> = {
  free: 'Free',
  roster: 'Roster Starter',
  roster_plus: 'Roster Pro',
  pro: 'Roster Premium',
  business_starter: 'Business Starter',
  business_pro: 'Business Pro',
  business_premium: 'Business Premium',
  enterprise: 'Enterprise',
};

const TIER_PRICES: Record<string, string> = {
  roster: formatTierPricePerYear('roster'),
  roster_plus: formatTierPricePerYear('roster_plus'),
  pro: formatTierPricePerYear('pro'),
  business_starter: formatTierPricePerYear('business_starter'),
  business_pro: formatTierPricePerYear('business_pro'),
  business_premium: formatTierPricePerYear('business_premium'),
  enterprise: formatTierPricePerYear('enterprise'),
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active: { label: 'Active', color: '#14B8A6' },
  trialing: { label: 'Trialing', color: '#14B8A6' },
  past_due: { label: 'Past due', color: '#FFB81C' },
  unpaid: { label: 'Unpaid', color: '#C8102E' },
  canceled: { label: 'Canceled', color: 'rgba(255,255,255,0.5)' },
  incomplete: { label: 'Incomplete', color: '#FFB81C' },
  incomplete_expired: { label: 'Expired', color: 'rgba(255,255,255,0.5)' },
};

function formatDate(epoch: number | null | undefined): string {
  if (!epoch) return '—';
  return new Date(epoch * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatMoney(amount: number | null, currency: string = 'usd'): string {
  if (amount == null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

export default async function SubscriptionPage() {
  const { userId } = await auth();
  if (!userId) redirect('/login');

  // Read profile fields directly for fast first paint
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('tier, subscription_status, tier_expires_at, is_founding_member, stripe_customer_id, stripe_subscription_id, created_at')
    .eq('user_id', userId)
    .maybeSingle();

  const tier = profile?.tier || 'free';
  const isFounding = profile?.is_founding_member || false;
  const subStatus = profile?.subscription_status;
  const expiresAt = profile?.tier_expires_at;
  const hasStripeCustomer = !!profile?.stripe_customer_id;
  const hasStripeSubscription = !!profile?.stripe_subscription_id;

  return (
    <div>
      <h1 style={{
        fontFamily: "'Bebas Neue', Impact, sans-serif",
        fontSize: '2rem', letterSpacing: '0.05em',
        color: '#fff', margin: '0 0 0.5rem',
      }}>
        SUBSCRIPTION
      </h1>
      <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.9rem', margin: '0 0 1.5rem' }}>
        Your current plan, billing, and payment details.
      </p>

      {/* Current Plan Card */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(4,30,66,0.4), rgba(0,0,0,0.4))',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12,
        padding: '1.5rem 1.75rem',
        marginBottom: '1rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 0.25rem' }}>
              Current Plan
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <h2 style={{
                fontFamily: "'Bebas Neue', Impact, sans-serif",
                fontSize: '2.25rem', color: '#fff', margin: 0, letterSpacing: '0.04em',
              }}>
                {TIER_LABELS[tier] || 'Free'}
              </h2>
              <TierBadge tier={tier as any} size="sm" />
              {isFounding && <FoundingMemberBadge size="sm" />}
            </div>
            {tier !== 'free' && (
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', margin: '0.25rem 0 0' }}>
                {TIER_PRICES[tier]}
              </p>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Link
              href="/pricing"
              style={{
                background: tier === 'free' ? '#C8102E' : 'rgba(255,255,255,0.08)',
                color: '#fff',
                padding: '0.7rem 1.1rem',
                borderRadius: 6,
                fontSize: '0.85rem',
                fontWeight: 700,
                textDecoration: 'none',
                letterSpacing: '0.02em',
                border: tier === 'free' ? 'none' : '1px solid rgba(255,255,255,0.15)',
              }}
            >
              {tier === 'free' ? 'UPGRADE →' : 'CHANGE PLAN →'}
            </Link>
          </div>
        </div>

        {/* Status row (paid users only) */}
        {tier !== 'free' && (
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '0.75rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.06)',
          }}>
            <Field
              label="Status"
              value={STATUS_LABELS[subStatus || '']?.label || subStatus || 'Unknown'}
              valueColor={STATUS_LABELS[subStatus || '']?.color}
            />
            <Field
              label="Renews / Expires"
              value={expiresAt ? new Date(expiresAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
            />
            <Field
              label="Member Since"
              value={profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
            />
          </div>
        )}

        {/* Founding perks (founders only) */}
        {isFounding && (
          <div style={{
            marginTop: '1.25rem', padding: '1rem 1.25rem',
            background: 'rgba(255,184,28,0.06)', border: '1px solid rgba(255,184,28,0.25)',
            borderRadius: 8,
          }}>
            <p style={{ color: '#FFB81C', fontWeight: 700, fontSize: '0.85rem', margin: '0 0 0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              ⭐ Founding Member perks
            </p>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', margin: 0, lineHeight: 1.5 }}>
              You helped us launch. Your badge is permanent and your founding status is locked in forever, even if you cancel your paid plan.
            </p>
          </div>
        )}
      </div>

      {/* Live billing details from Stripe (client fetches) */}
      <ManageSubscriptionClient
        hasStripeCustomer={hasStripeCustomer}
        hasStripeSubscription={hasStripeSubscription}
        initialTier={tier}
      />

      {/* Common questions */}
      <div style={{
        marginTop: '2rem', padding: '1.25rem 1.5rem',
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12,
      }}>
        <h3 style={{ color: '#fff', fontSize: '1rem', margin: '0 0 0.75rem', fontWeight: 700 }}>
          Common questions
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <QA
            q="How do I change or cancel my plan?"
            a="Email support@rinkstop.com. We respond within 24 hours. Your plan stays active through the end of your paid period. We don't bury a cancel button in your account — we ask you to talk to us first so we can understand what we could have done better."
          />
          <QA
            q="Can I get a refund?"
            a="Email support@rinkstop.com within 14 days of purchase and we'll refund you, no questions asked."
          />
          <QA
            q="Need to update your card or billing address?"
            a="Click 'Manage in Stripe' above — you can change payment methods, view invoices, and download PDFs."
          />
          <QA
            q="What about my Founding Member badge?"
            a="Permanent. Even if you cancel your paid plan, your founding status stays on your profile forever."
          />
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div>
      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 0.2rem' }}>
        {label}
      </p>
      <p style={{ color: valueColor || '#fff', fontSize: '0.95rem', fontWeight: 600, margin: 0 }}>
        {value}
      </p>
    </div>
  );
}

function QA({ q, a }: { q: string; a: string }) {
  return (
    <div>
      <p style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 600, margin: '0 0 0.15rem' }}>
        {q}
      </p>
      <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', margin: 0, lineHeight: 1.5 }}>
        {a}
      </p>
    </div>
  );
}
