import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  transpilePackages: ["@nido/db", "@nido/paie-engine", "@nido/ui"],
};

export default nextConfig;
