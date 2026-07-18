import { useCallback, useEffect, useRef, useState } from "react";
import * as Location from "expo-location";
import { useMutation, useQuery } from "convex/react";

import { api } from "../lib/api";
import {
  getStoredLastLocation,
  isBackgroundLocationRunning,
  startBackgroundLocation,
  stopBackgroundLocation,
} from "../lib/backgroundLocationTask";

type LastLocation = {
  lat: number;
  lng: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
};

export function useGpsTracking() {
  const updateLocation = useMutation(api.gps.updateLocation);
  const serverStatus = useQuery(api.gps.getMyGPSStatus, {});
  const lastLocation = useRef<LastLocation | null>(null);
  const [tracking, setTracking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendLocation = useCallback(
    async (coords: Location.LocationObjectCoords, isTracking: boolean) => {
      const payload: LastLocation = {
        lat: coords.latitude,
        lng: coords.longitude,
        accuracy: coords.accuracy ?? undefined,
        speed: coords.speed ?? undefined,
        heading: coords.heading ?? undefined,
      };
      lastLocation.current = payload;
      await updateLocation({ ...payload, isTracking });
    },
    [updateLocation],
  );

  const start = useCallback(async () => {
    if (tracking) return;
    setBusy(true);
    setError(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        throw new Error("Pro sdílení polohy je potřeba povolit GPS.");
      }

      const backgroundPermission = await Location.requestBackgroundPermissionsAsync();
      if (backgroundPermission.status !== "granted") {
        throw new Error("Pro GPS během zamčené obrazovky povolte polohu vždy.");
      }

      const first = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      await sendLocation(first.coords, true);
      await startBackgroundLocation();
      setTracking(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "GPS se nepodařilo spustit.");
    } finally {
      setBusy(false);
    }
  }, [sendLocation, tracking]);

  const stop = useCallback(async () => {
    setBusy(true);
    setError(null);
    setTracking(false);

    try {
      await stopBackgroundLocation();
      let current = lastLocation.current;
      if (!current) {
        current = await getStoredLastLocation();
      }
      if (!current) {
        const known = await Location.getLastKnownPositionAsync();
        if (known) {
          current = {
            lat: known.coords.latitude,
            lng: known.coords.longitude,
            accuracy: known.coords.accuracy ?? undefined,
            speed: known.coords.speed ?? undefined,
            heading: known.coords.heading ?? undefined,
          };
        }
      }
      if (current) await updateLocation({ ...current, isTracking: false });
    } catch {
      setError("GPS je vypnutá v telefonu, ale stav se nepodařilo potvrdit dispečinku.");
    } finally {
      setBusy(false);
    }
  }, [updateLocation]);

  useEffect(() => {
    if (serverStatus?.adminStopRequested && tracking) void stop();
  }, [serverStatus?.adminStopRequested, stop, tracking]);

  useEffect(() => {
    void isBackgroundLocationRunning().then(setTracking).catch(() => undefined);
  }, []);

  return { tracking, busy, error, start, stop, serverStatus };
}
