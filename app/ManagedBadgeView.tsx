"use client";

import type { WattManagedAiHost } from "./wattHost";

// Shown inside the Model Center when the WATT App injects a managed AI host.
// It explains that no manual configuration is needed and never surfaces the
// injected apiKey (held in memory only, never persisted).
export function ManagedBadgeView({ managedHost }: { managedHost: WattManagedAiHost }) {
  return (
    <div className="managed-badge">
      <p>{managedHost.ai.provider ? `Managed by ${managedHost.ai.provider}` : "AI model is managed by the WATT App"}</p>
      <p>{managedHost.ai.model ? `Model: ${managedHost.ai.model}` : "You do not need to configure anything; Kaka uses the managed vision model."}</p>
      <p className="managed-detail">The managed config is injected by the WATT App, held in memory only, and is never saved locally or printed to the UI or logs.</p>
    </div>
  );
}
