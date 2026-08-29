import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Project root = monorepo root so Turbopack can resolve ../../src/ imports
    root: path.resolve(__dirname, "../.."),
  },
};

export default nextConfig;