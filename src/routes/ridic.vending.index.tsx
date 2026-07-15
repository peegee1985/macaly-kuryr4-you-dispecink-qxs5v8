import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useState } from 'react'

export const Route = createFileRoute('/ridic/vending/')({
  component: DriverVendingDashboard,
})

const VISIT_STATUS_COLOR: Record<string, string> = {
  scheduled: 'border-yellow-500/40 bg-yellow-500/5',
  assigned: 'border-blue-500/40 bg-blue-500/5',
  accepted: 'border-blue-400/40 bg-blue-400/5',
  en_route: 'border-[hsl(var(--info))]/40 bg-[hsl(var(--info))]/5',
  in_progress: 'border-[hsl(var(--primary))]/40 bg-[hsl(var(--primary))]/5',
  completed: 'border-[hsl(var(--success))]/40 bg-[hsl(var(--success))]/5',
  incident: 'border-[hsl(var(--destructive))]/40 bg-[hsl(var(--destructive))]/5',
}

const VISIT_STATUS_DOT: Record<string, string> = {
  scheduled: 'bg-yellow-400',
  assigned: 'bg-blue-400',
  accepted: 'bg-blue-300',
  en_route: 'bg-[hsl(var(--info))]',
  in_progress: 'bg-[hsl(var(--primary))]',
  completed: 'bg-[hsl(var(--success))]',
  incident: 'bg-[hsl(var(--destructive))]',
}

const VISIT_STATUS_LABEL: Record<string, string> = {
  scheduled: 'Plánováno', assigned: 'Přiřazeno', accepted: 'Přijato',
  en_route: 'Na cestě', in_progress: 'Probíhá', completed: 'Dokončeno',
  cancelled: 'Zrušeno', incident: 'Incident',
}

function DriverVendingDashboard() {
  const visits = useQuery(api.vending.getDriverTodayVisits)
  const me = useQuery(api.users.getMe)

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Dobré ráno'
    if (h < 18) return 'Dobrý den'
    return 'Dobrý večer'
  }

  const pending = visits?.filter((v) => ['assigned', 'scheduled', 'accepted'].includes(v.status)) ?? []
  const active = visits?.filter((v) => ['en_route', 'in_progress'].includes(v.status)) ?? []
  const done = visits?.filter((v) => v.status === 'completed') ?? []

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] p-4 pb-24">
      {/* Header */}
      <div className="mb-6">
        <p className="text-[hsl(var(--muted-foreground))] text-sm">{greeting()},</p>
        <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">{me?.name ?? 'Řidič'}</h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
          {new Date().toLocaleDateString('cs-CZ', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* Progress summary */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-[hsl(var(--foreground))]">{active.length}</p>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">Aktivní</p>
        </div>
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-yellow-400">{pending.length}</p>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">Čeká</p>
        </div>
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-[hsl(var(--success))]">{done.length}</p>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">Hotovo</p>
        </div>
      </div>

      {/* Active visit highlight */}
      {active.length > 0 && (
        <div className="mb-5">
          <p className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide mb-2">Aktivní návštěva</p>
          {active.map((visit) => (
            <Link
              key={visit._id}
              to="/ridic/vending/$visitId"
              params={{ visitId: visit._id }}
              className={`block border rounded-2xl p-5 mb-3 ${VISIT_STATUS_COLOR[visit.status]} transition-all active:scale-[0.98]`}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-bold text-[hsl(var(--foreground))]">{(visit.location as any)?.name ?? '—'}</p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">{(visit.location as any)?.address}</p>
                </div>
                <div className="flex items-center gap-1.5 bg-[hsl(var(--background))]/50 px-2 py-1 rounded-full">
                  <span className={`w-2 h-2 rounded-full ${VISIT_STATUS_DOT[visit.status]}`} />
                  <span className="text-xs font-medium text-[hsl(var(--foreground))]">{VISIT_STATUS_LABEL[visit.status]}</span>
                </div>
              </div>
              <div className="text-xs text-[hsl(var(--muted-foreground))]">
                {new Date(visit.scheduledAt).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })} · {visit.visitNumber}
              </div>
              <div className="mt-3 w-full py-2 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] rounded-xl font-semibold text-center text-sm">
                Pokračovat →
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Upcoming visits */}
      {pending.length > 0 && (
        <div className="mb-5">
          <p className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide mb-2">Naplánované</p>
          <div className="space-y-3">
            {pending.map((visit) => (
              <Link
                key={visit._id}
                to="/ridic/vending/$visitId"
                params={{ visitId: visit._id }}
                className={`block border rounded-2xl p-4 ${VISIT_STATUS_COLOR[visit.status]} transition-all active:scale-[0.98]`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[hsl(var(--foreground))] truncate">{(visit.location as any)?.name ?? '—'}</p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">{(visit.location as any)?.address}</p>
                  </div>
                  <div className="text-right ml-3 shrink-0">
                    <p className="font-bold text-[hsl(var(--foreground))]">
                      {new Date(visit.scheduledAt).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">{visit.estimatedDuration ?? '—'} min</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Completed visits */}
      {done.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide mb-2">Dokončené</p>
          <div className="space-y-2">
            {done.map((visit) => (
              <Link
                key={visit._id}
                to="/ridic/vending/$visitId"
                params={{ visitId: visit._id }}
                className="flex items-center justify-between border border-[hsl(var(--success))]/20 bg-[hsl(var(--success))]/5 rounded-xl p-3 transition-all active:scale-[0.98]"
              >
                <div>
                  <p className="text-sm font-medium text-[hsl(var(--foreground))]">{(visit.location as any)?.name ?? '—'}</p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">{visit.visitNumber}</p>
                </div>
                <span className="text-xs text-[hsl(var(--success))]">✓ Hotovo</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {!visits && (
        <div className="text-center text-[hsl(var(--muted-foreground))] mt-10">Načítám…</div>
      )}

      {visits && visits.length === 0 && (
        <div className="text-center mt-12">
          <div className="text-5xl mb-4">🎉</div>
          <p className="text-[hsl(var(--foreground))] font-semibold">Na dnešek nic není</p>
          <p className="text-[hsl(var(--muted-foreground))] text-sm mt-1">Žádné přiřazené servisní návštěvy</p>
        </div>
      )}

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-[hsl(var(--card))] border-t border-[hsl(var(--border))] px-4 py-3 flex justify-around">
        <Link to="/ridic/vending" className="flex flex-col items-center gap-1 text-[hsl(var(--primary))]">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span className="text-xs">Přehled</span>
        </Link>
        <Link to="/ridic" className="flex flex-col items-center gap-1 text-[hsl(var(--muted-foreground))]">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 10V7" />
          </svg>
          <span className="text-xs">Zásilky</span>
        </Link>
        <Link to="/ridic/profil" className="flex flex-col items-center gap-1 text-[hsl(var(--muted-foreground))]">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span className="text-xs">Profil</span>
        </Link>
      </div>
    </div>
  )
}
