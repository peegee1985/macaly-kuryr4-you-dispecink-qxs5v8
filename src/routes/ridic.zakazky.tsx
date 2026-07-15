import { createFileRoute, Link } from '@tanstack/react-router'
import { useConvexAuth, useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useState, useEffect } from 'react'
import { LoadingScreen, PageHeader } from '@/components/AppShell'
import { DriverShell } from '@/components/DriverShell'
import { StopReorderPanel } from '@/components/StopReorderPanel'
import {
  cargoLabels, isToday, isTomorrow, isUrgent,
  formatDateBadge, AvailableRideCard,
} from '@/components/DriverAvailableRides'

export const Route = createFileRoute('/ridic/zakazky')({
  component: DriverRidesPage,
})



// ─── Status pill ──────────────────────────────────────────────────────────────

function StatusPill({ status }: { status: string }) {
  const configs: Record<string, { label: string; classes: string }> = {
    assigned:  { label: 'Přiřazeno',        classes: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
    pickup:    { label: 'Jedu vyzvednout',  classes: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
    transit:   { label: 'Jedu doručit',     classes: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },
    delivered: { label: 'Doručeno',         classes: 'bg-green-500/20 text-green-300 border-green-500/30' },
    pending:   { label: 'Volná zákazka',    classes: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
    cancelled: { label: 'Zrušeno',          classes: 'bg-red-500/20 text-red-300 border-red-500/30' },
  }
  const c = configs[status] ?? { label: status, classes: 'bg-muted text-muted-foreground border-border' }
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border ${c.classes}`}>
      {c.label}
    </span>
  )
}

// ─── Accent bar color by status ───────────────────────────────────────────────

function accentGradient(status: string) {
  const map: Record<string, string> = {
    assigned: 'from-blue-600/70 via-blue-500/40 to-blue-400/10',
    pickup:   'from-amber-600/70 via-amber-500/40 to-amber-400/10',
    transit:  'from-orange-600/70 via-orange-500/40 to-orange-400/10',
  }
  return map[status] ?? 'from-primary via-primary/50 to-primary/10'
}

// ─── Navigation helpers ───────────────────────────────────────────────────────

function buildNavUrl(service: 'google' | 'waze', address: string, lat?: number, lng?: number): string {
  const query = lat && lng ? `${lat},${lng}` : encodeURIComponent(address)
  if (service === 'waze') return `https://waze.com/ul?ll=${query}&navigate=yes`
  return `https://www.google.com/maps/dir/?api=1&destination=${lat && lng ? query : encodeURIComponent(address)}`
}

function NavGrid({ address, lat, lng }: { address: string; lat?: number; lng?: number }) {
  return (
    <div className="grid grid-cols-3 gap-2 mt-2">
      <a
        href={buildNavUrl('google', address, lat, lng)}
        target="_blank" rel="noopener noreferrer"
        className="flex flex-col items-center gap-1.5 py-3 bg-blue-600/15 border border-blue-600/25 text-blue-400 text-xs font-bold rounded-xl hover:bg-blue-600/25 transition-colors"
      >
        <span className="text-xl">🗺️</span>
        <span>Google Maps</span>
      </a>
      <a
        href={buildNavUrl('waze', address, lat, lng)}
        target="_blank" rel="noopener noreferrer"
        className="flex flex-col items-center gap-1.5 py-3 bg-cyan-600/15 border border-cyan-600/25 text-cyan-400 text-xs font-bold rounded-xl hover:bg-cyan-600/25 transition-colors"
      >
        <span className="text-xl">🔵</span>
        <span>Waze</span>
      </a>
      <a
        href={`https://maps.apple.com/?daddr=${lat && lng ? `${lat},${lng}` : encodeURIComponent(address)}`}
        target="_blank" rel="noopener noreferrer"
        className="flex flex-col items-center gap-1.5 py-3 bg-zinc-600/15 border border-zinc-600/25 text-zinc-400 text-xs font-bold rounded-xl hover:bg-zinc-600/25 transition-colors"
      >
        <span className="text-xl">🍎</span>
        <span>Apple Maps</span>
      </a>
    </div>
  )
}



// Legacy grouping for scheduled rides section
function getDateGroup(ts: number): 'dnes' | 'tyden' | 'mesic' | 'ostatni' {
  const now = new Date()
  const d = new Date(ts)
  if (d.toDateString() === now.toDateString()) return 'dnes'
  const startOfWeek = new Date(now)
  startOfWeek.setHours(0, 0, 0, 0)
  startOfWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7))
  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 7)
  if (d >= startOfWeek && d < endOfWeek) return 'tyden'
  if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) return 'mesic'
  return 'ostatni'
}

type DateGroup = 'dnes' | 'tyden' | 'mesic' | 'ostatni'
const groupOrder: DateGroup[] = ['dnes', 'tyden', 'mesic', 'ostatni']
const groupLabels: Record<DateGroup, string> = {
  dnes: '📅 Dnes',
  tyden: '🗓️ Tento týden',
  mesic: '📆 Tento měsíc',
  ostatni: '🕒 Ostatní',
}

function groupAndSortRides(rides: any[]) {
  const groups: Record<DateGroup, any[]> = { dnes: [], tyden: [], mesic: [], ostatni: [] }
  for (const r of rides) {
    groups[getDateGroup(r.requestedPickupAt)].push(r)
  }
  for (const g of groupOrder) {
    groups[g].sort((a: any, b: any) => a.requestedPickupAt - b.requestedPickupAt)
  }
  return groups
}

// ─── Countdown hook ───────────────────────────────────────────────────────────

const START_WINDOW_MS = 60 * 60 * 1000 // 60 minut před vyzvednutím

function useStartCountdown(requestedPickupAt: number): number {
  const canStartAt = requestedPickupAt - START_WINDOW_MS
  const [msLeft, setMsLeft] = useState(() => Math.max(0, canStartAt - Date.now()))

  useEffect(() => {
    const remaining = Math.max(0, canStartAt - Date.now())
    setMsLeft(remaining)
    if (remaining <= 0) return
    const id = setInterval(() => {
      const r = Math.max(0, canStartAt - Date.now())
      setMsLeft(r)
      if (r <= 0) clearInterval(id)
    }, 1000)
    return () => clearInterval(id)
  }, [canStartAt])

  return msLeft
}

function formatCountdown(ms: number): string {
  const total = Math.ceil(ms / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) return `${h} hod ${String(m).padStart(2, '0')} min`
  if (m > 0) return `${m} min ${String(s).padStart(2, '0')} s`
  return `${s} s`
}

// ─── Main RideCard (assigned / pickup / transit) ──────────────────────────────

function RideCard({ ride, onStatusUpdate, updating }: {
  ride: any
  onStatusUpdate: (rideId: string, status: string) => void
  updating: string | null
}) {
  const [navOpen, setNavOpen] = useState(false)
  const isTransit = ride.status === 'transit'

  const navAddress = isTransit ? ride.deliveryAddress : ride.pickupAddress
  const navLat     = isTransit ? ride.deliveryLat : ride.pickupLat
  const navLng     = isTransit ? ride.deliveryLng : ride.pickupLng
  const navLabel   = isTransit ? 'doručení' : 'vyzvednutí'

  const nextStatusMap: Record<string, { status: string; label: string }> = {
    assigned: { status: 'pickup',  label: '🚗 Jedu vyzvednout' },
    pickup:   { status: 'transit', label: '📦 Zásilku mám – jedu doručit' },
  }
  const next = nextStatusMap[ride.status]
  const isUpdating = updating === ride._id

  // Countdown: only lock the first action (assigned → pickup)
  const msLeft = useStartCountdown(ride.requestedPickupAt)
  const isLocked = ride.status === 'assigned' && msLeft > 0

  return (
    <div className="rounded-2xl overflow-hidden border border-border shadow-md">
      {/* Accent bar */}
      <div className={`h-1 w-full bg-gradient-to-r ${accentGradient(ride.status)}`} />

      <div className="bg-card p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-heading font-black text-base text-foreground">#{ride.rideNumber}</span>
            <StatusPill status={ride.status} />
          </div>
          {ride.price != null && (
            <span className="text-sm font-black text-primary flex-shrink-0">{ride.price} Kč</span>
          )}
        </div>
        {/* Date + cargo row */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {cargoLabels[ride.cargoType] ?? ride.cargoType} × {ride.quantity}
          </span>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
            isUrgent(ride.requestedPickupAt)
              ? 'bg-red-500/20 text-red-300'
              : isToday(ride.requestedPickupAt)
              ? 'bg-orange-500/15 text-orange-300'
              : 'bg-blue-500/15 text-blue-300'
          }`}>
            {formatDateBadge(ride.requestedPickupAt).label}
          </span>
        </div>

        {/* Route visualization */}
        <div className="relative flex flex-col gap-0 mb-4">
          {/* Pickup */}
          <div className={`flex gap-3 items-start pb-4 relative ${isTransit ? 'opacity-40' : ''}`}>
            <div className="flex flex-col items-center gap-1 pt-0.5 flex-shrink-0">
              <div className="w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-green-400" />
              <div className="w-0.5 h-6 bg-border" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">
                Vyzvednutí · {new Date(ride.requestedPickupAt).toLocaleString('cs-CZ', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
              </p>
              <p className="text-sm font-semibold text-foreground leading-tight">{ride.pickupAddress}</p>
              {ride.pickupContactName && (
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  {ride.pickupContactPhone ? (
                    <a
                      href={`tel:${ride.pickupContactPhone}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-500/15 border border-green-500/25 text-green-400 text-xs font-bold rounded-xl hover:bg-green-500/25 transition-colors"
                    >
                      📞 {ride.pickupContactName}
                    </a>
                  ) : (
                    <span className="text-xs text-muted-foreground">{ride.pickupContactName}</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Delivery */}
          <div className="flex gap-3 items-start">
            <div className="flex flex-col items-center pt-0.5 flex-shrink-0">
              <div className="w-3.5 h-3.5 rounded-full bg-red-500 border-2 border-red-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">
                Doručení · {new Date(ride.requestedDeliveryAt).toLocaleString('cs-CZ', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
              </p>
              <p className="text-sm font-semibold text-foreground leading-tight">{ride.deliveryAddress}</p>
              {ride.deliveryContactName && (
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  {ride.deliveryContactPhone ? (
                    <a
                      href={`tel:${ride.deliveryContactPhone}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-500/15 border border-green-500/25 text-green-400 text-xs font-bold rounded-xl hover:bg-green-500/25 transition-colors"
                    >
                      📞 {ride.deliveryContactName}
                    </a>
                  ) : (
                    <span className="text-xs text-muted-foreground">{ride.deliveryContactName}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Multi-stop */}
        {ride.isMultiStop && ride.stops && ride.stops.length > 0 && ['assigned', 'pickup', 'transit'].includes(ride.status) && (
          <div className="mb-3">
            <StopReorderPanel
              rideId={ride._id}
              stops={ride.stops}
              pickupAddress={ride.pickupAddress}
              pickupLat={ride.pickupLat}
              pickupLng={ride.pickupLng}
              deliveryAddress={ride.deliveryAddress}
              deliveryLat={ride.deliveryLat}
              deliveryLng={ride.deliveryLng}
            />
          </div>
        )}

        {/* Note / description */}
        {ride.cargoDescription && (
          <p className="text-xs text-muted-foreground bg-muted/50 rounded-xl px-3 py-2 mb-3">
            {ride.cargoDescription}
          </p>
        )}
        {ride.notes && (
          <p className="text-xs text-amber-300/90 bg-amber-950/40 border border-amber-700/30 rounded-xl px-3 py-2 mb-3 flex items-start gap-2">
            <span className="flex-shrink-0">⚠️</span>{ride.notes}
          </p>
        )}

        {/* Navigation toggle */}
        <div className="mb-3">
          <button
            onClick={() => setNavOpen(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 bg-primary/10 border border-primary/20 text-primary font-bold text-sm rounded-xl hover:bg-primary/20 transition-colors"
          >
            <span>🧭 Navigovat na {navLabel}</span>
            <span className="text-xs opacity-60">{navOpen ? '▲' : '▼'}</span>
          </button>
          {navOpen && <NavGrid address={navAddress} lat={navLat} lng={navLng} />}
        </div>

        {/* Main action */}
        {ride.status === 'transit' ? (
          <Link
            to="/ridic/pod/$rideId"
            params={{ rideId: ride._id }}
            className="block w-full py-4 text-center text-white font-black text-base rounded-2xl transition-colors bg-green-600 hover:bg-green-700 shadow-lg shadow-green-900/20"
          >
            ✅ Dokončit – zadat doklad o doručení
          </Link>
        ) : next ? (
          isLocked ? (
            <div className="w-full rounded-2xl border border-border bg-muted/50 px-4 py-3.5 flex flex-col gap-1.5">
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="text-lg">🔒</span>
                <span className="text-sm font-semibold">Zatím nelze spustit</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Zákazku lze zahájit 60 min před plánovaným vyzvednutím.
              </p>
              <div className="mt-1 flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary/40 rounded-full transition-all duration-1000"
                    style={{
                      width: `${Math.max(2, 100 - (msLeft / (ride.requestedPickupAt - START_WINDOW_MS - Date.now() + msLeft)) * 100)}%`
                    }}
                  />
                </div>
                <span className="text-xs font-mono font-bold text-primary tabular-nums">
                  {formatCountdown(msLeft)}
                </span>
              </div>
            </div>
          ) : (
            <button
              onClick={() => onStatusUpdate(ride._id, next.status)}
              disabled={isUpdating}
              className="w-full py-4 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-base rounded-2xl disabled:opacity-50 transition-colors shadow-lg shadow-primary/20"
            >
              {isUpdating ? 'Aktualizuji…' : next.label}
            </button>
          )
        ) : null}
      </div>
    </div>
  )
}



// ─── Compact history row ──────────────────────────────────────────────────────

function HistoryRow({ ride }: { ride: any }) {
  const isDelivered = ride.status === 'delivered'
  return (
    <div className="flex items-center gap-3 py-3 px-3 border-b border-border/40 last:border-0">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isDelivered ? 'bg-green-900/40 border border-green-700/30' : 'bg-red-900/30 border border-red-700/25'}`}>
        <span className={`text-sm ${isDelivered ? 'text-green-400' : 'text-red-400'}`}>
          {isDelivered ? '✓' : '✕'}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-xs font-bold text-foreground">#{ride.rideNumber}</span>
          <span className="text-xs text-muted-foreground">·</span>
          <span className="text-xs text-muted-foreground">
            {new Date(ride.requestedPickupAt).toLocaleString('cs-CZ', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {ride.pickupAddress?.split(',')[0]} → {ride.deliveryAddress?.split(',')[0]}
        </p>
      </div>
      {ride.price != null && (
        <span className="text-sm font-bold text-foreground flex-shrink-0">{ride.price} Kč</span>
      )}
    </div>
  )
}

// ─── Date-grouped section for scheduled rides ─────────────────────────────────

function ScheduledGroup({
  label, rides, onStatusUpdate, updating, forceExpand,
}: {
  label: string; rides: any[]; onStatusUpdate: (id: string, s: string) => void; updating: string | null; forceExpand?: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  if (rides.length === 0) return null
  const visible = forceExpand || expanded ? rides : rides.slice(0, 1)
  const hidden = rides.length - 1

  return (
    <div>
      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2 px-1">{label}</p>
      <div className="space-y-3">
        {visible.map(ride => (
          <RideCard key={ride._id} ride={ride} onStatusUpdate={onStatusUpdate} updating={updating} />
        ))}
      </div>
      {!forceExpand && hidden > 0 && (
        <button
          onClick={() => setExpanded(v => !v)}
          className="mt-2 w-full flex items-center justify-center gap-1 py-2.5 text-xs text-muted-foreground hover:text-foreground bg-muted/50 border border-border rounded-xl hover:bg-muted transition-colors"
        >
          {expanded ? '▲ Skrýt' : `▼ Zobrazit dalších ${hidden}`}
        </button>
      )}
    </div>
  )
}

function ScheduledSection({ rides, onStatusUpdate, updating }: {
  rides: any[]; onStatusUpdate: (id: string, s: string) => void; updating: string | null
}) {
  const groups = groupAndSortRides(rides)
  const hasAny = groupOrder.some(g => groups[g].length > 0)
  if (!hasAny) return null
  return (
    <div className="space-y-5">
      {groupOrder.map(g => (
        <ScheduledGroup
          key={g}
          label={groupLabels[g]}
          rides={groups[g]}
          onStatusUpdate={onStatusUpdate}
          updating={updating}
          forceExpand={g === 'dnes'}
        />
      ))}
    </div>
  )
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ emoji, title, count, accent }: { emoji: string; title: string; count: number; accent?: string }) {
  return (
    <div className={`flex items-center gap-2 mb-3 border-l-2 pl-3 ${accent ?? 'border-primary'}`}>
      <span className="text-base">{emoji}</span>
      <h2 className="font-heading font-bold text-sm uppercase tracking-wide text-foreground">{title}</h2>
      <span className="ml-auto text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{count}</span>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function DriverRidesPage() {
  const { isAuthenticated } = useConvexAuth()
  const rides = useQuery(api.rides.getDriverRides)
  const rejectedRides = useQuery(api.rides.getRejectedRides)
  const updateStatus = useMutation(api.rides.updateRideStatus)
  const selfAssign = useMutation(api.rides.selfAssignRide)
  const [updating, setUpdating] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [showRejected, setShowRejected] = useState(false)
  const [taking, setTaking] = useState<string | null>(null)
  const [takenRideId, setTakenRideId] = useState<string | null>(null)

  if (!isAuthenticated || rides === undefined) return <LoadingScreen />

  const handleTakeFromRejected = async (rideId: string) => {
    setTaking(rideId)
    try {
      await selfAssign({ rideId: rideId as any })
      setTakenRideId(rideId)
      setTimeout(() => setTakenRideId(null), 3000)
    } catch (e: any) {
      alert(e.message ?? 'Chyba při přijímání zákazky')
    } finally {
      setTaking(null)
    }
  }

  const handleStatusUpdate = async (rideId: string, newStatus: string) => {
    setUpdating(rideId)
    try {
      await updateStatus({ rideId: rideId as any, status: newStatus as any })
    } finally {
      setUpdating(null)
    }
  }

  const activeRides    = rides.filter(r => r.status === 'pickup' || r.status === 'transit')
  const scheduledRides = rides.filter(r => r.status === 'assigned')
  const historyRides   = rides.filter(r => r.status === 'delivered' || r.status === 'cancelled')
    .sort((a, b) => b.requestedPickupAt - a.requestedPickupAt)

  return (
    <DriverShell>
      <div className="px-4 pt-5 pb-24 max-w-2xl mx-auto space-y-8">
        {/* Take-from-rejected success toast */}
        {takenRideId && (
          <div className="fixed top-4 left-4 right-4 z-50 max-w-md mx-auto bg-green-700 text-white text-sm font-semibold px-4 py-3 rounded-xl shadow-xl text-center">
            ✅ Zákazka přijata! Je nyní ve tvých plánovaných.
          </div>
        )}
        <PageHeader
          title="Zákazky"
          subtitle={`${rides.length} celkem · ${activeRides.length} aktivní · ${scheduledRides.length} plánované`}
        />

        {/* ─── ACTIVE ─── */}
        <section>
          <SectionHeader emoji="🔴" title="Aktivní – právě řeším" count={activeRides.length} accent="border-red-500" />
          {activeRides.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl px-4 py-6 text-center">
              <p className="text-muted-foreground text-sm">Žádná aktivní zákazka</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeRides.map(ride => (
                <RideCard key={ride._id} ride={ride} onStatusUpdate={handleStatusUpdate} updating={updating} />
              ))}
            </div>
          )}
        </section>

        {/* ─── SCHEDULED ─── */}
        <section>
          <SectionHeader emoji="📅" title="Plánované – přiřazeno mně" count={scheduledRides.length} accent="border-blue-500" />
          {scheduledRides.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl px-4 py-6 text-center">
              <p className="text-muted-foreground text-sm">Žádné plánované zákazky</p>
            </div>
          ) : (
            <ScheduledSection rides={scheduledRides} onStatusUpdate={handleStatusUpdate} updating={updating} />
          )}
        </section>

        {/* ─── HISTORY ─── */}
        <section>
          <button
            onClick={() => setShowHistory(h => !h)}
            className="w-full flex items-center justify-between px-4 py-3.5 bg-card border border-border rounded-2xl hover:bg-secondary/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span>🗂️</span>
              <span className="font-heading font-bold text-sm uppercase tracking-wide">Historie</span>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{historyRides.length}</span>
            </div>
            <span className="text-muted-foreground text-xs">{showHistory ? '▲ Skrýt' : '▼ Zobrazit'}</span>
          </button>
          {showHistory && (
            <div className="mt-2 bg-card border border-border rounded-2xl overflow-hidden">
              {historyRides.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-6">Historie je prázdná</p>
              ) : (
                historyRides.map(ride => <HistoryRow key={ride._id} ride={ride} />)
              )}
            </div>
          )}
        </section>

        {/* ─── REJECTED ─── */}
        {(rejectedRides === undefined || rejectedRides.length > 0) && (
          <section>
            <button
              onClick={() => setShowRejected(r => !r)}
              className="w-full flex items-center justify-between px-4 py-3.5 bg-card border border-zinc-700/40 rounded-2xl hover:bg-secondary/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span>🚫</span>
                <span className="font-heading font-bold text-sm uppercase tracking-wide text-zinc-400">Odmítnuté</span>
                <span className="text-xs text-zinc-500 bg-zinc-800/60 px-2 py-0.5 rounded-full">
                  {rejectedRides === undefined ? '…' : rejectedRides.length}
                </span>
              </div>
              <span className="text-zinc-500 text-xs">{showRejected ? '▲ Skrýt' : '▼ Zobrazit'}</span>
            </button>
            {showRejected && (
              <div className="mt-2 space-y-3">
                {rejectedRides === undefined ? (
                  <div className="bg-card border border-border rounded-2xl px-4 py-6 text-center">
                    <p className="text-muted-foreground text-sm">Načítám…</p>
                  </div>
                ) : rejectedRides.length === 0 ? (
                  <div className="bg-card border border-border rounded-2xl px-4 py-6 text-center">
                    <p className="text-muted-foreground text-sm">Žádné odmítnuté zákazky</p>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-zinc-500 px-1">Tyto zákazky jsi odmítl — stále je můžeš vzít.</p>
                    {rejectedRides.map(ride => (
                      <AvailableRideCard
                        key={ride._id}
                        ride={ride}
                        onTake={handleTakeFromRejected}
                        taking={taking}
                        showTakeOnly
                      />
                    ))}
                  </>
                )}
              </div>
            )}
          </section>
        )}
      </div>
    </DriverShell>
  )
}
