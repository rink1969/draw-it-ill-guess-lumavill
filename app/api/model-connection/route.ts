import { clearConnectionCookie, readConnection, sealConnection, validateConnection } from "../../modelConnection";
import { testCustomModelConnection } from "../../modelGateway";

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
    await testCustomModelConnection(connection);
    return Response.json({ connected: true, baseUrl: connection.baseUrl, model: connection.model }, { headers: { "Set-Cookie": await sealConnection(connection, request) } });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "";
    const message = detail.includes("MODEL_CONNECTION_SECRET")
      ? "Connection storage is not configured on this server."
      : detail.startsWith("provider_")
        ? `Could not connect (${detail.replace(/^provider_/, "HTTP ")}).`
        : "Could not connect. Check the address, model, and API Key.";
    return Response.json({ error: message }, { status: 502 });
  }
}

export async function DELETE(request: Request) {
  return Response.json({ connected: false }, { headers: { "Set-Cookie": clearConnectionCookie(request) } });
}
