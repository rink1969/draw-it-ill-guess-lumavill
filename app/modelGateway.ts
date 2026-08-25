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
