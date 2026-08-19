type GuessRequest = {
  canvasImage?: string;
  round?: number;
  previousGuesses?: string[];
};

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "Mimi needs her looking glass later." }, { status: 503 });
  }

  const payload = await request.json() as GuessRequest;
  const canvasImage = payload.canvasImage?.trim();
  const round = Number.isFinite(payload.round) ? payload.round : 1;
  const previousGuesses = Array.isArray(payload.previousGuesses) ? payload.previousGuesses.slice(0, 3) : [];

  if (!canvasImage?.startsWith("data:image/png;base64,")) {
    return Response.json({ error: "Drawing image is required." }, { status: 400 });
  }

  const prompt = [
    "You are Mimi, a playful AI companion playing a drawing guessing game.",
    "Look carefully at the user's drawing and guess what object or concept it represents.",
    `Current round: ${round}.`,
    `Previous guesses: ${previousGuesses.length ? previousGuesses.join(", ") : "none"}.`,
    "Give ONE concise guess. Do not repeat previous guesses. It is okay to be wrong.",
    "Return only JSON with this shape: {\"guess\":\"...\",\"confidence\":0.0,\"reaction\":\"...\"}.",
  ].join("\n");

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

function extractOutputText(data: unknown): string {
  const output = (data as { output?: Array<{ content?: Array<{ text?: string }> }> }).output ?? [];
  for (const item of output) {
    for (const content of item.content ?? []) {
      if (content.text) return content.text;
    }
  }
  return "{}";
}
