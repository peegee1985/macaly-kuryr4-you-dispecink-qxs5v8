import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { AppShell, PageHeader } from '@/components/AppShell'
import { vendingNav } from './vending'
import { useState } from 'react'
import type { Id } from '../../convex/_generated/dataModel'

export const Route = createFileRoute('/vending/incidenty')({
  component: VendingIncidentyPage,
})

const INCIDENT_TYPE_LABEL: Record<string, string> = {
  machine_locked: 'Stroj zamčen', pin_incorrect: 'Nesprávný PIN',
  machine_damaged: 'Poškozený stroj', broken_display: 'Poškozený displej',
  no_products: 'Chybí produkty', wrong_products: 'Špatné produkty',
  power_failure: 'Výpadek proudu', vandalism: 'Vandalismus', other: 'Jiný',
}

function VendingIncidentyPage() {
  const incidents = useQuery(api.vending.listIncidents, {})
  const locations = useQuery(api.vending.listLocations, {})
  const resolveIncident = useMutation(api.vending.resolveIncident)

  const [filterStatus, setFilterStatus] = useState('open')
  const [filterSeverity, setFilterSeverity] = useState('')
  const [resolvingId, setResolvingId] = useState<string | null>(null)
  const [resolveNote, setResolveNote] = useState('')
  const [saving, setSaving] = useState(false)

  const locationMap = Object.fromEntries((locations ?? []).map((l) => [l._id, l]))

  const filtered = (incidents ?? []).filter((i) => {
    if (filterStatus && i.status !== filterStatus) return false
    if (filterSeverity && i.severity !== filterSeverity) return false
    return true
  })

  const openCount = (incidents ?? []).filter((i) => i.status === 'open').length
  const highCount = (incidents ?? []).filter((i) => i.severity === 'high' && i.status === 'open').length

  const handleResolve = async (id: string) => {
    if (!resolveNote.trim()) return
    setSaving(true)
    try {
      await resolveIncident({ incidentId: id as Id<'visitIncidents'>, resolutionNote: resolveNote })
      setResolvingId(null)
      setResolveNote('')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppShell navItems={vendingNav} title="Incidenty" primaryCount={5}>
      <PageHeader
        title="Správa incidentů"
        subtitle={`${openCount} otevřených${highCount > 0 ? ` · ${highCount} vysoká priorita` : ''}`}
      />

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        {[
          { label: 'Otevřeno', count: (incidents ?? []).filter((i) => i.status === 'open').length, color: 'text-[hsl(var(--destructive))]' },
          { label: 'Řeší se', count: (incidents ?? []).filter((i) => i.status === 'in_progress').length, color: 'text-yellow-400' },
          { label: 'Vyřešeno', count: (incidents ?? []).filter((i) => i.status === 'resolved').length, color: 'text-[hsl(var(--success))]' },
        ].map((s) => (
          <div key={s.label} className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 bg-[hsl(var(--input))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))]"
        >
          <option value="">Všechny stavy</option>
          <option value="open">Otevřené</option>
          <option value="in_progress">Řeší se</option>
          <option value="resolved">Vyřešené</option>
        </select>
        <select
          value={filterSeverity}
          onChange={(e) => setFilterSeverity(e.target.value)}
          className="px-3 py-2 bg-[hsl(var(--input))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))]"
        >
          <option value="">Všechny priority</option>
          <option value="high">Vysoká</option>
          <option value="medium">Střední</option>
          <option value="low">Nízká</option>
        </select>
      </div>

      {/* Incidents list */}
      <div className="space-y-4">
        {!incidents ? (
          <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-8 text-center text-[hsl(var(--muted-foreground))]">Načítám…</div>
        ) : filtered.length === 0 ? (
          <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-12 text-center">
            <div className="text-4xl mb-3">✅</div>
            <p className="text-[hsl(var(--muted-foreground))]">Žádné incidenty odpovídající filtru</p>
          </div>
        ) : filtered.map((incident) => {
          const loc = locationMap[incident.locationId]
          return (
            <div
              key={incident._id}
              className={`bg-[hsl(var(--card))] border rounded-xl p-5 ${incident.severity === 'high' && incident.status === 'open' ? 'border-[hsl(var(--destructive))]/40' : 'border-[hsl(var(--border))]'}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${incident.severity === 'high' ? 'bg-red-500/20 text-red-400' : incident.severity === 'medium' ? 'bg-yellow-500/15 text-yellow-400' : 'bg-blue-500/15 text-blue-400'}`}>
                      {incident.severity === 'high' ? '🔴 Vysoká' : incident.severity === 'medium' ? '🟡 Střední' : '🔵 Nízká'}
                    </span>
                    <span className="font-semibold text-[hsl(var(--foreground))]">{INCIDENT_TYPE_LABEL[incident.type] ?? incident.type}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${incident.status === 'resolved' ? 'bg-[hsl(var(--success))]/15 text-[hsl(var(--success))]' : incident.status === 'in_progress' ? 'bg-yellow-500/15 text-yellow-400' : 'bg-[hsl(var(--destructive))]/15 text-[hsl(var(--destructive))]'}`}>
                      {incident.status === 'resolved' ? 'Vyřešeno' : incident.status === 'in_progress' ? 'Řeší se' : 'Otevřeno'}
                    </span>
                  </div>
                  <p className="text-sm text-[hsl(var(--muted-foreground))] mb-2">{incident.description}</p>
                  <div className="flex flex-wrap gap-3 text-xs text-[hsl(var(--muted-foreground))]">
                    {loc && (
                      <Link
                        to="/vending/lokace/$locationId"
                        params={{ locationId: incident.locationId }}
                        className="hover:text-[hsl(var(--primary))]"
                      >
                        📍 {loc.name}
                      </Link>
                    )}
                    <Link
                      to="/vending/navstevy/$visitId"
                      params={{ visitId: incident.visitId }}
                      search={{ locationId: undefined }}
                      className="hover:text-[hsl(var(--primary))]"
                    >
                      🔗 Návštěva
                    </Link>
                    <span>{new Date(incident.createdAt).toLocaleString('cs-CZ', { dateStyle: 'short', timeStyle: 'short' })}</span>
                  </div>
                </div>

                {incident.status !== 'resolved' && resolvingId !== incident._id && (
                  <button
                    onClick={() => { setResolvingId(incident._id); setResolveNote('') }}
                    className="shrink-0 px-4 py-2 bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] border border-[hsl(var(--success))]/30 rounded-lg text-sm font-medium hover:bg-[hsl(var(--success))]/20 transition-colors"
                  >
                    Vyřešit
                  </button>
                )}
              </div>

              {incident.status === 'resolved' && incident.resolutionNote && (
                <div className="mt-3 bg-[hsl(var(--success))]/10 rounded-lg p-3 text-sm">
                  <span className="text-xs font-semibold text-[hsl(var(--success))]">Řešení: </span>
                  <span className="text-[hsl(var(--muted-foreground))]">{incident.resolutionNote}</span>
                </div>
              )}

              {resolvingId === incident._id && (
                <div className="mt-4 space-y-3 border-t border-[hsl(var(--border))] pt-4">
                  <textarea
                    value={resolveNote}
                    onChange={(e) => setResolveNote(e.target.value)}
                    placeholder="Popis řešení incidentu…"
                    rows={3}
                    className="w-full px-3 py-2 bg-[hsl(var(--input))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))]"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleResolve(incident._id)}
                      disabled={saving || !resolveNote.trim()}
                      className="px-5 py-2 bg-[hsl(var(--success))] text-white rounded-lg text-sm font-medium disabled:opacity-50"
                    >
                      {saving ? 'Ukládám…' : 'Potvrdit vyřešení'}
                    </button>
                    <button onClick={() => setResolvingId(null)} className="px-4 py-2 bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] rounded-lg text-sm">
                      Zrušit
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </AppShell>
  )
}
