import type { NextConfig } from "next";

const nextConfig: NextConfig = process.env.VERCEL === "1"
  ? {
      turbopack: {
        root: process.cwd(),
        resolveAlias: {
          "cloudflare:workers": "./db/vercel-env.ts",
        },
      },
    }
  : {};

export default nextConfig;
