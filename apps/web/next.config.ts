import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Playwright and local curl use 127.0.0.1 while Next dev binds localhost.
  allowedDevOrigins: ['127.0.0.1'],
  transpilePackages: [
    '@society/shared',
    '@society/validation',
    '@society/authorization',
    '@society/database',
  ],
  serverExternalPackages: ['@node-rs/argon2', '@prisma/adapter-mariadb', 'mariadb', 'pino', 'exceljs'],
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          // Content-Security-Policy is emitted by proxy.ts with a fresh nonce
          // for every request; Next.js needs that nonce to hydrate safely.
        ],
      },
    ];
  },
};

export default nextConfig;
