"use client";

import { GameWordEntry, GuessAttempt, getFallbackGuess, isCorrectGuess } from "./mockAgentService";
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
  const timeout = window.setTimeout(() => controller.abort(), 60000);

  try {
    const response = await fetch("/api/guess", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({ canvasImage, structuredDrawing, previousGuesses, userHints, round, locale }),
    });

    if (!response.ok) {
      throw new Error(response.status === 503 ? "connection_missing" : "guess_temporarily_failed");
    }
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
  } catch (error) {
    if (error instanceof Error && error.message === "connection_missing") throw error;
    const fallbackGuess = getFallbackGuess(targetWord, previousGuesses, round, userHints, true);
    return {
      guess: localizeGuess(fallbackGuess, locale),
      confidence: 0.28 + Math.random() * 0.28,
      reaction: locale === "zh" ? "我先顺着轮廓大胆猜一个。" : "I'll make a bold guess from the silhouette.",
      source: "fallback",
      isCorrect: isCorrectGuess(canonicalGuess(fallbackGuess), targetWord),
    };
  } finally {
    window.clearTimeout(timeout);
  }
}

function clampConfidence(value: unknown) {
  if (typeof value !== "number" || Number.isNaN(value)) return 0.5;
  return Math.max(0, Math.min(1, value));
}
