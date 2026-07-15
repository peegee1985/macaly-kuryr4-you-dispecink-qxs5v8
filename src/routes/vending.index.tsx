import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { AppShell, PageHeader } from '@/components/AppShell'
import { vendingNav } from './vending'

export const Route = createFileRoute('/vending/')({
  component: VendingDashboard,
})

const LOCATION_STATUS_COLOR: Record<string, string> = {
  active: 'text-[hsl(var(--success))]',
  offline: 'text-[hsl(var(--muted-foreground))]',
  maintenance: 'text-[hsl(var(--warning))]',
  inactive: 'text-[hsl(var(--destructive))]',
}

const LOCATION_STATUS_LABEL: Record<string, string> = {
  active: 'Aktivní',
  offline: 'Offline',
  maintenance: 'Údržba',
  inactive: 'Neaktivní',
}

const VISIT_STATUS_COLOR: Record<string, string> = {
  scheduled: 'bg-yellow-500/15 text-yellow-400',
  assigned: 'bg-blue-500/15 text-blue-400',
  accepted: 'bg-blue-500/15 text-blue-300',
  en_route: 'bg-blue-500/15 text-blue-400',
  in_progress: 'bg-[hsl(var(--info))]/15 text-[hsl(var(--info))]',
  completed: 'bg-[hsl(var(--success))]/15 text-[hsl(var(--success))]',
  cancelled: 'bg-[hsl(var(--muted))]/50 text-[hsl(var(--muted-foreground))]',
  incident: 'bg-[hsl(var(--destructive))]/15 text-[hsl(var(--destructive))]',
}

const VISIT_STATUS_LABEL: Record<string, string> = {
  scheduled: 'Plánováno',
  assigned: 'Přiřazeno',
  accepted: 'Přijato',
  en_route: 'Na cestě',
  in_progress: 'Probíhá',
  completed: 'Dokončeno',
  cancelled: 'Zrušeno',
  incident: 'Incident',
}

function StatCard({ title, value, sub, color = 'text-[hsl(var(--primary))]', icon }: {
  title: string; value: number | string; sub?: string; color?: string; icon: React.ReactNode
}) {
  return (
    <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-5 flex items-start gap-4">
      <div className={`w-10 h-10 rounded-lg bg-[hsl(var(--muted))] flex items-center justify-center ${color} shrink-0`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-[hsl(var(--foreground))]">{value}</p>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">{title}</p>
        {sub && <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function VendingDashboard() {
  const overview = useQuery(api.vending.getDispatcherOverview)
  const clients = useQuery(api.vending.listClients)
  const recentVisits = useQuery(api.vending.listVisits, { status: undefined })
  const openIncidents = useQuery(api.vending.listIncidents, { status: 'open' })

  // Today's visits
  const today = new Date()
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
  const todayEnd = todayStart + 86400000

  const todayVisits = recentVisits?.filter(
    (v) => v.scheduledAt >= todayStart && v.scheduledAt < todayEnd
  ).slice(0, 8) ?? []

  return (
    <AppShell navItems={vendingNav} title="Vending Operations" subtitle="Správa servisních lokací" primaryCount={5}>
      <PageHeader title="Přehled" subtitle="Vending Operations Management" />

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Aktivních lokací"
          value={overview?.activeLocations ?? '—'}
          sub={`z ${overview?.totalLocations ?? 0} celkem`}
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
        />
        <StatCard
          title="Návštěvy dnes"
          value={overview?.todayVisitsTotal ?? '—'}
          sub={`${overview?.todayVisitsCompleted ?? 0} dokončeno`}
          color="text-[hsl(var(--info))]"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
        />
        <StatCard
          title="Otevřené incidenty"
          value={overview?.openIncidents ?? '—'}
          color={overview?.openIncidents ? 'text-[hsl(var(--destructive))]' : 'text-[hsl(var(--success))]'}
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
        />
        <StatCard
          title="Aktivní klienti"
          value={overview?.totalClients ?? '—'}
          color="text-[hsl(var(--success))]"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Today's visits */}
        <div className="lg:col-span-2 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[hsl(var(--border))]">
            <h3 className="font-semibold text-[hsl(var(--foreground))]">Dnešní návštěvy</h3>
            <Link to="/vending/navstevy" search={{ locationId: undefined }} className="text-xs text-[hsl(var(--primary))] hover:underline">
              Všechny →
            </Link>
          </div>
          {todayVisits.length === 0 ? (
            <div className="p-8 text-center text-[hsl(var(--muted-foreground))] text-sm">
              Dnes žádné návštěvy naplánované
            </div>
          ) : (
            <div className="divide-y divide-[hsl(var(--border))]">
              {todayVisits.map((visit) => (
                <Link
                  key={visit._id}
                  to="/vending/navstevy/$visitId"
                  params={{ visitId: visit._id }}
                  search={{ locationId: undefined }}
                  className="flex items-center justify-between px-5 py-3 hover:bg-[hsl(var(--muted))] transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-[hsl(var(--foreground))]">{visit.visitNumber}</p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">
                      {new Date(visit.scheduledAt).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${VISIT_STATUS_COLOR[visit.status] ?? ''}`}>
                    {VISIT_STATUS_LABEL[visit.status] ?? visit.status}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Open incidents */}
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[hsl(var(--border))]">
            <h3 className="font-semibold text-[hsl(var(--foreground))]">Otevřené incidenty</h3>
            <Link to="/vending/incidenty" className="text-xs text-[hsl(var(--primary))] hover:underline">
              Všechny →
            </Link>
          </div>
          {!openIncidents || openIncidents.length === 0 ? (
            <div className="p-8 text-center text-[hsl(var(--muted-foreground))] text-sm">
              <div className="text-3xl mb-2">✅</div>
              Žádné otevřené incidenty
            </div>
          ) : (
            <div className="divide-y divide-[hsl(var(--border))]">
              {openIncidents.slice(0, 6).map((incident) => (
                <div key={incident._id} className="px-5 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="w-2 h-2 rounded-full bg-[hsl(var(--destructive))] mt-1.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[hsl(var(--foreground))] truncate">
                        {INCIDENT_TYPE_LABEL[incident.type] ?? incident.type}
                      </p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))] truncate mt-0.5">
                        {incident.description.slice(0, 60)}{incident.description.length > 60 ? '…' : ''}
                      </p>
                    </div>
                    <span className={`shrink-0 text-xs px-1.5 py-0.5 rounded ${incident.severity === 'high' ? 'bg-red-500/15 text-red-400' : incident.severity === 'medium' ? 'bg-yellow-500/15 text-yellow-400' : 'bg-blue-500/15 text-blue-400'}`}>
                      {incident.severity === 'high' ? 'Vysoká' : incident.severity === 'medium' ? 'Střední' : 'Nízká'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick links */}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { to: '/vending/lokace', label: 'Správa lokací', icon: '📍' },
          { to: '/vending/navstevy', label: 'Naplánovat návštěvu', icon: '📅' },
          { to: '/vending/mapa', label: 'Otevřít mapu', icon: '🗺️' },
          { to: '/vending/sablony', label: 'Šablony checklistů', icon: '✅' },
        ].map((q) => (
          <Link
            key={q.to}
            to={q.to as any}
            className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-4 text-center hover:border-[hsl(var(--primary))] hover:bg-[hsl(var(--muted))] transition-all"
          >
            <div className="text-2xl mb-2">{q.icon}</div>
            <p className="text-xs font-medium text-[hsl(var(--foreground))]">{q.label}</p>
          </Link>
        ))}
      </div>
    </AppShell>
  )
}

const INCIDENT_TYPE_LABEL: Record<string, string> = {
  machine_locked: 'Stroj zamčen',
  pin_incorrect: 'Nesprávný PIN',
  machine_damaged: 'Poškozený stroj',
  broken_display: 'Poškozený displej',
  no_products: 'Chybí produkty',
  wrong_products: 'Špatné produkty',
  power_failure: 'Výpadek proudu',
  vandalism: 'Vandalismus',
  other: 'Jiný',
}
