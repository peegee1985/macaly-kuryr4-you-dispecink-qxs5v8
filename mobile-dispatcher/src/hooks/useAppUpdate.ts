import { useEffect, useState } from "react";

import {
  DISPATCHER_APP_VERSION_CODE,
  DISPATCHER_UPDATE_MANIFEST_URL,
} from "../lib/appVersion";

export type DispatcherRelease = {
  version: string;
  versionCode: number;
  minimumVersionCode?: number;
  downloadUrl: string;
  releaseNotes?: string[];
};

export function useAppUpdate() {
  const [release, setRelease] = useState<DispatcherRelease | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const check = async () => {
      try {
        const response = await fetch(
          `${DISPATCHER_UPDATE_MANIFEST_URL}?t=${Date.now()}`,
          {
            headers: { Accept: "application/json" },
            signal: controller.signal,
          },
        );
        if (!response.ok) return;
        const manifest = (await response.json()) as DispatcherRelease;
        if (
          Number.isInteger(manifest.versionCode) &&
          manifest.versionCode > DISPATCHER_APP_VERSION_CODE &&
          typeof manifest.downloadUrl === "string" &&
          manifest.downloadUrl.startsWith("https://")
        ) {
          setRelease(manifest);
        } else {
          setRelease(null);
        }
      } catch {
        // Kontrola aktualizace nesmí blokovat dispečera při slabém připojení.
      }
    };

    void check();
    return () => controller.abort();
  }, []);

  return {
    release,
    required: Boolean(
      release &&
        DISPATCHER_APP_VERSION_CODE < (release.minimumVersionCode ?? 0),
    ),
  };
}
