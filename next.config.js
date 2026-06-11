const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
      {
        source: '/gear-brands',
        destination: '/gear-reviews',
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
