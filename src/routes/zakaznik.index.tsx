import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { AppShell } from '@/components/AppShell'
import { customerNav } from './zakaznik'

export const Route = createFileRoute('/zakaznik/')({
  component: CustomerDashboard,
})

// ─── Status progress helpers ──────────────────────────────────────────────────

const STATUS_STEPS = [
  { key: 'received',  label: 'Přijato' },
  { key: 'driver',    label: 'Řidič na cestě' },
  { key: 'delivered', label: 'Doručeno' },
]

function getStepIndex(status: string): number {
  if (status === 'delivered') return 2
  if (['assigned', 'pickup', 'transit'].includes(status)) return 1
  return 0
}

function RideProgress({ status }: { status: string }) {
  const active = getStepIndex(status)
  const cancelled = status === 'cancelled'
  return (
    <div className="flex items-center gap-0 mt-3">
      {STATUS_STEPS.map((step, i) => (
        <div key={step.key} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center gap-1">
            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-black transition-colors ${
              cancelled ? 'border-red-500/50 bg-red-900/20 text-red-500/50'
                : i < active  ? 'border-green-500 bg-green-500 text-white'
                : i === active ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-muted text-muted-foreground'
            }`}>
              {cancelled ? '✕' : i < active ? '✓' : i + 1}
            </div>
            <span className={`text-[10px] font-medium whitespace-nowrap ${i <= active && !cancelled ? 'text-foreground' : 'text-muted-foreground'}`}>
              {step.label}
            </span>
          </div>
          {i < STATUS_STEPS.length - 1 && (
            <div className={`flex-1 h-0.5 mb-4 mx-1 rounded-full ${i < active && !cancelled ? 'bg-green-500' : 'bg-border'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, accent }: { icon: string; label: string; value: string | number; accent: string }) {
  return (
    <div className={`relative overflow-hidden bg-card border border-border rounded-2xl p-4`}>
      <div className={`absolute top-0 left-0 w-1 h-full rounded-l-2xl ${accent}`} />
      <div className="flex items-center justify-between mb-2">
        <span className="text-xl">{icon}</span>
      </div>
      <p className="font-heading font-black text-2xl text-foreground leading-none mb-1">{value}</p>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
    </div>
  )
}

// ─── Active ride card ─────────────────────────────────────────────────────────

function ActiveRideCard({ ride }: { ride: any }) {
  const statusColors: Record<string, string> = {
    pending:   'text-yellow-400',
    approved:  'text-blue-400',
    assigned:  'text-blue-400',
    pickup:    'text-amber-400',
    transit:   'text-orange-400',
    delivered: 'text-green-400',
    cancelled: 'text-red-400',
  }

  return (
    <div className="bg-card border border-border hover:border-primary/30 rounded-2xl p-4 transition-colors">
      <div className="flex items-start justify-between gap-3 mb-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-heading font-black text-sm text-foreground">#{ride.rideNumber}</span>
          <span className={`text-xs font-bold ${statusColors[ride.status] ?? 'text-muted-foreground'}`}>
            {ride.status === 'pending' ? '⏳ Čeká na schválení'
              : ride.status === 'approved' ? '✓ Schváleno'
              : ride.status === 'assigned' ? '👤 Přiřazen řidič'
              : ride.status === 'pickup' ? '🚗 Jedu vyzvednout'
              : ride.status === 'transit' ? '🚚 Zásilka v přepravě'
              : ride.status === 'delivered' ? '✅ Doručeno'
              : ride.status === 'cancelled' ? '✕ Zrušeno'
              : ride.status}
          </span>
        </div>
        <Link
          to="/sledovani/$token"
          params={{ token: ride.trackingToken }}
          className="flex-shrink-0 px-3 py-1.5 text-xs font-bold bg-primary/15 border border-primary/25 text-primary rounded-xl hover:bg-primary/25 transition-colors"
        >
          Sledovat →
        </Link>
      </div>

      <div className="flex gap-2 items-center mb-3">
        <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <div className="w-0.5 h-4 bg-border" />
          <div className="w-2 h-2 rounded-full bg-red-500" />
        </div>
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="text-xs text-foreground font-medium truncate">{ride.pickupAddress}</p>
          <p className="text-xs text-muted-foreground truncate">{ride.deliveryAddress}</p>
        </div>
      </div>

      <RideProgress status={ride.status} />
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function CustomerDashboard() {
  const me = useQuery(api.users.getMe)
  const rides = useQuery(api.rides.getMyRides)

  if (!me) return null

  if (me.status !== 'active') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="max-w-sm text-center bg-card border border-border rounded-2xl p-8">
          <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-2xl mx-auto mb-4">⏳</div>
          <h2 className="font-heading text-xl font-black mb-2 text-foreground">Účet čeká na schválení</h2>
          <p className="text-muted-foreground text-sm">Váš účet musí být schválen dispečerem.<br />Obdržíte e-mail po schválení.</p>
        </div>
      </div>
    )
  }

  const activeRides    = rides?.filter(r => !['delivered', 'cancelled'].includes(r.status)) ?? []
  const deliveredRides = rides?.filter(r => r.status === 'delivered') ?? []
  const firstName = me.name?.split(' ')[0] || 'zákazníku'

  return (
    <AppShell navItems={customerNav} title="Zákazník" subtitle="Zákaznický portál" primaryCount={5}>
      <div className="max-w-4xl mx-auto">

        {/* ─── Hero welcome bar ─── */}
        <div className="relative overflow-hidden border-b border-border bg-card px-6 py-6">
          {/* Subtle grid texture */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: 'linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }} />
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Zákaznický portál</p>
              <h1 className="font-heading font-black text-2xl text-foreground">
                Dobrý den, {firstName}!
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {activeRides.length > 0
                  ? `${activeRides.length} aktivní zásilk${activeRides.length === 1 ? 'a' : activeRides.length < 5 ? 'y' : ''} právě probíhá`
                  : 'Vše doručeno. Připraveni na další zásilku?'}
              </p>
            </div>
            <Link
              to="/zakaznik/nova-zasilka"
              className="inline-flex items-center gap-2 px-5 py-3 bg-primary text-primary-foreground font-black text-sm rounded-2xl hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 flex-shrink-0"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Nová zásilka
            </Link>
          </div>
        </div>

        <div className="p-4 md:p-6 space-y-8">

          {/* ─── Stats ─── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard icon="📦" label="Aktivní zásilky" value={activeRides.length} accent="bg-primary" />
            <StatCard icon="✅" label="Doručeno celkem" value={deliveredRides.length} accent="bg-green-500" />
            <StatCard icon="📊" label="Zásilek celkem"   value={rides?.length ?? 0}    accent="bg-blue-500" />
            <StatCard
              icon="🏢"
              label="Firemní účet"
              value={me.corporateStatus === 'approved' ? 'Aktivní' : me.corporateStatus === 'pending' ? 'Čeká' : '—'}
              accent={me.corporateStatus === 'approved' ? 'bg-green-500' : 'bg-amber-500'}
            />
          </div>

          {/* ─── Active rides ─── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-heading font-black text-base text-foreground flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse inline-block" />
                Aktivní zásilky
              </h2>
              {activeRides.length > 5 && (
                <Link to="/zakaznik/zasilky" className="text-xs font-bold text-primary hover:opacity-80">
                  Zobrazit všechny →
                </Link>
              )}
            </div>

            {activeRides.length === 0 ? (
              <div className="bg-card border border-border rounded-2xl p-10 text-center">
                <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center text-2xl mx-auto mb-4">📦</div>
                <h3 className="font-heading font-bold text-base mb-1 text-foreground">Žádné aktivní zásilky</h3>
                <p className="text-muted-foreground text-sm mb-5">Vše klidné. Objednejte novou zásilku.</p>
                <Link to="/zakaznik/nova-zasilka"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-bold text-sm rounded-xl hover:bg-primary/90 transition-colors">
                  + Objednat zásilku
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {activeRides.slice(0, 5).map((ride) => (
                  <ActiveRideCard key={ride._id} ride={ride} />
                ))}
              </div>
            )}
          </div>

          {/* ─── Corporate account banner ─── */}
          {me.corporateStatus === 'none' && (
            <div className="relative overflow-hidden bg-card border border-border rounded-2xl p-5">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full translate-x-8 -translate-y-8" />
              <div className="relative flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-lg flex-shrink-0">
                  🏢
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-heading font-black text-base text-foreground mb-1">Firemní účet — 14denní fakturace</h3>
                  <p className="text-muted-foreground text-sm mb-3">
                    Platba jednou za 14 dní. Žádné platby kartou při každé zásilce. Ideální pro pravidelné zásilky.
                  </p>
                  <Link to="/zakaznik/profil"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/15 border border-amber-500/25 text-amber-400 text-sm font-bold rounded-xl hover:bg-amber-500/25 transition-colors">
                    Požádat o firemní účet →
                  </Link>
                </div>
              </div>
            </div>
          )}

          {me.corporateStatus === 'pending' && (
            <div className="bg-card border border-amber-700/30 rounded-2xl p-4 flex items-center gap-3">
              <span className="text-xl flex-shrink-0">⏳</span>
              <div>
                <p className="font-bold text-sm text-foreground">Žádost o firemní účet se zpracovává</p>
                <p className="text-xs text-muted-foreground">Dispečer žádost brzy posoudí. Obdržíte e-mail.</p>
              </div>
            </div>
          )}

          {me.corporateStatus === 'approved' && (
            <div className="bg-card border border-green-700/30 rounded-2xl p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-xl flex-shrink-0">✅</span>
                <div>
                  <p className="font-bold text-sm text-foreground">Firemní účet aktivní</p>
                  <p className="text-xs text-muted-foreground">Fakturace probíhá každých 14 dní.</p>
                </div>
              </div>
              <Link to="/zakaznik/faktury"
                className="px-3 py-1.5 text-xs font-bold bg-secondary border border-border text-foreground rounded-xl hover:bg-muted transition-colors flex-shrink-0">
                Faktury →
              </Link>
            </div>
          )}

        </div>
      </div>
    </AppShell>
  )
}
