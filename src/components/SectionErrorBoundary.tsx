'use client';
import React from 'react';

interface Props {
  name: string;
  children: React.ReactNode;
}

export default function SectionErrorBoundary({ name, children }: Props) {
  return (
    <ErrorBoundary
      fallback={
        <div style={{ padding: '0.75rem', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.35)', borderRadius: 8, color: '#fecaca', fontSize: '0.8rem' }}>
          <strong>{name} error</strong>
          <div style={{ marginTop: 4 }}>This section failed to render. The page is still functional.</div>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: unknown) {
    console.error(`[rinkstop] section boundary [${(this.props as any)?.name ?? 'unknown'}]:`, error);
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}
