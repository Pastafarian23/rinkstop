/** @type {import('next').NextConfig} */
const nextConfig = {
  // 2026-10-03: Scoresheet lives at scoresheet.rinkstop.com (or score.rinkstop.com).
  // Built as a separate Vercel project pointed at the scoresheet/ subdirectory
  // of rinkstop-platform. Shares Supabase + Clerk with the main app via env vars.
  experimental: {
    // Server actions enabled for offline-first event queueing
    serverActions: { bodySizeLimit: '2mb' },
  },
  // PWA: service worker needs to be served from root with no-cache.
  // The vercel.json in this dir already handles the headers.
  async headers() {
    return [
      {
        source: '/manifest.json',
        headers: [
          { key: 'Content-Type', value: 'application/manifest+json' },
          { key: 'Cache-Control', value: 'public, max-age=86400' },
        ],
      },
      {
        source: '/icon-:size.png',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
