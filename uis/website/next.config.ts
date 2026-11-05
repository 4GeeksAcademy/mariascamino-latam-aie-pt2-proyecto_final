import type { NextConfig } from "next";

// The public HealthCore site is static HTML (public/index.html, public/application.html).
// Next.js serves it as-is; "/" is rewritten to the landing page.
const nextConfig: NextConfig = {
  async rewrites() {
    return {
      beforeFiles: [{ source: "/", destination: "/index.html" }],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
