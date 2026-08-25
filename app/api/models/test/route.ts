import { runVisionGuess } from "../../../modelGateway";
import { isValidSelection } from "../../../modelProviders";

const pixel = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=";

export async function POST(request: Request) {
  const body = await request.json() as { selection?: unknown };
  if (!isValidSelection(body.selection)) return Response.json({ error: "Invalid model selection." }, { status: 400 });
  try {
    await runVisionGuess(body.selection, 'Return only JSON: {"guess":"dot","confidence":0.5,"reaction":"ready"}.', pixel);
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error && error.message === "provider_not_configured" ? "This provider is not configured yet." : "Connection test failed.";
    return Response.json({ error: message }, { status: 502 });
  }
}

