'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

const CATEGORIES = ['sticks', 'skates', 'helmets', 'pads', 'gloves', 'apparel', 'accessories', 'other'];

export default function BrandsPage() {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('');

  useEffect(() => {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    fetch(`/api/brands?${params}`).then(r => r.json()).then(d => {
      setBrands(d || []);
      setLoading(false);
    });
  }, [category]);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-white">Brands</h1>
      <div className="mb-6 h-[2px] bg-brand-gradient rounded-full w-16"></div>
      <div className="mb-6">
        <select value={category} onChange={e => setCategory(e.target.value)} className="select-field w-48">
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
        </select>
      </div>
      {loading ? <p className="text-slate-400">Loading...</p> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {brands.map((b: any) => (
            <Link key={b.id} href={`/directory/brands/${b.id}`} className="card-default p-5">
              <h3 className="font-semibold text-lg text-white">{b.name}</h3>
              <p className="text-slate-500 text-sm capitalize">{b.category}</p>
              {b.country_of_origin && <p className="text-teal-400 text-sm mt-1">{b.country_of_origin}</p>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}