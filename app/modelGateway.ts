import { ModelSelection, defaultModelSelection, isValidSelection } from "./modelProviders";
import { CustomModelConnection } from "./modelConnection";

export type ModelGuess = { guess: string; confidence: number; reaction: string };

export function getProviderKey(provider: ModelSelection["provider"]) {
  if (provider === "anthropic") return process.env.ANTHROPIC_API_KEY;
  if (provider === "gemini") return process.env.GEMINI_API_KEY;
  return process.env.OPENAI_API_KEY;
}

export async function runVisionGuess(selectionInput: unknown, prompt: string, canvasImage: string): Promise<ModelGuess> {
  const selection = isValidSelection(selectionInput) ? selectionInput : defaultModelSelection;
  const apiKey = getProviderKey(selection.provider);
  if (!apiKey) throw new Error("provider_not_configured");

  if (selection.provider === "anthropic") return callAnthropic(apiKey, selection.model, prompt, canvasImage);
  if (selection.provider === "gemini") return callGemini(apiKey, selection.model, prompt, canvasImage);
  return callOpenAI(apiKey, selection.model, prompt, canvasImage);
}

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

async function callOpenAI(apiKey: string, model: string, prompt: string, canvasImage: string) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      input: [{ role: "user", content: [{ type: "input_text", text: prompt }, { type: "input_image", image_url: canvasImage }] }],
      text: {
        format: {
          type: "json_schema",
          name: "drawing_guess",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: { guess: { type: "string" }, confidence: { type: "number" }, reaction: { type: "string" } },
            required: ["guess", "confidence", "reaction"],
          },
        },
      },
    }),
  });
  if (!response.ok) throw new Error(`openai_${response.status}`);
  const data = await response.json() as { output_text?: string; output?: Array<{ content?: Array<{ text?: string }> }> };
  const raw = data.output_text ?? data.output?.flatMap((item) => item.content ?? []).find((item) => item.text)?.text ?? "{}";
  return parseGuess(raw);
}

async function callAnthropic(apiKey: string, model: string, prompt: string, canvasImage: string) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model,
      max_tokens: 180,
      messages: [{ role: "user", content: [
        { type: "image", source: { type: "base64", media_type: "image/png", data: stripDataUrl(canvasImage) } },
        { type: "text", text: prompt },
      ] }],
    }),
  });
  if (!response.ok) throw new Error(`anthropic_${response.status}`);
  const data = await response.json() as { content?: Array<{ type?: string; text?: string }> };
  return parseGuess(data.content?.find((item) => item.type === "text")?.text ?? "{}");
}

async function callGemini(apiKey: string, model: string, prompt: string, canvasImage: string) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ inline_data: { mime_type: "image/png", data: stripDataUrl(canvasImage) } }, { text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" },
    }),
  });
  if (!response.ok) throw new Error(`gemini_${response.status}`);
  const data = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  return parseGuess(data.candidates?.[0]?.content?.parts?.find((part) => part.text)?.text ?? "{}");
}

function stripDataUrl(value: string) {
  return value.replace(/^data:image\/png;base64,/, "");
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
