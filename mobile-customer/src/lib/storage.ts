import * as SecureStore from "expo-secure-store";

export const secureAuthStorage = {
  getItem: (key: string) => SecureStore.getItemAsync(`customer:${key}`),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(`customer:${key}`, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(`customer:${key}`),
};

export const preferencesStorage = {
  get: (key: string) => SecureStore.getItemAsync(`customer-pref:${key}`),
  set: (key: string, value: string) => SecureStore.setItemAsync(`customer-pref:${key}`, value),
};
