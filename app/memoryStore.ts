// Local-storage persistence for the drawing "memories".

export type GameMemoryAttempt = {
  guess: string;
  confidence: number;
  isCorrect: boolean;
  source: string;
};

export interface GameMemory {
  saveKey: string;
  title: string;
  story: string;
  targetWord: string;
  emoji: string;
  category: string;
  difficulty: string;
  drawingDataUrl: string;
  attempts: GameMemoryAttempt[];
  solved: boolean;
  provider: string;
  model: string;
  createdAt: string;
}

const STORAGE_KEY = "lumavill-memories";
const MAX_MEMORIES = 20;
const MAX_DRAWING_BYTES = 2_000_000;

function clean(value: unknown, maxLength: number) {
  return String(value ?? "").trim().slice(0, maxLength);
}

export interface MemoryInput {
  saveKey?: string;
  title?: string;
  story?: string;
  targetWord?: string;
  emoji?: string;
  category?: string;
  difficulty?: string;
  drawingDataUrl?: string;
  attempts?: GameMemoryAttempt[];
  solved?: boolean;
  provider?: string;
  model?: string;
}

export type SaveMemoryResult = { ok: true } | { ok: false; error: string };

// Build + validate a memory from the payload coming out of the game.
export function createMemory(input: MemoryInput): { ok: true; memory: GameMemory } | { ok: false; error: string } {
  const saveKey = clean(input.saveKey ?? `${Date.now()}-${Math.random()}`, 80);
  const title = clean(input.title ?? "", 100);
  const story = clean(input.story ?? "", 240);
  const targetWord = clean(input.targetWord ?? "", 80);
  const category = clean(input.category ?? "", 40);
  const difficulty = clean(input.difficulty ?? "", 24);
  const drawingDataUrl = String(input.drawingDataUrl ?? "");

  if (!saveKey || !title || !targetWord || !category || !difficulty) {
    return { ok: false, error: "Memory details are incomplete." };
  }
  if (!drawingDataUrl.startsWith("data:image/") || drawingDataUrl.length > MAX_DRAWING_BYTES) {
    return { ok: false, error: "Drawing is missing or too large to save." };
  }

  const attempts = Array.isArray(input.attempts)
    ? input.attempts
        .slice(0, 20)
        .map((attempt) => ({
          guess: clean(attempt.guess, 60),
          confidence: Math.max(0, Math.min(1, Number(attempt.confidence ?? 0))),
          isCorrect: Boolean(attempt.isCorrect),
          source: clean(attempt.source, 20),
        }))
    : [];

  const memory: GameMemory = {
    saveKey,
    title,
    story,
    targetWord,
    emoji: clean(input.emoji ?? "", 12),
    category,
    difficulty,
    drawingDataUrl,
    attempts,
    solved: Boolean(input.solved),
    provider: clean(input.provider ?? "local-fallback", 20),
    model: clean(input.model ?? "local-fallback", 120),
    createdAt: new Date().toISOString(),
  };

  return { ok: true, memory };
}

// Save a single memory, de-duplicating by saveKey and trimming to MAX_MEMORIES.
export function saveMemory(input: MemoryInput): SaveMemoryResult {
  const built = createMemory(input);
  if (!built.ok) return { ok: false, error: built.error };

  try {
    const kept = getMemories().filter((memory) => memory.saveKey !== built.memory.saveKey);
    kept.unshift(built.memory);
    while (kept.length > MAX_MEMORIES) kept.pop();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(kept));
    return { ok: true };
  } catch {
    return { ok: false, error: "Kaka could not save this memory (storage full)." };
  }
}

export function getMemories(): GameMemory[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, MAX_MEMORIES) : [];
  } catch {
    return [];
  }
}

export function removeMemory(saveKey: string) {
  try {
    const kept = getMemories().filter((memory) => memory.saveKey !== saveKey);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(kept));
  } catch {
    // ignore
  }
}
