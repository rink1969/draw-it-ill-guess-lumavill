import { clearConnectionCookie, readConnection, sealConnection, validateConnection } from "../../modelConnection";
import { testCustomModelConnection } from "../../modelGateway";

export async function GET(request: Request) {
  const connection = await readConnection(request);
  return Response.json({ connected: Boolean(connection), baseUrl: connection?.baseUrl ?? "", model: connection?.model ?? "" });
}

export async function POST(request: Request) {
  const payload = await request.json() as { baseUrl?: string; model?: string; apiKey?: string; locale?: "en" | "zh" };
  const zh = payload.locale === "zh";
  if (!payload.apiKey) payload.apiKey = (await readConnection(request))?.apiKey;
  const connection = validateConnection(payload);
  if (!connection) return Response.json({ error: zh ? "请完整填写服务地址、模型名称和 API Key。" : "Please complete the service URL, model name, and API Key." }, { status: 400 });
  try {
    await testCustomModelConnection(connection);
    const headers = new Headers();
    for (const cookie of await sealConnection(connection, request)) headers.append("Set-Cookie", cookie);
    return Response.json({ connected: true, baseUrl: connection.baseUrl, model: connection.model }, { headers });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "";
    const message = detail.includes("MODEL_CONNECTION_SECRET")
      ? (zh ? "服务器尚未配置连接信息存储。" : "Connection storage is not configured on this server.")
      : detail.startsWith("provider_")
        ? (zh ? `无法连接（${detail.replace(/^provider_/, "HTTP ")}）。` : `Could not connect (${detail.replace(/^provider_/, "HTTP ")}).`)
        : (zh ? "无法连接，请检查服务地址、模型名称和 API Key。" : "Could not connect. Check the address, model, and API Key.");
    return Response.json({ error: message }, { status: 502 });
  }
}

export async function DELETE(request: Request) {
  const headers = new Headers();
  for (const cookie of clearConnectionCookie(request)) headers.append("Set-Cookie", cookie);
  return Response.json({ connected: false }, { headers });
}
