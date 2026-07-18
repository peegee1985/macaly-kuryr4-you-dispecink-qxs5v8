import { useEffect } from "react";

import {
  clearDriverStatusNotification,
  ensureStatusNotificationPermission,
  showDriverStatusNotification,
} from "../lib/statusNotifications";
import type { DriverUser, Ride } from "../types";

export function useDriverStatusNotification({
  user,
  tracking,
  activeRide,
  enabled,
}: {
  user: DriverUser;
  tracking: boolean;
  activeRide: Ride | null;
  enabled: boolean;
}) {
  useEffect(() => {
    let cancelled = false;

    const update = async () => {
      if (!enabled) {
        await clearDriverStatusNotification();
        return;
      }
      const granted = await ensureStatusNotificationPermission();
      if (!granted || cancelled) return;
      await showDriverStatusNotification({ user, tracking, activeRide });
    };

    void update().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [activeRide?._id, activeRide?.status, enabled, tracking, user]);

  useEffect(() => () => {
    void clearDriverStatusNotification();
  }, []);
}
