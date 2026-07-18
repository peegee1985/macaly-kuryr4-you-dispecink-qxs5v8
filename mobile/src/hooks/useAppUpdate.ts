import { useEffect, useState } from "react";

import {
  DRIVER_APP_VERSION_CODE,
  DRIVER_UPDATE_MANIFEST_URL,
} from "../lib/appVersion";

export type DriverRelease = {
  version: string;
  versionCode: number;
  minimumVersionCode?: number;
  downloadUrl: string;
  releaseNotes?: string[];
};

export function useAppUpdate() {
  const [release, setRelease] = useState<DriverRelease | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    const check = async () => {
      setChecking(true);
      try {
        const response = await fetch(`${DRIVER_UPDATE_MANIFEST_URL}?t=${Date.now()}`, {
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });
        if (!response.ok) return;
        const manifest = (await response.json()) as DriverRelease;
        if (
          Number.isInteger(manifest.versionCode) &&
          manifest.versionCode > DRIVER_APP_VERSION_CODE &&
          typeof manifest.downloadUrl === "string" &&
          manifest.downloadUrl.startsWith("https://")
        ) {
          setRelease(manifest);
        } else {
          setRelease(null);
        }
      } catch {
        // Kontrola aktualizace nesmí blokovat práci řidiče při slabém signálu.
      } finally {
        if (!controller.signal.aborted) setChecking(false);
      }
    };

    void check();
    return () => controller.abort();
  }, []);

  return {
    release,
    checking,
    required: Boolean(release && DRIVER_APP_VERSION_CODE < (release.minimumVersionCode ?? 0)),
  };
}
