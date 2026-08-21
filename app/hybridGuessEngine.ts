"use client";

import { GameWordEntry, GuessAttempt, getFallbackGuess, isCorrectGuess } from "./mockAgentService";
import { StructuredDrawing } from "./drawingCodec";

type VisionGuessResponse = {
  guess?: string;
  confidence?: number;
  reaction?: string;
};

export async function requestHybridGuess({
  canvasImage,
  structuredDrawing,
  previousGuesses,
  userHints,
  round,
  targetWord,
}: {
  canvasImage: string;
  structuredDrawing: StructuredDrawing | null;
  previousGuesses: string[];
  userHints: string[];
  round: number;
  targetWord: GameWordEntry;
}): Promise<GuessAttempt> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 4200);

  try {
    const response = await fetch("/api/guess", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({ canvasImage, structuredDrawing, previousGuesses, userHints, round }),
    });

    if (!response.ok) throw new Error("Mimi blinked at the drawing for too long.");
    const data = (await response.json()) as VisionGuessResponse;
    const guess = data.guess?.trim();
    if (!guess) throw new Error("Mimi made a mystery noise instead of a guess.");

    return {
      guess,
      confidence: clampConfidence(data.confidence),
      reaction: data.reaction,
      source: "vision",
      isCorrect: isCorrectGuess(guess, targetWord),
    };
  } catch {
    const guess = getFallbackGuess(targetWord, previousGuesses, round, userHints);
    return {
      guess,
      confidence: fallbackConfidence(round),
      source: "fallback",
      isCorrect: isCorrectGuess(guess, targetWord),
    };
  } finally {
    window.clearTimeout(timeout);
  }
}

function clampConfidence(value: unknown) {
  if (typeof value !== "number" || Number.isNaN(value)) return 0.5;
  return Math.max(0, Math.min(1, value));
}

function fallbackConfidence(round: number) {
  const base = round === 1 ? 0.34 : round === 2 ? 0.52 : 0.68;
  return Math.min(0.86, base + Math.random() * 0.18);
}
