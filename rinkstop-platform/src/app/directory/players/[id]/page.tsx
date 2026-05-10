'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function PlayerDetail() {
  const { id } = useParams();
  const [player, setPlayer] = useState(null);
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/players?id=${id}`).then(r => r.json()).then(d => {
      setPlayer(d?.data?.[0] || null);
    });
    fetch(`/api/stats?playerId=${id}`).then(r => r.json()).then(d => setStats(d || []));
    setLoading(false);
  }, [id]);

  if (loading) return <p className="text-slate-400">Loading...</p>;
  if (!player) return <p className="text-slate-400">Player not found</p>;

  const POSITIONS: Record<string, string> = {
    goalie: 'Goalie', defenseman: 'Defenseman', left_wing: 'Left Wing',
    right_wing: 'Right Wing', center: 'Center', defense: 'Defense'
  };

  return (
    <div>
      <Link href="/directory/players" className="text-teal-400 text-sm mb-4 inline-block">&larr; Back to Players</Link>
      <div className="flex items-center gap-6 mb-6">
        {player.headshot_url ? (
          <img src={player.headshot_url} alt="" className="w-24 h-24 rounded-full object-cover border-2 border-teal-500" />
        ) : (
          <div className="w-24 h-24 rounded-full bg-slate-700 flex items-center justify-center text-4xl border-2 border-slate-600">🏒</div>
        )}
        <div>
          <h1 className="text-3xl font-bold text-white">{player.first_name} {player.last_name}</h1>
          <p className="text-teal-400 text-lg">#{player.jersey_number} · {POSITIONS[player.position] || player.position}</p>
          <p className="text-slate-400">{player.teams?.name}</p>
          {player.nationality && <p className="text-slate-500 text-sm">{player.nationality}</p>}
        </div>
      </div>

      <div className="h-[2px] bg-brand-gradient rounded-full w-32 mb-8"></div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {player.height_cm && <div className="bg-slate-900/60 p-3 rounded-lg text-center border border-slate-800"><p className="text-slate-500 text-xs">Height</p><p className="text-white font-bold">{player.height_cm}cm</p></div>}
        {player.weight_kg && <div className="bg-slate-900/60 p-3 rounded-lg text-center border border-slate-800"><p className="text-slate-500 text-xs">Weight</p><p className="text-white font-bold">{player.weight_kg}kg</p></div>}
        {player.shoots && <div className="bg-slate-900/60 p-3 rounded-lg text-center border border-slate-800"><p className="text-slate-500 text-xs">Shoots</p><p className="text-white font-bold capitalize">{player.shoots}</p></div>}
        {player.catches && <div className="bg-slate-900/60 p-3 rounded-lg text-center border border-slate-800"><p className="text-slate-500 text-xs">Catches</p><p className="text-white font-bold capitalize">{player.catches}</p></div>}
      </div>

      {player.bio && <p className="text-slate-300 mb-6">{player.bio}</p>}

      {stats.length > 0 && (
        <>
          <h2 className="text-xl font-semibold mb-4 text-white">Season Stats</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-800">
                <th className="text-left py-2 px-3 text-slate-500 font-medium">GP</th>
                <th className="text-left py-2 px-3 text-slate-500 font-medium">G</th>
                <th className="text-left py-2 px-3 text-slate-500 font-medium">A</th>
                <th className="text-left py-2 px-3 text-slate-500 font-medium">PTS</th>
                <th className="text-left py-2 px-3 text-slate-500 font-medium">+/-</th>
                <th className="text-left py-2 px-3 text-slate-500 font-medium">PIM</th>
                <th className="text-left py-2 px-3 text-slate-500 font-medium">SOG</th>
                <th className="text-left py-2 px-3 text-slate-500 font-medium">Rating</th>
              </tr></thead>
              <tbody>
                {stats.map((s: any) => (
                  <tr key={s.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                    <td className="py-2 px-3 text-white">1</td>
                    <td className="py-2 px-3 text-white">{s.goals}</td>
                    <td className="py-2 px-3 text-white">{s.assists}</td>
                    <td className="py-2 px-3 font-semibold text-teal-400">{s.points}</td>
                    <td className="py-2 px-3 text-white">{s.plus_minus}</td>
                    <td className="py-2 px-3 text-white">{s.penalty_minutes}</td>
                    <td className="py-2 px-3 text-white">{s.shots_on_goal}</td>
                    <td className="py-2 px-3 font-semibold">{s.game_rating}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}