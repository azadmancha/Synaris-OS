/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Legacy format (Next.js 12-13)
    domains: [
      'localhost',
      'lh3.googleusercontent.com',  // Google avatars
      'avatars.githubusercontent.com',
    ],
    // Modern format (Next.js 14+) — supports wildcard patterns for Vercel preview URLs
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: '*.vercel.app',       // Vercel preview deployments
      },
    ],
  },
  // Vercel automatically assigns NEXT_PUBLIC_SITE_URL in production.
  // This is used by the Supabase auth redirect flow.
  experimental: {},

  // Pass Sentry environment variables to the browser bundle
  env: {
    NEXT_PUBLIC_SENTRY_DSN: process.env.SENTRY_DSN || '',
    NEXT_PUBLIC_SENTRY_TRACES_RATE: process.env.SENTRY_TRACES_RATE || '0.1',
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
