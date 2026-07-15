import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { AppShell } from '@/components/AppShell'
import { vendingNav } from './vending'
import { useState } from 'react'
import type { Id } from '../../convex/_generated/dataModel'

export const Route = createFileRoute('/vending/lokace/$locationId')({
  component: LocationDetailPage,
})

const LOCATION_STATUS_COLORS: Record<string, string> = {
  active: 'bg-[hsl(var(--success))]/15 text-[hsl(var(--success))] border-[hsl(var(--success))]/30',
  offline: 'bg-[hsl(var(--muted))]/50 text-[hsl(var(--muted-foreground))] border-[hsl(var(--border))]',
  maintenance: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  inactive: 'bg-[hsl(var(--destructive))]/15 text-[hsl(var(--destructive))] border-[hsl(var(--destructive))]/30',
}

const LOCATION_STATUS_LABEL: Record<string, string> = {
  active: 'Aktivní', offline: 'Offline', maintenance: 'Údržba', inactive: 'Neaktivní',
}

const VISIT_STATUS_COLOR: Record<string, string> = {
  scheduled: 'bg-yellow-500/15 text-yellow-400',
  assigned: 'bg-blue-500/15 text-blue-400',
  en_route: 'bg-blue-500/15 text-blue-400',
  in_progress: 'bg-[hsl(var(--info))]/15 text-[hsl(var(--info))]',
  completed: 'bg-[hsl(var(--success))]/15 text-[hsl(var(--success))]',
  cancelled: 'bg-[hsl(var(--muted))]/50 text-[hsl(var(--muted-foreground))]',
  incident: 'bg-[hsl(var(--destructive))]/15 text-[hsl(var(--destructive))]',
  accepted: 'bg-blue-500/15 text-blue-300',
}

const VISIT_STATUS_LABEL: Record<string, string> = {
  scheduled: 'Plánováno', assigned: 'Přiřazeno', accepted: 'Přijato',
  en_route: 'Na cestě', in_progress: 'Probíhá', completed: 'Dokončeno',
  cancelled: 'Zrušeno', incident: 'Incident',
}

const INCIDENT_TYPE_LABEL: Record<string, string> = {
  machine_locked: 'Stroj zamčen', pin_incorrect: 'Nesprávný PIN',
  machine_damaged: 'Poškozený stroj', broken_display: 'Poškozený displej',
  no_products: 'Chybí produkty', wrong_products: 'Špatné produkty',
  power_failure: 'Výpadek proudu', vandalism: 'Vandalismus', other: 'Jiný',
}

function LocationDetailPage() {
  const { locationId } = Route.useParams()
  const location = useQuery(api.vending.getLocation, { locationId: locationId as Id<'serviceLocations'> })
  const visits = useQuery(api.vending.listVisits, { locationId: locationId as Id<'serviceLocations'> })
  const incidents = useQuery(api.vending.listIncidents, { locationId: locationId as Id<'serviceLocations'> })
  const updateLocation = useMutation(api.vending.updateLocation)

  const [editStatus, setEditStatus] = useState(false)
  const [newStatus, setNewStatus] = useState('')
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'visits' | 'incidents' | 'photos'>('overview')

  if (!location) {
    return (
      <AppShell navItems={vendingNav} title="Lokace" primaryCount={5}>
        <div className="p-8 text-center text-[hsl(var(--muted-foreground))]">
          {location === null ? 'Lokace nenalezena' : 'Načítám…'}
        </div>
      </AppShell>
    )
  }

  const handleStatusChange = async () => {
    setSaving(true)
    try {
      await updateLocation({
        locationId: locationId as Id<'serviceLocations'>,
        status: newStatus as any,
      })
      setEditStatus(false)
    } finally {
      setSaving(false)
    }
  }

  const completedVisits = visits?.filter((v) => v.status === 'completed') ?? []
  const openIncidents = incidents?.filter((i) => i.status === 'open') ?? []

  return (
    <AppShell navItems={vendingNav} title={location.name} primaryCount={5}>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))] mb-4">
        <Link to="/vending/lokace" className="hover:text-[hsl(var(--primary))]">Lokace</Link>
        <span>/</span>
        <span className="text-[hsl(var(--foreground))]">{location.name}</span>
      </div>

      {/* Header */}
      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-6 mb-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl font-bold text-[hsl(var(--foreground))]">{location.name}</h1>
              <span className={`px-2 py-0.5 rounded-full border text-xs font-medium ${LOCATION_STATUS_COLORS[location.status]}`}>
                {LOCATION_STATUS_LABEL[location.status]}
              </span>
            </div>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              <span className="font-mono text-[hsl(var(--primary))]">{location.locationCode}</span>
              {' · '}
              {location.address}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {editStatus ? (
              <div className="flex items-center gap-2">
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="px-3 py-1.5 text-sm bg-[hsl(var(--input))] border border-[hsl(var(--border))] rounded-lg text-[hsl(var(--foreground))]"
                >
                  <option value="">— Stav —</option>
                  <option value="active">Aktivní</option>
                  <option value="maintenance">Údržba</option>
                  <option value="offline">Offline</option>
                  <option value="inactive">Neaktivní</option>
                </select>
                <button onClick={handleStatusChange} disabled={saving || !newStatus} className="px-3 py-1.5 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] rounded-lg text-sm font-medium disabled:opacity-50">
                  {saving ? '…' : 'Uložit'}
                </button>
                <button onClick={() => setEditStatus(false)} className="px-3 py-1.5 bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] rounded-lg text-sm">
                  Zrušit
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setEditStatus(true); setNewStatus(location.status) }}
                className="px-3 py-1.5 bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] rounded-lg text-sm hover:opacity-90"
              >
                Změnit stav
              </button>
            )}
            <Link
              to="/vending/navstevy"
              search={{ locationId }}
              className="px-3 py-1.5 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] rounded-lg text-sm font-medium hover:opacity-90"
            >
              + Návštěva
            </Link>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 pt-5 border-t border-[hsl(var(--border))]">
          <div>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">Celkem návštěv</p>
            <p className="text-xl font-bold text-[hsl(var(--foreground))]">{visits?.length ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">Dokončeno</p>
            <p className="text-xl font-bold text-[hsl(var(--success))]">{completedVisits.length}</p>
          </div>
          <div>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">Otevřené incidenty</p>
            <p className={`text-xl font-bold ${openIncidents.length > 0 ? 'text-[hsl(var(--destructive))]' : 'text-[hsl(var(--foreground))]'}`}>
              {openIncidents.length}
            </p>
          </div>
          <div>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">Poslední návštěva</p>
            <p className="text-sm font-medium text-[hsl(var(--foreground))]">
              {location.lastVisitAt ? new Date(location.lastVisitAt).toLocaleDateString('cs-CZ') : 'Nikdy'}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-[hsl(var(--muted))] p-1 rounded-lg w-fit">
        {(['overview', 'visits', 'incidents', 'photos'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === tab ? 'bg-[hsl(var(--card))] text-[hsl(var(--foreground))] shadow-sm' : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'}`}
          >
            {tab === 'overview' ? 'Přehled' : tab === 'visits' ? 'Návštěvy' : tab === 'incidents' ? 'Incidenty' : 'Fotografie'}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="grid lg:grid-cols-2 gap-5">
          <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-5 space-y-3">
            <h3 className="font-semibold text-[hsl(var(--foreground))] mb-3">Základní informace</h3>
            {[
              ['Typ zařízení', location.locationType],
              ['Adresa', location.address],
              ['Město', location.city],
              ['GPS', location.lat && location.lng ? `${location.lat}, ${location.lng}` : null],
              ['Otevírací hodiny', location.openingHours],
              ['Příští návštěva', location.nextVisitAt ? new Date(location.nextVisitAt).toLocaleString('cs-CZ') : null],
            ].map(([label, value]) => value ? (
              <div key={label as string} className="flex justify-between text-sm">
                <span className="text-[hsl(var(--muted-foreground))]">{label}</span>
                <span className="text-[hsl(var(--foreground))] text-right max-w-xs">{value}</span>
              </div>
            ) : null)}
          </div>

          <div className="space-y-4">
            {location.accessInstructions && (
              <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-5">
                <h4 className="text-sm font-semibold text-[hsl(var(--foreground))] mb-2">Přístupové instrukce</h4>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">{location.accessInstructions}</p>
              </div>
            )}
            {location.internalNotes && (
              <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-5">
                <h4 className="text-sm font-semibold text-yellow-400 mb-2">⚠ Interní poznámky</h4>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">{location.internalNotes}</p>
              </div>
            )}
            {location.publicNotes && (
              <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-5">
                <h4 className="text-sm font-semibold text-[hsl(var(--foreground))] mb-2">Veřejné poznámky</h4>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">{location.publicNotes}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'visits' && (
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl overflow-hidden">
          {!visits || visits.length === 0 ? (
            <div className="p-10 text-center text-[hsl(var(--muted-foreground))]">Žádné návštěvy</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-[hsl(var(--border))]">
                  {['Číslo', 'Plánováno', 'Řidič', 'Stav', 'Trvání', ''].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[hsl(var(--border))]">
                {visits.map((visit) => (
                  <tr key={visit._id} className="hover:bg-[hsl(var(--muted))]/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-[hsl(var(--primary))]">{visit.visitNumber}</td>
                    <td className="px-4 py-3 text-sm text-[hsl(var(--foreground))]">
                      {new Date(visit.scheduledAt).toLocaleString('cs-CZ', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="px-4 py-3 text-sm text-[hsl(var(--muted-foreground))]">
                      {visit.driverId ? '—' : 'Nepřiřazeno'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${VISIT_STATUS_COLOR[visit.status]}`}>
                        {VISIT_STATUS_LABEL[visit.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-[hsl(var(--muted-foreground))]">
                      {visit.startedAt && visit.completedAt
                        ? `${Math.round((visit.completedAt - visit.startedAt) / 60000)} min`
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to="/vending/navstevy/$visitId"
                        params={{ visitId: visit._id }}
                        search={{ locationId: undefined }}
                        className="text-xs text-[hsl(var(--primary))] hover:underline"
                      >
                        Detail →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'incidents' && (
        <div className="space-y-3">
          {!incidents || incidents.length === 0 ? (
            <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-10 text-center text-[hsl(var(--muted-foreground))]">
              Žádné incidenty
            </div>
          ) : incidents.map((incident) => (
            <div key={incident._id} className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded ${incident.severity === 'high' ? 'bg-red-500/15 text-red-400' : incident.severity === 'medium' ? 'bg-yellow-500/15 text-yellow-400' : 'bg-blue-500/15 text-blue-400'}`}>
                      {incident.severity === 'high' ? 'Vysoká' : incident.severity === 'medium' ? 'Střední' : 'Nízká'}
                    </span>
                    <span className="font-medium text-sm text-[hsl(var(--foreground))]">
                      {INCIDENT_TYPE_LABEL[incident.type] ?? incident.type}
                    </span>
                  </div>
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">{incident.description}</p>
                </div>
                <span className={`shrink-0 text-xs px-2 py-0.5 rounded ${incident.status === 'resolved' ? 'bg-[hsl(var(--success))]/15 text-[hsl(var(--success))]' : 'bg-[hsl(var(--destructive))]/15 text-[hsl(var(--destructive))]'}`}>
                  {incident.status === 'resolved' ? 'Vyřešeno' : incident.status === 'in_progress' ? 'Řeší se' : 'Otevřeno'}
                </span>
              </div>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-2">
                {new Date(incident.createdAt).toLocaleString('cs-CZ')}
              </p>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'photos' && (
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-8 text-center text-[hsl(var(--muted-foreground))]">
          Fotografie jsou dostupné v detailu každé návštěvy
        </div>
      )}
    </AppShell>
  )
}
