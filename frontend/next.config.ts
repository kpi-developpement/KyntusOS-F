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