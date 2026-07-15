import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { AppShell } from '@/components/AppShell'
import { vendingNav } from './vending'
import { useEffect, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import type { Id } from '../../convex/_generated/dataModel'

export const Route = createFileRoute('/vending/mapa')({
  component: VendingMapPage,
})

// Status → Leaflet marker color
const STATUS_COLOR: Record<string, string> = {
  active: '#22c55e',      // green
  maintenance: '#eab308', // yellow
  inactive: '#ef4444',    // red
  offline: '#6b7280',     // grey
}

const STATUS_LABEL: Record<string, string> = {
  active: 'Aktivní',
  maintenance: 'Údržba',
  inactive: 'Neaktivní',
  offline: 'Offline',
}

const INCIDENT_TYPE_LABEL: Record<string, string> = {
  machine_locked: 'Stroj zamčen', pin_incorrect: 'Nesprávný PIN',
  machine_damaged: 'Poškozený stroj', broken_display: 'Poškozený displej',
  no_products: 'Chybí produkty', wrong_products: 'Špatné produkty',
  power_failure: 'Výpadek proudu', vandalism: 'Vandalismus', other: 'Jiný',
}

function makeMarkerIcon(color: string, label: string) {
  // Custom SVG circle marker
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 32 42">
    <circle cx="16" cy="16" r="14" fill="${color}" stroke="white" stroke-width="2.5"/>
    <polygon points="10,28 22,28 16,42" fill="${color}"/>
    <text x="16" y="21" text-anchor="middle" font-size="11" font-weight="bold" fill="white" font-family="sans-serif">${label.slice(0, 2).toUpperCase()}</text>
  </svg>`
  return svg
}

function VendingMapPage() {
  const locations = useQuery(api.vending.listLocations, {})
  const openIncidents = useQuery(api.vending.listIncidents, { status: 'open' })
  const clients = useQuery(api.vending.listClients)

  const mapRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const mapElRef = useRef<HTMLDivElement>(null)

  const [selectedLocation, setSelectedLocation] = useState<any>(null)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterClient, setFilterClient] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!mounted || !mapElRef.current) return
    let L: any
    let map: any

    const initMap = async () => {
      L = (await import('leaflet')).default

      if (mapRef.current) return // already initialized

      map = L.map(mapElRef.current!, {
        center: [50.0755, 14.4378], // Prague
        zoom: 10,
        zoomControl: true,
      })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map)

      mapRef.current = map
    }

    initMap()

    return () => {
      if (map) {
        map.remove()
        mapRef.current = null
      }
    }
  }, [mounted])

  // Update markers when locations change
  useEffect(() => {
    if (!mounted || !mapRef.current || !locations) return

    let L: any
    const updateMarkers = async () => {
      L = (await import('leaflet')).default

      // Clear old markers
      markersRef.current.forEach((m) => m.remove())
      markersRef.current = []

      const filtered = locations.filter((loc) => {
        if (filterStatus && loc.status !== filterStatus) return false
        if (filterClient && loc.clientId !== filterClient) return false
        return loc.lat && loc.lng
      })

      // Group by status for "in progress" — check visits
      const bounds: [number, number][] = []

      filtered.forEach((loc) => {
        if (!loc.lat || !loc.lng) return

        const color = STATUS_COLOR[loc.status] ?? '#6b7280'
        const svgIcon = makeMarkerIcon(color, loc.name)
        const icon = L.divIcon({
          html: svgIcon,
          className: '',
          iconSize: [32, 42],
          iconAnchor: [16, 42],
          popupAnchor: [0, -42],
        })

        const marker = L.marker([loc.lat, loc.lng], { icon })
        marker.on('click', () => setSelectedLocation(loc))
        marker.addTo(mapRef.current)
        markersRef.current.push(marker)
        bounds.push([loc.lat, loc.lng])
      })

      if (bounds.length > 0) {
        mapRef.current.fitBounds(bounds, { padding: [40, 40] })
      }
    }

    updateMarkers()
  }, [locations, filterStatus, filterClient, mounted])

  const clientMap = Object.fromEntries((clients ?? []).map((c) => [c._id, c]))
  const locationIncidents = openIncidents?.filter((i) => i.locationId === selectedLocation?._id) ?? []

  const statusCounts = (locations ?? []).reduce<Record<string, number>>((acc, l) => {
    acc[l.status] = (acc[l.status] ?? 0) + 1
    return acc
  }, {})

  return (
    <AppShell navItems={vendingNav} title="Mapa lokací" primaryCount={5}>
      <div className="flex flex-col h-[calc(100vh-8rem)] gap-0">
        {/* Top bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex flex-wrap gap-2">
            {Object.entries(STATUS_LABEL).map(([s, label]) => (
              <button
                key={s}
                onClick={() => setFilterStatus(filterStatus === s ? '' : s)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${filterStatus === s ? 'border-white/50 bg-white/10' : 'border-[hsl(var(--border))] hover:border-white/30'}`}
              >
                <span className="w-2 h-2 rounded-full" style={{ background: STATUS_COLOR[s] }} />
                {label} {statusCounts[s] ? `(${statusCounts[s]})` : ''}
              </button>
            ))}
          </div>
          <select
            value={filterClient}
            onChange={(e) => setFilterClient(e.target.value)}
            className="px-3 py-1.5 text-sm bg-[hsl(var(--input))] border border-[hsl(var(--border))] rounded-lg text-[hsl(var(--foreground))]"
          >
            <option value="">Všichni klienti</option>
            {(clients ?? []).map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
        </div>

        {/* Map + sidebar */}
        <div className="flex gap-4 flex-1 min-h-0">
          <div
            ref={mapElRef}
            className="flex-1 rounded-xl overflow-hidden border border-[hsl(var(--border))]"
            style={{ minHeight: 400 }}
          />

          {/* Side panel */}
          {selectedLocation && (
            <div className="w-80 shrink-0 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl overflow-y-auto">
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-[hsl(var(--foreground))]">{selectedLocation.name}</h3>
                    <p className="font-mono text-xs text-[hsl(var(--primary))] mt-0.5">{selectedLocation.locationCode}</p>
                  </div>
                  <button
                    onClick={() => setSelectedLocation(null)}
                    className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] p-1"
                  >
                    ✕
                  </button>
                </div>

                <div
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border mb-4"
                  style={{
                    background: `${STATUS_COLOR[selectedLocation.status]}20`,
                    borderColor: `${STATUS_COLOR[selectedLocation.status]}40`,
                    color: STATUS_COLOR[selectedLocation.status],
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: STATUS_COLOR[selectedLocation.status] }} />
                  {STATUS_LABEL[selectedLocation.status]}
                </div>

                <div className="space-y-2 text-sm mb-4">
                  <div className="flex gap-2">
                    <span className="text-[hsl(var(--muted-foreground))] w-20 shrink-0">Adresa</span>
                    <span className="text-[hsl(var(--foreground))]">{selectedLocation.address}</span>
                  </div>
                  {selectedLocation.city && (
                    <div className="flex gap-2">
                      <span className="text-[hsl(var(--muted-foreground))] w-20 shrink-0">Město</span>
                      <span className="text-[hsl(var(--foreground))]">{selectedLocation.city}</span>
                    </div>
                  )}
                  {selectedLocation.openingHours && (
                    <div className="flex gap-2">
                      <span className="text-[hsl(var(--muted-foreground))] w-20 shrink-0">Otevřeno</span>
                      <span className="text-[hsl(var(--foreground))]">{selectedLocation.openingHours}</span>
                    </div>
                  )}
                  {clientMap[selectedLocation.clientId] && (
                    <div className="flex gap-2">
                      <span className="text-[hsl(var(--muted-foreground))] w-20 shrink-0">Klient</span>
                      <span className="text-[hsl(var(--foreground))]">{clientMap[selectedLocation.clientId].name}</span>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <span className="text-[hsl(var(--muted-foreground))] w-20 shrink-0">Posl. návštěva</span>
                    <span className="text-[hsl(var(--foreground))]">
                      {selectedLocation.lastVisitAt ? new Date(selectedLocation.lastVisitAt).toLocaleDateString('cs-CZ') : 'Nikdy'}
                    </span>
                  </div>
                </div>

                {selectedLocation.accessInstructions && (
                  <div className="bg-[hsl(var(--muted))] rounded-lg p-3 mb-4">
                    <p className="text-xs font-semibold text-[hsl(var(--muted-foreground))] mb-1">Přístup</p>
                    <p className="text-sm text-[hsl(var(--foreground))]">{selectedLocation.accessInstructions}</p>
                  </div>
                )}

                {locationIncidents.length > 0 && (
                  <div className="bg-[hsl(var(--destructive))]/10 border border-[hsl(var(--destructive))]/20 rounded-lg p-3 mb-4">
                    <p className="text-xs font-semibold text-[hsl(var(--destructive))] mb-2">
                      ⚠ {locationIncidents.length} otevřený incident{locationIncidents.length > 1 ? 'y' : ''}
                    </p>
                    {locationIncidents.slice(0, 3).map((inc) => (
                      <p key={inc._id} className="text-xs text-[hsl(var(--muted-foreground))]">
                        • {INCIDENT_TYPE_LABEL[inc.type] ?? inc.type}
                      </p>
                    ))}
                  </div>
                )}

                {/* Navigation buttons */}
                {selectedLocation.lat && selectedLocation.lng && (
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-[hsl(var(--muted-foreground))] mb-2 uppercase tracking-wide">Navigace</p>
                    <div className="grid grid-cols-3 gap-1.5">
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${selectedLocation.lat},${selectedLocation.lng}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex flex-col items-center gap-1 p-2 bg-[hsl(var(--muted))] rounded-lg text-xs text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))] transition-colors"
                      >
                        🗺️ <span>Google</span>
                      </a>
                      <a
                        href={`maps://maps.apple.com/?daddr=${selectedLocation.lat},${selectedLocation.lng}`}
                        className="flex flex-col items-center gap-1 p-2 bg-[hsl(var(--muted))] rounded-lg text-xs text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))] transition-colors"
                      >
                        🍎 <span>Apple</span>
                      </a>
                      <a
                        href={`https://waze.com/ul?ll=${selectedLocation.lat},${selectedLocation.lng}&navigate=yes`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex flex-col items-center gap-1 p-2 bg-[hsl(var(--muted))] rounded-lg text-xs text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))] transition-colors"
                      >
                        🔵 <span>Waze</span>
                      </a>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Link
                    to="/vending/lokace/$locationId"
                    params={{ locationId: selectedLocation._id }}
                    className="flex-1 text-center px-3 py-2 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] rounded-lg text-sm font-medium hover:opacity-90"
                  >
                    Otevřít detail
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t border-[hsl(var(--border))]">
          {Object.entries(STATUS_LABEL).map(([s, label]) => (
            <div key={s} className="flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
              <span className="w-3 h-3 rounded-full" style={{ background: STATUS_COLOR[s] }} />
              {label}
            </div>
          ))}
          <div className="flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
            <span className="w-3 h-3 rounded-full bg-[hsl(var(--info))]" />
            Probíhá
          </div>
        </div>
      </div>
    </AppShell>
  )
}
