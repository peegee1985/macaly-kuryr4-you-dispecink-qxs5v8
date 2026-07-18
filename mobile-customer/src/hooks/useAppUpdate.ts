import { useEffect, useState } from "react";

import {
  CUSTOMER_APP_VERSION_CODE,
  CUSTOMER_UPDATE_MANIFEST_URL,
} from "../lib/appVersion";

export type CustomerRelease = {
  version: string;
  versionCode: number;
  minimumVersionCode?: number;
  downloadUrl: string;
  releaseNotes?: string[];
};

export function useAppUpdate() {
  const [release, setRelease] = useState<CustomerRelease | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const check = async () => {
      try {
        const response = await fetch(`${CUSTOMER_UPDATE_MANIFEST_URL}?t=${Date.now()}`, {
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });
        if (!response.ok) return;
        const manifest = (await response.json()) as CustomerRelease;
        if (
          Number.isInteger(manifest.versionCode) &&
          manifest.versionCode > CUSTOMER_APP_VERSION_CODE &&
          typeof manifest.downloadUrl === "string" &&
          manifest.downloadUrl.startsWith("https://")
        ) {
          setRelease(manifest);
        } else {
          setRelease(null);
        }
      } catch {
        // Kontrola aktualizace nesmí blokovat zákazníka při slabém připojení.
      }
    };

    void check();
    return () => controller.abort();
  }, []);

  return {
    release,
    required: Boolean(release && CUSTOMER_APP_VERSION_CODE < (release.minimumVersionCode ?? 0)),
  };
}
