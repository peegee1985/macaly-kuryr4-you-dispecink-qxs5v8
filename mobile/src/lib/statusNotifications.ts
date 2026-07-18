import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import { rideStatusLabel } from "./format";
import type { DriverUser, Ride } from "../types";

const STATUS_CHANNEL = "k4y-driver-status";
const STATUS_NOTIFICATION_ID = "k4y-driver-status";
const STATUS_ENABLED_KEY = "k4y_status_notification_enabled";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: false,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function configureStatusNotificationChannel() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(STATUS_CHANNEL, {
    name: "Stav řidiče",
    description: "Přihlášení, GPS a aktuální fáze zakázky",
    importance: Notifications.AndroidImportance.LOW,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    sound: null,
    enableVibrate: false,
    showBadge: false,
  });
}

export async function ensureStatusNotificationPermission() {
  if (Platform.OS !== "android") return true;
  await configureStatusNotificationChannel();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export async function getStatusNotificationsEnabled() {
  const stored = await SecureStore.getItemAsync(STATUS_ENABLED_KEY);
  return stored !== "false";
}

export async function setStatusNotificationsEnabled(enabled: boolean) {
  await SecureStore.setItemAsync(STATUS_ENABLED_KEY, String(enabled));
  if (!enabled) await clearDriverStatusNotification();
}

export async function showDriverStatusNotification({
  user,
  tracking,
  activeRide,
}: {
  user: DriverUser;
  tracking: boolean;
  activeRide: Ride | null;
}) {
  if (Platform.OS !== "android") return;
  await configureStatusNotificationChannel();

  const rideLine = activeRide ? `Zakázka: #${activeRide.rideNumber}` : "Zakázka: žádná aktivní";
  const phaseLine = activeRide ? `Fáze: ${rideStatusLabel[activeRide.status]}` : "Fáze: —";
  const body = [`GPS: ${tracking ? "zapnuto" : "vypnuto"}`, rideLine, phaseLine].join("\n");

  await Notifications.dismissNotificationAsync(STATUS_NOTIFICATION_ID).catch(() => undefined);
  await Notifications.scheduleNotificationAsync({
    identifier: STATUS_NOTIFICATION_ID,
    content: {
      title: `Kuryr4You • Přihlášen${user.name ? ` (${user.name})` : ""}`,
      body,
      data: { screen: activeRide ? "rides" : "home", rideId: activeRide?._id },
      color: "#F59E0B",
      priority: Notifications.AndroidNotificationPriority.LOW,
      sound: false,
      sticky: true,
      autoDismiss: false,
    },
    trigger: { channelId: STATUS_CHANNEL },
  });
}

export async function clearDriverStatusNotification() {
  if (Platform.OS !== "android") return;
  await Notifications.dismissNotificationAsync(STATUS_NOTIFICATION_ID).catch(() => undefined);
}
