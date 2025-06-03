// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
      serverComponentsExternalPackages: ['@prisma/client', 'prisma']
    },
    // Wyłącz statyczne generowanie dla API routes
    async rewrites() {
      return []
    },
    // Konfiguracja dla Vercel
    async headers() {
      return [
        {
          source: '/api/:path*',
          headers: [
            {
              key: 'Access-Control-Allow-Origin',
              value: '*'
            },
            {
              key: 'Access-Control-Allow-Methods',
              value: 'GET, POST, PUT, DELETE, OPTIONS'
            },
            {
              key: 'Access-Control-Allow-Headers',
              value: 'Content-Type, Authorization'
            },
            {
              key: 'Cache-Control',
              value: 'public, max-age=300, stale-while-revalidate=60' // 5 min cache
            }
          ]
        }
      ];
    }
  };
  
  module.exports = nextConfig;