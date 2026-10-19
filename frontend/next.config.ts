import type { NextConfig } from "next";

const target = process.env.NODE_ENV === 'production' 
    ? 'http://backend:8082' 
    : 'http://localhost:8082';

const nextConfig: NextConfig = {
  transpilePackages: ['animejs'],
  reactCompiler: true,
  output: "standalone",
  
  // 🔥 Bash TypeScript w ESLint ma-y-blokiwch l-build f' Docker
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // 🔥 N-khelliw Next.js y-qbel les fichiers kbar
  experimental: {
    serverActions: {
      bodySizeLimit: '500mb',
    },
  },
  
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${target}/api/:path*`, 
      },
      {
        source: '/ws/:path*',
        destination: `${target}/ws/:path*`,
      }
    ];
  },
};

export default nextConfig;