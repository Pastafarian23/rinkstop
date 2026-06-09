import { requireAdmin } from '@/lib/admin-auth';
import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';

const NAV = [
  { href: '/admin', label: 'Overview', icon: '📊' },
  { href: '/admin/teams', label: 'Teams', icon: '🏒' },
  { href: '/admin/rinks', label: 'Rinks', icon: '🏟️' },
  { href: '/admin/users', label: 'Users', icon: '👥' },
  { href: '/admin/games', label: 'Games', icon: '🎮' },
  { href: '/admin/data-quality', label: 'Data Quality', icon: '✅' },
  { href: '/admin/revenue', label: 'Revenue', icon: '💰', disabled: true, badge: 'Phase 5' },
  { href: '/admin/cron-health', label: 'Cron Health', icon: '⏰', disabled: true, badge: 'Phase 5' },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col fixed h-full">
        <div className="p-6 border-b border-slate-800">
          <Link href="/" className="block">
            <div className="text-xl font-bold text-white">RinkStop</div>
            <div className="text-xs text-teal-400 font-medium tracking-wider">ADMIN CONSOLE</div>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.disabled ? '#' : item.href}
              className={`flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                item.disabled
                  ? 'text-slate-600 cursor-not-allowed'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
              aria-disabled={item.disabled}
              onClick={(e) => item.disabled && e.preventDefault()}
            >
              <span className="flex items-center gap-3">
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </span>
              {item.badge && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">
                  {item.badge}
                </span>
              )}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">{admin.email}</div>
              <div className="text-xs text-teal-400 capitalize">{admin.role.replace('_', ' ')}</div>
            </div>
            <UserButton />
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-64">
        <div className="max-w-7xl mx-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
