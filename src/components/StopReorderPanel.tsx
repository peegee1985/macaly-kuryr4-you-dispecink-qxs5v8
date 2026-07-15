/**
 * StopReorderPanel – drag-to-reorder + route optimization for multi-stop rides.
 * Used by both dispatcher (in ride detail) and driver (in active order view).
 */
import { useState, useRef, useCallback } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { optimizeRoute, estimateRouteDistance, type RoutePoint } from '@/lib/routeOptimizer'

type Stop = {
  address: string
  lat?: number
  lng?: number
  contactName: string
  contactPhone: string
  notes?: string
  order: number
}

interface Props {
  rideId: Id<'rides'>
  stops: Stop[]
  pickupAddress: string
  pickupLat?: number
  pickupLng?: number
  deliveryAddress: string
  deliveryLat?: number
  deliveryLng?: number
  readOnly?: boolean
}

export function StopReorderPanel({
  rideId,
  stops,
  pickupAddress,
  pickupLat,
  pickupLng,
  deliveryAddress,
  deliveryLat,
  deliveryLng,
  readOnly = false,
}: Props) {
  const reorderStops = useMutation(api.rides.reorderStops)
  const [localStops, setLocalStops] = useState<Stop[]>(() =>
    [...stops].sort((a, b) => a.order - b.order)
  )
  const [saving, setSaving] = useState(false)
  const [optimizing, setOptimizing] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [optimizedInfo, setOptimizedInfo] = useState<string | null>(null)
  const [isDirty, setIsDirty] = useState(false)

  // Drag state
  const dragIdx = useRef<number | null>(null)
  const dragOverIdx = useRef<number | null>(null)

  const handleDragStart = (idx: number) => {
    dragIdx.current = idx
  }

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault()
    dragOverIdx.current = idx
  }

  const handleDrop = () => {
    if (dragIdx.current === null || dragOverIdx.current === null) return
    if (dragIdx.current === dragOverIdx.current) return
    const updated = [...localStops]
    const [dragged] = updated.splice(dragIdx.current, 1)
    updated.splice(dragOverIdx.current, 0, dragged)
    const reindexed = updated.map((s, i) => ({ ...s, order: i + 1 }))
    setLocalStops(reindexed)
    setIsDirty(true)
    setOptimizedInfo(null)
    dragIdx.current = null
    dragOverIdx.current = null
  }

  const handleOptimize = useCallback(() => {
    setOptimizing(true)
    setError(null)
    try {
      // Build full route: pickup → stops → delivery
      const pickup: RoutePoint = {
        address: pickupAddress,
        lat: pickupLat,
        lng: pickupLng,
        label: 'Vyzvednutí',
      }
      const middle: RoutePoint[] = localStops.map(s => ({
        address: s.address,
        lat: s.lat,
        lng: s.lng,
        contactName: s.contactName,
        contactPhone: s.contactPhone,
        notes: s.notes,
      }))
      const delivery: RoutePoint = {
        address: deliveryAddress,
        lat: deliveryLat,
        lng: deliveryLng,
        label: 'Doručení',
      }

      const before = estimateRouteDistance([pickup, ...middle, delivery])
      const optimized = optimizeRoute([pickup, ...middle, delivery])
      const after = estimateRouteDistance(optimized)

      // Extract reordered middle stops (skip first and last which are fixed)
      const newMiddle = optimized.slice(1, optimized.length - 1)
      const newStops = newMiddle.map((p, i) => {
        const orig = localStops.find(s => s.address === p.address) || localStops[i]
        return { ...orig, order: i + 1 }
      })

      setLocalStops(newStops)
      setIsDirty(true)

      const saved = (before - after).toFixed(1)
      const hasCoords = localStops.some(s => s.lat !== undefined)
      if (hasCoords && parseFloat(saved) > 0) {
        setOptimizedInfo(`Trasa optimalizována. Úspora ~${saved} km`)
      } else if (hasCoords) {
        setOptimizedInfo('Trasa je již optimální')
      } else {
        setOptimizedInfo('Zastávky přeseřazeny (bez GPS souřadnic)')
      }
    } catch (err) {
      setError('Optimalizace selhala')
      console.error('Route optimization error:', err)
    } finally {
      setOptimizing(false)
    }
  }, [localStops, pickupAddress, pickupLat, pickupLng, deliveryAddress, deliveryLat, deliveryLng])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      await reorderStops({ rideId, stops: localStops })
      setIsDirty(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err: any) {
      setError(err?.message || 'Nepodařilo se uložit pořadí')
    } finally {
      setSaving(false)
    }
  }

  if (localStops.length === 0) return null

  return (
    <div className="bg-blue-950/20 border border-blue-700/30 rounded-xl p-3">
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <p className="text-xs font-semibold text-blue-400">
          🗺️ Zastávky na trase ({localStops.length})
        </p>
        {!readOnly && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleOptimize}
              disabled={optimizing || saving}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-700/30 border border-blue-600/40 text-blue-300 text-xs font-medium rounded-lg hover:bg-blue-700/50 disabled:opacity-50 transition-colors"
            >
              {optimizing ? '⏳ Optimalizuji...' : '🔀 Optimalizovat trasu'}
            </button>
            {isDirty && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:opacity-90 disabled:opacity-50 transition-colors"
              >
                {saving ? '⏳ Ukládám...' : '💾 Uložit pořadí'}
              </button>
            )}
            {saved && !isDirty && (
              <span className="text-xs text-green-400 flex items-center gap-1">✓ Uloženo</span>
            )}
          </div>
        )}
      </div>

      {optimizedInfo && (
        <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg px-3 py-2 mb-3">
          <p className="text-xs text-blue-300">✅ {optimizedInfo}</p>
        </div>
      )}

      {error && (
        <div className="bg-red-900/20 border border-red-600/30 rounded-lg px-3 py-2 mb-3">
          <p className="text-xs text-red-400">⚠ {error}</p>
        </div>
      )}

      {/* Fixed: pickup start */}
      <div className="flex items-center gap-2 mb-1 opacity-60 select-none">
        <span className="text-green-400 text-base w-5 text-center flex-shrink-0">▲</span>
        <span className="text-xs text-muted-foreground truncate">{pickupAddress}</span>
        <span className="ml-auto text-xs text-muted-foreground/50 flex-shrink-0">start</span>
      </div>

      {/* Draggable stops */}
      <div className="space-y-1 my-1">
        {localStops.map((stop, idx) => (
          <div
            key={`${stop.address}-${idx}`}
            draggable={!readOnly}
            onDragStart={() => handleDragStart(idx)}
            onDragOver={e => handleDragOver(e, idx)}
            onDrop={handleDrop}
            className={`flex items-center gap-2 px-2 py-2 bg-blue-900/20 border border-blue-700/20 rounded-lg transition-colors ${
              !readOnly ? 'cursor-grab active:cursor-grabbing hover:border-blue-600/40 hover:bg-blue-800/30' : ''
            }`}
          >
            {!readOnly && (
              <span className="text-muted-foreground/40 text-sm flex-shrink-0 select-none">⠿</span>
            )}
            <span className="text-blue-400/70 text-xs font-mono w-5 flex-shrink-0">#{idx + 1}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-foreground truncate">{stop.address}</p>
              {stop.contactName && (
                <p className="text-xs text-muted-foreground/70 truncate">{stop.contactName} · {stop.contactPhone}</p>
              )}
            </div>
            {stop.lat && stop.lng && (
              <span className="text-xs text-green-500/50 flex-shrink-0" title="GPS souřadnice k dispozici">📍</span>
            )}
          </div>
        ))}
      </div>

      {/* Fixed: delivery end */}
      <div className="flex items-center gap-2 mt-1 opacity-60 select-none">
        <span className="text-red-400 text-base w-5 text-center flex-shrink-0">●</span>
        <span className="text-xs text-muted-foreground truncate">{deliveryAddress}</span>
        <span className="ml-auto text-xs text-muted-foreground/50 flex-shrink-0">konec</span>
      </div>

      {!readOnly && localStops.length > 1 && (
        <p className="text-xs text-muted-foreground/50 mt-2 text-center">
          Přetáhněte zastávky pro ruční přeřazení
        </p>
      )}
    </div>
  )
}
