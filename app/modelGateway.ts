import { CustomModelConnection } from "./modelConnection";

export type ModelGuess = { guess: string; confidence: number; reaction: string };

function chatCompletionsEndpoint(baseUrl: string) {
  const base = baseUrl.replace(/\/$/, "");
  return base.endsWith("/chat/completions") ? base : `${base}${base.endsWith("/v1") ? "" : "/v1"}/chat/completions`;
}

async function providerError(response: Response) {
  let detail = "";
  try {
    const data = await response.json() as { error?: { message?: string } | string; message?: string };
    detail = typeof data.error === "string" ? data.error : data.error?.message ?? data.message ?? "";
  } catch {
    // Some compatible providers return an empty or non-JSON error response.
  }
  const safeDetail = detail
    .replace(/(?:sk-|key-)[A-Za-z0-9_-]{8,}/gi, "[redacted]")
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .slice(0, 180);
  return new Error(`provider_${response.status}${safeDetail ? `: ${safeDetail}` : ""}`);
}

export async function testCustomModelConnection(connection: CustomModelConnection) {
  const response = await fetch(chatCompletionsEndpoint(connection.baseUrl), {
    method: "POST",
    headers: { Authorization: `Bearer ${connection.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: connection.model,
      max_tokens: 8,
      messages: [{ role: "user", content: "Reply with READY." }],
    }),
  });
  if (!response.ok) throw await providerError(response);
}

export async function runCustomVisionGuess(connection: CustomModelConnection, prompt: string, canvasImage: string): Promise<ModelGuess> {
  const response = await fetch(chatCompletionsEndpoint(connection.baseUrl), {
    method: "POST",
    headers: { Authorization: `Bearer ${connection.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: connection.model,
      max_tokens: 180,
      messages: [{ role: "user", content: [
        { type: "text", text: prompt },
        { type: "image_url", image_url: { url: canvasImage } },
      ] }],
    }),
  });
  if (!response.ok) throw await providerError(response);
  const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  return parseGuess(data.choices?.[0]?.message?.content ?? "{}");
}

function parseGuess(raw: string): ModelGuess {
  const json = raw.match(/\{[\s\S]*\}/)?.[0] ?? "{}";
  const parsed = JSON.parse(json) as Partial<ModelGuess>;
  const guess = String(parsed.guess ?? "").trim().slice(0, 60);
  if (!guess) throw new Error("empty_guess");
  return {
    guess,
    confidence: typeof parsed.confidence === "number" ? Math.max(0, Math.min(1, parsed.confidence)) : 0.5,
    reaction: String(parsed.reaction ?? "").slice(0, 120),
  };
}

export type StructuredPromptDrawing = {
  canvas?: string;
  drawingSvg?: string;
  asciiGrid?: string;
  asciiGridNote?: string;
  strokeCount?: number;
};

// Assemble the "hidden target" prompt sent to a vision model. The target
// word is intentionally never included here.
export function buildVisionPrompt({
  round,
  previousGuesses,
  userHints,
  structuredDrawing,
  locale,
}: {
  round?: number;
  previousGuesses?: string[];
  userHints?: string[];
  structuredDrawing?: StructuredPromptDrawing | null;
  locale?: "en" | "zh";
}): string {
  const roundNumber = Number.isFinite(round) ? round : 1;
  const prior = Array.isArray(previousGuesses) ? previousGuesses.slice(-12) : [];
  const hints = Array.isArray(userHints)
    ? userHints.map((hint) => String(hint).trim()).filter(Boolean).slice(-6)
    : [];
  return [
    "You are Kaka, a playful AI companion playing a drawing guessing game.",
    "Look carefully at the user's drawing image and the structured drawing data, then guess what object or concept it represents.",
    `Current round: ${roundNumber}.`,
    `Previous guesses: ${prior.length ? prior.join(", ") : "none"}.`,
    `User text hints: ${hints.length ? hints.join(" | ") : "none"}.`,
    structuredDrawing
      ? `Canvas: ${structuredDrawing.canvas ?? "1000x700"}. Stroke count: ${structuredDrawing.strokeCount ?? 0}.`
      : "No structured drawing data was available.",
    structuredDrawing ? `SVG path data:\n${structuredDrawing.drawingSvg ?? ""}` : "",
    structuredDrawing ? `ASCII grid:\n${structuredDrawing.asciiGrid ?? ""}` : "",
    structuredDrawing ? structuredDrawing.asciiGridNote ?? "" : "",
    "Use the overall silhouette and stroke direction. Do not overfit to a single mark.",
    `Never guess any of these previous answers; always pick something else: ${prior.length ? prior.join(", ") : "none"}.`,
    "If you are not quite sure, use a LOW confidence (0.1-0.4); do not fabricate a confident guess for something you cannot see.",
    "Combine the user hints to narrow down to a single most likely answer, but still make only one concise guess. Do not repeat previous guesses. It is okay to be wrong.",
    locale === "zh" ? "Write the guess and reaction in Simplified Chinese only." : "Write the guess and reaction in English only.",
    "Return only JSON with this shape: {\"guess\":\"...\",\"confidence\":0.0,\"reaction\":\"...\"}.",
  ]
    .filter(Boolean)
    .join("\n\n");
}
