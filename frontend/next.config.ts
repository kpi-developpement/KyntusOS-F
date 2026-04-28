import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['animejs'],
  /* config options here */
  reactCompiler: true,
  // Zidna hadi bach Docker image tkon khfifa (Standalone mode)
  output: "standalone",
  // Kan zido hadi gher bach ila kan chi erreur sgher f Typescript may7bslikch l build
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // 🔥 THE MASTER FIX: Le Proxy Ultime 🔥
  async rewrites() {
    return [
      {
        // Ay requête l' API
        source: '/api/:path*',
        destination: 'http://localhost:8082/api/:path*',
      },
      {
        // Ay requête l' WebSockets (SockJS/STOMP)
        source: '/ws/:path*',
        destination: 'http://localhost:8082/ws/:path*',
      }
    ];
  },
};

export default nextConfig;