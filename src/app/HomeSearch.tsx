'use client';
import { useState } from 'react';

export default function HomeSearch() {
  const [q, setQ] = useState('');

  const search = (e: React.FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    if (term) window.location.href = `/directory?q=${encodeURIComponent(term)}`;
  };

  return (
    <form onSubmit={search} className="search-wrap" style={{ marginBottom: '1.5rem' }}>
      <input
        type="search"
        className="search-input"
        placeholder="Search teams, players, leagues..."
        value={q}
        onChange={e => setQ(e.target.value)}
        aria-label="Search the RinkStop directory"
        name="q"
      />
      <button type="submit" className="search-btn" aria-label="Search">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
      </button>
    </form>
  );
}
