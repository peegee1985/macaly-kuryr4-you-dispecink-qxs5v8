import { useConvex } from "convex/react";
import { useEffect, useState } from "react";

import { api } from "../lib/api";
import type { DriverPresence } from "../types";

const REFRESH_INTERVAL_MS = 30_000;

/**
 * Presence was added after the first dispatcher APK release. A one-shot query
 * keeps older Convex deployments compatible: an unknown function is handled as
 * an empty result instead of reaching React's error boundary.
 */
export function useOptionalDriverPresence() {
  const convex = useConvex();
  const [presence, setPresence] = useState<DriverPresence[]>([]);

  useEffect(() => {
    let mounted = true;

    const refresh = async () => {
      try {
        const result = (await convex.query(
          api.presence.listDriverPresence,
          {},
        )) as DriverPresence[];
        if (mounted) setPresence(result);
      } catch {
        if (mounted) setPresence([]);
      }
    };

    void refresh();
    const interval = setInterval(() => void refresh(), REFRESH_INTERVAL_MS);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [convex]);

  return presence;
}
