"use client";

import { GameWordEntry, GuessAttempt, getFallbackGuess, isCorrectGuess } from "./mockAgentService";
import { StructuredDrawing } from "./drawingCodec";
import { canonicalGuess, Locale, localizeGuess } from "./i18n";
import { readConnection } from "./modelConnection";
import { buildVisionPrompt, runCustomVisionGuess } from "./modelGateway";

type VisionGuessResponse = {
  guess?: string;
  confidence?: number;
  reaction?: string;
};

// Drive a single guessing round. When the player has not connected their own
// vision model we bail with "connection_missing" so the UI can ask them to
// reconnect. Otherwise a failed/failed-to-reach model degrades gracefully to a
// pure-locale fallback guess so the game is always playable.
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
  const connection = readConnection();
  if (!connection) throw new Error("connection_missing");

  const controller = new AbortController();
  // Vision providers often need extra time for image input or a cold start.
  const timeout = window.setTimeout(() => controller.abort(), 60000);

  try {
    const prompt = buildVisionPrompt({ round, previousGuesses, userHints, structuredDrawing, locale });
    const { guess, confidence, reaction } = await runCustomVisionGuess(connection, prompt, canvasImage);
    return {
      guess: localizeGuess(guess, locale),
      confidence: clampConfidence(confidence),
      reaction,
      source: "vision",
      isCorrect: isCorrectGuess(canonicalGuess(guess), targetWord),
    };
  } catch (error) {
    // Any failure reaching/reading the connected model (CORS, network, bad key,
    // empty response, ...) falls back to a local guess so play continues.
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
