import { createContext, useContext, useRef, useState, useEffect, useCallback } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { useConvexAuth } from 'convex/react'
import { api } from '../../convex/_generated/api'

const GPS_STORAGE_KEY = 'kuryr_gps_active'

interface GPSState {
  isTracking: boolean
  lastLocation: { lat: number; lng: number; accuracy?: number } | null
  error: string | null
  updateCount: number
  startTracking: () => void
  stopTracking: () => void
}

const GPSContext = createContext<GPSState | null>(null)

export function GPSProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useConvexAuth()
  const updateGPS = useMutation(api.gps.updateLocation)
  const gpsStatus = useQuery(api.gps.getMyGPSStatus)

  const [isTracking, setIsTracking] = useState(false)
  const [lastLocation, setLastLocation] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [updateCount, setUpdateCount] = useState(0)

  const watchIdRef = useRef<number | null>(null)
  const isTrackingRef = useRef(false)
  const lastLocationRef = useRef<{ lat: number; lng: number } | null>(null)
  const hasAutoStarted = useRef(false)

  const stopTracking = useCallback(async (adminForced = false) => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    setIsTracking(false)
    isTrackingRef.current = false

    if (!adminForced) {
      // User manually stopped – remember their choice
      localStorage.setItem(GPS_STORAGE_KEY, 'false')
    } else {
      // Admin stopped – clear preference so next login auto-starts again
      localStorage.removeItem(GPS_STORAGE_KEY)
    }

    if (lastLocationRef.current) {
      try {
        await updateGPS({
          lat: lastLocationRef.current.lat,
          lng: lastLocationRef.current.lng,
          isTracking: false,
        })
      } catch (e) {
        console.error('Failed to update GPS stop in DB:', e)
      }
    }
  }, [updateGPS])

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Váš prohlížeč nepodporuje GPS.')
      return
    }
    if (watchIdRef.current !== null) return // already watching
    setError(null)
    setIsTracking(true)
    isTrackingRef.current = true
    localStorage.setItem(GPS_STORAGE_KEY, 'true')

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude, longitude, accuracy, speed, heading } = pos.coords
        lastLocationRef.current = { lat: latitude, lng: longitude }
        setLastLocation({ lat: latitude, lng: longitude, accuracy: accuracy ?? undefined })
        setUpdateCount(c => c + 1)
        try {
          await updateGPS({
            lat: latitude,
            lng: longitude,
            accuracy: accuracy ?? undefined,
            speed: speed ?? undefined,
            heading: heading ?? undefined,
            isTracking: true,
          })
          console.log(`GPS updated: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`)
        } catch (e) {
          console.error('GPS update failed:', e)
        }
      },
      (err) => {
        console.error('Geolocation error:', err)
        setError('Nepodařilo se získat polohu. Zkontrolujte oprávnění GPS.')
        setIsTracking(false)
        isTrackingRef.current = false
        watchIdRef.current = null
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    )
  }, [updateGPS])

  // Auto-start GPS when driver logs in
  useEffect(() => {
    if (!isAuthenticated || hasAutoStarted.current) return
    hasAutoStarted.current = true
    const saved = localStorage.getItem(GPS_STORAGE_KEY)
    // Auto-start unless the driver explicitly turned it off last session
    if (saved !== 'false') {
      console.log('Auto-starting GPS tracking on login')
      startTracking()
    }
  }, [isAuthenticated, startTracking])

  // Watch for admin force-stop signal from DB
  useEffect(() => {
    if (gpsStatus?.adminStopRequested && isTrackingRef.current) {
      console.log('Admin force-stopped GPS tracking')
      stopTracking(true)
    }
  }, [gpsStatus?.adminStopRequested, stopTracking])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
    }
  }, [])

  return (
    <GPSContext.Provider value={{ isTracking, lastLocation, error, updateCount, startTracking, stopTracking }}>
      {children}
    </GPSContext.Provider>
  )
}

export function useGPS() {
  const ctx = useContext(GPSContext)
  if (!ctx) throw new Error('useGPS must be used inside GPSProvider')
  return ctx
}
