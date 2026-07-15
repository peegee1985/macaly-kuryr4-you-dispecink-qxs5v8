import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useState, useEffect, useRef } from 'react'
import type { Id } from '../../convex/_generated/dataModel'

export const Route = createFileRoute('/vending-portal/')({
  component: VendingPortalDashboard,
})

const STATUS_COLOR: Record<string, string> = {
  active: 'bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] border-[hsl(var(--success))]/20',
  maintenance: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  offline: 'bg-[hsl(var(--destructive))]/10 text-[hsl(var(--destructive))] border-[hsl(var(--destructive))]/20',
  inactive: 'bg-[hsl(var(--muted))]/20 text-[hsl(var(--muted-foreground))] border-[hsl(var(--border))]',
}

const STATUS_LABEL: Record<string, string> = {
  active: 'Aktivní', maintenance: 'Servis', offline: 'Offline', inactive: 'Neaktivní',
}

const VISIT_STATUS_LABEL: Record<string, string> = {
  scheduled: 'Plánováno', assigned: 'Přiřazeno', accepted: 'Přijato',
  en_route: 'Na cestě', in_progress: 'Probíhá', completed: 'Dokončeno',
  cancelled: 'Zrušeno', incident: 'Incident',
}

// Map marker color by location status
const MARKER_COLOR: Record<string, string> = {
  active: '#22c55e',
  maintenance: '#eab308',
  offline: '#ef4444',
  inactive: '#6b7280',
}

function makeMarkerSvg(color: string, label: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="40" viewBox="0 0 30 40">
    <circle cx="15" cy="15" r="13" fill="${color}" stroke="white" stroke-width="2"/>
    <polygon points="9,27 21,27 15,40" fill="${color}"/>
    <text x="15" y="20" text-anchor="middle" font-size="10" font-weight="bold" fill="white" font-family="sans-serif">${label.slice(0, 2).toUpperCase()}</text>
  </svg>`
}

// ─── Map Tab ────────────────────────────────────────────────────────────────

function PortalMapTab({ locations }: { locations: any[] }) {
  const mapRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const mapElRef = useRef<HTMLDivElement>(null)
  const [selectedLoc, setSelectedLoc] = useState<any>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!mounted || !mapElRef.current) return
    let cancelled = false

    async function initMap() {
      const L = (await import('leaflet')).default
      await import('leaflet/dist/leaflet.css')
      if (cancelled || !mapElRef.current) return

      if (!mapRef.current) {
        const center = locations.find((l) => l.lat && l.lng)
        const map = L.map(mapElRef.current, { zoomControl: true })
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap'
        }).addTo(map)
        if (center) {
          map.setView([center.lat, center.lng], 11)
        } else {
          map.setView([50.075, 14.437], 7)
        }
        mapRef.current = map
      }

      // Clear old markers
      markersRef.current.forEach((m) => m.remove())
      markersRef.current = []

      for (const loc of locations) {
        if (!loc.lat || !loc.lng) continue
        const color = MARKER_COLOR[loc.status] ?? '#6b7280'
        const svg = makeMarkerSvg(color, loc.locationCode ?? loc.name)
        const icon = L.divIcon({
          html: svg,
          className: '',
          iconSize: [30, 40],
          iconAnchor: [15, 40],
          popupAnchor: [0, -40],
        })
        const marker = L.marker([loc.lat, loc.lng], { icon }).addTo(mapRef.current)
        marker.on('click', () => setSelectedLoc(loc))
        markersRef.current.push(marker)
      }

      // Fit bounds if multiple locations
      const withCoords = locations.filter((l) => l.lat && l.lng)
      if (withCoords.length > 1) {
        const bounds = L.latLngBounds(withCoords.map((l) => [l.lat!, l.lng!]))
        mapRef.current.fitBounds(bounds, { padding: [40, 40] })
      }
    }

    initMap()
    return () => { cancelled = true }
  }, [mounted, locations])

  const locationsWithCoords = locations.filter((l) => l.lat && l.lng)
  const locationsWithout = locations.filter((l) => !l.lat || !l.lng)

  return (
    <div className="space-y-4">
      {locationsWithout.length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-2 text-xs text-yellow-400">
          {locationsWithout.length} lokací nemá GPS souřadnice a nezobrazí se na mapě
        </div>
      )}

      <div className="relative bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl overflow-hidden">
        {!mounted ? (
          <div className="h-80 flex items-center justify-center text-[hsl(var(--muted-foreground))]">Načítám mapu…</div>
        ) : locationsWithCoords.length === 0 ? (
          <div className="h-80 flex flex-col items-center justify-center text-[hsl(var(--muted-foreground))]">
            <div className="text-4xl mb-2">🗺</div>
            <p>Žádné lokace s GPS souřadnicemi</p>
          </div>
        ) : (
          <div ref={mapElRef} className="h-80 md:h-96 w-full" />
        )}

        {/* Selected location card */}
        {selectedLoc && (
          <div className="absolute bottom-3 left-3 right-3 md:left-auto md:right-3 md:w-72 bg-[hsl(var(--card))]/95 backdrop-blur-sm border border-[hsl(var(--border))] rounded-xl p-3 shadow-xl">
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <p className="font-semibold text-sm text-[hsl(var(--foreground))] truncate">{selectedLoc.name}</p>
                <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">{selectedLoc.locationCode}</p>
              </div>
              <button onClick={() => setSelectedLoc(null)} className="ml-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] shrink-0 text-xs">✕</button>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLOR[selectedLoc.status] ?? ''}`}>
                {STATUS_LABEL[selectedLoc.status] ?? selectedLoc.status}
              </span>
              {selectedLoc.address && (
                <span className="text-xs text-[hsl(var(--muted-foreground))] truncate">{selectedLoc.address}</span>
              )}
            </div>
            {selectedLoc.lat && selectedLoc.lng && (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${selectedLoc.lat},${selectedLoc.lng}`}
                target="_blank" rel="noopener noreferrer"
                className="mt-2 flex items-center gap-1 text-xs text-[hsl(var(--primary))] hover:underline"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                Navigovat
              </a>
            )}
          </div>
        )}
      </div>

      {/* Location legend */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {Object.entries(STATUS_LABEL).map(([key, label]) => {
          const count = locations.filter((l) => l.status === key).length
          return (
            <div key={key} className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl px-3 py-2 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: MARKER_COLOR[key] }} />
              <span className="text-xs text-[hsl(var(--muted-foreground))]">{label}</span>
              <span className="ml-auto text-sm font-semibold text-[hsl(var(--foreground))]">{count}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Photo Gallery Tab ───────────────────────────────────────────────────────

const PHOTO_CAT_LABEL: Record<string, string> = {
  before: 'Před', after: 'Po', damage: 'Škoda', other: 'Ostatní',
}

function PortalPhotoTab({ clientId }: { clientId: Id<'serviceClients'> }) {
  const photos = useQuery(api.vending.listClientPhotos, { clientId, limit: 48 })
  const [filterCat, setFilterCat] = useState('')
  const [lightbox, setLightbox] = useState<string | null>(null)

  const filtered = (photos ?? []).filter((p: any) => !filterCat || p.category === filterCat)

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {(['', 'before', 'after', 'damage', 'other'] as const).map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCat(cat)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              filterCat === cat
                ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] border-[hsl(var(--primary))]'
                : 'border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]'
            }`}
          >
            {cat === '' ? 'Vše' : PHOTO_CAT_LABEL[cat]}
          </button>
        ))}
      </div>

      {!photos ? (
        <div className="text-center py-12 text-[hsl(var(--muted-foreground))]">Načítám fotografie…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl">
          <div className="text-4xl mb-2">📷</div>
          <p className="text-[hsl(var(--muted-foreground))]">Žádné fotografie</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {filtered.map((photo: any) => (
            <button
              key={photo._id}
              onClick={() => setLightbox(photo.url)}
              className="group relative aspect-square bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl overflow-hidden hover:border-[hsl(var(--primary))]/50 transition-colors"
            >
              {photo.url && (
                <img src={photo.url} alt="" className="w-full h-full object-cover group-hover:opacity-90 transition-opacity" />
              )}
              <div className="absolute top-1 left-1">
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-black/50 text-white">
                  {PHOTO_CAT_LABEL[photo.category] ?? photo.category}
                </span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-xs text-white">
                  {new Date(photo.takenAt).toLocaleDateString('cs-CZ')}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <img src={lightbox} alt="" className="max-w-full max-h-full object-contain rounded-lg" />
          <button
            className="absolute top-4 right-4 text-white text-2xl hover:text-gray-300"
            onClick={() => setLightbox(null)}
          >✕</button>
        </div>
      )}
    </div>
  )
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────

function VendingPortalDashboard() {
  const clients = useQuery(api.vending.listClients)
  const me = useQuery(api.users.getMe)
  const [selectedClientId, setSelectedClientId] = useState<Id<'serviceClients'> | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'map' | 'photos'>('overview')

  const clientId = selectedClientId ?? (clients && clients.length > 0 ? (clients[0] as any)._id : null)

  const kpi = useQuery(
    api.vending.getClientKpi,
    clientId ? { clientId } : 'skip'
  )

  const visits = useQuery(
    api.vending.listVisits,
    clientId ? { clientId } : 'skip'
  )

  const locations = useQuery(
    api.vending.listLocations,
    clientId ? { clientId } : 'skip'
  )

  const incidents = useQuery(
    api.vending.listIncidents,
    clientId ? { clientId, status: 'open' } : 'skip'
  )

  const recentVisits = visits
    ? [...visits].sort((a, b) => b.scheduledAt - a.scheduledAt).slice(0, 10)
    : []

  const selectedClient = clients?.find((c: any) => c._id === clientId)
  const accentStyle = (selectedClient as any)?.accentColor
    ? { '--portal-accent': (selectedClient as any).accentColor } as React.CSSProperties
    : {}

  const TABS = [
    { key: 'overview' as const, label: 'Přehled' },
    { key: 'map' as const, label: 'Mapa' },
    { key: 'photos' as const, label: 'Fotodokumentace' },
  ]

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]" style={accentStyle}>
      {/* Header */}
      <div className="bg-[hsl(var(--card))] border-b border-[hsl(var(--border))] px-4 py-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {(selectedClient as any)?.logoUrl && (
                <img
                  src={(selectedClient as any).logoUrl}
                  alt=""
                  className="h-8 object-contain"
                />
              )}
              <div>
                <h1 className="text-xl font-bold text-[hsl(var(--foreground))]">Vending Portál</h1>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">{me?.name ?? me?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
              <div className="w-2 h-2 rounded-full bg-[hsl(var(--success))] animate-pulse" />
              Živá data
            </div>
          </div>

          {/* Client selector */}
          {clients && clients.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {clients.map((c: any) => (
                <button
                  key={c._id}
                  onClick={() => setSelectedClientId(c._id)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    c._id === clientId
                      ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] border-[hsl(var(--primary))]'
                      : 'border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] bg-[hsl(var(--background))]'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}

          {/* Tab navigation */}
          <div className="mt-3 flex gap-1 border-b border-[hsl(var(--border))] -mb-4 pb-0">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-[hsl(var(--primary))] text-[hsl(var(--primary))]'
                    : 'border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-4 pt-6 space-y-5">
        {/* MAP TAB */}
        {activeTab === 'map' && (
          <PortalMapTab locations={locations ?? []} />
        )}

        {/* PHOTOS TAB */}
        {activeTab === 'photos' && clientId && (
          <PortalPhotoTab clientId={clientId as Id<'serviceClients'>} />
        )}

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <>
            {/* KPI Grid */}
            {kpi && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <KpiCard
                  label="Lokace celkem"
                  value={kpi.totalLocations}
                  sub={`${kpi.activeLocations} aktivní`}
                  color="text-[hsl(var(--foreground))]"
                />
                <KpiCard
                  label="Plnění"
                  value={`${kpi.completionRate}%`}
                  sub={`${kpi.completedVisits}/${kpi.totalVisits} návštěv`}
                  color={kpi.completionRate >= 90 ? 'text-[hsl(var(--success))]' : kpi.completionRate >= 70 ? 'text-yellow-400' : 'text-[hsl(var(--destructive))]'}
                />
                <KpiCard
                  label="Dochvilnost"
                  value={`${kpi.onTimePct}%`}
                  sub="Příjezd do 30 min"
                  color={kpi.onTimePct >= 90 ? 'text-[hsl(var(--success))]' : 'text-yellow-400'}
                />
                <KpiCard
                  label="Otevřené incidenty"
                  value={kpi.openIncidents}
                  sub={`${kpi.totalIncidents} celkem (30 dní)`}
                  color={kpi.openIncidents > 0 ? 'text-[hsl(var(--destructive))]' : 'text-[hsl(var(--success))]'}
                />
              </div>
            )}

            {/* Open incidents alert */}
            {incidents && incidents.length > 0 && (
              <div className="bg-[hsl(var(--destructive))]/10 border border-[hsl(var(--destructive))]/20 rounded-2xl p-4">
                <p className="font-semibold text-[hsl(var(--destructive))] mb-3 flex items-center gap-2">
                  <span>⚠</span> {incidents.length} otevřených incidentů
                </p>
                <div className="space-y-2">
                  {incidents.slice(0, 3).map((inc: any) => (
                    <div key={inc._id} className="flex items-center justify-between text-sm">
                      <span className="text-[hsl(var(--foreground))]">{inc.description.slice(0, 60)}{inc.description.length > 60 ? '…' : ''}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${
                        inc.severity === 'high' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                        inc.severity === 'medium' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                        'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                      }`}>
                        {inc.severity === 'high' ? 'Vysoká' : inc.severity === 'medium' ? 'Střední' : 'Nízká'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-5">
              {/* Locations status */}
              <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-4">
                <h2 className="font-semibold text-[hsl(var(--foreground))] mb-3 flex items-center justify-between">
                  <span>Lokace</span>
                  {locations && <span className="text-xs text-[hsl(var(--muted-foreground))] font-normal">{locations.length} celkem</span>}
                </h2>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {locations?.map((loc: any) => (
                    <div key={loc._id} className="flex items-center justify-between py-2 border-b border-[hsl(var(--border))] last:border-0">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-[hsl(var(--foreground))] truncate">{loc.name}</p>
                        <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">{loc.address}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ml-2 shrink-0 ${STATUS_COLOR[loc.status] ?? ''}`}>
                        {STATUS_LABEL[loc.status] ?? loc.status}
                      </span>
                    </div>
                  ))}
                  {locations?.length === 0 && (
                    <p className="text-sm text-[hsl(var(--muted-foreground))] text-center py-4">Žádné lokace</p>
                  )}
                  {locations === undefined && (
                    <p className="text-sm text-[hsl(var(--muted-foreground))] text-center py-4">Načítám…</p>
                  )}
                </div>
              </div>

              {/* Recent visits */}
              <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-4">
                <h2 className="font-semibold text-[hsl(var(--foreground))] mb-3">Poslední návštěvy</h2>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {recentVisits.map((visit: any) => (
                    <div key={visit._id} className="flex items-center justify-between py-2 border-b border-[hsl(var(--border))] last:border-0">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-[hsl(var(--foreground))] truncate">{visit.visitNumber}</p>
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">
                          {new Date(visit.scheduledAt).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <VisitStatusBadge status={visit.status} />
                    </div>
                  ))}
                  {recentVisits.length === 0 && (
                    <p className="text-sm text-[hsl(var(--muted-foreground))] text-center py-4">
                      {visits === undefined ? 'Načítám…' : 'Žádné návštěvy'}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Client info */}
            {selectedClient && (
              <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-4">
                <h2 className="font-semibold text-[hsl(var(--foreground))] mb-3">Informace o klientovi</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  {selectedClient.contactName && (
                    <div>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">Kontakt</p>
                      <p className="text-[hsl(var(--foreground))]">{selectedClient.contactName}</p>
                    </div>
                  )}
                  {selectedClient.contactEmail && (
                    <div>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">Email</p>
                      <a href={`mailto:${selectedClient.contactEmail}`} className="text-[hsl(var(--primary))]">{selectedClient.contactEmail}</a>
                    </div>
                  )}
                  {selectedClient.contactPhone && (
                    <div>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">Telefon</p>
                      <a href={`tel:${selectedClient.contactPhone}`} className="text-[hsl(var(--primary))]">{selectedClient.contactPhone}</a>
                    </div>
                  )}
                  {selectedClient.ico && (
                    <div>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">IČO</p>
                      <p className="text-[hsl(var(--foreground))]">{selectedClient.ico}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {!clients && (
              <div className="text-center py-12 text-[hsl(var(--muted-foreground))]">Načítám data…</div>
            )}

            {clients?.length === 0 && (
              <div className="text-center py-12">
                <p className="text-[hsl(var(--foreground))] font-semibold">Žádná přiřazení klienti</p>
                <p className="text-[hsl(var(--muted-foreground))] text-sm mt-1">Kontaktujte dispečera pro přiřazení k workspace</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function KpiCard({ label, value, sub, color }: { label: string; value: string | number; sub: string; color: string }) {
  return (
    <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-4">
      <p className="text-xs text-[hsl(var(--muted-foreground))] mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">{sub}</p>
    </div>
  )
}

function VisitStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    completed: 'bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] border-[hsl(var(--success))]/20',
    incident: 'bg-[hsl(var(--destructive))]/10 text-[hsl(var(--destructive))] border-[hsl(var(--destructive))]/20',
    in_progress: 'bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] border-[hsl(var(--primary))]/20',
    en_route: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    cancelled: 'bg-[hsl(var(--muted))]/20 text-[hsl(var(--muted-foreground))] border-[hsl(var(--border))]',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border ml-2 shrink-0 ${colors[status] ?? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'}`}>
      {VISIT_STATUS_LABEL[status] ?? status}
    </span>
  )
}
