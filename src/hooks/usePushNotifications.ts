import { useState, useEffect, useCallback } from "react"
import { useAction, useMutation, useQuery } from "convex/react"
import { api } from "../../convex/_generated/api"

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray.buffer as ArrayBuffer
}

export type PushPermission = "default" | "granted" | "denied" | "unsupported"

export function usePushNotifications() {
  const [permission, setPermission] = useState<PushPermission>("default")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isSubscribed = useQuery(api.pushNotifications.hasSubscription)
  const saveSubscription = useMutation(api.pushNotifications.saveSubscription)
  const removeSubscription = useMutation(api.pushNotifications.removeSubscription)
  const getVapidKey = useAction(api.pushNotificationsActions.getVapidPublicKey)

  useEffect(() => {
    if (typeof window === "undefined") return
    if (!("Notification" in window)) {
      setPermission("unsupported")
      return
    }
    setPermission(Notification.permission as PushPermission)
  }, [])

  const isSupported = permission !== "unsupported" && "serviceWorker" in navigator && "PushManager" in window

  const subscribe = useCallback(async () => {
    if (!isSupported) {
      setError("Váš prohlížeč nepodporuje push notifikace")
      return false
    }

    setIsLoading(true)
    setError(null)

    try {
      // Request notification permission
      const perm = await Notification.requestPermission()
      setPermission(perm as PushPermission)

      if (perm !== "granted") {
        setError("Přístup k notifikacím byl odepřen")
        setIsLoading(false)
        return false
      }

      // Register service worker
      const reg = await navigator.serviceWorker.register("/sw.js")
      await navigator.serviceWorker.ready

      // Get VAPID public key
      const vapidPublicKey = await getVapidKey()
      if (!vapidPublicKey) throw new Error("VAPID klíč není dostupný")

      // Subscribe
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      })

      const json = sub.toJSON()
      const keys = json.keys as { p256dh: string; auth: string }

      await saveSubscription({
        endpoint: sub.endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent: navigator.userAgent.slice(0, 200),
      })

      console.log("[Push] Subscription saved successfully")
      setIsLoading(false)
      return true
    } catch (err) {
      console.error("[Push] Subscribe error:", err)
      setError("Nepodařilo se aktivovat notifikace")
      setIsLoading(false)
      return false
    }
  }, [isSupported, getVapidKey, saveSubscription])

  const unsubscribe = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw.js")
      if (reg) {
        const sub = await reg.pushManager.getSubscription()
        if (sub) {
          await removeSubscription({ endpoint: sub.endpoint })
          await sub.unsubscribe()
        }
      }
      console.log("[Push] Unsubscribed successfully")
      setIsLoading(false)
      return true
    } catch (err) {
      console.error("[Push] Unsubscribe error:", err)
      setError("Nepodařilo se deaktivovat notifikace")
      setIsLoading(false)
      return false
    }
  }, [removeSubscription])

  return {
    isSupported,
    permission,
    isSubscribed: !!isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe,
  }
}
