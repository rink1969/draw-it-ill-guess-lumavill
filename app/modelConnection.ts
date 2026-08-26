export type CustomModelConnection = { baseUrl: string; model: string; apiKey: string };

const cookieName = "mimi_model_connection";
const sessionKeyCookieName = "mimi_model_session_key";

export async function sealConnection(connection: CustomModelConnection, request: Request) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const { key, sessionKey } = await connectionKey(request, true);
  const plain = new TextEncoder().encode(JSON.stringify(connection));
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plain));
  const value = toBase64Url(join(iv, encrypted));
  const attributes = cookieAttributes(request, 86400);
  return [
    `${cookieName}=${value}; ${attributes}`,
    ...(sessionKey ? [`${sessionKeyCookieName}=${sessionKey}; ${attributes}`] : []),
  ];
}

export async function readConnection(request: Request): Promise<CustomModelConnection | null> {
  const value = request.headers.get("cookie")?.split(";").map((item) => item.trim()).find((item) => item.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
  if (!value) return null;
  try {
    const bytes = fromBase64Url(value);
    const iv = bytes.slice(0, 12);
    const encrypted = bytes.slice(12);
    const { key } = await connectionKey(request, false);
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, encrypted);
    const parsed = JSON.parse(new TextDecoder().decode(plain)) as CustomModelConnection;
    return validateConnection(parsed);
  } catch {
    return null;
  }
}

export function clearConnectionCookie(request: Request) {
  const attributes = cookieAttributes(request, 0);
  return [
    `${cookieName}=; ${attributes}`,
    `${sessionKeyCookieName}=; ${attributes}`,
  ];
}

export function validateConnection(input: unknown): CustomModelConnection | null {
  if (!input || typeof input !== "object") return null;
  const value = input as Partial<CustomModelConnection>;
  const model = String(value.model ?? "").trim().slice(0, 120);
  const apiKey = String(value.apiKey ?? "").trim().slice(0, 500);
  try {
    const url = new URL(String(value.baseUrl ?? "").trim());
    if (url.protocol !== "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") return null;
    const blockedHost = /^(0\.|10\.|127\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(url.hostname) || url.hostname === "metadata.google.internal";
    if (blockedHost && url.hostname !== "127.0.0.1") return null;
    if (!model || !apiKey) return null;
    return { baseUrl: url.toString().replace(/\/$/, ""), model, apiKey };
  } catch {
    return null;
  }
}

async function connectionKey(request: Request, createSessionKey: boolean) {
  const hostname = new URL(request.url).hostname;
  const isLocal = ["localhost", "127.0.0.1", "0.0.0.0", "::1"].includes(hostname);
  const configuredSecret = process.env.MODEL_CONNECTION_SECRET?.trim();
  let sessionKey = cookieValue(request, sessionKeyCookieName);
  let keySecret = configuredSecret || (process.env.NODE_ENV !== "production" || isLocal
    ? "lumavill-local-development-secret"
    : sessionKey || "");
  let shouldSetSessionKey = false;
  if (!keySecret && createSessionKey) {
    sessionKey = toBase64Url(crypto.getRandomValues(new Uint8Array(32)));
    keySecret = sessionKey;
    shouldSetSessionKey = true;
  }
  if (!keySecret) throw new Error("Model connection session key is unavailable");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(keySecret));
  const key = await crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
  return { key, sessionKey: shouldSetSessionKey ? sessionKey : "" };
}

function cookieValue(request: Request, name: string) {
  return request.headers.get("cookie")
    ?.split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${name}=`))
    ?.slice(name.length + 1) ?? "";
}

function cookieAttributes(request: Request, maxAge: number) {
  return `HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`;
}

function join(first: Uint8Array, second: Uint8Array) {
  const result = new Uint8Array(first.length + second.length);
  result.set(first);
  result.set(second, first.length);
  return result;
}

function toBase64Url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Uint8Array.from(atob(normalized), (char) => char.charCodeAt(0));
}
