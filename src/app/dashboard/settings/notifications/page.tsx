import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase';
import NotificationSettingsForm from './NotificationSettingsForm';

export const dynamic = 'force-dynamic';

export default async function NotificationSettingsPage() {
  const { userId } = await auth();
  if (!userId) redirect('/login');

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('user_id, display_name, email, email_team_news, email_team_results, email_team_schedule, email_connection_requests, email_dm_notifications, email_payment_notifications, email_marketing')
    .eq('user_id', userId)
    .maybeSingle();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div
        style={{
          background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: 12,
          padding: '1.5rem 1.75rem',
        }}
      >
        <h1 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.75rem', color: '#fff', margin: 0, letterSpacing: '0.04em' }}>
          Email &amp; Notification Settings
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', margin: '0.5rem 0 0 0', lineHeight: 1.6 }}>
          Choose which emails RinkStop sends you. The in-app inbox at <a href="/dashboard" style={{ color: '#FFB81C' }}>your dashboard</a> is the source of truth —
          these settings only control whether we also email you a copy.
        </p>
      </div>

      <NotificationSettingsForm
        initial={{
          email: profile?.email ?? null,
          displayName: profile?.display_name ?? null,
          email_team_news: profile?.email_team_news !== false,
          email_team_results: profile?.email_team_results !== false,
          email_team_schedule: profile?.email_team_schedule !== false,
          email_connection_requests: profile?.email_connection_requests !== false,
          email_dm_notifications: profile?.email_dm_notifications !== false,
          email_payment_notifications: profile?.email_payment_notifications !== false,
          email_marketing: profile?.email_marketing === true,
        }}
      />
    </div>
  );
}
