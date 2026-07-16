const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Fix 3 followup (2026-07-08): skip Next.js's default trailing-slash
  // redirect. Combined with our /index.php/* catch-all sources below, this
  // means /index.php/news/ -> /news in a single 308 hop instead of going
  // through /index.php/news first. Cleaner redirect chain, same SEO.
  skipTrailingSlashRedirect: true,
  webpack: (config) => {
    config.resolve.alias['@'] = path.resolve(__dirname, 'src');
    return config;
  },
  images: {
    // Restrict remote image sources to known-good hosts (closes M4 from the
    // 2026-06-11 security audit — the previous '**' allowed any HTTPS host
    // to be used as an image source, which could be abused for SSRF or to
    // bypass cache controls).
    remotePatterns: [
      { protocol: 'https', hostname: 'img.clerk.com' },      // Clerk avatars
      { protocol: 'https', hostname: 'images.clerk.com' },    // Clerk image proxy
      { protocol: 'https', hostname: '*.supabase.co' },       // Supabase storage
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' }, // GitHub avatars
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },     // Google avatars
      { protocol: 'https', hostname: 'platform-lookaside.fbsbx.com' }, // FB OAuth avatars
    ],
  },
  async headers() {
    // Security headers (closes M3 from the 2026-06-11 security audit).
    // We set conservative defaults here; tune CSP per page as needed.
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self), interest-cohort=()' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
          // Content Security Policy. Clerk's hosted components require
          // 'unsafe-inline' / 'unsafe-eval' for their bundled scripts.
          // Supabase, Stripe, and Zoho need their own origins in connect-src.
          // Tighten iteratively after Clerk publishes a nonce-based mode.
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.accounts.dev https://clerk.rinkstop.com https://*.stripe.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data: https://*.clerk.accounts.dev https://*.clerk.com",
              "connect-src 'self' https://*.clerk.accounts.dev https://clerk.rinkstop.com https://*.supabase.co https://api.stripe.com https://*.highlightly.net wss://*.supabase.co",
              "frame-src 'self' https://*.clerk.accounts.dev https://clerk.rinkstop.com https://js.stripe.com https://hooks.stripe.com https://www.youtube.com",
              "worker-src 'self' blob:",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self' https://*.clerk.accounts.dev https://clerk.rinkstop.com",
              "frame-ancestors 'none'",
              "upgrade-insecure-requests",
            ].join('; '),
          },
        ],
      },
      // Immutable 1-year cache for static images in /public/images/.
      // Vercel's CDN serves these directly; without this header, every
      // crawler request re-fetches the file. With max-age=31536000,
      // repeat requests are served from edge cache. Saves bandwidth on
      // Vercel Hobby plan (100GB/mo cap).
      {
        source: '/images/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      // Also cache the favicon and other static assets for 1 year.
      {
        source: '/:path(favicon\\.ico|og-image\\.png|rinkstoplogo\\.png|robots\\.txt)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/scores',
        destination: '/directory/games',
        permanent: true,
      },
      // Legacy /draft/[year] URLs from before the namespace split
      // (per Arnel's decision 2026-06-30, Option A). All historical
      // references to /draft/2026, /draft/2025, etc. should now go
      // to /draft/nhl/[year]. Future sibling routes will live at
      // /draft/ohl/[year], /draft/whl/[year], etc. so we use a regex
      // that only matches the 4-digit year pattern — not landing pages
      // like /draft/ohl which we'll add later.
      {
        source: '/draft/:year(\\d{4})',
        destination: '/draft/nhl/:year',
        permanent: true,
      },
      // /directory/staffs → /directory/staff. The dynamic [country] route
      // catches /directory/staffs and renders 'Hockey in Staffs' (a non-country
      // the geo template didn't recognize). The actual staff directory lives
      // at the singular path. Permanent redirect so old links + bookmarks
      // resolve to the right page.
      {
        source: '/directory/staffs',
        destination: '/directory/staff',
        permanent: true,
      },
      // /directory/locations/czechia/* and /directory/czechia → /directory/locations/czech-republic/* and /directory/czech-republic
      // (canonical URL is now czech-republic; czechia was the legacy slug).
      {
        source: '/directory/locations/czechia/:path*',
        destination: '/directory/locations/czech-republic/:path*',
        permanent: true,
      },
      {
        source: '/directory/czechia',
        destination: '/directory/czech-republic',
        permanent: true,
      },
      {
        source: '/hockey/czechia',
        destination: '/hockey/czech-republic',
        permanent: true,
      },
      {
        source: '/hockey/czechia/:path*',
        destination: '/hockey/czech-republic/:path*',
        permanent: true,
      },
      // /news/2026-nhl-draft-complete-results → /news/2026-nhl-draft-round-1-storylines
      // The article title changed in iteration 2 but the slug wasn't updated
      // until iteration 3. Old slug URL no longer matches the content; redirect
      // so social shares + bookmarks from the original publish still resolve.
      {
        source: '/news/2026-nhl-draft-complete-results',
        destination: '/news/2026-nhl-draft-round-1-storylines',
        permanent: true,
      },
      {
        source: '/gear-reviews',
        destination: '/gear-brands',
        permanent: true,
      },
      // www.rinkstop.com → rinkstop.com (301)
      // Closes the brand-signal split: GSC's 90d report shows both
      // www.rinkstop.com (6 clicks, 9 impr, pos 1.11) and
      // rinkstop.com (23 clicks, 72 impr, pos 1.60) getting impressions
      // for the same queries. Consolidating to the naked domain
      // doubles our ranking signal for the home page.
      {
        source: '/:path*',
        has: [
          { type: 'host', value: 'www.rinkstop.com' },
        ],
        destination: 'https://rinkstop.com/:path*',
        permanent: true,
      },
      // Legacy WordPress URLs (Fix 3, 2026-07-08). The old /index.php/*
      // paths were indexed by Google before the rebuild and still 404.
      // 301 redirects to current routes pass any residual link equity
      // instead of dropping it. Both bare and trailing-slash variants
      // are caught, plus a :path* catch-all for any deeper URLs.
      // Verified 2026-07-08: all targets ( /news, /pricing, /contact,
      // /terms ) exist and return 200. Sitemap is already clean.
      {
        source: '/index.php/news/:path*',
        destination: '/news',
        permanent: true,
      },
      {
        source: '/index.php/store/:path*',
        destination: '/pricing',
        permanent: true,
      },
      {
        source: '/index.php/contacts-us/:path*',
        destination: '/contact',
        permanent: true,
      },
      {
        source: '/index.php/terms-and-conditions/:path*',
        destination: '/terms',
        permanent: true,
      },
      {
        source: '/(.*)',
        has: [
          { type: 'host', value: 'rinkstop-platform\.vercel\.app' },
        ],
        destination: 'https://rinkstop.com/$1',
        permanent: true,
      },
    ];
  },
};
module.exports = nextConfig;
