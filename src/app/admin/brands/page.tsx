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
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1><span aria-hidden="true">👕</span> Brands</h1>
          <p>Manage equipment and apparel brands.</p>
        </div>
        <Link href="/admin/brands/new" className="admin-btn admin-btn-primary">+ Add Brand</Link>
      </div>
      {loading ? <p>Loading...</p> : (
        <div className="admin-card">
          <table className="w-full text-sm">
            <thead><tr>
              <th className="text-left py-3 px-4">Name</th>
              <th className="text-left py-3 px-4">Category</th>
              <th className="text-left py-3 px-4">Origin</th>
              <th className="text-right py-3 px-4">Actions</th>
            </tr></thead>
            <tbody>
              {brands.map((b: any) => (
                <tr key={b.id}>
                  <td className="py-3 px-4 font-semibold text-white">{b.name}</td>
                  <td className="py-3 px-4 text-slate-400">{b.category}</td>
                  <td className="py-3 px-4 text-slate-400">{b.country_of_origin}</td>
                  <td className="py-3 px-4 text-right">
                    <Link href={`/admin/brands/${b.id}`} className="text-teal-400 mr-3">Edit</Link>
                    <button onClick={() => handleDelete(b.id)} className="text-red-400 hover:text-red-300">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}