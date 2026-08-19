"use client";

import { GameWordEntry, GuessAttempt, getFallbackGuess, isCorrectGuess } from "./mockAgentService";

type VisionGuessResponse = {
  guess?: string;
  confidence?: number;
  reaction?: string;
};

export async function requestHybridGuess({
  canvasImage,
  previousGuesses,
  round,
  targetWord,
}: {
  canvasImage: string;
  previousGuesses: string[];
  round: number;
  targetWord: GameWordEntry;
}): Promise<GuessAttempt> {
  try {
    const response = await fetch("/api/guess", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ canvasImage, previousGuesses, round }),
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
    const guess = getFallbackGuess(targetWord, previousGuesses, round);
    return {
      guess,
      confidence: round === 3 ? 0.7 : 0.48,
      source: "fallback",
      isCorrect: isCorrectGuess(guess, targetWord),
    };
  }
}

function clampConfidence(value: unknown) {
  if (typeof value !== "number" || Number.isNaN(value)) return 0.5;
  return Math.max(0, Math.min(1, value));
}
