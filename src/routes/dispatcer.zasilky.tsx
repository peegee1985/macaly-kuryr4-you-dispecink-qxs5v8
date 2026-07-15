import { createFileRoute } from '@tanstack/react-router'
import { useConvexAuth, useAction, useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useState, useMemo } from 'react'
import type { Id } from '../../convex/_generated/dataModel'
import { AppShell, LoadingScreen, PageHeader, StatusBadge } from '@/components/AppShell'
import { dispatcherNav } from './dispatcer'
import { AddressInput } from '@/components/AddressInput'
import { StopReorderPanel } from '@/components/StopReorderPanel'
import { PODModal } from '@/components/PODViewer'
import { AiPricingPanel } from '@/components/AiPricingPanel'
import { QRCodeSVG } from 'qrcode.react'

export const Route = createFileRoute('/dispatcer/zasilky')({
  component: DispatcherRidesPage,
})

const STATUS_OPTIONS = [
  { key: '', label: 'Vše' },
  { key: 'pending', label: 'Čeká' },
  { key: 'approved', label: 'Schváleno' },
  { key: 'assigned', label: 'Přiřazeno' },
  { key: 'pickup', label: 'Vyzvedávám' },
  { key: 'transit', label: 'Na cestě' },
  { key: 'delivered', label: 'Doručeno' },
  { key: 'cancelled', label: 'Zrušeno' },
]

const CARGO_LABELS: Record<string, string> = {
  envelope: 'Obálka', parcel: 'Balík', box: 'Krabice', pallet: 'Paleta', other: 'Jiné',
}

type RideGroup = { key: string; label: string; rides: any[] }

function groupRidesByPeriod(rides: any[]): RideGroup[] {
  const now = new Date()
  const todayStr = now.toDateString()

  // Start of this week (Monday)
  const weekStart = new Date(now)
  weekStart.setHours(0, 0, 0, 0)
  weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7))

  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 7)

  const nextWeekEnd = new Date(weekEnd)
  nextWeekEnd.setDate(weekEnd.getDate() + 7)

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1)

  const groups: Record<string, any[]> = { dnes: [], tyden: [], pristi: [], mesic: [], ostatni: [] }

  for (const r of rides) {
    const d = new Date(r.requestedPickupAt)
    if (d.toDateString() === todayStr) {
      groups.dnes.push(r)
    } else if (d >= weekStart && d < weekEnd) {
      groups.tyden.push(r)
    } else if (d >= weekEnd && d < nextWeekEnd) {
      groups.pristi.push(r)
    } else if (d >= monthStart && d < monthEnd) {
      groups.mesic.push(r)
    } else {
      groups.ostatni.push(r)
    }
  }

  return [
    { key: 'dnes',    label: '📅 Dnes',          rides: groups.dnes    },
    { key: 'tyden',   label: '🗓️ Tento týden',    rides: groups.tyden   },
    { key: 'pristi',  label: '📆 Příští týden',   rides: groups.pristi  },
    { key: 'mesic',   label: '📋 Tento měsíc',    rides: groups.mesic   },
    { key: 'ostatni', label: '🕒 Ostatní',         rides: groups.ostatni },
  ].filter(g => g.rides.length > 0)
}

type Stop = { address: string; lat?: number; lng?: number; contactName: string; contactPhone: string; notes: string; order: number }

const emptyStop = (order: number): Stop => ({ address: '', lat: undefined, lng: undefined, contactName: '', contactPhone: '', notes: '', order })

function NewOrderModal({ onClose, drivers, customers }: {
  onClose: () => void
  drivers: any[]
  customers: any[]
}) {
  const createRide = useMutation(api.rides.createRideAsDispatcher)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isMultiStop, setIsMultiStop] = useState(false)
  const [stops, setStops] = useState<Stop[]>([emptyStop(1)])

  const [form, setForm] = useState({
    customerId: '',
    pickupAddress: '',
    pickupLat: undefined as number | undefined,
    pickupLng: undefined as number | undefined,
    pickupContactName: '',
    pickupContactPhone: '',
    requestedPickupAt: '',
    deliveryAddress: '',
    deliveryLat: undefined as number | undefined,
    deliveryLng: undefined as number | undefined,
    deliveryContactName: '',
    deliveryContactPhone: '',
    requestedDeliveryAt: '',
    cargoType: 'parcel' as const,
    cargoDescription: '',
    weight: '',
    quantity: '1',
    price: '',
    notes: '',
    dispatcherNotes: '',
    driverId: '',
  })

  const updateStop = (i: number, field: keyof Stop, value: string) => {
    setStops(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: value } : s))
  }
  const updateStopAddress = (i: number, address: string, lat?: number, lng?: number) => {
    setStops(prev => prev.map((s, idx) => idx === i ? { ...s, address, lat, lng } : s))
  }
  const addStop = () => setStops(prev => [...prev, emptyStop(prev.length + 1)])
  const removeStop = (i: number) => setStops(prev => prev.filter((_, idx) => idx !== i).map((s, idx) => ({ ...s, order: idx + 1 })))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.customerId) { setError('Vyberte zákazníka'); return }
    setError(null)
    setLoading(true)
    try {
      await createRide({
        customerId: form.customerId as Id<'users'>,
        pickupAddress: form.pickupAddress,
        pickupLat: form.pickupLat,
        pickupLng: form.pickupLng,
        pickupContactName: form.pickupContactName,
        pickupContactPhone: form.pickupContactPhone,
        requestedPickupAt: new Date(form.requestedPickupAt).getTime(),
        deliveryAddress: form.deliveryAddress,
        deliveryLat: form.deliveryLat,
        deliveryLng: form.deliveryLng,
        deliveryContactName: form.deliveryContactName,
        deliveryContactPhone: form.deliveryContactPhone,
        requestedDeliveryAt: new Date(form.requestedDeliveryAt).getTime(),
        cargoType: form.cargoType,
        cargoDescription: form.cargoDescription,
        weight: form.weight ? Number(form.weight) : undefined,
        quantity: Number(form.quantity),
        price: form.price ? Number(form.price) : undefined,
        notes: form.notes || undefined,
        dispatcherNotes: form.dispatcherNotes || undefined,
        driverId: form.driverId ? form.driverId as Id<'users'> : undefined,
        isMultiStop,
        stops: isMultiStop ? stops.filter(s => s.address.trim()) : undefined,
      })
      onClose()
    } catch (err: any) {
      setError(err?.message ?? 'Chyba při vytváření zakázky')
    } finally {
      setLoading(false)
    }
  }

  const inputCls = 'w-full px-3 py-2 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary'

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card z-10">
          <h2 className="font-heading font-bold text-lg">Nová zakázka</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl leading-none">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Customer */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Zákazník *</label>
            <select value={form.customerId} onChange={e => setForm(f => ({ ...f, customerId: e.target.value }))} required
              className={inputCls}>
              <option value="">— Vyberte zákazníka —</option>
              {customers.map(c => (
                <option key={c._id} value={c._id}>{c.name || c.email} {c.companyName ? `(${c.companyName})` : ''}</option>
              ))}
            </select>
          </div>

          {/* Stop type toggle */}
          <div className="flex gap-3">
            <button type="button" onClick={() => setIsMultiStop(false)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${!isMultiStop ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary text-secondary-foreground border-border hover:bg-secondary/80'}`}>
              📍 Jednoduchá trasa
            </button>
            <button type="button" onClick={() => setIsMultiStop(true)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${isMultiStop ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary text-secondary-foreground border-border hover:bg-secondary/80'}`}>
              🗺️ Multi-stop
            </button>
          </div>

          {/* Pickup */}
          <div className="bg-muted/30 rounded-lg p-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">📍 Vyzvednutí</p>
            <AddressInput
              value={form.pickupAddress}
              onChange={(addr, lat, lng) => setForm(f => ({ ...f, pickupAddress: addr, pickupLat: lat, pickupLng: lng }))}
              placeholder="Adresa vyzvednutí"
              required
              className={inputCls}
            />
            <div className="grid grid-cols-2 gap-3">
              <input value={form.pickupContactName} onChange={e => setForm(f => ({ ...f, pickupContactName: e.target.value }))} required
                className={inputCls} placeholder="Kontaktní osoba" />
              <input value={form.pickupContactPhone} onChange={e => setForm(f => ({ ...f, pickupContactPhone: e.target.value }))} required
                className={inputCls} placeholder="Telefon" />
            </div>
            <input type="datetime-local" value={form.requestedPickupAt} onChange={e => setForm(f => ({ ...f, requestedPickupAt: e.target.value }))} required
              className={inputCls} />
          </div>

          {/* Multi-stop intermediate stops */}
          {isMultiStop && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">🔄 Mezizastávky</p>
              {stops.map((stop, i) => (
                <div key={i} className="bg-muted/20 rounded-lg p-3 space-y-2 border border-border/50">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Zastávka {i + 1}</span>
                    {stops.length > 1 && (
                      <button type="button" onClick={() => removeStop(i)} className="text-xs text-destructive hover:text-destructive/80">Odebrat</button>
                    )}
                  </div>
                  <AddressInput
                    value={stop.address}
                    onChange={(addr, lat, lng) => updateStopAddress(i, addr, lat, lng)}
                    placeholder="Adresa zastávky"
                    className={inputCls}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input value={stop.contactName} onChange={e => updateStop(i, 'contactName', e.target.value)}
                      className={inputCls} placeholder="Kontakt" />
                    <input value={stop.contactPhone} onChange={e => updateStop(i, 'contactPhone', e.target.value)}
                      className={inputCls} placeholder="Telefon" />
                  </div>
                  <input value={stop.notes} onChange={e => updateStop(i, 'notes', e.target.value)}
                    className={inputCls} placeholder="Poznámka k zastávce (volitelné)" />
                </div>
              ))}
              <button type="button" onClick={addStop}
                className="w-full py-2 border border-dashed border-border rounded-lg text-sm text-muted-foreground hover:text-foreground hover:border-primary transition-colors">
                + Přidat zastávku
              </button>
            </div>
          )}

          {/* Delivery */}
          <div className="bg-muted/30 rounded-lg p-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">🎯 Doručení</p>
            <AddressInput
              value={form.deliveryAddress}
              onChange={(addr, lat, lng) => setForm(f => ({ ...f, deliveryAddress: addr, deliveryLat: lat, deliveryLng: lng }))}
              placeholder="Adresa doručení"
              required
              className={inputCls}
            />
            <div className="grid grid-cols-2 gap-3">
              <input value={form.deliveryContactName} onChange={e => setForm(f => ({ ...f, deliveryContactName: e.target.value }))} required
                className={inputCls} placeholder="Kontaktní osoba" />
              <input value={form.deliveryContactPhone} onChange={e => setForm(f => ({ ...f, deliveryContactPhone: e.target.value }))} required
                className={inputCls} placeholder="Telefon" />
            </div>
            <input type="datetime-local" value={form.requestedDeliveryAt} onChange={e => setForm(f => ({ ...f, requestedDeliveryAt: e.target.value }))} required
              className={inputCls} />
          </div>

          {/* Cargo */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1 text-muted-foreground">Typ zásilky</label>
              <select value={form.cargoType} onChange={e => setForm(f => ({ ...f, cargoType: e.target.value as any }))}
                className={inputCls}>
                <option value="envelope">Obálka</option>
                <option value="parcel">Balík</option>
                <option value="box">Krabice</option>
                <option value="pallet">Paleta</option>
                <option value="other">Jiné</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-muted-foreground">Množství</label>
              <input type="number" min="1" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} required
                className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-muted-foreground">Hmotnost (kg)</label>
              <input type="number" step="0.1" value={form.weight} onChange={e => setForm(f => ({ ...f, weight: e.target.value }))}
                className={inputCls} placeholder="Volitelné" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-muted-foreground">Cena (CZK)</label>
              <input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                className={inputCls} placeholder="Volitelné" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1 text-muted-foreground">Popis zásilky *</label>
            <input value={form.cargoDescription} onChange={e => setForm(f => ({ ...f, cargoDescription: e.target.value }))} required
              className={inputCls} placeholder="Co se přepravuje" />
          </div>

          {/* Driver assignment */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Přiřadit řidiče (volitelné)</label>
            <select value={form.driverId} onChange={e => setForm(f => ({ ...f, driverId: e.target.value }))}
              className={inputCls}>
              <option value="">— Bez přiřazení —</option>
              {drivers.map(d => (
                <option key={d._id} value={d._id}>{d.name || d.email} {d.vehicleType ? `(${d.vehicleType})` : ''}</option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1 text-muted-foreground">Poznámka zákazníka</label>
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                className={inputCls} placeholder="Volitelné" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-muted-foreground">Interní poznámka dispečera</label>
              <textarea value={form.dispatcherNotes} onChange={e => setForm(f => ({ ...f, dispatcherNotes: e.target.value }))} rows={2}
                className={inputCls} placeholder="Volitelné" />
            </div>
          </div>

          {error && <p className="text-destructive text-sm bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 bg-secondary text-secondary-foreground font-medium rounded-lg hover:bg-secondary/80 text-sm">
              Zrušit
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 bg-primary text-primary-foreground font-heading font-semibold rounded-lg hover:opacity-90 disabled:opacity-50">
              {loading ? 'Vytvářím...' : '+ Vytvořit zakázku'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function CopyDatesModal({ ride, onClose }: { ride: any; onClose: () => void }) {
  const copyRide = useMutation(api.rides.copyRideToDates)
  const [selectedDates, setSelectedDates] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  // Generate next 31 days
  const days: string[] = []
  for (let i = 1; i <= 31; i++) {
    const d = new Date()
    d.setDate(d.getDate() + i)
    days.push(d.toISOString().slice(0, 10))
  }

  const toggleDate = (d: string) => {
    setSelectedDates(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])
  }

  const handleCopy = async () => {
    if (selectedDates.length === 0) { setError('Vyberte alespoň jeden den'); return }
    setError(null)
    setLoading(true)
    try {
      // Use UTC noon to avoid timezone shift — CET midnight (T00:00:00) would land on wrong day in UTC
      const timestamps = selectedDates.map(d => new Date(d + 'T12:00:00Z').getTime())
      await copyRide({ rideId: ride._id as Id<'rides'>, targetDates: timestamps })
      setDone(true)
      setTimeout(onClose, 1500)
    } catch (err: any) {
      setError(err?.message ?? 'Chyba při kopírování')
    } finally {
      setLoading(false)
    }
  }

  // Mon=0 … Sun=6 (Czech week starts Monday)
  const toMondayIdx = (jsDay: number) => (jsDay + 6) % 7

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card z-10">
          <div>
            <h2 className="font-heading font-bold text-lg">Kopírovat zakázku</h2>
            <p className="text-xs text-muted-foreground mt-0.5">#{ride.rideNumber} · {ride.pickupAddress} → {ride.deliveryAddress}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl leading-none">✕</button>
        </div>

        <div className="p-6">
          <p className="text-sm text-muted-foreground mb-4">
            Vyberte dny, na které chcete zakázku zkopírovat (max. 31 dnů dopředu).
            Čas vyzvednutí a doručení bude zachován.
          </p>

          {done ? (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg px-4 py-3 text-green-400 text-sm text-center">
              ✓ Zakázka zkopírována na {selectedDates.length} dnů!
            </div>
          ) : (
            <>
              {/* Week header – Monday first */}
              <div className="grid grid-cols-7 gap-1 mb-4">
                {['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'].map((d, i) => (
                  <div key={d} className={`text-center text-xs font-medium py-1 ${i >= 5 ? 'text-muted-foreground/50' : 'text-muted-foreground'}`}>{d}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1 mb-4">
                {/* Empty cells for Monday-based alignment */}
                {Array.from({ length: toMondayIdx(new Date(days[0] + 'T12:00:00Z').getDay()) }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                {days.map(d => {
                  const date = new Date(d + 'T12:00:00Z')
                  const isSelected = selectedDates.includes(d)
                  const isWeekend = date.getUTCDay() === 0 || date.getUTCDay() === 6
                  return (
                    <button key={d} type="button" onClick={() => toggleDate(d)}
                      className={`aspect-square rounded-lg text-xs font-medium transition-colors flex flex-col items-center justify-center ${
                        isSelected
                          ? 'bg-primary text-primary-foreground'
                          : isWeekend
                          ? 'bg-muted/50 text-muted-foreground/60 hover:bg-muted'
                          : 'bg-muted/30 hover:bg-muted text-foreground'
                      }`}>
                      <span>{date.getUTCDate()}</span>
                    </button>
                  )
                })}
              </div>

              <div className="flex items-center justify-between mb-4 text-sm">
                <span className="text-muted-foreground">Vybráno: <strong className="text-foreground">{selectedDates.length}</strong> dní</span>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setSelectedDates(days.filter(d => {
                    const day = new Date(d + 'T12:00:00Z').getUTCDay()
                    return day >= 1 && day <= 5
                  }))} className="text-xs text-primary hover:underline">Pracovní dny</button>
                  <span className="text-muted-foreground">·</span>
                  <button type="button" onClick={() => setSelectedDates([])} className="text-xs text-muted-foreground hover:text-foreground">Zrušit výběr</button>
                </div>
              </div>

              {error && <p className="text-destructive text-sm bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2 mb-3">{error}</p>}

              <div className="flex gap-3">
                <button type="button" onClick={onClose}
                  className="flex-1 py-2.5 bg-secondary text-secondary-foreground font-medium rounded-lg hover:bg-secondary/80 text-sm">
                  Zrušit
                </button>
                <button type="button" onClick={handleCopy} disabled={loading || selectedDates.length === 0}
                  className="flex-1 py-2.5 bg-primary text-primary-foreground font-heading font-semibold rounded-lg hover:opacity-90 disabled:opacity-50 text-sm">
                  {loading ? 'Kopíruji...' : `Kopírovat na ${selectedDates.length} dní`}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function DispatcherRidesPage() {
  const { isAuthenticated } = useConvexAuth()
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [selectedRide, setSelectedRide] = useState<string | null>(null)
  const [showNewOrder, setShowNewOrder] = useState(false)
  const [copyRide, setCopyRide] = useState<any | null>(null)
  const [copiedTrackingId, setCopiedTrackingId] = useState<string | null>(null)
  const [qrRide, setQrRide] = useState<{ rideNumber: string; token: string } | null>(null)

  // ── Search / sort / filter ──
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'price_desc' | 'price_asc'>('date_asc')
  const [cargoFilter, setCargoFilter] = useState('')
  const [driverFilter, setDriverFilter] = useState('')
  const [paidFilter, setPaidFilter] = useState<'' | 'paid' | 'unpaid'>('')

  // ── Bulk selection ──
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkDriverId, setBulkDriverId] = useState('')
  const [bulkActionLoading, setBulkActionLoading] = useState(false)
  const [showBulkDriverPicker, setShowBulkDriverPicker] = useState(false)

  const rides = useQuery(api.rides.getAllRides, statusFilter ? { status: statusFilter as any } : {})
  const drivers = useQuery(api.users.listActiveDrivers)
  const customers = useQuery(api.users.listCustomers)
  const approveRide = useMutation(api.rides.approveRide)
  const assignDriver = useMutation(api.rides.assignDriver)
  const unassignDriver = useMutation(api.rides.unassignDriver)
  const cancelRide = useMutation(api.rides.cancelRide)
  const updateRide = useMutation(api.rides.updateRide)
  const forceStatusUpdate = useMutation(api.rides.forceStatusUpdate)
  const updateRidePrice = useMutation(api.rides.updateRidePrice)
  const sendPaymentLinkAction = useAction(api.rides.sendPaymentLink)
  const bulkCancelMutation = useMutation(api.rides.bulkCancelRides)
  const deleteRideMutation = useMutation(api.rides.deleteRide)
  const bulkDeleteMutation = useMutation(api.rides.bulkDeleteRides)
  const markAsPaidMutation = useMutation(api.rides.markRideAsPaidByDispatcher)
  const bulkMarkAsPaidMutation = useMutation(api.rides.bulkMarkAsPaid)

  const [assigningRide, setAssigningRide] = useState<string | null>(null)
  const [sendingPaymentLink, setSendingPaymentLink] = useState<string | null>(null)
  const [podViewRide, setPodViewRide] = useState<{ id: Id<'rides'>; number: string } | null>(null)
  const [paymentLinkSent, setPaymentLinkSent] = useState<Set<string>>(new Set())
  const [priceRide, setPriceRide] = useState<string | null>(null)
  const [priceInput, setPriceInput] = useState('')
  const [approveRideId, setApproveRideId] = useState<string | null>(null)
  const [approvePriceInput, setApprovePriceInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [statusOverrideRide, setStatusOverrideRide] = useState<string | null>(null)
  const [aiPricingRide, setAiPricingRide] = useState<string | null>(null)
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set(['dnes']))
  const toggleGroup = (key: string) => setOpenGroups(prev => {
    const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n
  })

  // ── Client-side filter + sort ──
  const displayRides = useMemo(() => {
    let r = [...(rides ?? [])]
    if (search.trim()) {
      const q = search.toLowerCase()
      r = r.filter(ride =>
        ride.rideNumber.toLowerCase().includes(q) ||
        ride.pickupAddress.toLowerCase().includes(q) ||
        ride.deliveryAddress.toLowerCase().includes(q)
      )
    }
    if (cargoFilter) r = r.filter(ride => ride.cargoType === cargoFilter)
    if (driverFilter === '__unassigned') r = r.filter(ride => !ride.driverId)
    else if (driverFilter) r = r.filter(ride => ride.driverId === driverFilter)
    if (paidFilter === 'paid') r = r.filter(ride => ride.isPaid)
    else if (paidFilter === 'unpaid') r = r.filter(ride => !!(ride.price) && !ride.isPaid)
    r.sort((a, b) => {
      if (sortBy === 'date_asc') return a.requestedPickupAt - b.requestedPickupAt
      if (sortBy === 'date_desc') return b.requestedPickupAt - a.requestedPickupAt
      if (sortBy === 'price_desc') return (b.price ?? 0) - (a.price ?? 0)
      if (sortBy === 'price_asc') return (a.price ?? 0) - (b.price ?? 0)
      return 0
    })
    return r
  }, [rides, search, cargoFilter, driverFilter, paidFilter, sortBy])

  const driverMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const d of (drivers ?? [])) map[d._id] = d.name || d.email
    return map
  }, [drivers])

  const rideGroups = useMemo(() => groupRidesByPeriod(displayRides), [displayRides])

  // ── Bulk selection helpers ──
  const selectedList = Array.from(selected)
  const allSelected = displayRides.length > 0 && displayRides.every(r => selected.has(r._id))
  const toggleSelect = (id: string) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleAll = () => {
    if (allSelected) setSelected(prev => { const n = new Set(prev); displayRides.forEach(r => n.delete(r._id)); return n })
    else setSelected(prev => { const n = new Set(prev); displayRides.forEach(r => n.add(r._id)); return n })
  }
  const clearSelection = () => setSelected(new Set())

  if (!isAuthenticated || rides === undefined) return <LoadingScreen />

  const handleApprove = async (rideId: string) => {
    if (!approvePriceInput) return
    setLoading(true)
    try {
      await approveRide({ rideId: rideId as Id<'rides'>, price: Number(approvePriceInput) })
      setApproveRideId(null)
      setApprovePriceInput('')
    } finally {
      setLoading(false)
    }
  }

  const handleAssign = async (rideId: string, driverId: string) => {
    setLoading(true)
    try {
      await assignDriver({ rideId: rideId as Id<'rides'>, driverId: driverId as Id<'users'> })
      setAssigningRide(null)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async (rideId: string) => {
    if (!confirm('Opravdu zrušit zásilku?')) return
    await cancelRide({ rideId: rideId as Id<'rides'> })
  }

  const handleForceStatus = async (rideId: string, status: string) => {
    if (!confirm(`Opravdu změnit stav na "${status}"?`)) return
    setLoading(true)
    try {
      await forceStatusUpdate({ rideId: rideId as Id<'rides'>, status: status as any })
      setStatusOverrideRide(null)
    } finally {
      setLoading(false)
    }
  }

  const handleSetPrice = async (rideId: string) => {
    if (!priceInput) return
    setLoading(true)
    try {
      await updateRidePrice({ rideId: rideId as Id<'rides'>, price: Number(priceInput), currency: 'CZK' })
      setPriceRide(null)
      setPriceInput('')
    } finally {
      setLoading(false)
    }
  }

  const handleSendPaymentLink = async (rideId: string) => {
    if (!confirm('Odeslat zákazníkovi platební odkaz e-mailem?')) return
    setSendingPaymentLink(rideId)
    try {
      await sendPaymentLinkAction({ rideId: rideId as Id<'rides'> })
      setPaymentLinkSent(prev => new Set([...prev, rideId]))
      alert('Platební odkaz byl odeslán zákazníkovi e-mailem.')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      alert(`Chyba: ${msg}`)
    } finally {
      setSendingPaymentLink(null)
    }
  }

  // ── Bulk action handlers ──
  const handleBulkCancel = async () => {
    if (!confirm(`Opravdu zrušit ${selectedList.length} zásilek?`)) return
    setBulkActionLoading(true)
    try { await bulkCancelMutation({ rideIds: selectedList as Id<'rides'>[] }) }
    finally { setBulkActionLoading(false); clearSelection() }
  }

  const handleBulkAssign = async () => {
    if (!bulkDriverId || !selectedList.length) return
    setBulkActionLoading(true)
    try {
      for (const rideId of selectedList) {
        await assignDriver({ rideId: rideId as Id<'rides'>, driverId: bulkDriverId as Id<'users'> })
      }
      setShowBulkDriverPicker(false)
      setBulkDriverId('')
    } finally { setBulkActionLoading(false); clearSelection() }
  }

  const handleDelete = async (rideId: string) => {
    if (!confirm('Opravdu trvale smazat zásilku? Tato akce je nevratná.')) return
    await deleteRideMutation({ rideId: rideId as Id<'rides'> })
  }

  const handleBulkDelete = async () => {
    if (!confirm(`Opravdu trvale smazat ${selectedList.length} zásilek? Tato akce je nevratná.`)) return
    setBulkActionLoading(true)
    try { await bulkDeleteMutation({ rideIds: selectedList as Id<'rides'>[] }) }
    finally { setBulkActionLoading(false); clearSelection() }
  }

  const handleBulkMarkAsPaid = async (isPaid: boolean) => {
    const label = isPaid ? 'označit jako zaplaceno' : 'označit jako nezaplaceno'
    if (!confirm(`Opravdu ${label} ${selectedList.length} zásilek?`)) return
    setBulkActionLoading(true)
    try { await bulkMarkAsPaidMutation({ rideIds: selectedList as Id<'rides'>[], isPaid }) }
    finally { setBulkActionLoading(false); clearSelection() }
  }

  const hasActiveFilters = !!(search || cargoFilter || driverFilter || paidFilter || sortBy !== 'date_asc')

  return (
    <AppShell navItems={dispatcherNav} title="Dispečer" subtitle="Řídicí centrum" primaryCount={4}>
      <div className="p-4 md:p-6 max-w-6xl mx-auto">
        <PageHeader title="Správa zásilek" subtitle={`${displayRides.length}${rides.length !== displayRides.length ? ` / ${rides.length}` : ''} zásilek`}
          action={
            <button onClick={() => setShowNewOrder(true)}
              className="px-4 py-2 bg-primary text-primary-foreground font-heading font-semibold rounded-lg hover:opacity-90 text-sm flex items-center gap-2">
              <span>+</span> Nová zakázka
            </button>
          }
        />

        {/* Status filter */}
        <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
          {STATUS_OPTIONS.map((s) => (
            <button key={s.key} onClick={() => { setStatusFilter(s.key); clearSelection() }}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === s.key ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}>
              {s.label}
            </button>
          ))}
        </div>

        {/* ── Search + Sort + Filters toolbar ── */}
        <div className="flex flex-wrap gap-2 mb-4">
          <div className="relative flex-1 min-w-48">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">🔍</span>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Hledat číslo, adresu…"
              className="w-full pl-8 pr-3 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
            />
          </div>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as typeof sortBy)}
            className="px-3 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:border-primary text-foreground min-w-[170px]">
            <option value="date_desc">↓ Datum (nejnovější)</option>
            <option value="date_asc">↑ Datum (nejstarší)</option>
            <option value="price_desc">↓ Cena (nejvyšší)</option>
            <option value="price_asc">↑ Cena (nejnižší)</option>
          </select>
          <select
            value={cargoFilter}
            onChange={e => setCargoFilter(e.target.value)}
            className="px-3 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:border-primary text-foreground">
            <option value="">Všechny typy</option>
            {Object.entries(CARGO_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <select
            value={driverFilter}
            onChange={e => setDriverFilter(e.target.value)}
            className="px-3 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:border-primary text-foreground min-w-[140px]">
            <option value="">Všichni řidiči</option>
            <option value="__unassigned">⚠ Nepřiřazeno</option>
            {drivers?.map(d => (
              <option key={d._id} value={d._id}>{d.name || d.email}</option>
            ))}
          </select>
          <select
            value={paidFilter}
            onChange={e => setPaidFilter(e.target.value as typeof paidFilter)}
            className="px-3 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:border-primary text-foreground">
            <option value="">Platba – vše</option>
            <option value="paid">✓ Zaplaceno</option>
            <option value="unpaid">⏳ Nezaplaceno</option>
          </select>
          {hasActiveFilters && (
            <button
              onClick={() => { setSearch(''); setSortBy('date_asc'); setCargoFilter(''); setDriverFilter(''); setPaidFilter('') }}
              className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground border border-border rounded-lg hover:bg-secondary transition-colors">
              ✕ Reset
            </button>
          )}
        </div>

        {/* ── Bulk action bar ── */}
        {selected.size > 0 && (
          <div className="bg-primary/10 border border-primary/30 rounded-xl p-3 mb-4 flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 cursor-pointer mr-2">
              <input type="checkbox" checked={allSelected} onChange={toggleAll}
                className="w-4 h-4 rounded border-border accent-primary cursor-pointer" />
              <span className="text-sm font-medium text-primary">{selected.size} vybráno</span>
            </label>
            {!showBulkDriverPicker ? (
              <button onClick={() => setShowBulkDriverPicker(true)} disabled={bulkActionLoading}
                className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50">
                👤 Přiřadit řidiče
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <select value={bulkDriverId} onChange={e => setBulkDriverId(e.target.value)}
                  className="px-3 py-1.5 bg-card border border-border rounded-lg text-xs focus:outline-none focus:border-primary text-foreground">
                  <option value="">Vybrat řidiče…</option>
                  {drivers?.map(d => (
                    <option key={d._id} value={d._id}>{d.name || d.email}</option>
                  ))}
                </select>
                <button onClick={handleBulkAssign} disabled={!bulkDriverId || bulkActionLoading}
                  className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50">
                  {bulkActionLoading ? '…' : 'Potvrdit'}
                </button>
                <button onClick={() => { setShowBulkDriverPicker(false); setBulkDriverId('') }}
                  className="px-2 py-1.5 bg-secondary text-secondary-foreground text-xs rounded-lg hover:bg-secondary/80">✕</button>
              </div>
            )}
            <button onClick={() => handleBulkMarkAsPaid(true)} disabled={bulkActionLoading}
              className="px-3 py-1.5 bg-emerald-700/30 text-emerald-300 text-xs font-medium rounded-lg hover:bg-emerald-700/50 border border-emerald-700/40 disabled:opacity-50">
              💳 Zaplaceno
            </button>
            <button onClick={() => handleBulkMarkAsPaid(false)} disabled={bulkActionLoading}
              className="px-3 py-1.5 bg-secondary text-secondary-foreground text-xs font-medium rounded-lg hover:bg-secondary/80 border border-border disabled:opacity-50">
              💳 Nezaplaceno
            </button>
            <button onClick={handleBulkCancel} disabled={bulkActionLoading}
              className="px-3 py-1.5 bg-destructive/20 text-destructive text-xs font-medium rounded-lg hover:bg-destructive/30 border border-destructive/30 disabled:opacity-50">
              ✕ Zrušit vybrané
            </button>
            <button onClick={handleBulkDelete} disabled={bulkActionLoading}
              className="px-3 py-1.5 bg-red-900/40 text-red-400 text-xs font-medium rounded-lg hover:bg-red-900/60 border border-red-800/50 disabled:opacity-50">
              🗑️ Smazat vybrané
            </button>
            <button onClick={clearSelection} className="ml-auto text-xs text-muted-foreground hover:text-foreground">
              Odznačit vše
            </button>
          </div>
        )}

        {displayRides.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-8 text-center">
            <p className="text-muted-foreground">
              {search || cargoFilter || driverFilter || paidFilter
                ? 'Žádné zásilky odpovídají filtru'
                : 'Žádné zásilky v tomto stavu'}
            </p>
            {!search && !statusFilter && (
              <button onClick={() => setShowNewOrder(true)}
                className="mt-3 text-sm text-primary hover:underline">
                + Vytvořit první zakázku
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {/* Select all header */}
            <div className="flex items-center gap-3 px-1 mb-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={allSelected} onChange={toggleAll}
                  className="w-4 h-4 rounded border-border accent-primary cursor-pointer" />
                <span className="text-xs text-muted-foreground">Vybrat vše ({displayRides.length})</span>
              </label>
            </div>
            {/* Date-grouped sections */}
            {rideGroups.map(group => (
              <div key={group.key} className="mb-3">
                {/* Group header */}
                <button
                  onClick={() => toggleGroup(group.key)}
                  className={`w-full flex items-center justify-between px-4 py-3 mb-2 rounded-xl border transition-colors ${
                    group.key === 'dnes'
                      ? 'bg-primary/5 border-primary/25 hover:bg-primary/10'
                      : 'bg-card border-border hover:bg-secondary/40'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-heading font-bold text-sm">{group.label}</span>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{group.rides.length}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{openGroups.has(group.key) ? '▲ Skrýt' : '▼ Zobrazit'}</span>
                </button>
                {openGroups.has(group.key) && (
                  <div className="space-y-3">
                    {group.rides.map((ride) => (
                      <div key={ride._id} className="flex items-start gap-3">
                {/* Checkbox */}
                <label className="flex-shrink-0 mt-4 cursor-pointer" onClick={e => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selected.has(ride._id)}
                    onChange={() => toggleSelect(ride._id)}
                    className="w-4 h-4 rounded border-border accent-primary cursor-pointer"
                  />
                </label>
                {/* Ride card */}
                <div className={`flex-1 bg-card border rounded-xl transition-colors ${
                  selectedRide === ride._id ? 'border-primary/60' : selected.has(ride._id) ? 'border-primary/40 bg-primary/5' : 'border-border hover:border-primary/30'
                }`}>
                {/* Header */}
                <div className="flex items-start justify-between gap-3 p-4"
                  onClick={() => setSelectedRide(selectedRide === ride._id ? null : ride._id)}
                  style={{ cursor: 'pointer' }}>
                  <div>
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="font-heading font-bold">#{ride.rideNumber}</span>
                      <StatusBadge status={ride.status} />
                      {ride.isMultiStop && (
                        <span className="text-xs text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded-full border border-blue-400/20">
                          🗺️ Multi-stop
                        </span>
                      )}
                      {ride.originalRideId && (
                        <span className="text-xs text-amber-400/80 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                          📋 Kopie
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                        {CARGO_LABELS[ride.cargoType]} × {ride.quantity}
                      </span>
                      {ride.weight && <span className="text-xs text-muted-foreground">{ride.weight} kg</span>}
                      {ride.driverId && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-300 bg-blue-500/10 border border-blue-500/25 px-2.5 py-0.5 rounded-full">
                          👤 {driverMap[ride.driverId] ?? 'Přiřazený řidič'}
                        </span>
                      )}
                    </div>
                    <div className="text-sm space-y-0.5 text-muted-foreground">
                      <p>📍 <span className="text-foreground">{ride.pickupAddress}</span></p>
                      {ride.isMultiStop && ride.stops && ride.stops.length > 0 && (
                        <p className="text-xs text-blue-400/70 pl-4">↳ {ride.stops.length} zastávka(y)</p>
                      )}
                      <p>🎯 <span className="text-foreground">{ride.deliveryAddress}</span></p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {ride.price ? (
                      <div>
                        <p className="font-heading font-bold text-primary">{ride.price} {ride.currency ?? 'CZK'}</p>
                        {ride.isPaid ? (
                          <span className="inline-block text-xs bg-green-700/30 text-green-400 border border-green-700/40 px-1.5 py-0.5 rounded mt-0.5">✓ Zaplaceno</span>
                        ) : (
                          <span className="inline-block text-xs bg-amber-700/20 text-amber-400 border border-amber-700/30 px-1.5 py-0.5 rounded mt-0.5">Nezaplaceno</span>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1 items-end">
                        <button onClick={(e) => { e.stopPropagation(); setPriceRide(ride._id); setPriceInput('') }}
                          className="text-xs text-muted-foreground hover:text-primary border border-border hover:border-primary px-2 py-1 rounded-lg transition-colors">
                          + Cena
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setAiPricingRide(aiPricingRide === ride._id ? null : ride._id) }}
                          className="text-xs text-primary/70 hover:text-primary border border-primary/20 hover:border-primary/50 bg-primary/5 hover:bg-primary/10 px-2 py-1 rounded-lg transition-colors">
                          🤖 AI
                        </button>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(ride.requestedPickupAt).toLocaleDateString('cs-CZ')}
                    </p>
                  </div>
                </div>

                {/* Price setting */}
                {priceRide === ride._id && (
                  <div className="border-t border-border px-4 py-3 flex items-center gap-2">
                    <input type="number" value={priceInput} onChange={e => setPriceInput(e.target.value)}
                      className="flex-1 px-3 py-2 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="Cena v CZK" autoFocus />
                    <button
                      onClick={(e) => { e.stopPropagation(); setAiPricingRide(aiPricingRide === ride._id ? null : ride._id) }}
                      title="AI nacenění"
                      className="px-3 py-2 bg-primary/10 text-primary border border-primary/30 text-sm font-medium rounded-lg hover:bg-primary/20 transition-colors">
                      🤖
                    </button>
                    <button onClick={() => handleSetPrice(ride._id)} disabled={loading || !priceInput}
                      className="px-3 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:opacity-90 disabled:opacity-50">
                      Uložit
                    </button>
                    <button onClick={() => setPriceRide(null)}
                      className="px-3 py-2 bg-secondary text-secondary-foreground text-sm font-medium rounded-lg hover:bg-secondary/80">
                      Zrušit
                    </button>
                  </div>
                )}

                {/* AI Pricing Panel */}
                {aiPricingRide === ride._id && (
                  <AiPricingPanel
                    ride={ride}
                    onApplyPrice={(price) => {
                      setPriceInput(String(price))
                      setPriceRide(ride._id)
                    }}
                    onClose={() => setAiPricingRide(null)}
                  />
                )}

                {/* Expanded details & actions */}
                {selectedRide === ride._id && (
                  <div className="border-t border-border px-4 py-3 space-y-3">
                    {/* Details */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs text-muted-foreground">
                      <div>
                        <p className="font-medium text-foreground mb-0.5">Vyzvednutí</p>
                        <p>{ride.pickupContactName}</p>
                        <p>{ride.pickupContactPhone}</p>
                        <p>{new Date(ride.requestedPickupAt).toLocaleString('cs-CZ')}</p>
                      </div>
                      <div>
                        <p className="font-medium text-foreground mb-0.5">Doručení</p>
                        <p>{ride.deliveryContactName}</p>
                        <p>{ride.deliveryContactPhone}</p>
                        <p>{new Date(ride.requestedDeliveryAt).toLocaleString('cs-CZ')}</p>
                      </div>
                      <div>
                        <p className="font-medium text-foreground mb-0.5">Zásilka</p>
                        <p>{ride.cargoDescription}</p>
                        {ride.notes && <p className="text-amber-400/80 mt-1">💬 {ride.notes}</p>}
                        {ride.dispatcherNotes && <p className="text-blue-400/80 mt-1">🔧 {ride.dispatcherNotes}</p>}
                      </div>
                    </div>

                    {/* Multi-stop detail with route optimization */}
                    {ride.isMultiStop && ride.stops && ride.stops.length > 0 && (
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
                    )}

                    {/* POD info */}
                    {ride.status === 'delivered' && (
                      ride.podDeliveredAt ? (
                        <div className="bg-green-950/20 border border-green-700/30 rounded-xl px-4 py-3">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-green-400 font-semibold text-sm">✅ Zásilka doručena</p>
                              {ride.podRecipientName && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  Převzal: {ride.podRecipientName}
                                  {` · ${new Date(ride.podDeliveredAt).toLocaleString('cs-CZ')}`}
                                </p>
                              )}
                            </div>
                            <button
                              onClick={() => setPodViewRide({ id: ride._id, number: ride.rideNumber })}
                              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-green-700/20 border border-green-700/30 text-green-400 text-xs font-medium rounded-lg hover:bg-green-700/30 transition-colors"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              Zobrazit doklad
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-amber-950/20 border border-amber-700/30 rounded-xl px-4 py-3">
                          <p className="text-amber-400 font-semibold text-sm">✅ Zásilka doručena</p>
                          <p className="text-xs text-muted-foreground mt-0.5">⚠️ Doklad o doručení nebyl pořízen — řidič neprošel POD formulářem.</p>
                        </div>
                      )
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2">
                      {ride.status === 'pending' && approveRideId !== ride._id && (
                        <button onClick={() => { setApproveRideId(ride._id); setApprovePriceInput('') }}
                          className="px-3 py-1.5 bg-green-700 text-white text-sm font-medium rounded-lg hover:bg-green-800">
                          ✓ Schválit + nastavit cenu
                        </button>
                      )}
                      {approveRideId === ride._id && (
                        <div className="flex items-center gap-2">
                          <input type="number" value={approvePriceInput} onChange={e => setApprovePriceInput(e.target.value)}
                            className="w-28 px-2 py-1.5 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                            placeholder="Cena CZK" autoFocus />
                          <button onClick={() => handleApprove(ride._id)} disabled={loading || !approvePriceInput}
                            className="px-3 py-1.5 bg-green-700 text-white text-sm font-medium rounded-lg hover:bg-green-800 disabled:opacity-50">
                            {loading ? '...' : 'Potvrdit'}
                          </button>
                          <button onClick={() => setApproveRideId(null)}
                            className="px-2 py-1.5 bg-secondary text-secondary-foreground text-sm rounded-lg hover:bg-secondary/80">✕</button>
                        </div>
                      )}

                      {/* Driver assignment — available for pending, approved, assigned statuses */}
                      {!['delivered', 'cancelled', 'pickup', 'transit'].includes(ride.status) && (
                        <>
                          {assigningRide === ride._id ? (
                            <div className="flex items-center gap-2">
                              <select onChange={e => e.target.value && handleAssign(ride._id, e.target.value)}
                                className="px-3 py-1.5 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                defaultValue="">
                                <option value="">Vybrat řidiče...</option>
                                {drivers?.map(d => (
                                  <option key={d._id} value={d._id}>
                                    {d.name || d.email} {d.vehicleType ? `(${d.vehicleType})` : ''}
                                  </option>
                                ))}
                              </select>
                              <button onClick={() => setAssigningRide(null)}
                                className="px-2 py-1.5 bg-secondary text-secondary-foreground text-sm rounded-lg hover:bg-secondary/80">
                                ✕
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <button onClick={() => setAssigningRide(ride._id)}
                                className="px-3 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:opacity-90">
                                👤 {ride.driverId ? 'Změnit řidiče' : 'Přiřadit řidiče'}
                              </button>
                              {ride.driverId && (
                                <button
                                  onClick={async () => {
                                    if (!confirm('Odebrat přiřazeného řidiče? Zakázka se vrátí do volných zákazek.')) return
                                    await unassignDriver({ rideId: ride._id as Id<'rides'> })
                                  }}
                                  className="px-3 py-1.5 bg-orange-900/40 text-orange-400 text-sm font-medium rounded-lg hover:bg-orange-900/60 border border-orange-700/40"
                                  title="Odebrat řidiče — zakázka se vrátí do volných zákazek">
                                  ✕ Odebrat řidiče
                                </button>
                              )}
                            </div>
                          )}
                        </>
                      )}

                      {/* Copy to dates */}
                      {!['cancelled'].includes(ride.status) && (
                        <button onClick={() => setCopyRide(ride)}
                          className="px-3 py-1.5 bg-secondary text-secondary-foreground text-sm font-medium rounded-lg hover:bg-secondary/80 border border-border">
                          📋 Kopírovat na dny
                        </button>
                      )}

                      {!['delivered', 'cancelled'].includes(ride.status) && (
                        <button onClick={() => handleCancel(ride._id)}
                          className="px-3 py-1.5 bg-destructive/20 text-destructive text-sm font-medium rounded-lg hover:bg-destructive/30 border border-destructive/30">
                          ✕ Zrušit
                        </button>
                      )}
                      <button onClick={() => handleDelete(ride._id)}
                        className="px-3 py-1.5 bg-red-900/30 text-red-400 text-sm font-medium rounded-lg hover:bg-red-900/50 border border-red-800/40">
                        🗑️ Smazat
                      </button>

                      {/* Force status override */}
                      {statusOverrideRide === ride._id ? (
                        <div className="flex items-center gap-2 flex-wrap w-full mt-1">
                          <span className="text-xs text-muted-foreground">Přepnout stav na:</span>
                          {(['pending','approved','assigned','pickup','transit','delivered','cancelled'] as const)
                            .filter(s => s !== ride.status)
                            .map(s => {
                              const labels: Record<string, string> = {
                                pending: 'Čeká', approved: 'Schváleno', assigned: 'Přiřazeno',
                                pickup: 'Vyzvedávám', transit: 'Na cestě', delivered: 'Doručeno', cancelled: 'Zrušeno',
                              }
                              return (
                                <button key={s} onClick={() => handleForceStatus(ride._id, s)} disabled={loading}
                                  className="px-2 py-1 bg-amber-700/30 text-amber-300 text-xs font-medium rounded-lg hover:bg-amber-700/50 border border-amber-700/40 disabled:opacity-50">
                                  → {labels[s]}
                                </button>
                              )
                            })}
                          <button onClick={() => setStatusOverrideRide(null)}
                            className="px-2 py-1 bg-secondary text-secondary-foreground text-xs rounded-lg hover:bg-secondary/80">✕</button>
                        </div>
                      ) : (
                        <button onClick={() => setStatusOverrideRide(ride._id)}
                          className="px-3 py-1.5 bg-amber-700/20 text-amber-300 text-sm font-medium rounded-lg hover:bg-amber-700/30 border border-amber-700/30">
                          ⚡ Změnit stav
                        </button>
                      )}

                      {ride.trackingToken && (
                        <div className="flex items-center gap-1">
                          <a href={`/sledovani/${ride.trackingToken}`} target="_blank" rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-secondary text-secondary-foreground text-sm font-medium rounded-l-lg hover:bg-secondary/80 border-r border-background/20">
                            🔗 Tracking
                          </a>
                          <button
                            onClick={() => {
                              const url = `https://www.kuryr4you.cz/sledovani/${ride.trackingToken}`
                              navigator.clipboard.writeText(url).then(() => {
                                setCopiedTrackingId(ride._id)
                                setTimeout(() => setCopiedTrackingId(null), 2000)
                              })
                            }}
                            title="Kopírovat odkaz do schránky"
                            className="px-3 py-1.5 bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/80 border-r border-background/20"
                          >
                            {copiedTrackingId === ride._id ? '✓ Zkopírováno' : '📋'}
                          </button>
                          <button
                            onClick={() => setQrRide({ rideNumber: ride.rideNumber, token: ride.trackingToken! })}
                            title="QR kód pro sledování"
                            className="px-3 py-1.5 bg-secondary text-secondary-foreground text-sm font-medium rounded-r-lg hover:bg-secondary/80"
                          >
                            QR
                          </button>
                        </div>
                      )}

                      {/* Payment link button — visible when ride has price and is not yet paid */}
                      {ride.price && ride.price > 0 && !ride.isPaid && !['cancelled'].includes(ride.status) && (
                        <button
                          onClick={() => handleSendPaymentLink(ride._id)}
                          disabled={sendingPaymentLink === ride._id}
                          className="px-3 py-1.5 bg-emerald-700/30 text-emerald-300 text-sm font-medium rounded-lg hover:bg-emerald-700/50 border border-emerald-700/40 disabled:opacity-50">
                          {sendingPaymentLink === ride._id ? '⏳ Odesílám...' :
                            paymentLinkSent.has(ride._id) ? '✓ Odkaz odeslán' : '💳 Poslat platební odkaz'}
                        </button>
                      )}

                      {/* Payment status toggle — available on any non-cancelled ride */}
                      {!['cancelled'].includes(ride.status) && (
                        ride.isPaid ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              if (confirm(`Odebrat platbu z zásilky ${ride.rideNumber}? (označit jako nezaplaceno)`)) {
                                markAsPaidMutation({ rideId: ride._id, isPaid: false })
                              }
                            }}
                            className="px-3 py-1.5 bg-secondary text-secondary-foreground text-sm font-medium rounded-lg hover:bg-secondary/80 border border-border text-xs">
                            💳 Odebrat platbu
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              if (confirm(`Označit zásilku ${ride.rideNumber} jako zaplacenou?`)) {
                                markAsPaidMutation({ rideId: ride._id, isPaid: true })
                              }
                            }}
                            className="px-3 py-1.5 bg-green-700/30 text-green-300 text-sm font-medium rounded-lg hover:bg-green-700/50 border border-green-700/40">
                            ✓ Označit jako zaplaceno
                          </button>
                        )
                      )}

                      {/* Update price — visible when ride already has a price */}
                      {ride.price && ride.price > 0 && !ride.isPaid && (
                        priceRide === ride._id ? null : (
                          <>
                          <button onClick={(e) => { e.stopPropagation(); setAiPricingRide(aiPricingRide === ride._id ? null : ride._id) }}
                            className="px-3 py-1.5 bg-primary/10 text-primary text-sm font-medium rounded-lg hover:bg-primary/20 border border-primary/30 text-xs transition-colors">
                            🤖 AI nacenění
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); setPriceRide(ride._id); setPriceInput(String(ride.price ?? '')) }}
                            className="px-3 py-1.5 bg-secondary text-secondary-foreground text-sm font-medium rounded-lg hover:bg-secondary/80 border border-border text-xs">
                            ✏️ Upravit cenu
                          </button>
                          </>
                        )
                      )}
                    </div>
                  </div>
                )}
                </div>
              </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Order Modal */}
      {showNewOrder && drivers && customers && (
        <NewOrderModal
          onClose={() => setShowNewOrder(false)}
          drivers={drivers}
          customers={customers}
        />
      )}

      {/* Copy to Dates Modal */}
      {copyRide && (
        <CopyDatesModal ride={copyRide} onClose={() => setCopyRide(null)} />
      )}

      {/* POD Viewer Modal */}
      {podViewRide && (
        <PODModal
          rideId={podViewRide.id}
          rideNumber={podViewRide.number}
          onClose={() => setPodViewRide(null)}
        />
      )}

      {/* QR Code Modal */}
      {qrRide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setQrRide(null)}>
          <div className="bg-card border border-border rounded-2xl p-6 max-w-xs w-full text-center shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-heading font-bold mb-1">QR – Sledování zásilky</h3>
            <p className="text-sm text-muted-foreground mb-4">#{qrRide.rideNumber}</p>
            <div className="flex justify-center mb-4 p-3 bg-white rounded-xl">
              <QRCodeSVG
                value={`https://www.kuryr4you.cz/sledovani/${qrRide.token}`}
                size={180}
                level="M"
                includeMargin={false}
              />
            </div>
            <p className="text-xs text-muted-foreground mb-4 break-all">
              kuryr4you.cz/sledovani/{qrRide.token.slice(0, 12)}…
            </p>
            <button onClick={() => setQrRide(null)}
              className="w-full py-2 bg-secondary text-secondary-foreground rounded-lg text-sm hover:bg-secondary/80">
              Zavřít
            </button>
          </div>
        </div>
      )}
    </AppShell>
  )
}
