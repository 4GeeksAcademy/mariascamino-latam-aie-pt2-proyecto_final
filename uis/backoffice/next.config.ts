import type { NextConfig } from "next";

// The browser calls /api/* on the backoffice itself; the Next.js server forwards it to the
// FastAPI container using the Docker service name (API_INTERNAL_URL, e.g. http://api:8000).
// This way no connection URL uses localhost inside the Docker network.
const API_INTERNAL_URL = process.env.API_INTERNAL_URL ?? "http://api:8000";

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_INTERNAL_URL}/:path*` }];
  },
};

export default nextConfig;
