import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pure frontend: produce static HTML/JS/CSS in ./out served by any static host.
  output: "export",
};

export default nextConfig;
