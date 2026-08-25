import { desc, eq } from "drizzle-orm";
import { ensureMemoryStorage, getDb } from "../../../db";
import { memories } from "../../../db/schema";
import { readConnection } from "../../modelConnection";

type MemoryPayload = {
  saveKey?: string;
  title?: string;
  story?: string;
  targetWord?: string;
  emoji?: string;
  category?: string;
  difficulty?: string;
  drawingDataUrl?: string;
  attempts?: Array<{ guess?: string; confidence?: number; isCorrect?: boolean; source?: string }>;
  solved?: boolean;
};

export async function GET() {
  try {
    await ensureMemoryStorage();
    const rows = await getDb().select({
      id: memories.id,
      title: memories.title,
      story: memories.story,
      targetWord: memories.targetWord,
      emoji: memories.emoji,
      category: memories.category,
      difficulty: memories.difficulty,
      drawingDataUrl: memories.drawingDataUrl,
      attemptsJson: memories.attemptsJson,
      solved: memories.solved,
      provider: memories.provider,
      model: memories.model,
      createdAt: memories.createdAt,
    }).from(memories).orderBy(desc(memories.id)).limit(20);

    return Response.json({ memories: rows.map((row) => ({ ...row, attempts: JSON.parse(row.attemptsJson), attemptsJson: undefined })) });
  } catch (error) {
    return databaseError(error);
  }
}

export async function POST(request: Request) {
  try {
    await ensureMemoryStorage();
    const payload = await request.json() as MemoryPayload;
    const saveKey = clean(payload.saveKey, 80);
    const title = clean(payload.title, 100);
    const story = clean(payload.story, 240);
    const targetWord = clean(payload.targetWord, 80);
    const category = clean(payload.category, 40);
    const difficulty = clean(payload.difficulty, 24);
    const drawingDataUrl = String(payload.drawingDataUrl ?? "");
    const attempts = Array.isArray(payload.attempts) ? payload.attempts.slice(0, 20).map((attempt) => ({
      guess: clean(attempt.guess, 60),
      confidence: Math.max(0, Math.min(1, Number(attempt.confidence ?? 0))),
      isCorrect: Boolean(attempt.isCorrect),
      source: clean(attempt.source, 20),
    })) : [];

    if (!saveKey || !title || !targetWord || !category || !difficulty) {
      return Response.json({ error: "Memory details are incomplete." }, { status: 400 });
    }
    if (!drawingDataUrl.startsWith("data:image/") || drawingDataUrl.length > 2_000_000) {
      return Response.json({ error: "Drawing is missing or too large to save." }, { status: 400 });
    }
    const db = getDb();
    const connection = await readConnection(request);
    const existing = await db.select({ id: memories.id }).from(memories).where(eq(memories.saveKey, saveKey)).limit(1);
    if (existing[0]) return Response.json({ id: existing[0].id, saved: true });

    const [memory] = await db.insert(memories).values({
      saveKey,
      title,
      story,
      targetWord,
      emoji: clean(payload.emoji, 12),
      category,
      difficulty,
      drawingDataUrl,
      attemptsJson: JSON.stringify(attempts),
      solved: Boolean(payload.solved),
      provider: connection ? "visitor" : "fallback",
      model: connection?.model ?? "local-fallback",
    }).returning({ id: memories.id, createdAt: memories.createdAt });

    return Response.json({ memory, saved: true }, { status: 201 });
  } catch (error) {
    return databaseError(error);
  }
}

function clean(value: unknown, maxLength: number) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function databaseError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  const unavailable = message.includes("no such table") || message.includes("D1 binding");
  return Response.json(
    { error: unavailable ? "Memory storage is not ready yet." : "Mimi could not save this memory. Please try again." },
    { status: 500 },
  );
}
