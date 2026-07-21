import { useMutation } from "convex/react";
import { useEffect } from "react";
import { AppState } from "react-native";

import { api } from "../lib/api";

const HEARTBEAT_INTERVAL_MS = 30_000;

/**
 * Hlásí backendu, že je řidič přihlášen a aplikace běží ("online" na dispečinku,
 * i když GPS není zapnutá). Při aplikaci na pozadí drží presence GPS aktualizace;
 * bez nich řidič po ~90 sekundách přejde do stavu offline.
 */
export function usePresenceHeartbeat() {
  const heartbeat = useMutation(api.presence.heartbeat);

  useEffect(() => {
    const send = () => {
      void heartbeat({}).catch(() => {
        // Výpadek spojení řeší backend přes TTL, další heartbeat to napraví.
      });
    };
    send();
    const interval = setInterval(send, HEARTBEAT_INTERVAL_MS);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") send();
    });
    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [heartbeat]);
}
