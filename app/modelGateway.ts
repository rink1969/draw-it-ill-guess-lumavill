import { CustomModelConnection } from "./modelConnection";

export type ModelGuess = { guess: string; confidence: number; reaction: string };

export async function runCustomVisionGuess(connection: CustomModelConnection, prompt: string, canvasImage: string): Promise<ModelGuess> {
  const base = connection.baseUrl.replace(/\/$/, "");
  const endpoint = base.endsWith("/chat/completions") ? base : `${base}${base.endsWith("/v1") ? "" : "/v1"}/chat/completions`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${connection.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: connection.model,
      max_tokens: 180,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: [
        { type: "text", text: prompt },
        { type: "image_url", image_url: { url: canvasImage } },
      ] }],
    }),
  });
  if (!response.ok) throw new Error(`custom_${response.status}`);
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
