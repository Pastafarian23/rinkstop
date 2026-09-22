const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Bump on every deploy to invalidate Vercel's per-build CDN cache.
  // Without this, Vercel can serve stale bundles for ~hours after a
  // successful deploy (seen 2026-07-30 08:04 CDT — 3 successful deploys
  // in a row, CDN stuck on the build hash from 90 min earlier).
  // Bump this to the current epoch when shipping a fix you need on
  // production immediately. Cheap, safe, deterministic.
  // Force buildId bump for next deploy
  generateBuildId: async () => `v-${Date.now()}`,
  reactStrictMode: true,
  // WS-Recovery 2026-08-11: skip ESLint during builds.
  // eslint is not in devDependencies, and Next.js's build fails with
  // "ESLint must be installed in order to run during builds" otherwise.
  // Our safety net is the pre-push guard: gate 3 (tsc --noEmit) catches
  // type errors, gate 5 catches dynamic-segment collisions. ESLint policy
  // can be added later as a deliberate choice with a real rule set.
  eslint: { ignoreDuringBuilds: true },
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
          // CSP origins. WS23 (2026-08-19): trimmed AdSense/Google-Ads
          // allowlist (pagead2.googlesyndication, googlesyndication,
          // googletagservices, googletagmanager, google-analytics,
          // doubleclick, googletag). Re-added 2026-08-31 for AdSense
          // resubmit — the AdSense policy reviewer fetches pages and
          // expects the publisher script to load. Without these origins
          // the browser blocks pagead2.googlesyndication.com and the
          // site appears not to run AdSense, even though ads.txt is
          // correct. Consent gating is enforced in AdSenseLoader (the
          // script loads, but no ad fill is requested until
          // localStorage.cookie_consent === 'accepted').
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // AdSense / Google ad stack: required for the publisher
              // script (pagead2.googlesyndication.com) and the
              // iframes / images / XHR / beacons it loads.
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.accounts.dev https://clerk.rinkstop.com https://*.stripe.com https://pagead2.googlesyndication.com https://*.googlesyndication.com https://*.googletagmanager.com https://*.googletagservices.com https://*.googletag https://*.googleadservices.com https://*.google-analytics.com https://*.doubleclick.net",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: blob: https: https://pagead2.googlesyndication.com https://*.googlesyndication.com https://*.google.com https://*.doubleclick.net https://*.googleadservices.com",
              "font-src 'self' data: https://*.clerk.accounts.dev https://*.clerk.com https://fonts.gstatic.com",
              "connect-src 'self' https://*.clerk.accounts.dev https://clerk.rinkstop.com https://*.supabase.co https://api.stripe.com https://*.highlightly.net wss://*.supabase.co https://pagead2.googlesyndication.com https://*.googlesyndication.com https://*.googletagmanager.com https://*.google-analytics.com https://*.doubleclick.net https://*.googleadservices.com",
              "frame-src 'self' https://*.clerk.accounts.dev https://clerk.rinkstop.com https://js.stripe.com https://hooks.stripe.com https://www.youtube.com https://verification.didit.me https://verify.didit.me https://didit.me https://app.didit.me https://*.googlesyndication.com https://*.googletag https://*.doubleclick.net https://googleads.g.doubleclick.net",
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
      {
        source: '/dashboard/identity',
        headers: [
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=(self), interest-cohort=()' },
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
      // Legacy WordPress ghost URL — the only one still 404-ing on 2026-08-19.
      // Claude's audit flagged 4; only this one needed cleanup. The other
      // three (/index.php/contacts-us/, /index.php/terms-and-conditions/,
      // /index.php/store/) already 308-redirect to their canonical pages.
      {
        source: '/index.php/directory-rinks',
        destination: '/directory/rinks',
        permanent: true,
      },
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
      // Partner/businesses rename (WS7 PR1, 2026-07-23).
      // /partner → /partner-with-us (marketing page got its own slug).
      // /businesses → /partners (list + detail). Both /businesses/[id] and
      // /businesses/[id]/... go to /partners/[id]/... so deep links resolve.
      {
        source: '/partner',
        destination: '/partner-with-us',
        permanent: true,
      },
      {
        source: '/businesses',
        destination: '/partners',
        permanent: true,
      },
      {
        source: '/businesses/:path*',
        destination: '/partners/:path*',
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
      // Rink 404 redirects (SEO cleanup, 2026-07-19).
      // Source: /tmp/coverage-2026-07-19/Table.csv (GSC crawl errors).
      // Audit: rinkstop-content/seo/audit-404-slugs.mjs re-ran 2026-07-19,
      // resolved each old slug against the live Supabase `rinks` table.
      // 8 redirects go to a current canonical slug (verified to exist);
      // 8 redirect to the /directory/rinks listing because no exact or
      // fuzzy match was found in the DB.
      { source: '/directory/rinks/versowood-arena-heinola', destination: '/directory/rinks/versowood-arena', permanent: true },
      // 2026-09-03: removed broken redirect /scheels-arena → /scheels-arena-fargo
      // The target slug was never created in the DB; canonical slug is 'scheels-arena' (verified live 2026-09-03).
      // Removing the redirect lets /scheels-arena serve 200 directly instead of 308→404.
      { source: '/directory/rinks/td-place', destination: '/directory/rinks/td-place-arena', permanent: true },
      { source: '/directory/rinks/joynext-arena', destination: '/directory/rinks/joynext-arena-rudolf-harbig-halle', permanent: true },
      { source: '/directory/rinks/beijing-world-ice-arena-skating-rink-qinghe-mixc', destination: '/directory/rinks/world-ice-arena', permanent: true },
      { source: '/directory/rinks/olympia-eishalle', destination: '/directory/rinks/olympia-eishalle-munich', permanent: true },
      { source: '/directory/rinks/kisapuisto-kisapuiston-jaahalli', destination: '/directory/rinks/kisapuisto', permanent: true },
      { source: '/directory/rinks/rogers-arena-vancouver', destination: '/directory/rinks/rogers-arena', permanent: true },
      { source: '/directory/rinks/skellefte-kraft-arena', destination: '/directory/rinks', permanent: true },
      { source: '/directory/rinks/psd-bank-n-rnberg-arena', destination: '/directory/rinks', permanent: true },
      { source: '/directory/rinks/probonio-arena-kasseler-sportsworld', destination: '/directory/rinks', permanent: true },
      { source: '/directory/rinks/colee-financiere-sun-life', destination: '/directory/rinks', permanent: true },
      { source: '/directory/rinks/slush-puppie-place', destination: '/directory/rinks', permanent: true },
      { source: '/directory/rinks/st-ngebro-ishall', destination: '/directory/rinks', permanent: true },
      { source: '/directory/rinks/upplands-bilforum-arena-gr-nby-ishall', destination: '/directory/rinks', permanent: true },
      { source: '/directory/rinks/brantford-civic-centre', destination: '/directory/rinks', permanent: true },
      // Team 404 redirects (SEO cleanup, 2026-07-19).
      // Source: /tmp/coverage-2026-07-19/Table.csv (GSC crawl errors).
      // Audit: rinkstop-content/seo/audit-404-slugs.mjs re-ran 2026-07-19,
      // resolved each old slug against the live Supabase `teams` table.
      //
      // Cross-slug (5): verified city/country/league match for destination.
      { source: '/directory/teams/sochi', destination: '/directory/teams/hc-sochi', permanent: true },
      { source: '/directory/teams/cherepovets', destination: '/directory/teams/severstal-cherepovets', permanent: true },
      { source: '/directory/teams/vitiaz-podolsk', destination: '/directory/teams/podolsk', permanent: true },
      { source: '/directory/teams/modo-hockey', destination: '/directory/teams/modo-hockey-shl', permanent: true },
      { source: '/directory/teams/brynas-if', destination: '/directory/teams/brynas-if-shl', permanent: true },
      // Self-slug -> /directory/teams listing (626 redirects).
      // These slugs exist in `teams` table but not in `team_workspaces`,
      // so /directory/teams/[slug] returns 404 (page reads team_workspaces).
      // The listing these teams belong to is /directory/teams.
      // Missing-slug -> /directory/teams listing (12 redirects; 3 UUID test-data slugs removed).
      // No DB match found (UUIDs, test data, diacritics, renames).
      // Listing is the destination.
      { source: '/directory/teams/ska-neva-st-petersburg', destination: '/directory/teams', permanent: true },
      { source: '/directory/teams/test-team-seed', destination: '/directory/teams', permanent: true },
      { source: '/directory/teams/malm-redhawks', destination: '/directory/teams', permanent: true },
      { source: '/directory/teams/eisb-ren-m-nchen', destination: '/directory/teams', permanent: true },
      { source: '/directory/teams/orebro-hk', destination: '/directory/teams', permanent: true },
      { source: '/directory/teams/ss-t-pori', destination: '/directory/teams', permanent: true },
      { source: '/directory/teams/v-xj-lakers', destination: '/directory/teams', permanent: true },
      { source: '/directory/teams/barys-nur-sultan', destination: '/directory/teams', permanent: true },
      { source: '/directory/teams/lule-hf', destination: '/directory/teams', permanent: true },
      { source: '/directory/teams/ska-st-petersburg', destination: '/directory/teams', permanent: true },
      { source: '/directory/teams/d-sseldorfer-eg', destination: '/directory/teams', permanent: true },
      { source: '/directory/teams/abbottford-canucks', destination: '/directory/teams', permanent: true },
      // AdSense cleanliness — bare /rinks and /teams return 404 on the live
      // site; canonical home for those lists is /directory/{rinks,teams}.
      // 301 to the directory pages so any inbound link, sitemap discovery,
      // or accidental bookmark lands on real content rather than the 404
      // chrome (which still includes the off-season strip + nav + footer
      // but no body content — a "broken page" signal AdSense reviewers
      // flag when crawling sitemap-discovered URLs).
      //
      // 2026-09-01 — added to close the gap flagged in the
      // memory/adsense-resubmit-checklist-2026-09-01.md audit.
      { source: '/rinks', destination: '/directory/rinks', permanent: true },
      { source: '/teams', destination: '/directory/teams', permanent: true },
    ];
  },
};
module.exports = nextConfig;
