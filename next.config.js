const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.resolve.alias['@'] = path.resolve(__dirname, 'src');
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  async redirects() {
    return [
      {
        source: '/scores',
        destination: '/directory/fixtures',
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
