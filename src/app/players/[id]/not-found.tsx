import Link from 'next/link';

export default function PlayerNotFound() {
  return (
    <main className="min-h-screen bg-[#041E42] text-white flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        <div className="text-6xl mb-4">🏒</div>
        <h1 className="text-2xl font-bold mb-2">Player not found</h1>
        <p className="text-white/60 mb-6">
          This player profile doesn't exist on RinkStop. It may have been removed, or the link is incorrect.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link
            href="/directory/players"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 border border-white/15 text-sm font-semibold transition-colors"
          >
            Browse players →
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#FFB81C] hover:bg-[#FFB81C]/90 text-[#041E42] text-sm font-semibold transition-colors"
          >
            RinkStop home
          </Link>
        </div>
      </div>
    </main>
  );
}