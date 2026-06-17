'use client';

import { useMemo, useState } from 'react';

interface BadWord {
  id: string;
  word: string;
  severity: 'hard' | 'soft';
  category: string | null;
  notes: string | null;
  created_at: string;
}

type FilterSev = 'all' | 'hard' | 'soft';

const CATEGORY_OPTIONS = [
  'profanity',
  'slur',
  'sexual',
  'violence',
  'drugs',
  'csam',
  'other',
];

export default function BadWordsClient({ initialItems }: { initialItems: BadWord[] }) {
  const [items, setItems] = useState<BadWord[]>(initialItems);
  const [filter, setFilter] = useState<FilterSev>('all');
  const [search, setSearch] = useState('');
  const [newWord, setNewWord] = useState('');
  const [newSev, setNewSev] = useState<'hard' | 'soft'>('soft');
  const [newCategory, setNewCategory] = useState('profanity');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const counts = useMemo(() => {
    const c = { all: items.length, hard: 0, soft: 0 };
    for (const i of items) {
      if (i.severity === 'hard') c.hard++;
      else c.soft++;
    }
    return c;
  }, [items]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((i) => {
      if (filter !== 'all' && i.severity !== filter) return false;
      if (q && !i.word.includes(q) && !(i.category || '').toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, filter, search]);

  async function setSeverity(id: string, severity: 'hard' | 'soft') {
    setBusy(id);
    setError(null);
    try {
      const res = await fetch('/api/admin/bad-words', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, severity }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message || data.error || `Update failed: HTTP ${res.status}`);
        return;
      }
      // Update local
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, severity } : i)));
    } catch {
      setError('Network error');
    } finally {
      setBusy(null);
    }
  }

  async function remove(id: string) {
    if (!confirm('Remove this entry from the bad-words list?')) return;
    setBusy(id);
    setError(null);
    try {
      const res = await fetch('/api/admin/bad-words', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message || data.error || `Delete failed: HTTP ${res.status}`);
        return;
      }
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch {
      setError('Network error');
    } finally {
      setBusy(null);
    }
  }

  async function addWord() {
    const w = newWord.trim().toLowerCase();
    if (w.length < 2) {
      setError('Word must be at least 2 characters.');
      return;
    }
    setBusy('new');
    setError(null);
    try {
      const res = await fetch('/api/admin/bad-words', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word: w, severity: newSev, category: newCategory }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message || data.error || `Add failed: HTTP ${res.status}`);
        return;
      }
      const data = await res.json();
      setItems((prev) => {
        const without = prev.filter((i) => i.id !== data.item.id);
        return [...without, data.item].sort((a, b) => a.word.localeCompare(b.word));
      });
      setNewWord('');
    } catch {
      setError('Network error');
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#041E42] text-white">
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="flex items-baseline justify-between mb-2">
          <h1
            className="text-3xl font-bold"
            style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", letterSpacing: '0.04em' }}
          >
            Bad-words list
          </h1>
          <a
            href="/admin/username-review"
            className="text-sm text-[#FFB81C] hover:underline"
          >
            → Username review queue
          </a>
        </div>
        <p className="text-white/60 text-sm mb-6">
          Manage the username-moderation wordlist. Promote borderline words to auto-reject
          (hard) or relax them to human review (soft). Add a new entry to flag evasion
          patterns you see in the wild.
        </p>

        {error && (
          <div
            className="mb-4 px-4 py-3 rounded text-sm"
            style={{ background: 'rgba(200,16,46,0.15)', border: '1px solid rgba(200,16,46,0.4)', color: '#ff8a9c' }}
            role="alert"
          >
            {error}
          </div>
        )}

        {/* Add word form */}
        <div
          className="mb-4 p-4 rounded-lg flex flex-wrap gap-2 items-end"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-white/60 mb-1">Add word</label>
            <input
              type="text"
              value={newWord}
              onChange={(e) => setNewWord(e.target.value)}
              placeholder="e.g. xyzbadword"
              className="w-full px-3 py-2 rounded bg-[#0A2A5E] border border-white/10 text-white text-sm focus:outline-none focus:border-[#FFB81C]/60"
              data-testid="add-word-input"
            />
          </div>
          <div>
            <label className="block text-xs text-white/60 mb-1">Severity</label>
            <select
              value={newSev}
              onChange={(e) => setNewSev(e.target.value as 'hard' | 'soft')}
              className="px-3 py-2 rounded bg-[#0A2A5E] border border-white/10 text-white text-sm"
              data-testid="add-word-severity"
            >
              <option value="soft">soft (queue for review)</option>
              <option value="hard">hard (auto-reject)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-white/60 mb-1">Category</label>
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="px-3 py-2 rounded bg-[#0A2A5E] border border-white/10 text-white text-sm"
              data-testid="add-word-category"
            >
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <button
            onClick={addWord}
            disabled={busy === 'new' || newWord.trim().length < 2}
            className="px-4 py-2 rounded font-bold text-sm disabled:opacity-50"
            style={{ background: '#FFB81C', color: '#041E42' }}
            data-testid="add-word-submit"
          >
            {busy === 'new' ? 'Adding…' : 'Add'}
          </button>
        </div>

        {/* Filter chips + search */}
        <div className="flex flex-wrap gap-2 mb-3">
          {(['all', 'hard', 'soft'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-3 py-1.5 rounded-md text-sm font-medium"
              style={
                filter === f
                  ? { background: '#FFB81C', color: '#041E42' }
                  : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)' }
              }
              data-testid={`filter-${f}`}
            >
              {f === 'all' ? 'All' : f === 'hard' ? 'Hard' : 'Soft'} ({counts[f]})
            </button>
          ))}
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="search word or category"
            className="ml-auto px-3 py-1.5 rounded-md text-sm bg-[#0A2A5E] border border-white/10 text-white placeholder-white/40 w-64"
            data-testid="bad-words-search"
          />
        </div>

        <p className="text-white/50 text-xs mb-2" data-testid="visible-count">
          Showing {visible.length} of {items.length}
        </p>

        {/* List */}
        <ul className="space-y-1.5" data-testid="bad-words-list">
          {visible.map((item) => (
            <li
              key={item.id}
              className="px-3 py-2 rounded flex items-center gap-3"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              data-testid={`bad-word-${item.word}`}
            >
              <code className="text-sm font-mono w-32 truncate" style={{ color: '#FFB81C' }}>
                {item.word}
              </code>
              <span className="text-xs text-white/50 w-24">{item.category || '—'}</span>
              <span
                className="text-xs px-2 py-0.5 rounded font-medium w-12 text-center"
                style={
                  item.severity === 'hard'
                    ? { background: 'rgba(200,16,46,0.2)', color: '#ff8a9c' }
                    : { background: 'rgba(255,184,28,0.15)', color: '#FFB81C' }
                }
              >
                {item.severity}
              </span>
              <div className="ml-auto flex gap-1.5">
                <button
                  onClick={() => setSeverity(item.id, item.severity === 'hard' ? 'soft' : 'hard')}
                  disabled={busy === item.id}
                  className="px-2 py-1 rounded text-xs disabled:opacity-50"
                  style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.8)' }}
                  data-testid={`toggle-${item.word}`}
                  title={item.severity === 'hard' ? 'Demote to soft (queue)' : 'Promote to hard (auto-reject)'}
                >
                  {item.severity === 'hard' ? '→ soft' : '→ hard'}
                </button>
                <button
                  onClick={() => remove(item.id)}
                  disabled={busy === item.id}
                  className="px-2 py-1 rounded text-xs disabled:opacity-50"
                  style={{ background: 'rgba(200,16,46,0.15)', color: '#ff8a9c' }}
                  data-testid={`remove-${item.word}`}
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
        {visible.length === 0 && (
          <p className="text-white/50 text-sm text-center py-8">No matches.</p>
        )}
      </div>
    </main>
  );
}
