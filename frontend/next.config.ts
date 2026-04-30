import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['animejs'],
  reactCompiler: true,
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  
  async rewrites() {
    // 🔥 THE MASTER FIX: L'Evaluation Dynamique hna l-dakhel
    const backendUrl = process.env.BACKEND_URL || 'http://backend:8082';
    
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`, 
      },
      {
        source: '/ws/:path*',
        destination: `${backendUrl}/ws/:path*`,
      }
    ];
  },
};

export default nextConfig;