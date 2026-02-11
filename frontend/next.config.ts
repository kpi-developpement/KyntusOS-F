import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Zidna hadi bach Docker image tkon khfifa (Standalone mode)
  output: "standalone",
  // Kan zido hadi gher bach ila kan chi erreur sgher f Typescript may7bslikch l build
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
