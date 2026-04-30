import type { NextConfig } from "next";

// 🔥 THE ABSOLUTE BULLETPROOF FIX 🔥
// Mnin kanderou 'npm run dev' (Local) -> NODE_ENV kat-koun 'development'
// Mnin kanderou 'npm run build' (Docker) -> Next.js kay-forci NODE_ENV='production'
const isDev = process.env.NODE_ENV === 'development';
const backendUrl = isDev ? 'http://localhost:8082' : 'http://backend:8082';

const nextConfig: NextConfig = {
  transpilePackages: ['animejs'],
  reactCompiler: true,
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`, // Daba gha t-tgra "http://backend:8082" f' Docker dreyyef!
      },
      {
        source: '/ws/:path*',
        destination: `${backendUrl}/ws/:path*`,
      }
    ];
  },
};

export default nextConfig;