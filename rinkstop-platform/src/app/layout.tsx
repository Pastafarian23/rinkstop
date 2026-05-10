import Link from 'next/link';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-black text-slate-200 antialiased min-h-screen">
        <nav className="border-b border-slate-900 bg-slate-950/95 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-brand-gradient flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-teal-500/20">
                  🏒
                </div>
                <Link href="/" className="text-xl font-bold text-white hover:opacity-90 transition-opacity tracking-tight">
                  RinkStop
                </Link>
              </div>
              <div className="hidden md:flex items-center gap-6">
                <Link href="/directory" className="text-slate-300 hover:text-teal-400 transition-colors text-sm font-medium">Directory</Link>
                <Link href="/directory/teams" className="text-slate-300 hover:text-teal-400 transition-colors text-sm font-medium">Teams</Link>
                <Link href="/directory/players" className="text-slate-300 hover:text-teal-400 transition-colors text-sm font-medium">Players</Link>
                <Link href="/directory/leagues" className="text-slate-300 hover:text-teal-400 transition-colors text-sm font-medium">Leagues</Link>
                <Link href="/blog" className="text-slate-300 hover:text-teal-400 transition-colors text-sm font-medium">Blog</Link>
              </div>
            </div>
          </div>
          {/* Subtle brand gradient line under nav */}
          <div className="h-[2px] bg-brand-gradient opacity-60"></div>
        </nav>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>

        <footer className="border-t border-slate-900 bg-slate-950/50 mt-16">
          <div className="h-[2px] bg-brand-gradient opacity-40 mb-8"></div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded bg-brand-gradient flex items-center justify-center text-white text-sm font-bold">
                    🏒
                  </div>
                  <span className="font-bold text-white">RinkStop</span>
                </div>
                <p className="text-slate-600 text-sm">The global hockey directory — connecting players, teams, and leagues worldwide.</p>
              </div>
              <div>
                <h4 className="font-semibold text-white mb-3">Directory</h4>
                <ul className="space-y-2 text-sm text-slate-500">
                  <li><a href="/directory/teams" className="hover:text-teal-400 transition-colors">Teams</a></li>
                  <li><a href="/directory/players" className="hover:text-teal-400 transition-colors">Players</a></li>
                  <li><a href="/directory/leagues" className="hover:text-teal-400 transition-colors">Leagues</a></li>
                  <li><a href="/directory/rinks" className="hover:text-teal-400 transition-colors">Rinks</a></li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-white mb-3">More</h4>
                <ul className="space-y-2 text-sm text-slate-500">
                  <li><a href="/directory/brands" className="hover:text-teal-400 transition-colors">Brands</a></li>
                  <li><a href="/directory/fixtures" className="hover:text-teal-400 transition-colors">Fixtures</a></li>
                  <li><a href="/admin" className="hover:text-teal-400 transition-colors">Admin</a></li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-white mb-3">Connect</h4>
                <ul className="space-y-2 text-sm text-slate-500">
                  <li><a href="https://topshelftoker.com" target="_blank" rel="noopener" className="hover:text-crimson-400 transition-colors">Shop Gear</a></li>
                  <li><a href="/blog" className="hover:text-teal-400 transition-colors">Blog</a></li>
                  <li><a href="/admin" className="hover:text-teal-400 transition-colors">Contribute Data</a></li>
                </ul>
              </div>
            </div>
            <div className="border-t border-slate-800 mt-8 pt-4 text-center text-xs text-slate-700">
              © {new Date().getFullYear()} RinkStop. Built for the global hockey community.
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}

import Link from 'next/link';