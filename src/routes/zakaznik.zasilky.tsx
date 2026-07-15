import { createFileRoute, Link } from '@tanstack/react-router'
import { useConvexAuth, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { AppShell, LoadingScreen } from '@/components/AppShell'
import { customerNav } from './zakaznik'
import { useState } from 'react'
import type { Id } from '../../convex/_generated/dataModel'
import { PODModal } from '@/components/PODViewer'

export const Route = createFileRoute('/zakaznik/zasilky')({
  component: MyShipmentsPage,
})

const cargoLabels: Record<string, string> = {
  envelope: 'Obálka',
  parcel: 'Balík',
  box: 'Krabice',
  pallet: 'Paleta',
  other: 'Jiné',
}

const cargoIcons: Record<string, string> = {
  envelope: '✉️',
  parcel: '📦',
  box: '📫',
  pallet: '🏗️',
  other: '📋',
}

type FilterTab = 'all' | 'active' | 'delivered' | 'cancelled'

const tabs: { key: FilterTab; label: string; icon: string }[] = [
  { key: 'all',       label: 'Vše',      icon: '📋' },
  { key: 'active',    label: 'Aktivní',  icon: '🚚' },
  { key: 'delivered', label: 'Doručeno', icon: '✅' },
  { key: 'cancelled', label: 'Zrušeno',  icon: '✕' },
]

function isActive(status: string) {
  return ['pending', 'waiting_approval', 'approved', 'assigned', 'pickup', 'transit'].includes(status)
}

// ─── Status visuals ───────────────────────────────────────────────────────────

const STATUS_META: Record<string, { label: string; color: string; dot: string }> = {
  pending:           { label: 'Čeká na schválení', color: 'text-yellow-400',  dot: 'bg-yellow-500' },
  waiting_approval:  { label: 'Čeká na schválení', color: 'text-yellow-400',  dot: 'bg-yellow-500' },
  approved:          { label: 'Schváleno',          color: 'text-blue-400',    dot: 'bg-blue-500' },
  assigned:          { label: 'Přiřazen řidič',     color: 'text-blue-400',    dot: 'bg-blue-500' },
  pickup:            { label: 'Jedu vyzvednout',    color: 'text-amber-400',   dot: 'bg-amber-500' },
  transit:           { label: 'V přepravě',         color: 'text-primary',     dot: 'bg-primary' },
  delivered:         { label: 'Doručeno',           color: 'text-green-400',   dot: 'bg-green-500' },
  cancelled:         { label: 'Zrušeno',            color: 'text-red-400',     dot: 'bg-red-500' },
}

// ─── Shipment card ─────────────────────────────────────────────────────────────

function ShipmentCard({
  ride,
  onViewPOD,
}: {
  ride: any
  onViewPOD: (id: Id<'rides'>, number: string) => void
}) {
  const meta = STATUS_META[ride.status] ?? { label: ride.status, color: 'text-muted-foreground', dot: 'bg-muted' }
  const active = isActive(ride.status)

  return (
    <div className={`relative overflow-hidden bg-card border rounded-2xl transition-colors group ${
      active ? 'border-border hover:border-primary/40' : 'border-border/60 opacity-90 hover:opacity-100'
    }`}>
      {/* Left accent bar */}
      <div className={`absolute top-0 left-0 w-1 h-full rounded-l-2xl ${meta.dot}`} />

      <div className="pl-4 pr-4 pt-4 pb-3 ml-1">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-heading font-black text-sm text-foreground">#{ride.rideNumber}</span>
            {/* Status chip */}
            <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded-full bg-muted/60 ${meta.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${meta.dot} ${active ? 'animate-pulse' : ''}`} />
              {meta.label}
            </span>
            {/* Cargo type chip */}
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {cargoIcons[ride.cargoType] ?? '📋'} {cargoLabels[ride.cargoType] ?? ride.cargoType}
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 flex-shrink-0">
            {active && (
              <Link
                to="/sledovani/$token"
                params={{ token: ride.trackingToken }}
                className="px-3 py-1.5 bg-primary/15 border border-primary/25 text-primary text-xs font-bold rounded-xl hover:bg-primary/25 transition-colors"
              >
                Sledovat →
              </Link>
            )}
            {ride.status === 'delivered' && ride.podDeliveredAt && (
              <button
                onClick={() => onViewPOD(ride._id, ride.rideNumber)}
                className="px-3 py-1.5 bg-green-700/20 text-green-400 border border-green-700/30 text-xs font-bold rounded-xl hover:bg-green-700/30 transition-colors flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Doklad
              </button>
            )}
            {!active && ride.status !== 'delivered' && (
              <Link
                to="/sledovani/$token"
                params={{ token: ride.trackingToken }}
                className="px-3 py-1.5 bg-secondary border border-border text-muted-foreground text-xs font-medium rounded-xl hover:bg-muted transition-colors"
              >
                Detail
              </Link>
            )}
          </div>
        </div>

        {/* Route row */}
        <div className="flex gap-3 items-stretch mb-3">
          <div className="flex flex-col items-center gap-1 flex-shrink-0 pt-0.5">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500 ring-2 ring-green-500/20" />
            <div className="w-0.5 flex-1 bg-gradient-to-b from-green-500/50 to-red-500/50 min-h-[16px]" />
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-red-500/20" />
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <div>
              <p className="text-xs font-medium text-foreground truncate">{ride.pickupAddress}</p>
              <p className="text-[11px] text-muted-foreground">
                {new Date(ride.requestedPickupAt).toLocaleString('cs-CZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-foreground truncate">{ride.deliveryAddress}</p>
              <p className="text-[11px] text-muted-foreground">
                {new Date(ride.requestedDeliveryAt).toLocaleString('cs-CZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
          {ride.price && (
            <div className="flex-shrink-0 text-right self-center pl-2">
              <p className="font-black text-sm text-foreground">{ride.price}</p>
              <p className="text-[11px] text-muted-foreground">{ride.currency || 'CZK'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function MyShipmentsPage() {
  const { isAuthenticated } = useConvexAuth()
  const rides = useQuery(api.rides.getMyRides)
  const [podViewRide, setPodViewRide] = useState<{ id: Id<'rides'>; number: string } | null>(null)
  const [activeTab, setActiveTab] = useState<FilterTab>('all')

  if (!isAuthenticated || rides === undefined) return <LoadingScreen />

  const counts: Record<FilterTab, number> = {
    all:       rides.length,
    active:    rides.filter(r => isActive(r.status)).length,
    delivered: rides.filter(r => r.status === 'delivered').length,
    cancelled: rides.filter(r => r.status === 'cancelled').length,
  }

  const filtered = rides.filter(r => {
    if (activeTab === 'all')       return true
    if (activeTab === 'active')    return isActive(r.status)
    if (activeTab === 'delivered') return r.status === 'delivered'
    if (activeTab === 'cancelled') return r.status === 'cancelled'
    return true
  })

  return (
    <AppShell navItems={customerNav} title="Zákazník" subtitle="Zákaznický portál" primaryCount={5}>
      <div className="max-w-3xl mx-auto">

        {/* ─── Page header ─── */}
        <div className="px-6 pt-6 pb-0 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-heading font-black text-xl text-foreground">Moje zásilky</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Celkem {rides.length} zásilek</p>
          </div>
          <Link
            to="/zakaznik/nova-zasilka"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground font-black text-sm rounded-2xl hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Nová zásilka
          </Link>
        </div>

        {/* ─── Filter tabs ─── */}
        <div className="px-6 pt-5 pb-0">
          <div className="flex gap-1 bg-card border border-border rounded-2xl p-1">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl transition-all ${
                  activeTab === tab.key
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <span className="hidden sm:inline">{tab.icon}</span>
                {tab.label}
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${
                  activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
                }`}>
                  {counts[tab.key]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* ─── List ─── */}
        <div className="p-4 md:p-6">
          {filtered.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl p-12 text-center">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center text-2xl mx-auto mb-4">
                {activeTab === 'active' ? '🚚' : activeTab === 'delivered' ? '✅' : activeTab === 'cancelled' ? '✕' : '📦'}
              </div>
              <h3 className="font-heading font-bold text-base mb-1 text-foreground">
                {activeTab === 'active' ? 'Žádné aktivní zásilky'
                  : activeTab === 'delivered' ? 'Žádné doručené zásilky'
                  : activeTab === 'cancelled' ? 'Žádné zrušené zásilky'
                  : 'Zatím žádné zásilky'}
              </h3>
              <p className="text-muted-foreground text-sm mb-5">
                {activeTab === 'all' ? 'Objednejte svou první zásilku' : 'V této kategorii nic není'}
              </p>
              {activeTab === 'all' && (
                <Link to="/zakaznik/nova-zasilka"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-bold text-sm rounded-xl hover:bg-primary/90 transition-colors">
                  + Objednat zásilku
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((ride) => (
                <ShipmentCard
                  key={ride._id}
                  ride={ride}
                  onViewPOD={(id, number) => setPodViewRide({ id, number })}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {podViewRide && (
        <PODModal
          rideId={podViewRide.id}
          rideNumber={podViewRide.number}
          onClose={() => setPodViewRide(null)}
        />
      )}
    </AppShell>
  )
}
