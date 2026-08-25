import { sql } from "drizzle-orm";
import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const memories = sqliteTable("memories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  saveKey: text("save_key").notNull(),
  title: text("title").notNull(),
  story: text("story").notNull(),
  targetWord: text("target_word").notNull(),
  emoji: text("emoji").notNull().default(""),
  category: text("category").notNull(),
  difficulty: text("difficulty").notNull(),
  drawingDataUrl: text("drawing_data_url").notNull(),
  attemptsJson: text("attempts_json").notNull(),
  solved: integer("solved", { mode: "boolean" }).notNull().default(false),
  provider: text("provider").notNull(),
  model: text("model").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("idx_memories_save_key").on(table.saveKey),
]);
