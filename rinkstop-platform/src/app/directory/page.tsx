export default function Directory() {
  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Hockey Directory</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <a href="/directory/teams" className="directory-card">
          <div className="text-4xl mb-3">🏒</div>
          <h2 className="text-xl font-semibold">Teams</h2>
          <p className="text-slate-400 mt-2">Browse teams by league and country</p>
        </a>
        <a href="/directory/players" className="directory-card">
          <div className="text-4xl mb-3">🥅</div>
          <h2 className="text-xl font-semibold">Players</h2>
          <p className="text-slate-400 mt-2">Search by position, team, or nationality</p>
        </a>
        <a href="/directory/leagues" className="directory-card">
          <div className="text-4xl mb-3">🏆</div>
          <h2 className="text-xl font-semibold">Leagues</h2>
          <p className="text-slate-400 mt-2">Professional, junior, amateur & youth</p>
        </a>
        <a href="/directory/rinks" className="directory-card">
          <div className="text-4xl mb-3">🏟️</div>
          <h2 className="text-xl font-semibold">Rinks & Facilities</h2>
          <p className="text-slate-400 mt-2">Find rinks near you</p>
        </a>
        <a href="/directory/brands" className="directory-card">
          <div className="text-4xl mb-3">🏷️</div>
          <h2 className="text-xl font-semibold">Brands</h2>
          <p className="text-slate-400 mt-2">Equipment & apparel brands</p>
        </a>
        <a href="/directory/fixtures" className="directory-card">
          <div className="text-4xl mb-3">📅</div>
          <h2 className="text-xl font-semibold">Fixtures</h2>
          <p className="text-slate-400 mt-2">Upcoming games & schedules</p>
        </a>
      </div>
    </div>
  );
}
