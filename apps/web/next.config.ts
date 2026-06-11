import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  transpilePackages: ["@nido/db", "@nido/ui"],
};

export default nextConfig;
