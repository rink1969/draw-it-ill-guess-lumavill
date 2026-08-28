// Build a URL to a public/static asset that resolves correctly whether the static
// export is served from the root (local npm start) or a subpath (GitHub Pages
// project site).
//
// Next.js does not expose its `basePath` to client code, so the root layout injects
// the build-time `process.env.BASE_PATH` into `window.__DSH_BASE_PATH`; this helper
// reads it and prepends the base path when present.

declare global {
  interface Window {
    __DSH_BASE_PATH?: string;
  }
}

export function asset(path: string): string {
  const base = (typeof window !== 'undefined' && window.__DSH_BASE_PATH) || (typeof process !== 'undefined' && process.env?.BASE_PATH) || '';
  const clean = path.startsWith('/') ? path.slice(1) : path;
  return base ? `/${base}/${clean}` : `/${clean}`;
}
