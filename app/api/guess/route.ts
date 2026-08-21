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
};

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "Mimi needs her looking glass later." }, { status: 503 });
  }

  const payload = await request.json() as GuessRequest;
  const canvasImage = payload.canvasImage?.trim();
  const structuredDrawing = sanitizeStructuredDrawing(payload.structuredDrawing);
  const round = Number.isFinite(payload.round) ? payload.round : 1;
  const previousGuesses = Array.isArray(payload.previousGuesses) ? payload.previousGuesses.slice(-12) : [];
  const userHints = Array.isArray(payload.userHints)
    ? payload.userHints.map((hint) => String(hint).trim()).filter(Boolean).slice(-6)
    : [];

  if (!canvasImage?.startsWith("data:image/png;base64,")) {
    return Response.json({ error: "Drawing image is required." }, { status: 400 });
  }

  const prompt = [
    "You are Mimi, a playful AI companion playing a drawing guessing game.",
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
    "Return only JSON with this shape: {\"guess\":\"...\",\"confidence\":0.0,\"reaction\":\"...\"}.",
  ].filter(Boolean).join("\n\n");

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_VISION_MODEL ?? "gpt-4.1-mini",
        input: [
          {
            role: "user",
            content: [
              { type: "input_text", text: prompt },
              { type: "input_image", image_url: canvasImage },
            ],
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "drawing_guess",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                guess: { type: "string" },
                confidence: { type: "number" },
                reaction: { type: "string" },
              },
              required: ["guess", "confidence", "reaction"],
            },
          },
        },
      }),
    });

    if (!response.ok) {
      return Response.json({ error: "Mimi could not see it clearly." }, { status: 502 });
    }

    const data = await response.json() as { output_text?: string };
    const rawText = data.output_text ?? extractOutputText(data);
    const parsed = JSON.parse(rawText) as { guess?: string; confidence?: number; reaction?: string };

    return Response.json({
      guess: String(parsed.guess ?? "").slice(0, 60),
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
      reaction: String(parsed.reaction ?? "").slice(0, 120),
    });
  } catch {
    return Response.json({ error: "Mimi got distracted." }, { status: 502 });
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

function extractOutputText(data: unknown): string {
  const output = (data as { output?: Array<{ content?: Array<{ text?: string }> }> }).output ?? [];
  for (const item of output) {
    for (const content of item.content ?? []) {
      if (content.text) return content.text;
    }
  }
  return "{}";
}
