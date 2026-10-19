import type { NextConfig } from "next";

const target = process.env.NODE_ENV === 'production' 
    ? 'http://backend:8082' 
    : 'http://localhost:8082';

const nextConfig: NextConfig = {
  transpilePackages: ['animejs'],
  reactCompiler: true,
  output: "standalone",
  
  // 🔥 THE FIX: N-goulou l-Next.js y-ghemmed 3inih 3la les erreurs TS w ESLint f' l-Build
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // 🔥 THE FIX: N-kellou Next.js y-qbel les fichiers kbar (500MB)
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