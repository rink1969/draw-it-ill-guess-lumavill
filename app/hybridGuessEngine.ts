"use client";

import { GameWordEntry, GuessAttempt, isCorrectGuess } from "./mockAgentService";
import { StructuredDrawing } from "./drawingCodec";
import { canonicalGuess, Locale, localizeGuess } from "./i18n";

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
  locale,
}: {
  canvasImage: string;
  structuredDrawing: StructuredDrawing | null;
  previousGuesses: string[];
  userHints: string[];
  round: number;
  targetWord: GameWordEntry;
  locale: Locale;
}): Promise<GuessAttempt> {
  const controller = new AbortController();
  // Vision providers often need extra time for image input or a cold start.
  const timeout = window.setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch("/api/guess", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({ canvasImage, structuredDrawing, previousGuesses, userHints, round, locale }),
    });

    if (!response.ok) throw new Error("Kaka blinked at the drawing for too long.");
    const data = (await response.json()) as VisionGuessResponse;
    const guess = data.guess?.trim();
    if (!guess) throw new Error("Kaka made a mystery noise instead of a guess.");

    return {
      guess: localizeGuess(guess, locale),
      confidence: clampConfidence(data.confidence),
      reaction: data.reaction,
      source: "vision",
      isCorrect: isCorrectGuess(canonicalGuess(guess), targetWord),
    };
  } finally {
    window.clearTimeout(timeout);
  }
}

function clampConfidence(value: unknown) {
  if (typeof value !== "number" || Number.isNaN(value)) return 0.5;
  return Math.max(0, Math.min(1, value));
}
