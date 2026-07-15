import { createFileRoute, Link, useSearch } from '@tanstack/react-router'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { AppShell, PageHeader } from '@/components/AppShell'
import { vendingNav } from './vending'
import { useState } from 'react'
import type { Id } from '../../convex/_generated/dataModel'
import { optimizeRoute } from '@/lib/routeOptimizer'

export const Route = createFileRoute('/vending/navstevy')({
  validateSearch: (s: Record<string, unknown>) => ({ locationId: s.locationId as string | undefined }),
  component: VendingNavstevyPage,
})

const VISIT_STATUS_COLOR: Record<string, string> = {
  scheduled: 'bg-yellow-500/15 text-yellow-400',
  assigned: 'bg-blue-500/15 text-blue-400',
  accepted: 'bg-blue-500/15 text-blue-300',
  en_route: 'bg-[hsl(var(--info))]/15 text-[hsl(var(--info))]',
  in_progress: 'bg-[hsl(var(--info))]/15 text-[hsl(var(--info))]',
  completed: 'bg-[hsl(var(--success))]/15 text-[hsl(var(--success))]',
  cancelled: 'bg-[hsl(var(--muted))]/50 text-[hsl(var(--muted-foreground))]',
  incident: 'bg-[hsl(var(--destructive))]/15 text-[hsl(var(--destructive))]',
}

const VISIT_STATUS_LABEL: Record<string, string> = {
  scheduled: 'Plánováno', assigned: 'Přiřazeno', accepted: 'Přijato',
  en_route: 'Na cestě', in_progress: 'Probíhá', completed: 'Dokončeno',
  cancelled: 'Zrušeno', incident: 'Incident',
}

function VisitForm({ onSave, onCancel, locations, drivers, templates, defaultLocationId }: {
  onSave: (data: any) => Promise<void>
  onCancel: () => void
  locations: any[]
  drivers: any[]
  templates: any[]
  defaultLocationId?: string
}) {
  const [form, setForm] = useState({
    locationId: defaultLocationId ?? '',
    driverId: '',
    checklistTemplateId: '',
    scheduledAt: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
    estimatedDuration: '60',
    dispatcherNotes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.locationId) { setError('Vyberte lokaci'); return }
    setSaving(true)
    setError('')
    try {
      await onSave({
        locationId: form.locationId as Id<'serviceLocations'>,
        driverId: form.driverId ? form.driverId as Id<'users'> : undefined,
        checklistTemplateId: form.checklistTemplateId ? form.checklistTemplateId as Id<'visitChecklistTemplates'> : undefined,
        scheduledAt: new Date(form.scheduledAt).getTime(),
        estimatedDuration: form.estimatedDuration ? parseInt(form.estimatedDuration) : undefined,
        dispatcherNotes: form.dispatcherNotes || undefined,
      })
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const inputCls = "w-full px-3 py-2 bg-[hsl(var(--input))] border border-[hsl(var(--border))] rounded-lg text-[hsl(var(--foreground))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
  const labelCls = "block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 uppercase tracking-wide"

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="bg-[hsl(var(--destructive))]/15 border border-[hsl(var(--destructive))]/30 rounded-lg px-4 py-3 text-sm text-[hsl(var(--destructive))]">{error}</div>}

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className={labelCls}>Lokace *</label>
          <select className={inputCls} value={form.locationId} onChange={(e) => set('locationId', e.target.value)} required>
            <option value="">— Vyberte lokaci —</option>
            {locations.map((l) => <option key={l._id} value={l._id}>{l.locationCode} · {l.name}</option>)}
          </select>
        </div>

        <div>
          <label className={labelCls}>Řidič</label>
          <select className={inputCls} value={form.driverId} onChange={(e) => set('driverId', e.target.value)}>
            <option value="">— Nepřiřazeno —</option>
            {drivers.map((d) => <option key={d._id} value={d._id}>{d.name ?? d.email}</option>)}
          </select>
        </div>

        <div>
          <label className={labelCls}>Šablona checklistu</label>
          <select className={inputCls} value={form.checklistTemplateId} onChange={(e) => set('checklistTemplateId', e.target.value)}>
            <option value="">— Bez šablony —</option>
            {templates.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
          </select>
        </div>

        <div>
          <label className={labelCls}>Datum a čas *</label>
          <input type="datetime-local" className={inputCls} value={form.scheduledAt} onChange={(e) => set('scheduledAt', e.target.value)} required />
        </div>

        <div>
          <label className={labelCls}>Odhad trvání (min)</label>
          <input type="number" className={inputCls} value={form.estimatedDuration} onChange={(e) => set('estimatedDuration', e.target.value)} min="5" max="480" />
        </div>

        <div className="sm:col-span-2">
          <label className={labelCls}>Poznámky dispečera</label>
          <textarea className={inputCls} rows={2} value={form.dispatcherNotes} onChange={(e) => set('dispatcherNotes', e.target.value)} placeholder="Instrukce pro řidiče…" />
        </div>
      </div>

      <div className="flex gap-3">
        <button type="submit" disabled={saving} className="flex-1 sm:flex-none px-6 py-2 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] rounded-lg font-semibold text-sm disabled:opacity-50">
          {saving ? 'Ukládám…' : 'Naplánovat'}
        </button>
        <button type="button" onClick={onCancel} className="px-6 py-2 bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] rounded-lg text-sm">
          Zrušit
        </button>
      </div>
    </form>
  )
}

function exportVisitsCsv(
  visits: any[],
  locationMap: Record<string, any>,
  userMap: Record<string, any>
) {
  const rows = [
    ['Číslo návštěvy', 'Lokace', 'Kód lokace', 'Plánováno', 'Řidič', 'Stav', 'Zahájeno', 'Dokončeno', 'Trvání (min)'],
  ]
  for (const v of visits) {
    const loc = locationMap[v.locationId]
    const driver = v.driverId ? userMap[v.driverId] : null
    const duration =
      v.startedAt && v.completedAt ? Math.round((v.completedAt - v.startedAt) / 60000).toString() : ''
    rows.push([
      v.visitNumber,
      loc?.name ?? '',
      loc?.locationCode ?? '',
      new Date(v.scheduledAt).toLocaleString('cs-CZ'),
      driver ? (driver.name ?? driver.email) : 'Nepřiřazeno',
      VISIT_STATUS_LABEL[v.status] ?? v.status,
      v.startedAt ? new Date(v.startedAt).toLocaleString('cs-CZ') : '',
      v.completedAt ? new Date(v.completedAt).toLocaleString('cs-CZ') : '',
      duration,
    ])
  }
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `navstevy_${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  console.log(`CSV export: ${rows.length - 1} návštěv`)
}

function VendingNavstevyPage() {
  const search = useSearch({ from: '/vending/navstevy' })
  const visits = useQuery(api.vending.listVisits, {})
  const locations = useQuery(api.vending.listLocations, {})
  const regularDrivers = useQuery(api.users.listUsersByRole, { role: 'driver' })
  const serviceDrivers = useQuery(api.users.listUsersByRole, { role: 'service_driver' })
  const templates = useQuery(api.vending.listChecklistTemplates)
  const createVisit = useMutation(api.vending.createVisit)
  const cancelVisit = useMutation(api.vending.cancelVisit)

  const [showForm, setShowForm] = useState(!!search.locationId)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterDate, setFilterDate] = useState('')
  const [cancelConfirm, setCancelConfirm] = useState<string | null>(null)
  const [showRouteOpt, setShowRouteOpt] = useState(false)
  const [routeDate, setRouteDate] = useState(new Date().toISOString().slice(0, 10))
  const [routeDriverId, setRouteDriverId] = useState('')
  const [optimizedRoute, setOptimizedRoute] = useState<any[] | null>(null)

  const drivers = [...(regularDrivers ?? []), ...(serviceDrivers ?? [])]

  const filtered = (visits ?? []).filter((v) => {
    if (filterStatus && v.status !== filterStatus) return false
    if (filterDate) {
      const d = new Date(filterDate)
      const start = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
      const end = start + 86400000
      if (v.scheduledAt < start || v.scheduledAt >= end) return false
    }
    return true
  })

  const locationMap = Object.fromEntries((locations ?? []).map((l) => [l._id, l]))
  const userMap = Object.fromEntries(drivers.map((u) => [u._id, u]))

  const handleCreate = async (data: any) => {
    await createVisit(data)
    setShowForm(false)
  }

  const handleOptimize = () => {
    const d = new Date(routeDate)
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
    const end = start + 86400000
    const dayVisits = (visits ?? []).filter((v) => {
      if (v.scheduledAt < start || v.scheduledAt >= end) return false
      if (routeDriverId && v.driverId !== routeDriverId) return false
      if (v.status === 'cancelled') return false
      return true
    })
    if (dayVisits.length === 0) {
      setOptimizedRoute([])
      return
    }
    const points = dayVisits.map((v) => {
      const loc = locationMap[v.locationId]
      return {
        address: loc?.address ?? '',
        lat: loc?.lat,
        lng: loc?.lng,
        label: loc?.name ?? v.visitNumber,
        notes: v.visitNumber,
      }
    })
    const optimized = optimizeRoute(points)
    // Map back to visit info
    const result = optimized.map((pt, i) => {
      const origVisit = dayVisits.find((v) => {
        const loc = locationMap[v.locationId]
        return (loc?.address ?? '') === pt.address && (loc?.name ?? v.visitNumber) === pt.label
      })
      return { ...pt, visit: origVisit, order: i + 1 }
    })
    setOptimizedRoute(result)
    console.log('Trasa optimalizována:', result.length, 'zastávek')
  }

  return (
    <AppShell navItems={vendingNav} title="Návštěvy" primaryCount={5}>
      <PageHeader
        title="Servisní návštěvy"
        subtitle={`${filtered.length} záznamů`}
        action={
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] rounded-lg font-semibold text-sm hover:opacity-90"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Naplánovat návštěvu
          </button>
        }
      />

      {showForm && (
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--primary))]/30 rounded-xl p-6 mb-5">
          <h3 className="font-semibold mb-4">Nová návštěva</h3>
          <VisitForm
            onSave={handleCreate}
            onCancel={() => setShowForm(false)}
            locations={locations ?? []}
            drivers={drivers}
            templates={templates ?? []}
            defaultLocationId={search.locationId}
          />
        </div>
      )}

      {/* Filters + actions */}
      <div className="flex flex-wrap gap-3 mb-5">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 bg-[hsl(var(--input))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))]"
        >
          <option value="">Všechny stavy</option>
          {Object.entries(VISIT_STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <input
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          className="px-3 py-2 bg-[hsl(var(--input))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))]"
        />
        {(filterStatus || filterDate) && (
          <button onClick={() => { setFilterStatus(''); setFilterDate('') }} className="text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">
            Zrušit filtry ✕
          </button>
        )}
        <div className="ml-auto flex gap-2">
          <button
            onClick={() => { setShowRouteOpt(!showRouteOpt); setOptimizedRoute(null) }}
            className="flex items-center gap-1.5 px-3 py-2 bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] rounded-lg text-sm hover:opacity-90"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            Optimalizovat trasu
          </button>
          {visits && filtered.length > 0 && (
            <button
              onClick={() => exportVisitsCsv(filtered, locationMap, userMap)}
              className="flex items-center gap-1.5 px-3 py-2 bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] rounded-lg text-sm hover:opacity-90"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Exportovat CSV ({filtered.length})
            </button>
          )}
        </div>
      </div>

      {/* Route optimizer panel */}
      {showRouteOpt && (
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--primary))]/30 rounded-xl p-5 mb-5">
          <h3 className="font-semibold text-[hsl(var(--foreground))] mb-4 flex items-center gap-2">
            <svg className="w-4 h-4 text-[hsl(var(--primary))]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            Optimalizace trasy
          </h3>
          <div className="flex flex-wrap gap-3 mb-4">
            <div>
              <label className="block text-xs text-[hsl(var(--muted-foreground))] mb-1 uppercase tracking-wide">Datum</label>
              <input
                type="date"
                value={routeDate}
                onChange={(e) => { setRouteDate(e.target.value); setOptimizedRoute(null) }}
                className="px-3 py-2 bg-[hsl(var(--input))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))]"
              />
            </div>
            <div>
              <label className="block text-xs text-[hsl(var(--muted-foreground))] mb-1 uppercase tracking-wide">Řidič (volitelný)</label>
              <select
                value={routeDriverId}
                onChange={(e) => { setRouteDriverId(e.target.value); setOptimizedRoute(null) }}
                className="px-3 py-2 bg-[hsl(var(--input))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))]"
              >
                <option value="">— Všichni řidiči —</option>
                {drivers.map((d) => <option key={d._id} value={d._id}>{d.name ?? d.email}</option>)}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={handleOptimize}
                className="px-5 py-2 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] rounded-lg text-sm font-semibold hover:opacity-90"
              >
                Spočítat optimální trasu
              </button>
            </div>
          </div>

          {optimizedRoute !== null && (
            optimizedRoute.length === 0 ? (
              <p className="text-sm text-[hsl(var(--muted-foreground))]">Žádné návštěvy pro vybraný den/řidiče.</p>
            ) : (
              <div>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mb-3">
                  Optimalizovaná trasa · {optimizedRoute.length} zastávek
                </p>
                <div className="space-y-2">
                  {optimizedRoute.map((stop, i) => {
                    const loc = stop.visit ? locationMap[stop.visit.locationId] : null
                    const driver = stop.visit?.driverId ? userMap[stop.visit.driverId] : null
                    return (
                      <div key={i} className="flex items-center gap-3 bg-[hsl(var(--muted))]/30 rounded-lg px-4 py-3">
                        <span className="w-7 h-7 rounded-full bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] flex items-center justify-center text-xs font-bold shrink-0">
                          {stop.order}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-[hsl(var(--foreground))] truncate">{stop.label}</p>
                          {stop.address && <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">{stop.address}</p>}
                        </div>
                        <div className="text-right shrink-0">
                          {stop.visit && (
                            <>
                              <p className="text-xs font-mono text-[hsl(var(--primary))]">{stop.visit.visitNumber}</p>
                              {driver && <p className="text-xs text-[hsl(var(--muted-foreground))]">{driver.name ?? driver.email}</p>}
                            </>
                          )}
                          {loc?.lat && loc?.lng && (
                            <a
                              href={`https://www.google.com/maps/dir/?api=1&destination=${loc.lat},${loc.lng}`}
                              target="_blank" rel="noopener noreferrer"
                              className="text-xs text-[hsl(var(--primary))] hover:underline"
                            >
                              Navigovat
                            </a>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          )}
        </div>
      )}

      {/* Visits table */}
      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl overflow-hidden">
        {!visits ? (
          <div className="p-8 text-center text-[hsl(var(--muted-foreground))]">Načítám…</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-3">📅</div>
            <p className="text-[hsl(var(--muted-foreground))]">Žádné návštěvy nenalezeny</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[hsl(var(--border))]">
                  {['Číslo', 'Lokace', 'Plánováno', 'Řidič', 'Stav', 'Trvání', ''].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[hsl(var(--border))]">
                {filtered.map((visit) => {
                  const loc = locationMap[visit.locationId]
                  const driver = visit.driverId ? userMap[visit.driverId] : null
                  const duration = visit.startedAt && visit.completedAt
                    ? Math.round((visit.completedAt - visit.startedAt) / 60000)
                    : null
                  return (
                    <tr key={visit._id} className="hover:bg-[hsl(var(--muted))]/50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-[hsl(var(--primary))]">{visit.visitNumber}</span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <p className="font-medium text-[hsl(var(--foreground))]">{loc?.name ?? '—'}</p>
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">{loc?.locationCode}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-[hsl(var(--foreground))]">
                        {new Date(visit.scheduledAt).toLocaleString('cs-CZ', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="px-4 py-3 text-sm text-[hsl(var(--muted-foreground))]">
                        {driver ? driver.name ?? driver.email : <span className="text-xs italic">Nepřiřazeno</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${VISIT_STATUS_COLOR[visit.status]}`}>
                          {VISIT_STATUS_LABEL[visit.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-[hsl(var(--muted-foreground))]">
                        {duration !== null ? `${duration} min` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Link
                            to="/vending/navstevy/$visitId"
                            params={{ visitId: visit._id }}
                            search={{ locationId: undefined }}
                            className="text-xs text-[hsl(var(--primary))] hover:underline"
                          >
                            Detail
                          </Link>
                          {!['completed', 'cancelled'].includes(visit.status) && (
                            cancelConfirm === visit._id ? (
                              <div className="flex gap-1">
                                <button onClick={() => { cancelVisit({ visitId: visit._id as Id<'serviceVisits'> }); setCancelConfirm(null) }} className="text-xs text-[hsl(var(--destructive))] font-semibold">Zrušit návštěvu</button>
                                <button onClick={() => setCancelConfirm(null)} className="text-xs text-[hsl(var(--muted-foreground))]">Ne</button>
                              </div>
                            ) : (
                              <button onClick={() => setCancelConfirm(visit._id)} className="text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))]">
                                Zrušit
                              </button>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  )
}
