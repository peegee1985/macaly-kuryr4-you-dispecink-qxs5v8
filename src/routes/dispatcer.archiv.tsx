import { createFileRoute, Link } from '@tanstack/react-router'
import { useConvexAuth, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useState, useMemo } from 'react'
import type { Id } from '../../convex/_generated/dataModel'
import { AppShell, LoadingScreen, StatusBadge } from '@/components/AppShell'
import { dispatcherNav } from './dispatcer'

export const Route = createFileRoute('/dispatcer/archiv')({
  component: ArchivePage,
})

const CARGO_LABELS: Record<string, string> = {
  envelope: 'Obálka', parcel: 'Balík', box: 'Krabice', pallet: 'Paleta', other: 'Jiné',
}

const STATUS_LABELS: Record<string, string> = {
  delivered: 'Doručeno',
  cancelled: 'Zrušeno',
  failed: 'Selhalo',
}

const STATUS_COLORS: Record<string, string> = {
  delivered: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  cancelled: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/20',
  failed: 'bg-red-500/15 text-red-400 border-red-500/20',
}

function fmt(ts: number) {
  return new Date(ts).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short', year: 'numeric' })
}
function fmtShort(ts: number) {
  return new Date(ts).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric', year: '2-digit' })
}

type StatusFilter = 'delivered' | 'cancelled' | 'failed'

function ArchivePage() {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const me = useQuery(api.users.getMe)

  // Filters
  const [search, setSearch] = useState('')
  const [statuses, setStatuses] = useState<StatusFilter[]>(['delivered', 'cancelled', 'failed'])
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedDriverId, setSelectedDriverId] = useState<string>('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const drivers = useQuery(api.users.listUsersByRole, { role: 'driver' })

  const dateFromMs = dateFrom ? new Date(dateFrom).getTime() : undefined
  const dateToMs = dateTo ? new Date(dateTo + 'T23:59:59').getTime() : undefined

  const rides = useQuery(api.rides.getArchivedRides, {
    statuses: statuses.length < 3 ? statuses : undefined,
    dateFrom: dateFromMs,
    dateTo: dateToMs,
    driverId: selectedDriverId ? selectedDriverId as Id<'users'> : undefined,
    search: search.trim() || undefined,
  })

  const totalRevenue = useMemo(() => {
    if (!rides) return 0
    return rides.filter(r => r.status === 'delivered' && r.price).reduce((s, r) => s + (r.price ?? 0), 0)
  }, [rides])

  const countByStatus = useMemo(() => {
    if (!rides) return { delivered: 0, cancelled: 0, failed: 0 }
    return rides.reduce((acc, r) => {
      acc[r.status as StatusFilter] = (acc[r.status as StatusFilter] ?? 0) + 1
      return acc
    }, { delivered: 0, cancelled: 0, failed: 0 } as Record<StatusFilter, number>)
  }, [rides])

  if (isLoading || me === undefined) return <LoadingScreen />
  if (!me) return null

  function toggleStatus(s: StatusFilter) {
    setStatuses(prev =>
      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
    )
  }

  return (
    <AppShell navItems={dispatcherNav} title="Dispečer" subtitle="Archiv zakázek" primaryCount={4}>
      <div className="p-4 md:p-6 space-y-5 max-w-7xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold font-heading">Archiv zakázek</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Historie dokončených, zrušených a neúspěšných zakázek
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Doručeno" value={countByStatus.delivered} color="text-emerald-400" />
          <StatCard label="Zrušeno" value={countByStatus.cancelled} color="text-zinc-400" />
          <StatCard label="Selhalo" value={countByStatus.failed} color="text-red-400" />
          <StatCard label="Celková tržba" value={`${totalRevenue.toLocaleString('cs-CZ')} Kč`} color="text-primary" />
        </div>

        {/* Filters */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <div className="flex flex-wrap gap-2 items-center">
            {/* Status toggles */}
            {(['delivered', 'cancelled', 'failed'] as StatusFilter[]).map(s => (
              <button
                key={s}
                onClick={() => toggleStatus(s)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
                  statuses.includes(s)
                    ? STATUS_COLORS[s]
                    : 'border-border text-muted-foreground bg-muted/30 hover:bg-muted'
                }`}
              >
                {STATUS_LABELS[s]}
              </button>
            ))}
            <div className="flex-1 min-w-[180px]">
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Hledat zásilky, adresy, kontakty…"
                className="w-full px-3 py-1.5 bg-input border border-border rounded-lg text-sm focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <label className="text-xs text-muted-foreground font-medium">Od:</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="px-2.5 py-1.5 bg-input border border-border rounded-lg text-xs focus:outline-none focus:border-primary transition-colors"
            />
            <label className="text-xs text-muted-foreground font-medium">Do:</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="px-2.5 py-1.5 bg-input border border-border rounded-lg text-xs focus:outline-none focus:border-primary transition-colors"
            />
            <select
              value={selectedDriverId}
              onChange={e => setSelectedDriverId(e.target.value)}
              className="px-2.5 py-1.5 bg-input border border-border rounded-lg text-xs focus:outline-none focus:border-primary transition-colors"
            >
              <option value="">Všichni řidiči</option>
              {drivers?.map(d => (
                <option key={d._id} value={d._id}>{d.name ?? d.email}</option>
              ))}
            </select>
            {(search || dateFrom || dateTo || selectedDriverId || statuses.length < 3) && (
              <button
                onClick={() => { setSearch(''); setDateFrom(''); setDateTo(''); setSelectedDriverId(''); setStatuses(['delivered', 'cancelled', 'failed']) }}
                className="px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg hover:bg-muted transition-colors"
              >
                Vymazat filtry
              </button>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {rides === undefined ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : rides.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 10V7" />
                </svg>
              </div>
              <p className="text-muted-foreground text-sm">Žádné zásilky nenalezeny</p>
              <p className="text-muted-foreground text-xs mt-1">Zkuste upravit filtry</p>
            </div>
          ) : (
            <>
              <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Nalezeno {rides.length} zakázek
                </span>
              </div>
              {/* Table header – desktop */}
              <div className="hidden md:grid grid-cols-[110px_1fr_1fr_100px_90px_80px] gap-3 px-4 py-2 text-xs font-medium text-muted-foreground border-b border-border">
                <span>Číslo</span>
                <span>Vyzvednutí</span>
                <span>Doručení</span>
                <span>Řidič</span>
                <span>Datum</span>
                <span>Stav</span>
              </div>
              <div className="divide-y divide-border">
                {rides.map(ride => (
                  <div key={ride._id}>
                    <button
                      onClick={() => setExpandedId(expandedId === ride._id ? null : ride._id)}
                      className="w-full text-left hover:bg-muted/30 transition-colors"
                    >
                      {/* Mobile */}
                      <div className="md:hidden px-4 py-3 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs font-semibold text-primary">{ride.rideNumber}</span>
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${STATUS_COLORS[ride.status]}`}>
                            {STATUS_LABELS[ride.status]}
                          </span>
                        </div>
                        <p className="text-sm truncate">{ride.pickupAddress}</p>
                        <p className="text-xs text-muted-foreground truncate">→ {ride.deliveryAddress}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{fmtShort(ride.requestedPickupAt)}</span>
                          {ride.driverName && <span>· {ride.driverName}</span>}
                          {ride.price && <span>· {ride.price.toLocaleString('cs-CZ')} {ride.currency ?? 'Kč'}</span>}
                        </div>
                      </div>
                      {/* Desktop */}
                      <div className="hidden md:grid grid-cols-[110px_1fr_1fr_100px_90px_80px] gap-3 px-4 py-3 items-center text-sm">
                        <span className="font-mono text-xs font-semibold text-primary">{ride.rideNumber}</span>
                        <span className="truncate">{ride.pickupAddress}</span>
                        <span className="truncate text-muted-foreground">{ride.deliveryAddress}</span>
                        <span className="truncate text-xs">{ride.driverName ?? '—'}</span>
                        <span className="text-xs text-muted-foreground">{fmtShort(ride.requestedPickupAt)}</span>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border w-fit ${STATUS_COLORS[ride.status]}`}>
                          {STATUS_LABELS[ride.status]}
                        </span>
                      </div>
                    </button>

                    {/* Expanded detail */}
                    {expandedId === ride._id && (
                      <div className="bg-muted/20 border-t border-border px-4 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-3 text-sm">
                          <DetailRow label="Číslo zásilky" value={ride.rideNumber} mono />
                          <DetailRow label="Stav" value={STATUS_LABELS[ride.status]} />
                          <DetailRow label="Typ zásilky" value={`${CARGO_LABELS[ride.cargoType] ?? ride.cargoType} × ${ride.quantity}`} />
                          {ride.weight && <DetailRow label="Hmotnost" value={`${ride.weight} kg`} />}
                          <DetailRow label="Popis" value={ride.cargoDescription} />
                          <DetailRow label="Vyzvednutí od" value={ride.pickupContactName} />
                          <DetailRow label="Datum vyzvednutí" value={fmt(ride.requestedPickupAt)} />
                          <DetailRow label="Doručení k" value={ride.deliveryContactName} />
                          <DetailRow label="Plánované doručení" value={fmt(ride.requestedDeliveryAt)} />
                          {ride.podDeliveredAt && <DetailRow label="Skutečné doručení" value={fmt(ride.podDeliveredAt)} />}
                          {ride.failedAt && <DetailRow label="Čas selhání" value={fmt(ride.failedAt)} />}
                          {ride.failedReason && <DetailRow label="Důvod selhání" value={ride.failedReason} />}
                          <DetailRow label="Zákazník" value={ride.customerName ?? '—'} />
                          {ride.customerCompany && <DetailRow label="Firma" value={ride.customerCompany} />}
                          <DetailRow label="Řidič" value={ride.driverName ?? '—'} />
                          {ride.price && (
                            <DetailRow label="Cena" value={`${ride.price.toLocaleString('cs-CZ')} ${ride.currency ?? 'Kč'}`} />
                          )}
                          <DetailRow label="Zaplaceno" value={ride.isPaid ? 'Ano' : 'Ne'} />
                          {ride.codEnabled && (
                            <DetailRow
                              label="Dobírka"
                              value={`${ride.codAmount?.toLocaleString('cs-CZ') ?? '—'} Kč (${ride.codCollected ? 'vybráno' : 'nevybráno'})`}
                            />
                          )}
                          {ride.rating && (
                            <DetailRow label="Hodnocení" value={`${'★'.repeat(ride.rating)}${'☆'.repeat(5 - ride.rating)} (${ride.rating}/5)`} />
                          )}
                        </div>
                        <div className="mt-3 flex gap-2">
                          <Link
                            to="/dispatcer/zasilky"
                            search={{ id: ride._id } as any}
                            className="text-xs text-primary hover:underline flex items-center gap-1"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            Otevřít v Zásilkách
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </AppShell>
  )
}

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="bg-card border border-border rounded-xl px-4 py-3">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`text-xl font-bold font-heading ${color}`}>{value}</p>
    </div>
  )
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className={`text-sm font-medium leading-snug ${mono ? 'font-mono text-primary' : ''}`}>{value}</p>
    </div>
  )
}
