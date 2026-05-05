import type { NextConfig } from "next";

const target = process.env.NODE_ENV === 'production' 
    ? 'http://backend:8082' 
    : 'http://localhost:8082';

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