import { useCallback, useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { useMutation } from "convex/react";

import { api } from "../lib/api";

const HEARTBEAT_INTERVAL_MS = 45_000;
const BACKGROUND_GRACE_MS = 10_000;

export function useDriverPresence() {
  const heartbeatMutation = useMutation(api.presence.heartbeat);
  const setOfflineMutation = useMutation(api.presence.setOffline);
  const backgroundTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const heartbeat = useCallback(async () => {
    await heartbeatMutation({});
  }, [heartbeatMutation]);

  const setOffline = useCallback(async () => {
    await setOfflineMutation({});
  }, [setOfflineMutation]);

  useEffect(() => {
    const clearBackgroundTimer = () => {
      if (backgroundTimer.current) clearTimeout(backgroundTimer.current);
      backgroundTimer.current = null;
    };
    const onAppStateChange = (state: AppStateStatus) => {
      if (state === "active") {
        clearBackgroundTimer();
        void heartbeat().catch(() => undefined);
        return;
      }
      if (!backgroundTimer.current) {
        backgroundTimer.current = setTimeout(() => {
          backgroundTimer.current = null;
          void setOffline().catch(() => undefined);
        }, BACKGROUND_GRACE_MS);
      }
    };

    void heartbeat().catch(() => undefined);
    const interval = setInterval(() => {
      if (AppState.currentState === "active")
        void heartbeat().catch(() => undefined);
    }, HEARTBEAT_INTERVAL_MS);
    const subscription = AppState.addEventListener("change", onAppStateChange);

    return () => {
      clearInterval(interval);
      clearBackgroundTimer();
      subscription.remove();
    };
  }, [heartbeat, setOffline]);

  return { setOffline };
}
