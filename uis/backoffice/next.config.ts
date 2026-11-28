import { execSync } from "node:child_process";
import type { NextConfig } from "next";

/** Short SHA of the commit being built: telemetry `appVersion` / `app_release`. */
function gitSha(): string {
  try {
    return execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return ""; // no git (e.g. Docker build context): telemetry reports an unknown release
  }
}

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION || gitSha(),
  },
};

export default nextConfig;
