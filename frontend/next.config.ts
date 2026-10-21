import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  
  // N-khelliw Next.js y-qbel les fichiers kbar
  experimental: {
    serverActions: {
      bodySizeLimit: '500mb',
    },
  },
  
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        // 🔥 L-FIX L-7ARBI: Forcina Next.js y-mchi direct l-l'IP dyal host dyalek!
        destination: 'http://10.10.10.25:8082/api/:path*', 
      },
      {
        source: '/ws/:path*',
        destination: 'http://10.10.10.25:8082/ws/:path*',
      }
    ];
  },
};

export default nextConfig;