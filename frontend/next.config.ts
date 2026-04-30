import type { NextConfig } from "next";


const backendUrl = process.env.BACKEND_URL || 'http://localhost:8082';

const nextConfig: NextConfig = {
  transpilePackages: ['animejs'],
  reactCompiler: true,
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // THE MASTER FIX: Proxy Dynamique 
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`, // Daba kay-tbdel 3la 7sab l-environnement
      },
      {
        source: '/ws/:path*',
        destination: `${backendUrl}/ws/:path*`,
      }
    ];
  },
};

export default nextConfig;