'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function AdminBrands() {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/brands').then(r => r.json()).then(d => { setBrands(d || []); setLoading(false); });
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this brand?')) return;
    await fetch(`/api/brands?id=${id}`, { method: 'DELETE' });
    setBrands(brands.filter((b: any) => b.id !== id));
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Manage Brands</h1>
        <Link href="/admin/brands/new" className="btn-primary">+ Add Brand</Link>
      </div>
      {loading ? <p>Loading...</p> : (
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-700">
            <th className="text-left py-2 px-3">Name</th>
            <th className="text-left py-2 px-3">Category</th>
            <th className="text-left py-2 px-3">Origin</th>
            <th className="text-right py-2 px-3">Actions</th>
          </tr></thead>
          <tbody>
            {brands.map((b: any) => (
              <tr key={b.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                <td className="py-2 px-3 font-semibold">{b.name}</td>
                <td className="py-2 px-3 text-slate-400">{b.category}</td>
                <td className="py-2 px-3 text-slate-400">{b.country_of_origin}</td>
                <td className="py-2 px-3 text-right">
                  <Link href={`/admin/brands/${b.id}`} className="text-teal-400 mr-3">Edit</Link>
                  <button onClick={() => handleDelete(b.id)} className="text-red-400 hover:text-red-300">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}