import * as Notifications from "expo-notifications";
import { useQuery } from "convex/react";
import { Platform } from "react-native";
import { useCallback, useEffect, useRef, useState } from "react";

import { api } from "../lib/api";
import { preferencesStorage } from "../lib/storage";
import type { ChatConversation, DispatcherNotification } from "../types";

const ENABLED_KEY = "notifications-enabled";
const LAST_SEEN_KEY = "notifications-last-seen";
const LAST_CHAT_KEY = "chat-last-seen";
const CHANNEL_ID = "k4y-dispatcher";

export function useDispatcherNotifications() {
  const notifications = useQuery(api.notifications.getMyNotifications, {}) as DispatcherNotification[] | undefined;
  const conversations = useQuery(api.chat.getMyConversations, {}) as ChatConversation[] | undefined;
  const [enabled, setEnabledState] = useState(false);
  const [permission, setPermission] = useState<Notifications.PermissionStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    void (async () => {
      const [stored, permissions] = await Promise.all([
        preferencesStorage.get(ENABLED_KEY),
        Notifications.getPermissionsAsync(),
      ]);
      setPermission(permissions.status);
      setEnabledState(stored === "true" && permissions.status === Notifications.PermissionStatus.GRANTED);
      initialized.current = true;
    })();
  }, []);

  useEffect(() => {
    if (!initialized.current || !enabled || !notifications?.length) return;
    void (async () => {
      const stored = await preferencesStorage.get(LAST_SEEN_KEY);
      const lastSeen = Number(stored ?? 0);
      const latest = Math.max(...notifications.map((item) => item._creationTime));
      if (!lastSeen) {
        await preferencesStorage.set(LAST_SEEN_KEY, String(latest));
        return;
      }
      const fresh = notifications.filter((item) => item._creationTime > lastSeen).reverse().slice(0, 5);
      for (const item of fresh) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: item.title,
            body: item.message,
            sound: true,
            data: { notificationId: item._id, rideId: item.rideId },
          },
          trigger: Platform.OS === "android" ? { channelId: CHANNEL_ID } : null,
        });
      }
      await preferencesStorage.set(LAST_SEEN_KEY, String(latest));
    })();
  }, [enabled, notifications]);

  useEffect(() => {
    if (!initialized.current || !enabled || !conversations?.length) return;
    void (async () => {
      const stored = await preferencesStorage.get(LAST_CHAT_KEY);
      const lastSeen = Number(stored ?? 0);
      const latest = Math.max(...conversations.map((item) => item.lastAt));
      if (!lastSeen) {
        await preferencesStorage.set(LAST_CHAT_KEY, String(latest));
        return;
      }
      const fresh = conversations.filter((item) => item.lastAt > lastSeen && item.unread > 0).sort((a, b) => a.lastAt - b.lastAt).slice(0, 5);
      for (const item of fresh) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `Zpráva od ${item.partnerName}`,
            body: item.lastMessage,
            sound: true,
            data: { partnerId: item.partnerId },
          },
          trigger: Platform.OS === "android" ? { channelId: CHANNEL_ID } : null,
        });
      }
      await preferencesStorage.set(LAST_CHAT_KEY, String(latest));
    })();
  }, [conversations, enabled]);

  const setEnabled = useCallback(async (next: boolean) => {
    setBusy(true);
    setError(null);
    try {
      if (!next) {
        setEnabledState(false);
        await preferencesStorage.set(ENABLED_KEY, "false");
        return true;
      }
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
          name: "Dispečink, zásilky a zprávy",
          importance: Notifications.AndroidImportance.HIGH,
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
          sound: "default",
          vibrationPattern: [0, 200, 120, 200],
        });
      }
      const current = await Notifications.getPermissionsAsync();
      const result = current.status === Notifications.PermissionStatus.GRANTED
        ? current
        : await Notifications.requestPermissionsAsync();
      setPermission(result.status);
      if (result.status !== Notifications.PermissionStatus.GRANTED) {
        setError("Android nepovolil zobrazování oznámení.");
        return false;
      }
      const latest = notifications?.[0]?._creationTime;
      if (latest) await preferencesStorage.set(LAST_SEEN_KEY, String(latest));
      const latestChat = conversations?.[0]?.lastAt;
      if (latestChat) await preferencesStorage.set(LAST_CHAT_KEY, String(latestChat));
      await preferencesStorage.set(ENABLED_KEY, "true");
      setEnabledState(true);
      return true;
    } catch {
      setError("Oznámení se nepodařilo nastavit.");
      return false;
    } finally {
      setBusy(false);
    }
  }, [conversations, notifications]);

  return { enabled, permission, busy, error, setEnabled };
}
