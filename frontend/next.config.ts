import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['animejs'],
  reactCompiler: true,
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  
  async rewrites() {
    // 🔥 THE MASTER FIX: F' Docker dima 'production', f' l-PC dima 'development'
    // Hakka kan-t-faddaw ga3 machakil dyal Docker Env Variables!
    const target = process.env.NODE_ENV === 'production' 
        ? 'http://backend:8082' 
        : 'http://localhost:8082';

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