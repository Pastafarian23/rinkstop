'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';

interface ActivityItem {
  type: 'follow' | 'favorite';
  id: string;
  actor_user_id: string;
  actor_username: string | null;
  actor_display_name: string | null;
  target_type: string;
  target_id: string;
  target_name: string | null;
  target_url: string | null;
  created_at: string;
}

interface TopEntity {
  type: string;
  id: string;
  name: string | null;
  count: number;
  url: string | null;
}

interface PowerUser {
  user_id: string;
  username: string | null;
  display_name: string | null;
  follows: number;
  favorites: number;
  total: number;
  profile_url: string | null;
}

type Tab = 'activity' | 'top-followed' | 'top-saved' | 'power-users';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'activity', label: 'Activity', icon: '🕐' },
  { id: 'top-followed', label: 'Top Followed', icon: '👥' },
  { id: 'top-saved', label: 'Top Saved', icon: '⭐' },
  { id: 'power-users', label: 'Power Users', icon: '💪' },
];

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

function typeBadge(type: string): string {
  const colors: Record<string, string> = {
    player: 'bg-blue-400/10 text-blue-400',
    team: 'bg-emerald-400/10 text-emerald-400',
    rink: 'bg-cyan-400/10 text-cyan-400',
    league: 'bg-amber-400/10 text-amber-400',
    user: 'bg-purple-400/10 text-purple-400',
  };
  return colors[type] || 'bg-slate-700 text-slate-300';
}

export default function EngagementDashboard({
  activity,
  topFollowed,
  topFavorited,
  powerUsers,
  counts,
}: {
  activity: ActivityItem[];
  topFollowed: TopEntity[];
  topFavorited: TopEntity[];
  powerUsers: PowerUser[];
  counts: {
    follows: number;
    favorites: number;
    totalFollows: number;
    totalFavorites: number;
    activeUsers: number;
  };
}) {
  const [tab, setTab] = useState<Tab>('activity');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const filteredActivity = useMemo(() => {
    const q = search.trim().toLowerCase();
    return activity.filter((a) => {
      if (typeFilter !== 'all' && a.target_type !== typeFilter) return false;
      if (!q) return true;
      const haystack = [
        a.actor_username,
        a.actor_display_name,
        a.target_name,
        a.target_id,
        a.target_type,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [activity, typeFilter, search]);

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <Stat label="Recent follows" value={counts.follows} color="text-teal-400" />
        <Stat label="Recent favorites" value={counts.favorites} color="text-amber-400" />
        <Stat label="Total follows" value={counts.totalFollows} color="text-teal-400" />
        <Stat label="Total favorites" value={counts.totalFavorites} color="text-amber-400" />
        <Stat label="Active users" value={counts.activeUsers} color="text-purple-400" />
      </div>

      <div className="flex gap-2 mb-6 border-b border-slate-800 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              tab === t.id
                ? 'border-teal-400 text-teal-400'
                : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
          >
            <span className="mr-1.5">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'activity' && (
        <ActivityTab
          activity={filteredActivity}
          search={search}
          setSearch={setSearch}
          typeFilter={typeFilter}
          setTypeFilter={setTypeFilter}
        />
      )}

      {tab === 'top-followed' && <EntityTable entities={topFollowed} emptyMessage="No follows yet" />}

      {tab === 'top-saved' && <EntityTable entities={topFavorited} emptyMessage="No favorites yet" />}

      {tab === 'power-users' && (
        <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/50">
                <th className="text-left py-3 px-4 text-slate-500 font-medium uppercase text-xs tracking-wider">#</th>
                <th className="text-left py-3 px-4 text-slate-500 font-medium uppercase text-xs tracking-wider">User</th>
                <th className="text-right py-3 px-4 text-slate-500 font-medium uppercase text-xs tracking-wider">Follows</th>
                <th className="text-right py-3 px-4 text-slate-500 font-medium uppercase text-xs tracking-wider">Favorites</th>
                <th className="text-right py-3 px-4 text-slate-500 font-medium uppercase text-xs tracking-wider">Total</th>
                <th className="text-left py-3 px-4 text-slate-500 font-medium uppercase text-xs tracking-wider">User ID</th>
              </tr>
            </thead>
            <tbody>
              {powerUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">No users yet</td>
                </tr>
              ) : (
                powerUsers.map((u, idx) => (
                  <tr key={u.user_id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 text-slate-500">{idx + 1}</td>
                    <td className="py-3 px-4">
                      {u.profile_url ? (
                        <Link href={u.profile_url} className="text-teal-400 hover:text-teal-300 font-medium">
                          {u.username ? `@${u.username}` : u.display_name || '(no name)'}
                        </Link>
                      ) : (
                        <span className="text-white">{u.display_name || u.username || '(no name)'}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right text-teal-400 font-medium">{u.follows}</td>
                    <td className="py-3 px-4 text-right text-amber-400 font-medium">{u.favorites}</td>
                    <td className="py-3 px-4 text-right text-white font-bold">{u.total}</td>
                    <td className="py-3 px-4 text-slate-500 text-xs font-mono">{u.user_id.slice(0, 16)}…</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="admin-card p-4" style={{ marginBottom: 0 }}>
      <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>{value.toLocaleString()}</div>
    </div>
  );
}

function ActivityTab({
  activity,
  search,
  setSearch,
  typeFilter,
  setTypeFilter,
}: {
  activity: ActivityItem[];
  search: string;
  setSearch: (s: string) => void;
  typeFilter: string;
  setTypeFilter: (s: string) => void;
}) {
  const types = useMemo(() => {
    const set = new Set(activity.map((a) => a.target_type));
    return ['all', ...Array.from(set).sort()];
  }, [activity]);

  return (
    <div>
      <div className="admin-card mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Search actor, target name or id…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-400"
          />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-teal-400"
          >
            {types.map((t) => (
              <option key={t} value={t}>
                {t === 'all' ? 'All types' : t}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/50">
              <th className="text-left py-3 px-4 text-slate-500 font-medium uppercase text-xs tracking-wider">When</th>
              <th className="text-left py-3 px-4 text-slate-500 font-medium uppercase text-xs tracking-wider">Action</th>
              <th className="text-left py-3 px-4 text-slate-500 font-medium uppercase text-xs tracking-wider">Actor</th>
              <th className="text-left py-3 px-4 text-slate-500 font-medium uppercase text-xs tracking-wider">Target</th>
            </tr>
          </thead>
          <tbody>
            {activity.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-12 text-center text-slate-500">No activity matches your filters</td>
              </tr>
            ) : (
              activity.map((a) => {
                const actorLabel = a.actor_username
                  ? `@${a.actor_username}`
                  : a.actor_display_name || a.actor_user_id.slice(0, 12) + '…';
                return (
                  <tr key={`${a.type}-${a.id}`} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 text-slate-400 text-xs font-mono whitespace-nowrap">
                      {relativeTime(a.created_at)}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        a.type === 'follow' ? 'bg-teal-400/10 text-teal-400' : 'bg-amber-400/10 text-amber-400'
                      }`}>
                        {a.type === 'follow' ? '👥 follow' : '⭐ favorite'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-white text-xs">{actorLabel}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-xs mr-2 ${typeBadge(a.target_type)}`}>
                        {a.target_type}
                      </span>
                      {a.target_url ? (
                        <Link href={a.target_url} className="text-teal-400 hover:text-teal-300 text-xs">
                          {a.target_name || a.target_id.slice(0, 12) + '…'}
                        </Link>
                      ) : (
                        <span className="text-slate-300 text-xs">{a.target_name || a.target_id.slice(0, 12) + '…'}</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EntityTable({ entities, emptyMessage }: { entities: TopEntity[]; emptyMessage: string }) {
  if (entities.length === 0) {
    return <p className="text-slate-500 py-12 text-center bg-slate-900 border border-slate-800 rounded-lg">{emptyMessage}</p>;
  }
  const max = Math.max(...entities.map((e) => e.count), 1);
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-800 bg-slate-900/50">
            <th className="text-left py-3 px-4 text-slate-500 font-medium uppercase text-xs tracking-wider">#</th>
            <th className="text-left py-3 px-4 text-slate-500 font-medium uppercase text-xs tracking-wider">Type</th>
            <th className="text-left py-3 px-4 text-slate-500 font-medium uppercase text-xs tracking-wider">Entity</th>
            <th className="text-right py-3 px-4 text-slate-500 font-medium uppercase text-xs tracking-wider">Count</th>
            <th className="text-left py-3 px-4 text-slate-500 font-medium uppercase text-xs tracking-wider">Bar</th>
          </tr>
        </thead>
        <tbody>
          {entities.map((e, idx) => (
            <tr key={`${e.type}-${e.id}`} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
              <td className="py-3 px-4 text-slate-500">{idx + 1}</td>
              <td className="py-3 px-4">
                <span className={`inline-block px-1.5 py-0.5 rounded text-xs ${typeBadge(e.type)}`}>
                  {e.type}
                </span>
              </td>
              <td className="py-3 px-4">
                {e.url ? (
                  <Link href={e.url} className="text-teal-400 hover:text-teal-300">
                    {e.name || e.id.slice(0, 12) + '…'}
                  </Link>
                ) : (
                  <span className="text-slate-300">{e.name || e.id.slice(0, 12) + '…'}</span>
                )}
              </td>
              <td className="py-3 px-4 text-right text-white font-bold">{e.count}</td>
              <td className="py-3 px-4 w-1/3">
                <div className="bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-teal-400 h-full"
                    style={{ width: `${(e.count / max) * 100}%` }}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
