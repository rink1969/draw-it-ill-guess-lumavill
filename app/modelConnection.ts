import { readWattHost } from "./wattHost";

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

// Build a connection from the WATT App's managed, injected host. The endpoint
// is supplied by the trusted App (not user-typed), so we only require a sane
// https URL and a non-empty model/key -- without truncating the injected key.
// The apiKey is read from memory only and never persisted here.
export function getManagedConnection(): CustomModelConnection | null {
  const host = readWattHost();
  if (!host) return null;
  const { apiKey, endpoint, model } = host.ai;
  if (!apiKey || !endpoint || !model) return null;
  let url: URL;
  try {
    url = new URL(endpoint.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  return { baseUrl: url.toString().replace(/\/$/, ""), model: model.trim().slice(0, 120), apiKey: apiKey.trim() };
}

// The connection the guess engine should use right now: prefer the managed
// WATT App host, then fall back to the user's own localStorage connection.
export function getActiveConnection(): CustomModelConnection | null {
  return getManagedConnection() ?? readConnection();
}
