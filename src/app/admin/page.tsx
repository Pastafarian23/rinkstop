import { supabaseAdmin } from '@/lib/supabase';
import Link from 'next/link';
import styles from './admin.module.css';
import ActivityFeed, { ActivityEvent } from './ActivityFeed';

interface LeagueCoverage {
  league: string;
  leagueId: string;
  total: number;
  withScores: number;
  scheduled: number;
  completed: number;
  pct: number;
  orphans: number;
  phantomCount: number;
}

interface CoverageResponse {
  coverage: LeagueCoverage[];
  summary: {
    totalFixtures: number;
    totalWithScores: number;
    totalPhantoms: number;
    totalOrphans: number;
    pct: number;
  };
}

export const dynamic = 'force-dynamic';

async function getCoverage(): Promise<CoverageResponse> {
  const { data: leagues } = await supabaseAdmin
    .from('leagues')
    .select('id, name, slug')
    .order('name');

  if (!leagues) {
    return { coverage: [], summary: { totalFixtures: 0, totalWithScores: 0, totalPhantoms: 0, totalOrphans: 0, pct: 0 } };
  }

  const coverage: LeagueCoverage[] = await Promise.all(
    leagues.map(async (league) => {
      let allFixtures: any[] = [];
      let page = 0;
      while (true) {
        const { data } = await supabaseAdmin
          .from('fixtures')
          .select('id, status, home_score, away_score, scheduled_at')
          .eq('league_id', league.id)
          .range(page * 1000, (page + 1) * 1000 - 1);
        if (!data || data.length === 0) break;
        allFixtures = allFixtures.concat(data);
        if (data.length < 1000) break;
        page++;
      }

      const total = allFixtures.length;
      const completed = allFixtures.filter((f) => f.status === 'completed' || f.status === 'final').length;
      const scheduled = allFixtures.filter((f) => f.status === 'scheduled').length;
      const withScores = allFixtures.filter(
        (f) => f.home_score !== null && f.away_score !== null,
      ).length;

      const now = new Date();
      const phantomCount = allFixtures.filter((f) => {
        if (f.status !== 'scheduled') return false;
        if (!f.scheduled_at) return false;
        if (new Date(f.scheduled_at) > now) return false;
        return f.home_score === null || f.away_score === null;
      }).length;

      const orphans = allFixtures.filter((f) => {
        if (f.status !== 'scheduled' || !f.scheduled_at) return false;
        const days = (now.getTime() - new Date(f.scheduled_at).getTime()) / (1000 * 60 * 60 * 24);
        return days > 30 && f.home_score === 0 && f.away_score === 0;
      }).length;

      const pct = total > 0 ? Math.round((withScores / total) * 100) : 0;

      return { league: league.name, leagueId: league.id, total, withScores, scheduled, completed, pct, orphans, phantomCount };
    }),
  );

  coverage.sort((a, b) => a.league.localeCompare(b.league));

  const totalFixtures = coverage.reduce((sum, c) => sum + c.total, 0);
  const totalWithScores = coverage.reduce((sum, c) => sum + c.withScores, 0);
  const totalPhantoms = coverage.reduce((sum, c) => sum + c.phantomCount, 0);
  const totalOrphans = coverage.reduce((sum, c) => sum + c.orphans, 0);

  return {
    coverage,
    summary: {
      totalFixtures,
      totalWithScores,
      totalPhantoms,
      totalOrphans,
      pct: totalFixtures > 0 ? Math.round((totalWithScores / totalFixtures) * 100) : 0,
    },
  };
}

function coverageClass(pct: number): string {
  if (pct >= 90) return styles.coverageFillGood;
  if (pct >= 70) return styles.coverageFillMid;
  return styles.coverageFillBad;
}

async function getActivityFeed(): Promise<ActivityEvent[]> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const events: ActivityEvent[] = [];

  // Run all 6 queries in parallel
  const [whRes, twRes, newsRes, schedRes, resRes, invRes] = await Promise.allSettled([
    supabaseAdmin
      .from('stripe_webhook_events')
      .select('id, event_type, status, created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(10),
    supabaseAdmin
      .from('team_workspaces')
      .select('id, name, slug, created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(10),
    supabaseAdmin
      .from('team_news')
      .select('id, team_id, headline, published_at')
      .eq('is_published', true)
      .not('published_at', 'is', null)
      .gte('published_at', since)
      .order('published_at', { ascending: false })
      .limit(10),
    supabaseAdmin
      .from('team_events')
      .select('id, team_id, title, event_kind, starts_at, created_at')
      .in('status', ['scheduled', 'completed'])
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(10),
    supabaseAdmin
      .from('team_results')
      .select('id, team_id, opponent_name, result_date, score_for, score_against')
      .gte('result_date', since)
      .order('result_date', { ascending: false })
      .limit(10),
    supabaseAdmin
      .from('team_invites')
      .select('id, team_id, role, created_at, accepted_by, label')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  // Webhooks
  if (whRes.status === 'fulfilled') {
    for (const w of whRes.value.data || []) {
      const isFail = w.status === 'failed';
      events.push({
        id: w.id,
        occurred_at: w.created_at,
        type: isFail ? 'webhook_failed' : 'webhook_received',
        icon: isFail ? '⚠️' : '💳',
        title: `${w.event_type} — ${w.status}`,
        detail: `Stripe event processed (${(w.status || 'unknown').toUpperCase()})`,
        href: '/admin/webhooks',
        tone: isFail ? 'danger' : 'info',
      });
    }
  }

  // Team workspaces created
  if (twRes.status === 'fulfilled') {
    for (const t of twRes.value.data || []) {
      events.push({
        id: t.id,
        occurred_at: t.created_at,
        type: 'team_created',
        icon: '🏒',
        title: `New team: ${t.name}`,
        detail: 'User-created workspace added to directory',
        href: `/directory/teams/${t.slug}`,
        tone: 'success',
      });
    }
  }

  // News published
  if (newsRes.status === 'fulfilled') {
    for (const n of newsRes.value.data || []) {
      events.push({
        id: n.id,
        occurred_at: n.published_at || '',
        type: 'news_published',
        icon: '📰',
        title: n.headline,
        detail: 'News article published to public profile',
        tone: 'info',
      });
    }
  }

  // Schedule events
  if (schedRes.status === 'fulfilled') {
    for (const s of schedRes.value.data || []) {
      events.push({
        id: s.id,
        occurred_at: s.created_at,
        type: 'schedule_published',
        icon: '📅',
        title: s.title,
        detail: `Schedule event: ${s.event_kind || 'general'}${s.starts_at ? ` on ${new Date(s.starts_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}`,
        tone: 'info',
      });
    }
  }

  // Results
  if (resRes.status === 'fulfilled') {
    for (const r of resRes.value.data || []) {
      events.push({
        id: r.id,
        occurred_at: r.result_date,
        type: 'result_added',
        icon: '🏆',
        title: `Result: ${r.score_for ?? '?'}-${r.score_against ?? '?'} vs ${r.opponent_name || 'opponent'}`,
        detail: 'Game result posted',
        tone: 'success',
      });
    }
  }

  // Invites
  if (invRes.status === 'fulfilled') {
    for (const i of invRes.value.data || []) {
      const accepted = (i.accepted_by || []).length;
      if (accepted > 0) {
        events.push({
          id: `${i.id}-redeem`,
          occurred_at: i.created_at,
          type: 'invite_redeemed',
          icon: '🎟️',
          title: `Invite redeemed (${i.role})`,
          detail: `${i.label || 'Invite'} — ${accepted} accepted`,
          tone: 'success',
        });
      } else {
        events.push({
          id: `${i.id}-create`,
          occurred_at: i.created_at,
          type: 'invite_created',
          icon: '✉️',
          title: `Invite created (${i.role})`,
          detail: i.label || 'Team invite',
          tone: 'muted',
        });
      }
    }
  }

  // Sort by occurred_at desc, cap at 20
  events.sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime());
  return events.slice(0, 20);
}

export default async function AdminOverview() {
  const [data, activity] = await Promise.all([getCoverage(), getActivityFeed()]);
  const { summary, coverage } = data;

  const stats = [
    {
      label: 'Total Fixtures',
      value: summary.totalFixtures.toLocaleString(),
      tone: styles.statValue,
    },
    {
      label: 'With Scores',
      value: `${summary.totalWithScores.toLocaleString()} (${summary.pct}%)`,
      tone: summary.pct >= 90 ? styles.statValueGood : summary.pct >= 70 ? styles.statValueWarn : styles.statValueBad,
    },
    {
      label: 'Phantoms',
      value: summary.totalPhantoms.toLocaleString(),
      tone: summary.totalPhantoms > 0 ? styles.statValueWarn : styles.statValueMuted,
    },
    {
      label: 'Orphans',
      value: summary.totalOrphans.toLocaleString(),
      tone: summary.totalOrphans > 0 ? styles.statValueBad : styles.statValueMuted,
    },
  ];

  const quickLinks = [
    { href: '/admin/teams', icon: '🏒', label: 'Teams', hint: 'Manage teams across leagues' },
    { href: '/admin/rinks', icon: '🏟️', label: 'Rinks', hint: 'Rinks & facilities' },
    { href: '/admin/users', icon: '👥', label: 'Users', hint: 'Members, roles, super admin' },
    { href: '/admin/games', icon: '🎮', label: 'Games', hint: 'Live & upcoming games' },
    { href: '/admin/blog', icon: '✍️', label: 'Blog', hint: 'Posts & drafts' },
    { href: '/admin/revenue', icon: '💰', label: 'Revenue', hint: 'Subscriptions & affiliates' },
    { href: '/admin/cron-health', icon: '⏰', label: 'Cron Health', hint: 'Background jobs status' },
    { href: '/admin/data-quality', icon: '✅', label: 'Data Quality', hint: 'Phantoms, orphans, gaps' },
  ];

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>
          <span aria-hidden="true">📊</span> Admin Overview
        </h1>
        <p className={styles.pageSubtitle}>RinkStop system health at a glance</p>
      </div>

      {/* Summary stats */}
      <div className={styles.statGrid}>
        {stats.map((stat) => (
          <div key={stat.label} className={styles.statCard}>
            <div className={styles.statLabel}>{stat.label}</div>
            <div className={`${styles.statValue} ${stat.tone}`}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <ActivityFeed events={activity} />
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Quick Actions</h2>
        </div>
        <div style={{ padding: '1rem 1.25rem' }}>
          <div className={styles.quickGrid}>
            {quickLinks.map((q) => (
              <Link key={q.href} href={q.href} className={styles.quickTile}>
                <div className={styles.quickTileIcon} aria-hidden="true">
                  {q.icon}
                </div>
                <div className={styles.quickTileText}>
                  <span className={styles.quickTileLabel}>{q.label}</span>
                  <span className={styles.quickTileHint}>{q.hint}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* League coverage */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>League Coverage</h2>
          <Link href="/admin/data-quality" className={styles.cardAction}>
            View details →
          </Link>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>League</th>
                <th style={{ textAlign: 'right' }}>Total</th>
                <th style={{ textAlign: 'right' }}>With Scores</th>
                <th>Coverage</th>
                <th style={{ textAlign: 'right' }}>Scheduled</th>
                <th style={{ textAlign: 'right' }}>Phantoms</th>
                <th style={{ textAlign: 'right' }}>Orphans</th>
              </tr>
            </thead>
            <tbody>
              {coverage.map((c) => (
                <tr key={c.leagueId}>
                  <td className={styles.leagueCell}>{c.league}</td>
                  <td className={styles.numCell}>{c.total.toLocaleString()}</td>
                  <td className={`${styles.numCell} ${c.withScores > 0 ? styles.statValueGood : styles.statValueMuted}`}>
                    {c.withScores.toLocaleString()}
                  </td>
                  <td>
                    <div className={styles.coverageBar}>
                      <div className={styles.coverageTrack}>
                        <div
                          className={`${styles.coverageFill} ${coverageClass(c.pct)}`}
                          style={{ width: `${c.pct}%` }}
                        />
                      </div>
                      <span className={styles.coveragePct}>{c.pct}%</span>
                    </div>
                  </td>
                  <td className={`${styles.numCell} ${c.scheduled > 0 ? '' : styles.statValueMuted}`}>
                    {c.scheduled.toLocaleString()}
                  </td>
                  <td className={`${styles.numCell} ${c.phantomCount > 0 ? styles.statValueWarn : styles.statValueMuted}`}>
                    {c.phantomCount.toLocaleString()}
                  </td>
                  <td className={`${styles.numCell} ${c.orphans > 0 ? styles.statValueBad : styles.statValueMuted}`}>
                    {c.orphans.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className={styles.pageFooter}>
        Last updated: {new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
      </div>
    </div>
  );
}
