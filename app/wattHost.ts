// WATT App managed AI host bridge.
//
// The WATT App injects window.__WATT_HOST__ before its business scripts run, and
// re-emits it on a "watt:host-ready" CustomEvent after the page loads. That
// object carries the managed vision-model config, so the game can connect
// without the user configuring anything. This module only *reads* it; the
// apiKey is never persisted.

export type WattManagedAi = {
  apiKey: string;
  endpoint: string;
  model: string;
  provider: string;
};

export type WattManagedAiHost = {
  ai: WattManagedAi;
  capabilities: Record<string, never>;
  mode: "managed";
};

declare global {
  interface Window {
    __WATT_HOST__?: WattManagedAiHost;
  }
}

function isValidHost(host: unknown): host is WattManagedAiHost {
  if (!host || typeof host !== "object") return false;
  const { ai, mode } = host as { ai?: unknown; mode?: unknown };
  if (mode !== "managed" || !ai || typeof ai !== "object") return false;
  const { apiKey, endpoint, model } = ai as { apiKey?: unknown; endpoint?: unknown; model?: unknown };
  return typeof apiKey === "string" && typeof endpoint === "string" && typeof model === "string";
}

// Read the current injected host. Safe to call during SSR (returns null).
export function readWattHost(): WattManagedAiHost | null {
  if (typeof window === "undefined") return null;
  const host = window.__WATT_HOST__;
  return isValidHost(host) ? host : null;
}
