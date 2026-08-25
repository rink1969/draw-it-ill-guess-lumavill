import { readConnection } from "../../modelConnection";
import { runCustomVisionGuess } from "../../modelGateway";

type GuessRequest = {
  canvasImage?: string;
  structuredDrawing?: {
    canvas?: string;
    drawingSvg?: string;
    asciiGrid?: string;
    asciiGridNote?: string;
    strokeCount?: number;
  } | null;
  round?: number;
  previousGuesses?: string[];
  userHints?: string[];
  locale?: "en" | "zh";
};

export async function POST(request: Request) {
  const payload = await request.json() as GuessRequest;
  const canvasImage = payload.canvasImage?.trim();
  const structuredDrawing = sanitizeStructuredDrawing(payload.structuredDrawing);
  const round = Number.isFinite(payload.round) ? payload.round : 1;
  const previousGuesses = Array.isArray(payload.previousGuesses) ? payload.previousGuesses.slice(-12) : [];
  const userHints = Array.isArray(payload.userHints)
    ? payload.userHints.map((hint) => String(hint).trim()).filter(Boolean).slice(-6)
    : [];
  const locale = payload.locale === "zh" ? "zh" : "en";

  if (!canvasImage?.startsWith("data:image/png;base64,")) {
    return Response.json({ error: "Drawing image is required." }, { status: 400 });
  }

  const prompt = [
    "You are Kaka, a playful AI companion playing a drawing guessing game.",
    "Look carefully at the user's drawing image and the structured drawing data, then guess what object or concept it represents.",
    `Current round: ${round}.`,
    `Previous guesses: ${previousGuesses.length ? previousGuesses.join(", ") : "none"}.`,
    `User text hints: ${userHints.length ? userHints.join(" | ") : "none"}.`,
    structuredDrawing ? `Canvas: ${structuredDrawing.canvas}. Stroke count: ${structuredDrawing.strokeCount}.` : "No structured drawing data was available.",
    structuredDrawing ? `SVG path data:\n${structuredDrawing.drawingSvg}` : "",
    structuredDrawing ? `ASCII grid:\n${structuredDrawing.asciiGrid}` : "",
    structuredDrawing ? structuredDrawing.asciiGridNote : "",
    "Use the overall silhouette and stroke direction. Do not overfit to a single mark.",
    "Use user hints as clues, but still make only one concise guess. Do not repeat previous guesses. It is okay to be wrong.",
    locale === "zh" ? "Write the guess and reaction in Simplified Chinese only." : "Write the guess and reaction in English only.",
    "Return only JSON with this shape: {\"guess\":\"...\",\"confidence\":0.0,\"reaction\":\"...\"}.",
  ].filter(Boolean).join("\n\n");

  try {
    const customConnection = await readConnection(request);
    if (customConnection) return Response.json(await runCustomVisionGuess(customConnection, prompt, canvasImage));
    return Response.json({ error: "Connect your own model to enable vision guessing." }, { status: 503 });
  } catch {
    return Response.json({ error: "Kaka got distracted." }, { status: 502 });
  }
}

function sanitizeStructuredDrawing(input: GuessRequest["structuredDrawing"]) {
  if (!input) return null;
  return {
    canvas: String(input.canvas ?? "1000x700").slice(0, 24),
    drawingSvg: String(input.drawingSvg ?? "").slice(0, 9000),
    asciiGrid: String(input.asciiGrid ?? "").slice(0, 3000),
    asciiGridNote: String(input.asciiGridNote ?? "").slice(0, 280),
    strokeCount: Math.max(0, Math.min(100, Number(input.strokeCount ?? 0))),
  };
}
