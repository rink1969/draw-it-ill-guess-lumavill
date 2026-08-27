import type { NextConfig } from "next";

// BASE_PATH is set by the GitHub Actions deploy workflow to this repository name so the
// static export is served correctly under the GitHub Pages project-site subpath.
// Next.js requires basePath to be empty or start with a leading slash, so we
// normalize here. It is left empty for local npm start (served at the root), which
// keeps dev working the same as before.
function strip(raw: string | undefined): string {
  let s = raw || "";
  while (s.startsWith("/")) s = s.slice(1);
  while (s.endsWith("/")) s = s.slice(0, -1);
  return s;
}

const normalized = strip(process.env.BASE_PATH);
const basePath = normalized ? "/" + normalized : "";

const nextConfig: NextConfig = {
  // Pure frontend: produce static HTML/JS/CSS in ./out served by any static host.
  output: "export",
  basePath,
};

export default nextConfig;
