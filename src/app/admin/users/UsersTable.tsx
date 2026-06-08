'use client';

import { useState, useMemo } from 'react';

interface User {
  clerkId: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  role: 'user' | 'admin' | 'super_admin';
  clerkRole: string | null;
  tier: string | null;
  subscriptionStatus: string | null;
  isFoundingMember: boolean;
  joinedAt: string;
  lastSignInAt: string | null;
}

interface Props {
  users: User[];
  currentUserId: string;
  isSuperAdmin: boolean;
}

const ROLE_COLORS: Record<string, string> = {
  user: 'bg-slate-700 text-slate-300',
  admin: 'bg-blue-400/10 text-blue-400',
  super_admin: 'bg-teal-400/10 text-teal-400',
};

const TIER_COLORS: Record<string, string> = {
  free: 'bg-slate-700 text-slate-300',
  verified: 'bg-blue-400/10 text-blue-400',
  pro: 'bg-amber-400/10 text-amber-400',
  elite: 'bg-purple-400/10 text-purple-400',
};

export default function UsersTable({ users: initialUsers, currentUserId, isSuperAdmin }: Props) {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        if (!u.email.toLowerCase().includes(s) && !u.name.toLowerCase().includes(s)) return false;
      }
      return true;
    });
  }, [users, search, roleFilter]);

  async function changeRole(userId: string, newRole: 'user' | 'admin' | 'super_admin') {
    if (!isSuperAdmin) {
      setError('Only super admins can change roles');
      return;
    }
    if (userId === currentUserId && newRole !== 'super_admin') {
      setError('You cannot demote yourself');
      return;
    }

    setError(null);
    setUpdatingId(userId);
    try {
      const r = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      if (!r.ok) {
        const j = await r.json();
        throw new Error(j.error || 'Update failed');
      }
      // Update local state
      setUsers((prev) => prev.map((u) => (u.clerkId === userId ? { ...u, role: newRole } : u)));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div>
      {error && (
        <div className="mb-4 bg-rose-400/10 border border-rose-400/20 text-rose-400 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <input
          type="text"
          placeholder="Search by email or name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-400"
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-teal-400"
        >
          <option value="all">All roles</option>
          <option value="user">User</option>
          <option value="admin">Admin</option>
          <option value="super_admin">Super admin</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/50">
              <th className="text-left py-3 px-4 text-slate-500 font-medium uppercase text-xs tracking-wider">User</th>
              <th className="text-left py-3 px-4 text-slate-500 font-medium uppercase text-xs tracking-wider">Role</th>
              <th className="text-left py-3 px-4 text-slate-500 font-medium uppercase text-xs tracking-wider">Tier</th>
              <th className="text-left py-3 px-4 text-slate-500 font-medium uppercase text-xs tracking-wider">Status</th>
              <th className="text-left py-3 px-4 text-slate-500 font-medium uppercase text-xs tracking-wider">Joined</th>
              {isSuperAdmin && (
                <th className="text-right py-3 px-4 text-slate-500 font-medium uppercase text-xs tracking-wider">Change Role</th>
              )}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={isSuperAdmin ? 6 : 5} className="py-12 text-center text-slate-500">
                  No users match your filters.
                </td>
              </tr>
            ) : (
              filtered.map((u) => (
                <tr key={u.clerkId} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      {u.avatarUrl ? (
                        <img src={u.avatarUrl} alt={u.name} className="w-8 h-8 rounded-full" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white text-sm">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="font-medium text-white truncate flex items-center gap-2">
                          {u.name}
                          {u.clerkId === currentUserId && (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400 bg-teal-400/10 px-1.5 py-0.5 rounded">
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 truncate">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${ROLE_COLORS[u.role]}`}>
                      {u.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {u.tier ? (
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${TIER_COLORS[u.tier] || 'bg-slate-700 text-slate-300'}`}>
                        {u.tier}
                      </span>
                    ) : (
                      <span className="text-slate-600 text-xs">—</span>
                    )}
                    {u.isFoundingMember && (
                      <span className="ml-1 text-amber-400" title="Founding member">⭐</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {u.subscriptionStatus ? (
                      <span className={`text-xs ${
                        u.subscriptionStatus === 'active' ? 'text-teal-400' :
                        u.subscriptionStatus === 'past_due' ? 'text-rose-400' :
                        'text-slate-500'
                      }`}>
                        {u.subscriptionStatus}
                      </span>
                    ) : (
                      <span className="text-slate-600 text-xs">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-slate-400 text-xs font-mono">
                    {new Date(u.joinedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </td>
                  {isSuperAdmin && (
                    <td className="py-3 px-4 text-right">
                      <select
                        value={u.role}
                        onChange={(e) => changeRole(u.clerkId, e.target.value as any)}
                        disabled={updatingId === u.clerkId}
                        className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-teal-400 disabled:opacity-50"
                      >
                        <option value="user">user</option>
                        <option value="admin">admin</option>
                        <option value="super_admin">super admin</option>
                      </select>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-xs text-slate-500 text-right">
        Showing {filtered.length} of {users.length} users · Last updated: {new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
      </div>
    </div>
  );
}
