"use client";

import { useEffect, useState } from "react";
import { readWattHost, WattManagedAiHost } from "./wattHost";

// Read the WATT App's managed AI host. The App injects window.__WATT_HOST__
// before business scripts run, then re-emits it via a "watt:host-ready"
// CustomEvent after load. We read the initial value *and* subscribe; re-reading
// on every event keeps idempotent initialization across repeated emits.
export function useWattHost(): WattManagedAiHost | null {
  const [host, setHost] = useState<WattManagedAiHost | null>(readWattHost);

  useEffect(() => {
    const syncHost = () => setHost(readWattHost());
    syncHost();
    window.addEventListener("watt:host-ready", syncHost);
    return () => window.removeEventListener("watt:host-ready", syncHost);
  }, []);

  return host;
}
