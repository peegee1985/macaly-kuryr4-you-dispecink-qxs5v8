import { createFileRoute } from '@tanstack/react-router'
import { useConvexAuth, useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { useEffect, useRef, useState } from 'react'
import { AppShell, LoadingScreen, PageHeader } from '@/components/AppShell'
import { dispatcherNav } from './dispatcer'

export const Route = createFileRoute('/dispatcer/mapa')({
  component: DispatcherMapPage,
})

type Filter = 'ridici' | 'vyzvednuti' | 'doruceni' | 'zastavky' | 'trasy'

// Fetch OSRM route geometry for an ordered list of [lng, lat] waypoints
async function fetchOSRMRoute(waypoints: [number, number][]): Promise<[number, number][] | null> {
  if (waypoints.length < 2) return null
  const coords = waypoints.map(([lng, lat]) => `${lng},${lat}`).join(';')
  try {
    const res = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`,
      { signal: AbortSignal.timeout(5000) }
    )
    if (!res.ok) return null
    const data = await res.json()
    const geom = data?.routes?.[0]?.geometry?.coordinates as [number, number][] | undefined
    if (!geom) return null
    // OSRM returns [lng, lat], Leaflet needs [lat, lng]
    return geom.map(([lng, lat]) => [lat, lng])
  } catch {
    return null
  }
}

function DispatcherMapPage() {
  const { isAuthenticated } = useConvexAuth()
  const driverLocations = useQuery(api.gps.getAllDriverLocations)
  const activeRides = useQuery(api.rides.getActiveRidesForMap)
  const forceStopGPS = useMutation(api.gps.forceStopDriverGPS)
  const [stoppingDriver, setStoppingDriver] = useState<Id<'users'> | null>(null)

  async function handleForceStopGPS(driverId: Id<'users'>) {
    setStoppingDriver(driverId)
    try {
      await forceStopGPS({ driverId })
    } catch (e) {
      console.error('Failed to force-stop GPS:', e)
    } finally {
      setStoppingDriver(null)
    }
  }

  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const layersRef = useRef<{
    drivers: Map<string, any>
    pickups: Map<string, any>
    deliveries: Map<string, any>
    stops: Map<string, any[]>   // rideId → array of stop markers
    routes: Map<string, any>    // rideId → polyline layer
  }>({
    drivers: new Map(),
    pickups: new Map(),
    deliveries: new Map(),
    stops: new Map(),
    routes: new Map(),
  })
  const [filters, setFilters] = useState<Set<Filter>>(new Set(['ridici', 'vyzvednuti', 'doruceni', 'zastavky', 'trasy']))

  const toggleFilter = (f: Filter) => {
    setFilters(prev => {
      const next = new Set(prev)
      if (next.has(f)) { next.delete(f) } else { next.add(f) }
      return next
    })
  }

  // Init map
  useEffect(() => {
    if (typeof window === 'undefined' || !mapRef.current) return
    import('leaflet').then((L) => {
      if (mapInstanceRef.current || !mapRef.current) return
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })
      const map = L.map(mapRef.current, { center: [50.0755, 14.4378], zoom: 11 })
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map)
      mapInstanceRef.current = map
      setTimeout(() => map.invalidateSize(), 100)
    })
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

  // Update driver markers
  useEffect(() => {
    if (!mapInstanceRef.current || !driverLocations) return
    import('leaflet').then((L) => {
      const show = filters.has('ridici')
      const activeIds = new Set(driverLocations.filter(d => d.isTracking).map(d => d.driverId as string))

      layersRef.current.drivers.forEach((marker, id) => {
        if (!activeIds.has(id)) {
          mapInstanceRef.current.removeLayer(marker)
          layersRef.current.drivers.delete(id)
        }
      })

      driverLocations.filter(d => d.isTracking).forEach((loc) => {
        const icon = L.divIcon({
          className: '',
          html: `<div style="background:#f59e0b;border-radius:50% 50% 50% 0;width:34px;height:34px;border:2px solid white;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 2px 8px rgba(0,0,0,0.5);transform:rotate(-45deg)"><span style="transform:rotate(45deg)">🚐</span></div>`,
          iconSize: [34, 34],
          iconAnchor: [17, 34],
        })
        const popup = `<strong>${loc.driverName || 'Řidič'}</strong><br/>⏱ ${new Date(loc.updatedAt).toLocaleTimeString('cs-CZ')}${loc.speed != null ? `<br/>🚗 ${Math.round(loc.speed * 3.6)} km/h` : ''}`

        if (layersRef.current.drivers.has(loc.driverId)) {
          const m = layersRef.current.drivers.get(loc.driverId)
          m.setLatLng([loc.lat, loc.lng])
          if (show) m.addTo(mapInstanceRef.current); else mapInstanceRef.current.removeLayer(m)
        } else {
          const marker = L.marker([loc.lat, loc.lng], { icon }).bindPopup(popup)
          if (show) marker.addTo(mapInstanceRef.current)
          layersRef.current.drivers.set(loc.driverId, marker)
        }
      })
    })
  }, [driverLocations, filters])

  // Update ride markers + stops + routes
  useEffect(() => {
    if (!mapInstanceRef.current || !activeRides) return
    import('leaflet').then(async (L) => {
      const showPickup = filters.has('vyzvednuti')
      const showDelivery = filters.has('doruceni')
      const showStops = filters.has('zastavky')
      const showRoutes = filters.has('trasy')
      const rideIds = new Set(activeRides.map(r => r._id as string))

      // Cleanup removed rides
      layersRef.current.pickups.forEach((m, id) => {
        if (!rideIds.has(id)) { mapInstanceRef.current.removeLayer(m); layersRef.current.pickups.delete(id) }
      })
      layersRef.current.deliveries.forEach((m, id) => {
        if (!rideIds.has(id)) { mapInstanceRef.current.removeLayer(m); layersRef.current.deliveries.delete(id) }
      })
      layersRef.current.stops.forEach((markers, id) => {
        if (!rideIds.has(id)) {
          markers.forEach(m => mapInstanceRef.current.removeLayer(m))
          layersRef.current.stops.delete(id)
        }
      })
      layersRef.current.routes.forEach((poly, id) => {
        if (!rideIds.has(id)) { mapInstanceRef.current.removeLayer(poly); layersRef.current.routes.delete(id) }
      })

      const statusColor: Record<string, string> = {
        pending: '#6b7280',
        approved: '#3b82f6',
        assigned: '#8b5cf6',
        pickup: '#f59e0b',
        transit: '#10b981',
      }

      for (const ride of activeRides) {
        const color = statusColor[ride.status] ?? '#6b7280'

        // ── Pickup marker ──
        if (ride.pickupLat != null && ride.pickupLng != null) {
          const icon = L.divIcon({
            className: '',
            html: `<div title="${ride.rideNumber}" style="background:${color};width:28px;height:28px;border-radius:50% 50% 50% 0;border:2px solid white;display:flex;align-items:center;justify-content:center;font-size:13px;box-shadow:0 2px 6px rgba(0,0,0,0.4);transform:rotate(-45deg)"><span style="transform:rotate(45deg)">📦</span></div>`,
            iconSize: [28, 28], iconAnchor: [14, 28],
          })
          const popup = `<strong>#${ride.rideNumber} – Vyzvednutí</strong><br/>${ride.pickupAddress}${ride.driverName ? `<br/>Řidič: ${ride.driverName}` : ''}`
          if (layersRef.current.pickups.has(ride._id)) {
            const m = layersRef.current.pickups.get(ride._id)
            if (showPickup) m.addTo(mapInstanceRef.current); else mapInstanceRef.current.removeLayer(m)
          } else {
            const marker = L.marker([ride.pickupLat, ride.pickupLng], { icon }).bindPopup(popup)
            if (showPickup) marker.addTo(mapInstanceRef.current)
            layersRef.current.pickups.set(ride._id, marker)
          }
        }

        // ── Delivery marker ──
        if (ride.deliveryLat != null && ride.deliveryLng != null) {
          const icon = L.divIcon({
            className: '',
            html: `<div title="${ride.rideNumber}" style="background:#10b981;width:28px;height:28px;border-radius:50% 50% 50% 0;border:2px solid white;display:flex;align-items:center;justify-content:center;font-size:13px;box-shadow:0 2px 6px rgba(0,0,0,0.4);transform:rotate(-45deg)"><span style="transform:rotate(45deg)">🏁</span></div>`,
            iconSize: [28, 28], iconAnchor: [14, 28],
          })
          const popup = `<strong>#${ride.rideNumber} – Doručení</strong><br/>${ride.deliveryAddress}${ride.driverName ? `<br/>Řidič: ${ride.driverName}` : ''}`
          if (layersRef.current.deliveries.has(ride._id)) {
            const m = layersRef.current.deliveries.get(ride._id)
            if (showDelivery) m.addTo(mapInstanceRef.current); else mapInstanceRef.current.removeLayer(m)
          } else {
            const marker = L.marker([ride.deliveryLat, ride.deliveryLng], { icon }).bindPopup(popup)
            if (showDelivery) marker.addTo(mapInstanceRef.current)
            layersRef.current.deliveries.set(ride._id, marker)
          }
        }

        // ── Intermediate stop markers ──
        const sortedStops = ride.isMultiStop && ride.stops
          ? [...ride.stops].sort((a, b) => a.order - b.order)
          : []

        if (!layersRef.current.stops.has(ride._id)) {
          const stopMarkers: any[] = []
          sortedStops.forEach((stop, idx) => {
            if (stop.lat == null || stop.lng == null) return
            const num = idx + 1
            const icon = L.divIcon({
              className: '',
              html: `<div title="Zastávka ${num}" style="background:#f97316;width:26px;height:26px;border-radius:50%;border:2px solid white;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:white;box-shadow:0 2px 6px rgba(0,0,0,0.4)">${num}</div>`,
              iconSize: [26, 26], iconAnchor: [13, 13],
            })
            const popup = `<strong>#${ride.rideNumber} – Zastávka ${num}</strong><br/>${stop.address}${stop.contactName ? `<br/>${stop.contactName}` : ''}`
            const marker = L.marker([stop.lat, stop.lng], { icon }).bindPopup(popup)
            if (showStops) marker.addTo(mapInstanceRef.current)
            stopMarkers.push(marker)
          })
          layersRef.current.stops.set(ride._id, stopMarkers)
        } else {
          const markers = layersRef.current.stops.get(ride._id)!
          markers.forEach(m => {
            if (showStops) m.addTo(mapInstanceRef.current); else mapInstanceRef.current.removeLayer(m)
          })
        }

        // ── Route polyline via OSRM ──
        if (!layersRef.current.routes.has(ride._id)) {
          // Build ordered waypoints: pickup → stops (sorted) → delivery
          const waypoints: [number, number][] = []
          if (ride.pickupLat != null && ride.pickupLng != null)
            waypoints.push([ride.pickupLng, ride.pickupLat])
          for (const s of sortedStops) {
            if (s.lat != null && s.lng != null) waypoints.push([s.lng, s.lat])
          }
          if (ride.deliveryLat != null && ride.deliveryLng != null)
            waypoints.push([ride.deliveryLng, ride.deliveryLat])

          if (waypoints.length >= 2) {
            // Fetch route async — don't await in loop, attach when ready
            fetchOSRMRoute(waypoints).then((latlngs) => {
              if (!latlngs || !mapInstanceRef.current) return
              const poly = L.polyline(latlngs, {
                color: color,
                weight: 3,
                opacity: 0.7,
                dashArray: '6 4',
              })
              if (showRoutes) poly.addTo(mapInstanceRef.current)
              layersRef.current.routes.set(ride._id, poly)
              console.log(`Route drawn for ride ${ride.rideNumber} (${latlngs.length} points)`)
            })
          }
        } else {
          const poly = layersRef.current.routes.get(ride._id)!
          if (showRoutes) poly.addTo(mapInstanceRef.current); else mapInstanceRef.current.removeLayer(poly)
        }
      }
    })
  }, [activeRides, filters])

  if (!isAuthenticated) return <LoadingScreen />

  const activeDrivers = driverLocations?.filter(d => d.isTracking) ?? []
  const ridesWithCoords = activeRides?.filter(r => r.pickupLat != null || r.deliveryLat != null) ?? []
  const multiStopRides = activeRides?.filter(r => r.isMultiStop && r.stops && r.stops.length > 0) ?? []

  return (
    <AppShell navItems={dispatcherNav} title="Dispečer" primaryCount={4} subtitle="Řídicí centrum">
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        <PageHeader title="Živá mapa" subtitle="GPS poloha řidičů a aktivních zakázek" />

        {/* Filter toggles */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button onClick={() => toggleFilter('ridici')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${filters.has('ridici') ? 'bg-amber-500/20 border-amber-500 text-amber-400' : 'bg-card border-border text-muted-foreground'}`}>
            🚐 Řidiči ({activeDrivers.length})
          </button>
          <button onClick={() => toggleFilter('vyzvednuti')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${filters.has('vyzvednuti') ? 'bg-blue-500/20 border-blue-500 text-blue-400' : 'bg-card border-border text-muted-foreground'}`}>
            📦 Vyzvednutí
          </button>
          <button onClick={() => toggleFilter('zastavky')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${filters.has('zastavky') ? 'bg-orange-500/20 border-orange-500 text-orange-400' : 'bg-card border-border text-muted-foreground'}`}>
            🔶 Zastávky ({multiStopRides.reduce((acc, r) => acc + (r.stops?.length ?? 0), 0)})
          </button>
          <button onClick={() => toggleFilter('doruceni')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${filters.has('doruceni') ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-card border-border text-muted-foreground'}`}>
            🏁 Doručení
          </button>
          <button onClick={() => toggleFilter('trasy')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${filters.has('trasy') ? 'bg-violet-500/20 border-violet-500 text-violet-400' : 'bg-card border-border text-muted-foreground'}`}>
            〰️ Trasy
          </button>
          <span className="ml-auto text-xs text-muted-foreground self-center">
            {ridesWithCoords.length} zakázek na mapě
          </span>
        </div>

        {/* Map — no overflow-hidden so Leaflet popups are not clipped */}
        <div className="bg-card border border-border rounded-xl mb-5" style={{ height: 'clamp(320px, 55vh, 600px)', position: 'relative', zIndex: 0 }}>
          <div ref={mapRef} style={{ height: '100%', width: '100%', borderRadius: '0.75rem' }} />
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mb-5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#6b7280] inline-block" /> Čeká</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#3b82f6] inline-block" /> Schváleno</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#8b5cf6] inline-block" /> Přiřazeno</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#f59e0b] inline-block" /> Vyzvedávání</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#10b981] inline-block" /> Na cestě</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#f97316] inline-block" /> Zastávka</span>
          <span className="flex items-center gap-1"><span className="inline-block w-4 border-t-2 border-dashed border-[#8b5cf6]" /> Trasa</span>
        </div>

        {/* Active drivers list */}
        <div>
          <h3 className="font-heading font-semibold mb-3 text-sm">Aktivní řidiči ({activeDrivers.length})</h3>
          {driverLocations === undefined ? (
            <div className="text-center py-4 text-muted-foreground text-sm">Načítám polohy...</div>
          ) : activeDrivers.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-5 text-center">
              <p className="text-muted-foreground text-sm">Žádný řidič momentálně nesdílí polohu</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {activeDrivers.map((loc) => (
                <div key={loc.driverId} className="bg-card border border-green-700/30 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse flex-shrink-0" />
                    <span className="font-medium text-sm flex-1">{loc.driverName || 'Řidič'}</span>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-0.5 mb-3">
                    <p>📍 {loc.lat.toFixed(5)}, {loc.lng.toFixed(5)}</p>
                    {loc.speed != null && <p>🚗 {Math.round(loc.speed * 3.6)} km/h</p>}
                    <p>⏱ {new Date(loc.updatedAt).toLocaleTimeString('cs-CZ')}</p>
                  </div>
                  <button
                    onClick={() => handleForceStopGPS(loc.driverId)}
                    disabled={stoppingDriver === loc.driverId}
                    className="w-full text-xs py-1.5 px-3 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 transition-colors disabled:opacity-50 font-medium"
                  >
                    {stoppingDriver === loc.driverId ? 'Zastavuji...' : '⏹ Zastavit GPS'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
