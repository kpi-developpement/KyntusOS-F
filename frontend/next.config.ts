import type { NextConfig } from "next";

const target = process.env.BACKEND_URL || "http://10.10.10.25:8082";

const nextConfig: NextConfig = {
  transpilePackages: ["animejs"],
  reactCompiler: true,
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "500mb",
    },
    // 🔥 PROXY /api (rewrites) : Next.js 16 kay-limiti par défaut l-body
    //    l 10 Mo w l-timeout l 30s. Ay upload kbir (record 30-80 Mo) wla
    //    facture li kat-dewwem > 30s kan kay-rje3 "Internal Server Error".
    proxyClientMaxBodySize: "500mb",
    proxyTimeout: 15 * 60 * 1000, // 15 min (generation facture + gros imports)
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${target}/api/:path*`,
      },
      {
        source: "/ws/:path*",
        destination: `${target}/ws/:path*`,
      },
    ];
  },
};

export default nextConfig;