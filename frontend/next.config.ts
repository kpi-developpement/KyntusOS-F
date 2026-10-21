import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  
  // 🔥 Rje3na l-Ignores dyalek bach ma-y-bloka l-build 3la qbel des types sghar
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  experimental: {
    serverActions: {
      body: {
         sizeLimit: '500mb'
      },
    },
  },
  
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        // L-IP dyal l-host bach Next.js y-hder direct m3a Spring Boot
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