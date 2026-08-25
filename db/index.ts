import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export function getDb() {
  if (!env.DB) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Set the `d1` field in .openai/hosting.json to `DB` or let your control plane inject the real binding values before using the database."
    );
  }

  return drizzle(env.DB, { schema });
}

let initialized: Promise<void> | null = null;

export function ensureMemoryStorage() {
  if (!env.DB) throw new Error("Cloudflare D1 binding `DB` is unavailable.");
  if (!initialized) {
    initialized = env.DB.batch([
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS memories (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        save_key TEXT NOT NULL,
        title TEXT NOT NULL,
        story TEXT NOT NULL,
        target_word TEXT NOT NULL,
        emoji TEXT DEFAULT '' NOT NULL,
        category TEXT NOT NULL,
        difficulty TEXT NOT NULL,
        drawing_data_url TEXT NOT NULL,
        attempts_json TEXT NOT NULL,
        solved INTEGER DEFAULT false NOT NULL,
        provider TEXT NOT NULL,
        model TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
      )`),
      env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_memories_save_key ON memories (save_key)"),
    ]).then(() => undefined).catch((error) => {
      initialized = null;
      throw error;
    });
  }
  return initialized;
}
