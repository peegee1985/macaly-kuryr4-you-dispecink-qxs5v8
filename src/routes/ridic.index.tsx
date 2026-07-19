import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useConvexAuth, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useEffect } from 'react'
import { DriverShell } from '@/components/DriverShell'
import { LoadingScreen, StatusBadge } from '@/components/AppShell'
import { GamificationCard } from '@/components/GamificationCard'
import { LevelUpModal } from '@/components/LevelUpModal'

export const Route = createFileRoute('/ridic/')({
  component: DriverDashboard,
})


function DriverDashboard() {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const me = useQuery(api.users.getMe)
  const rides = useQuery(api.rides.getDriverRides)
  const navigate = useNavigate()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) navigate({ to: '/prihlaseni' })
  }, [isAuthenticated, isLoading, navigate])

  useEffect(() => {
    if (me && me.role !== 'driver') navigate({ to: '/' })
  }, [me, navigate])

  if (isLoading || me === undefined) return <LoadingScreen />
  if (!me) return null

  if (me.status === 'pending') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="max-w-sm w-full text-center bg-card border border-border rounded-2xl p-8">
          <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="font-heading text-xl font-bold mb-2">Čeká na schválení</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Váš účet musí schválit dispečer. Jakmile budete schváleni, dostanete oznámení.
          </p>
        </div>
      </div>
    )
  }

  const activeRides = rides?.filter(r => !['delivered', 'cancelled'].includes(r.status)) ?? []
  const todayCount = rides?.filter(r => {
    return new Date(r.requestedPickupAt).toDateString() === new Date().toDateString()
  }).length ?? 0

  return (
    <DriverShell>
      <LevelUpModal />
      <div className="px-4 pt-5 pb-2">
        {/* Gamification XP card */}
        <GamificationCard />

        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Aktivní', value: activeRides.length, accent: 'text-primary' },
            { label: 'Dnes', value: todayCount, accent: 'text-amber-400' },
            { label: 'Celkem', value: rides?.length ?? 0, accent: 'text-foreground' },
          ].map(s => (
            <div key={s.label} className="bg-card border border-border rounded-xl p-3 text-center">
              <p className={`font-heading text-3xl font-bold ${s.accent}`}>{s.value}</p>
              <p className="text-muted-foreground text-xs mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Active rides */}
        {activeRides.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-8 text-center mb-6">
            <div className="text-4xl mb-3">✅</div>
            <p className="font-medium">Vše doručeno!</p>
            <p className="text-muted-foreground text-sm mt-1">Žádné aktivní zákazky</p>
          </div>
        ) : (
          <div className="space-y-3 mb-6">
            <div className="flex items-center justify-between">
              <h2 className="font-heading font-bold text-base">Aktivní zákazky</h2>
              <Link to="/ridic/zakazky" className="text-xs text-primary hover:underline">Všechny zákazky →</Link>
            </div>
            {activeRides.map((ride) => (
              <div
                key={ride._id}
                className="bg-card border border-border rounded-2xl p-4 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <span className="font-heading font-bold">#{ride.rideNumber}</span>
                  <StatusBadge status={ride.status} />
                </div>
                <p className="text-sm text-muted-foreground truncate">📍 {ride.pickupAddress}</p>
                <p className="text-sm truncate">🎯 <span className="font-medium">{ride.deliveryAddress}</span></p>
                <p className="text-sm text-muted-foreground">
                  🕐 {new Date(ride.requestedPickupAt).toLocaleString('cs-CZ', { dateStyle: 'short', timeStyle: 'short' })}
                </p>
                <Link
                  to="/ridic/zakazky"
                  className="inline-flex items-center gap-1.5 text-xs text-primary font-medium hover:underline mt-1"
                >
                  Ovládat zákazku →
                </Link>
              </div>
            ))}
          </div>
        )}

        {/* Quick action tiles */}
        <h2 className="font-heading font-bold text-base mb-3">Rychlé akce</h2>
        <div className="grid grid-cols-2 gap-3">
          <Link to="/ridic/dostupnost"
            className="bg-card border border-border rounded-2xl p-4 hover:border-primary/50 active:scale-95 transition-all"
          >
            <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="font-heading font-semibold text-sm">Dostupnost</p>
            <p className="text-xs text-muted-foreground mt-0.5">Nastavit směny</p>
          </Link>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('open-chat'))}
            className="bg-card border border-border rounded-2xl p-4 hover:border-primary/50 active:scale-95 transition-all text-left"
          >
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="font-heading font-semibold text-sm">Chat</p>
            <p className="text-xs text-muted-foreground mt-0.5">Zprávy a dispečink</p>
          </button>
        </div>
      </div>
    </DriverShell>
  )
}
