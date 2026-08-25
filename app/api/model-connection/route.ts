import { clearConnectionCookie, readConnection, sealConnection, validateConnection } from "../../modelConnection";
import { runCustomVisionGuess } from "../../modelGateway";

const pixel = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=";

export async function GET(request: Request) {
  const connection = await readConnection(request);
  return Response.json({ connected: Boolean(connection), baseUrl: connection?.baseUrl ?? "", model: connection?.model ?? "" });
}

export async function POST(request: Request) {
  const payload = await request.json() as { baseUrl?: string; model?: string; apiKey?: string };
  if (!payload.apiKey) payload.apiKey = (await readConnection(request))?.apiKey;
  const connection = validateConnection(payload);
  if (!connection) return Response.json({ error: "Please complete the service URL, model name, and API Key." }, { status: 400 });
  try {
    await runCustomVisionGuess(connection, 'Return only JSON: {"guess":"dot","confidence":0.5,"reaction":"ready"}.', pixel);
    return Response.json({ connected: true, baseUrl: connection.baseUrl, model: connection.model }, { headers: { "Set-Cookie": await sealConnection(connection, request) } });
  } catch (error) {
    const message = error instanceof Error && error.message.includes("MODEL_CONNECTION_SECRET") ? "Connection storage is not configured on this server." : "Could not connect. Check the address, model, and API Key.";
    return Response.json({ error: message }, { status: 502 });
  }
}

export async function DELETE(request: Request) {
  return Response.json({ connected: false }, { headers: { "Set-Cookie": clearConnectionCookie(request) } });
}
