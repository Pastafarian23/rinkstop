'use client';

import { useState, useMemo } from 'react';
import { contentToHtml, wordCount } from '@/lib/markdown';

interface Props {
  content: string;
  initialMode?: 'rendered' | 'source';
}

/**
 * Renders the article body in two modes:
 *   - rendered (default): HTML preview matching the public blog page
 *   - source: raw markdown for spot-checking
 *
 * Uses the same renderer as the public /news/[slug] page so what reviewers
 * see is exactly what visitors will see.
 */
export default function PostBodyViewer({ content, initialMode = 'rendered' }: Props) {
  const [mode, setMode] = useState<'rendered' | 'source'>(initialMode);
  const html = useMemo(() => contentToHtml(content || ''), [content]);
  const wc = useMemo(() => wordCount(content || ''), [content]);

  return (
    <div className="admin-card p-0" style={{ overflow: 'hidden' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.75rem 1rem',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(255,255,255,0.02)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>📄 Body</span>
          <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>
            {wc.toLocaleString()} words · ~{Math.max(1, Math.round(wc / 220))} min read
          </span>
        </div>
        <div
          style={{
            display: 'inline-flex',
            borderRadius: 6,
            border: '1px solid rgba(255,255,255,0.1)',
            overflow: 'hidden',
          }}
        >
          <button
            type="button"
            onClick={() => setMode('rendered')}
            style={{
              padding: '0.3rem 0.75rem',
              fontSize: '0.75rem',
              background: mode === 'rendered' ? 'rgba(20,184,166,0.15)' : 'transparent',
              color: mode === 'rendered' ? '#14B8A6' : 'rgba(255,255,255,0.6)',
              border: 0,
              cursor: 'pointer',
            }}
          >
            Rendered
          </button>
          <button
            type="button"
            onClick={() => setMode('source')}
            style={{
              padding: '0.3rem 0.75rem',
              fontSize: '0.75rem',
              background: mode === 'source' ? 'rgba(20,184,166,0.15)' : 'transparent',
              color: mode === 'source' ? '#14B8A6' : 'rgba(255,255,255,0.6)',
              border: 0,
              cursor: 'pointer',
            }}
          >
            Source
          </button>
        </div>
      </div>

      {mode === 'rendered' ? (
        <div
          className="news-content"
          style={{
            padding: '1.5rem',
            maxHeight: '70vh',
            overflowY: 'auto',
            color: 'rgba(255,255,255,0.9)',
            lineHeight: 1.7,
            fontSize: '0.95rem',
          }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <pre
          style={{
            padding: '1.5rem',
            maxHeight: '70vh',
            overflow: 'auto',
            margin: 0,
            fontSize: '0.8rem',
            color: 'rgba(255,255,255,0.7)',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            background: 'rgba(0,0,0,0.2)',
          }}
        >
          {content || '(empty)'}
        </pre>
      )}
    </div>
  );
}
