import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useOrderSound } from '@/hooks/useOrderSound'

export const cargoLabels: Record<string, string> = {
  envelope: 'Obálka', parcel: 'Balík', box: 'Krabice', pallet: 'Paleta', other: 'Jiné',
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

export function isToday(ts: number) {
  return new Date(ts).toDateString() === new Date().toDateString()
}
export function isTomorrow(ts: number) {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return new Date(ts).toDateString() === tomorrow.toDateString()
}
export function isUrgent(ts: number) {
  return ts - Date.now() < 2 * 60 * 60 * 1000 && ts > Date.now()
}

export function formatDateBadge(ts: number): { label: string; urgency: 'urgent' | 'today' | 'tomorrow' | 'future' } {
  const time = new Date(ts).toLocaleString('cs-CZ', { hour: '2-digit', minute: '2-digit' })
  if (isUrgent(ts)) return { label: `URGENTNÍ · ${time}`, urgency: 'urgent' }
  if (isToday(ts)) return { label: `Dnes · ${time}`, urgency: 'today' }
  if (isTomorrow(ts)) return { label: `Zítra · ${time}`, urgency: 'tomorrow' }
  const label = new Date(ts).toLocaleString('cs-CZ', { weekday: 'short', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })
  return { label, urgency: 'future' }
}

export function groupByDay(rides: any[]): { dateKey: string; label: string; rides: any[] }[] {
  const map = new Map<string, any[]>()
  for (const r of rides) {
    const d = new Date(r.requestedPickupAt)
    const key = d.toISOString().split('T')[0]
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(r)
  }
  for (const arr of map.values()) arr.sort((a, b) => a.requestedPickupAt - b.requestedPickupAt)
  const sorted = [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
  return sorted.map(([key, rides]) => {
    const ts = rides[0].requestedPickupAt
    let label: string
    if (isToday(ts)) label = '📅 Dnes'
    else if (isTomorrow(ts)) label = '📆 Zítra'
    else label = new Date(ts).toLocaleString('cs-CZ', { weekday: 'long', day: 'numeric', month: 'long' })
    return { dateKey: key, label, rides }
  })
}

// ─── Available ride card ───────────────────────────────────────────────────────

export function AvailableRideCard({ ride, onTake, taking, onReject, rejecting, showTakeOnly }: {
  ride: any
  onTake: (rideId: string) => void
  taking: string | null
  onReject?: (rideId: string) => void
  rejecting?: string | null
  showTakeOnly?: boolean
}) {
  const isTaking = taking === ride._id
  const isRejecting = rejecting === ride._id
  const badge = formatDateBadge(ride.requestedPickupAt)

  const urgencyBar: Record<string, string> = {
    urgent:   'from-red-600 via-red-500/50 to-red-400/10',
    today:    'from-orange-500 via-orange-400/50 to-orange-300/10',
    tomorrow: 'from-yellow-500 via-yellow-400/50 to-yellow-300/10',
    future:   'from-purple-500 via-purple-400/50 to-purple-400/10',
  }
  const badgeStyles: Record<string, string> = {
    urgent:   'bg-red-500/20 text-red-300 border-red-500/40',
    today:    'bg-orange-500/20 text-orange-300 border-orange-500/40',
    tomorrow: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
    future:   'bg-purple-500/15 text-purple-300 border-purple-500/30',
  }
  const borderStyles: Record<string, string> = {
    urgent:   'border-red-500/40',
    today:    'border-orange-500/30',
    tomorrow: 'border-yellow-500/25',
    future:   'border-purple-500/25',
  }

  return (
    <div className={`rounded-2xl overflow-hidden border shadow-md ${borderStyles[badge.urgency]}`}>
      <div className={`h-1 w-full bg-gradient-to-r ${urgencyBar[badge.urgency]}`} />
      <div className="bg-card p-4">
        {/* Date badge row */}
        <div className="flex items-center justify-between mb-3">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black border ${badgeStyles[badge.urgency]}`}>
            {badge.urgency === 'urgent' && <span className="animate-pulse">🚨</span>}
            {badge.urgency === 'today' && <span>📅</span>}
            {badge.urgency === 'tomorrow' && <span>📆</span>}
            {badge.urgency === 'future' && <span>🗓️</span>}
            {badge.label}
          </span>
          {ride.price != null && (
            <span className="text-sm font-black text-primary flex-shrink-0">{ride.price} Kč</span>
          )}
        </div>

        {/* Ride number + cargo */}
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <span className="font-heading font-black text-sm text-foreground">#{ride.rideNumber}</span>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {cargoLabels[ride.cargoType] ?? ride.cargoType} × {ride.quantity}
          </span>
        </div>

        {/* Route */}
        <div className="flex gap-3 mb-4">
          <div className="flex flex-col items-center gap-0.5 pt-1.5 flex-shrink-0">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
            <div className="w-0.5 h-5 bg-border" />
            <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <div>
              <p className="text-[11px] text-muted-foreground font-medium">
                Vyzvednutí · {new Date(ride.requestedPickupAt).toLocaleString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}
              </p>
              <p className="text-sm font-semibold text-foreground leading-tight truncate">{ride.pickupAddress}</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground font-medium">
                Doručení · {new Date(ride.requestedDeliveryAt).toLocaleString('cs-CZ', { weekday: 'short', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
              <p className="text-sm font-semibold text-foreground leading-tight truncate">{ride.deliveryAddress}</p>
            </div>
          </div>
        </div>

        {ride.notes && (
          <p className="text-xs text-amber-300/80 bg-amber-950/30 border border-amber-700/25 rounded-xl px-3 py-2 mb-3 flex items-start gap-2">
            <span className="flex-shrink-0">⚠️</span>{ride.notes}
          </p>
        )}

        {/* Action buttons */}
        {showTakeOnly ? (
          // In Odmítnuté section — only "Vzít zákazku"
          <button
            onClick={() => onTake(ride._id)}
            disabled={isTaking}
            className="w-full py-3.5 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-sm rounded-xl disabled:opacity-50 transition-colors"
          >
            {isTaking ? '⏳ Přijímám…' : '✋ Vzít zákazku'}
          </button>
        ) : (
          // In Volné tab — both buttons
          <div className="flex gap-2">
            <button
              onClick={() => onTake(ride._id)}
              disabled={isTaking || isRejecting}
              className="flex-1 py-3.5 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-sm rounded-xl disabled:opacity-50 transition-colors"
            >
              {isTaking ? '⏳ Přijímám…' : '✋ Vzít'}
            </button>
            {onReject && (
              <button
                onClick={() => onReject(ride._id)}
                disabled={isTaking || isRejecting}
                className="flex-[0_0_auto] px-4 py-3.5 bg-zinc-700/60 hover:bg-zinc-600/70 border border-zinc-600/50 text-zinc-300 font-bold text-sm rounded-xl disabled:opacity-50 transition-colors"
              >
                {isRejecting ? '…' : '✕ Odmítnout'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Self-contained available rides section ────────────────────────────────────
// Use this anywhere you want a full available-rides feed (query + mutations included).

export function AvailableRidesSection() {
  const availableRides = useQuery(api.rides.getAvailableRides)
  const selfAssign = useMutation(api.rides.selfAssignRide)
  const rejectRide = useMutation(api.rides.rejectRide)
  const [taking, setTaking] = useState<string | null>(null)
  const [rejecting, setRejecting] = useState<string | null>(null)
  const [takenRideId, setTakenRideId] = useState<string | null>(null)

  useOrderSound(availableRides?.length)

  const handleTake = async (rideId: string) => {
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

  const handleReject = async (rideId: string) => {
    setRejecting(rideId)
    try {
      await rejectRide({ rideId: rideId as any })
    } catch (e: any) {
      alert(e.message ?? 'Chyba při odmítání zákazky')
    } finally {
      setRejecting(null)
    }
  }

  return (
    <>
      {/* Success toast */}
      {takenRideId && (
        <div className="fixed top-4 left-4 right-4 z-50 max-w-md mx-auto bg-green-700 text-white text-sm font-semibold px-4 py-3 rounded-xl shadow-xl text-center">
          ✅ Zákazka přijata! Je nyní ve tvých plánovaných.
        </div>
      )}

      {availableRides === undefined ? (
        <div className="flex items-center justify-center py-16">
          <svg className="w-6 h-6 animate-spin text-muted-foreground" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : availableRides.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl px-4 py-10 text-center">
          <div className="text-4xl mb-3">📭</div>
          <p className="font-heading font-semibold text-base">Žádné volné zákazky</p>
          <p className="text-muted-foreground text-sm mt-1">Dispečer zatím nevydal žádnou zákazku k převzetí</p>
        </div>
      ) : (
        (() => {
          const sorted = [...availableRides].sort((a, b) => a.requestedPickupAt - b.requestedPickupAt)
          const dayGroups = groupByDay(sorted)
          return (
            <div className="space-y-5">
              {dayGroups.map(({ dateKey, label, rides }) => (
                <div key={dateKey}>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xs font-black text-foreground uppercase tracking-widest">{label}</span>
                    <div className="flex-1 h-px bg-border/60" />
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{rides.length}</span>
                  </div>
                  <div className="space-y-3">
                    {rides.map(ride => (
                      <AvailableRideCard
                        key={ride._id}
                        ride={ride}
                        onTake={handleTake}
                        taking={taking}
                        onReject={handleReject}
                        rejecting={rejecting}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )
        })()
      )}
    </>
  )
}
