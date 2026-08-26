export type CustomModelConnection = { baseUrl: string; model: string; apiKey: string };

const cookieName = "mimi_model_connection";

export async function sealConnection(connection: CustomModelConnection, request: Request) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await connectionKey(request);
  const plain = new TextEncoder().encode(JSON.stringify(connection));
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plain));
  const value = toBase64Url(join(iv, encrypted));
  return `${cookieName}=${value}; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`;
}

export async function readConnection(request: Request): Promise<CustomModelConnection | null> {
  const value = request.headers.get("cookie")?.split(";").map((item) => item.trim()).find((item) => item.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
  if (!value) return null;
  try {
    const bytes = fromBase64Url(value);
    const iv = bytes.slice(0, 12);
    const encrypted = bytes.slice(12);
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, await connectionKey(request), encrypted);
    const parsed = JSON.parse(new TextDecoder().decode(plain)) as CustomModelConnection;
    return validateConnection(parsed);
  } catch {
    return null;
  }
}

export function clearConnectionCookie(request: Request) {
  return `${cookieName}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`;
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

async function connectionKey(request: Request) {
  const hostname = new URL(request.url).hostname;
  const isLocal = ["localhost", "127.0.0.1", "0.0.0.0", "::1"].includes(hostname);
  const configuredSecret = process.env.MODEL_CONNECTION_SECRET?.trim();
  const secret = configuredSecret || (process.env.NODE_ENV !== "production" || isLocal
    ? "lumavill-local-development-secret"
    : "");
  if (!secret) throw new Error("MODEL_CONNECTION_SECRET is not configured");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
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
