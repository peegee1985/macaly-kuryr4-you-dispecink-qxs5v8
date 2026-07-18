import { ConvexHttpClient } from "convex/browser";
import * as Location from "expo-location";
import * as SecureStore from "expo-secure-store";
import * as TaskManager from "expo-task-manager";

import { api } from "./api";

export const BACKGROUND_LOCATION_TASK = "k4y-driver-background-location";
const LAST_LOCATION_KEY = "k4y_last_background_location";

type LocationTaskData = { locations: Location.LocationObject[] };

function authStorageKey(convexUrl: string) {
  return `__convexAuthJWT_${convexUrl.replace(/[^a-zA-Z0-9]/g, "")}`;
}

async function sendLocation(position: Location.LocationObject) {
  const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;
  if (!convexUrl) return;
  const token = await SecureStore.getItemAsync(authStorageKey(convexUrl));
  if (!token) return;

  const payload = {
    lat: position.coords.latitude,
    lng: position.coords.longitude,
    accuracy: position.coords.accuracy ?? undefined,
    speed: position.coords.speed ?? undefined,
    heading: position.coords.heading ?? undefined,
    isTracking: true,
  };
  await SecureStore.setItemAsync(LAST_LOCATION_KEY, JSON.stringify(payload));

  const client = new ConvexHttpClient(convexUrl);
  client.setAuth(token);
  await client.mutation(api.gps.updateLocation, payload);
}

if (!TaskManager.isTaskDefined(BACKGROUND_LOCATION_TASK)) {
  TaskManager.defineTask<LocationTaskData>(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
    if (error || !data?.locations?.length) return;
    const latest = data.locations[data.locations.length - 1];
    if (!latest) return;
    await sendLocation(latest).catch(() => undefined);
  });
}

export async function isBackgroundLocationRunning() {
  return Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
}

export async function startBackgroundLocation() {
  if (await isBackgroundLocationRunning()) return;
  await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
    accuracy: Location.Accuracy.High,
    timeInterval: 15_000,
    distanceInterval: 30,
    deferredUpdatesInterval: 15_000,
    deferredUpdatesDistance: 30,
    pausesUpdatesAutomatically: false,
    foregroundService: {
      notificationTitle: "Kuryr4You • GPS zapnuto",
      notificationBody: "Poloha se sdílí s dispečinkem i na pozadí.",
      notificationColor: "#F59E0B",
      killServiceOnDestroy: false,
    },
  });
}

export async function stopBackgroundLocation() {
  if (await isBackgroundLocationRunning()) {
    await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  }
}

export async function getStoredLastLocation() {
  const value = await SecureStore.getItemAsync(LAST_LOCATION_KEY);
  if (!value) return null;
  try {
    return JSON.parse(value) as {
      lat: number;
      lng: number;
      accuracy?: number;
      speed?: number;
      heading?: number;
    };
  } catch {
    return null;
  }
}
