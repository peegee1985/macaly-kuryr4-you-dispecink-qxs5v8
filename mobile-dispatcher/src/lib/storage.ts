import * as SecureStore from "expo-secure-store";

const AUTH_PREFIX = "dispatcher.";
const PREFERENCES_PREFIX = "dispatcher-pref.";
const READ_TIMEOUT_MS = 4_000;

function secureKey(prefix: string, key: string) {
  // Expo SecureStore accepts only alphanumeric characters, `.`, `-` and `_`.
  return `${prefix}${key.replace(/[^A-Za-z0-9._-]/g, "_")}`;
}

async function readSecureItem(key: string) {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      SecureStore.getItemAsync(key),
      new Promise<null>((resolve) => {
        timeout = setTimeout(() => resolve(null), READ_TIMEOUT_MS);
      }),
    ]);
  } catch {
    // A broken or unavailable keystore must never leave the app on its splash
    // screen. Treat it as a signed-out session and let the user sign in again.
    return null;
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export const secureAuthStorage = {
  getItem: (key: string) => readSecureItem(secureKey(AUTH_PREFIX, key)),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(secureKey(AUTH_PREFIX, key), value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(secureKey(AUTH_PREFIX, key)),
};

export const preferencesStorage = {
  get: (key: string) => readSecureItem(secureKey(PREFERENCES_PREFIX, key)),
  set: (key: string, value: string) => SecureStore.setItemAsync(secureKey(PREFERENCES_PREFIX, key), value),
};
