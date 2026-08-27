export type CustomModelConnection = { baseUrl: string; model: string; apiKey: string };

// Model connection info is kept in plain localStorage on the client.
const STORAGE_KEY = "lumavill-model-connection";

export function saveConnection(connection: CustomModelConnection) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(connection));
}

export function readConnection(): CustomModelConnection | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return validateConnection(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function clearConnection() {
  localStorage.removeItem(STORAGE_KEY);
}

export function hasConnection(): boolean {
  return Boolean(readConnection());
}

// Validate a raw connection object: enforce https / localhost and block
// private & metadata addresses so a typo cannot hit an internal endpoint.
export function validateConnection(input: unknown): CustomModelConnection | null {
  if (!input || typeof input !== "object") return null;
  const value = input as Partial<CustomModelConnection>;
  const model = String(value.model ?? "").trim().slice(0, 120);
  const apiKey = String(value.apiKey ?? "").trim().slice(0, 500);
  try {
    const url = new URL(String(value.baseUrl ?? "").trim());
    if (url.protocol !== "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") return null;
    const blockedHost = /^(0\\.|10\\.|127\\.|169\.254\\.|192\.168\\.|172\\.(1[6-9]|2\\d|3[01])\\.)/.test(url.hostname) || url.hostname === "metadata.google.internal";
    if (blockedHost && url.hostname !== "127.0.0.1") return null;
    if (!model || !apiKey) return null;
    return { baseUrl: url.toString().replace(/\/$/, ""), model, apiKey };
  } catch {
    return null;
  }
}
