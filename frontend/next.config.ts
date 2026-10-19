/** @type {import('next').NextConfig} */
const nextConfig = {
  // 🔥 HADCHI LI GHAY-KHELLI NEXT.JS Y-QBEL LES FICHIERS KBAR 🔥
  api: {
    bodyParser: {
      sizeLimit: '500mb',
    },
    responseLimit: '500mb',
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://backend:8082/api/:path*', // Proxy l-Spring Boot wst Docker
      },
    ];
  },
};

module.exports = nextConfig;