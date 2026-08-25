// Vercel has no Cloudflare D1 binding. This keeps non-memory API routes deployable.
export const env: { DB?: unknown } = {};
