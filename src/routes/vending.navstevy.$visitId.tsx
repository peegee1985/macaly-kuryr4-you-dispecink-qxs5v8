import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { AppShell } from '@/components/AppShell'
import { vendingNav } from './vending'
import { useState, useCallback } from 'react'
import type { Id } from '../../convex/_generated/dataModel'
import { generateVendingReportPdf } from '@/lib/vendingReportPdf'

export const Route = createFileRoute('/vending/navstevy/$visitId')({
  component: VisitDetailPage,
})

const VISIT_STATUS_COLOR: Record<string, string> = {
  scheduled: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  assigned: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  accepted: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  en_route: 'bg-[hsl(var(--info))]/15 text-[hsl(var(--info))] border-[hsl(var(--info))]/30',
  in_progress: 'bg-[hsl(var(--info))]/15 text-[hsl(var(--info))] border-[hsl(var(--info))]/30',
  completed: 'bg-[hsl(var(--success))]/15 text-[hsl(var(--success))] border-[hsl(var(--success))]/30',
  cancelled: 'bg-[hsl(var(--muted))]/50 text-[hsl(var(--muted-foreground))] border-[hsl(var(--border))]',
  incident: 'bg-[hsl(var(--destructive))]/15 text-[hsl(var(--destructive))] border-[hsl(var(--destructive))]/30',
}

const VISIT_STATUS_LABEL: Record<string, string> = {
  scheduled: 'Plánováno', assigned: 'Přiřazeno', accepted: 'Přijato',
  en_route: 'Na cestě', in_progress: 'Probíhá', completed: 'Dokončeno',
  cancelled: 'Zrušeno', incident: 'Incident',
}

const TIMELINE_ICONS: Record<string, string> = {
  created: '📋', assigned: '👤', accepted: '✅', en_route: '🚗',
  arrived: '📍', completed: '🏁', cancelled: '❌', incident: '⚠️',
}

const INCIDENT_TYPE_LABEL: Record<string, string> = {
  machine_locked: 'Stroj zamčen', pin_incorrect: 'Nesprávný PIN',
  machine_damaged: 'Poškozený stroj', broken_display: 'Poškozený displej',
  no_products: 'Chybí produkty', wrong_products: 'Špatné produkty',
  power_failure: 'Výpadek proudu', vandalism: 'Vandalismus', other: 'Jiný',
}

function VisitDetailPage() {
  const { visitId } = Route.useParams()
  const visit = useQuery(api.vending.getVisit, { visitId: visitId as Id<'serviceVisits'> })
  const resolveIncident = useMutation(api.vending.resolveIncident)
  const updateVisit = useMutation(api.vending.updateVisit)
  const driversRegular = useQuery(api.users.listUsersByRole, { role: 'driver' })
  const driversService = useQuery(api.users.listUsersByRole, { role: 'service_driver' })

  const [resolvingId, setResolvingId] = useState<string | null>(null)
  const [resolveNote, setResolveNote] = useState('')
  const [assigningDriver, setAssigningDriver] = useState(false)
  const [selectedDriver, setSelectedDriver] = useState('')
  const [saving, setSaving] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'checklist' | 'photos' | 'incidents' | 'timeline'>('overview')

  const handleDownloadPdf = useCallback(async () => {
    if (!visit) return
    setPdfLoading(true)
    try {
      await generateVendingReportPdf({
        visitNumber: visit.visitNumber,
        status: visit.status,
        scheduledAt: visit.scheduledAt,
        arrivedAt: visit.arrivedAt,
        startedAt: visit.startedAt,
        completedAt: visit.completedAt,
        driverNotes: visit.driverNotes,
        dispatcherNotes: visit.dispatcherNotes,
        signatureUrl: visit.signatureUrl,
        location: visit.location as any,
        driver: visit.driver as any,
        checklist: visit.checklist as any,
        photos: (visit.photos as any[])?.map((p: any) => ({ category: p.category, caption: p.caption, url: p.url })),
        incidents: visit.incidents as any[],
      })
    } catch (e) {
      console.error('PDF error:', e)
    } finally {
      setPdfLoading(false)
    }
  }, [visit])

  if (!visit) {
    return (
      <AppShell navItems={vendingNav} title="Návštěva" primaryCount={5}>
        <div className="p-8 text-center text-[hsl(var(--muted-foreground))]">
          {visit === null ? 'Návštěva nenalezena' : 'Načítám…'}
        </div>
      </AppShell>
    )
  }

  const drivers = [...(driversRegular ?? []), ...(driversService ?? [])]

  const duration = visit.startedAt && visit.completedAt
    ? Math.round((visit.completedAt - visit.startedAt) / 60000)
    : null

  const handleResolve = async (incidentId: string) => {
    if (!resolveNote.trim()) return
    setSaving(true)
    try {
      await resolveIncident({ incidentId: incidentId as Id<'visitIncidents'>, resolutionNote: resolveNote })
      setResolvingId(null)
      setResolveNote('')
    } finally {
      setSaving(false)
    }
  }

  const handleAssignDriver = async () => {
    if (!selectedDriver) return
    setSaving(true)
    try {
      await updateVisit({ visitId: visitId as Id<'serviceVisits'>, driverId: selectedDriver as Id<'users'>, status: 'assigned' })
      setAssigningDriver(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppShell navItems={vendingNav} title={visit.visitNumber} primaryCount={5}>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))] mb-4">
        <Link to="/vending/navstevy" search={{ locationId: undefined }} className="hover:text-[hsl(var(--primary))]">Návštěvy</Link>
        <span>/</span>
        <span className="text-[hsl(var(--foreground))]">{visit.visitNumber}</span>
      </div>

      {/* Header */}
      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-6 mb-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl font-bold text-[hsl(var(--foreground))]">{visit.visitNumber}</h1>
              <span className={`px-2 py-0.5 rounded-full border text-xs font-medium ${VISIT_STATUS_COLOR[visit.status]}`}>
                {VISIT_STATUS_LABEL[visit.status]}
              </span>
            </div>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              {visit.location?.name ?? '—'}
              {visit.location?.locationCode && <span className="ml-2 font-mono text-xs text-[hsl(var(--primary))]">{visit.location.locationCode}</span>}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              disabled={pdfLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] rounded-lg text-sm hover:opacity-90 disabled:opacity-50"
            >
              {pdfLoading ? (
                <span className="animate-spin w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              )}
              PDF Report
            </button>
          </div>

          {!['completed', 'cancelled'].includes(visit.status) && (
            <div className="flex items-center gap-2">
              {assigningDriver ? (
                <div className="flex items-center gap-2">
                  <select
                    value={selectedDriver}
                    onChange={(e) => setSelectedDriver(e.target.value)}
                    className="px-3 py-1.5 text-sm bg-[hsl(var(--input))] border border-[hsl(var(--border))] rounded-lg text-[hsl(var(--foreground))]"
                  >
                    <option value="">— Řidič —</option>
                    {drivers.map((d) => <option key={d._id} value={d._id}>{d.name ?? d.email}</option>)}
                  </select>
                  <button onClick={handleAssignDriver} disabled={saving || !selectedDriver} className="px-3 py-1.5 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] rounded-lg text-sm disabled:opacity-50">
                    Přiřadit
                  </button>
                  <button onClick={() => setAssigningDriver(false)} className="px-3 py-1.5 bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] rounded-lg text-sm">
                    Zrušit
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setAssigningDriver(true)}
                  className="px-3 py-1.5 bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] rounded-lg text-sm"
                >
                  {visit.driver ? 'Změnit řidiče' : 'Přiřadit řidiče'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 pt-5 border-t border-[hsl(var(--border))]">
          <div>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">Plánováno</p>
            <p className="text-sm font-medium text-[hsl(var(--foreground))]">
              {new Date(visit.scheduledAt).toLocaleString('cs-CZ', { dateStyle: 'short', timeStyle: 'short' })}
            </p>
          </div>
          <div>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">Příjezd</p>
            <p className="text-sm font-medium text-[hsl(var(--foreground))]">
              {visit.arrivedAt ? new Date(visit.arrivedAt).toLocaleTimeString('cs-CZ', { timeStyle: 'short' }) : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">Dokončeno</p>
            <p className="text-sm font-medium text-[hsl(var(--foreground))]">
              {visit.completedAt ? new Date(visit.completedAt).toLocaleTimeString('cs-CZ', { timeStyle: 'short' }) : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">Trvání</p>
            <p className="text-sm font-medium text-[hsl(var(--foreground))]">
              {duration !== null ? `${duration} min` : '—'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4 pt-4 border-t border-[hsl(var(--border))]">
          <div>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">Řidič</p>
            <p className="text-sm font-medium text-[hsl(var(--foreground))]">
              {visit.driver ? visit.driver.name ?? visit.driver.email : 'Nepřiřazeno'}
            </p>
          </div>
          <div>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">Fotografie</p>
            <p className="text-sm font-medium text-[hsl(var(--foreground))]">{visit.photos?.length ?? 0}</p>
          </div>
          <div>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">Incidenty</p>
            <p className={`text-sm font-medium ${visit.incidents?.length ? 'text-[hsl(var(--destructive))]' : 'text-[hsl(var(--foreground))]'}`}>
              {visit.incidents?.length ?? 0}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-[hsl(var(--muted))] p-1 rounded-lg w-fit overflow-x-auto">
        {(['overview', 'checklist', 'photos', 'incidents', 'timeline'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${activeTab === tab ? 'bg-[hsl(var(--card))] text-[hsl(var(--foreground))] shadow-sm' : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'}`}
          >
            {tab === 'overview' ? 'Přehled' : tab === 'checklist' ? 'Checklist' : tab === 'photos' ? `Foto (${visit.photos?.length ?? 0})` : tab === 'incidents' ? `Incidenty (${visit.incidents?.length ?? 0})` : 'Časová osa'}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="grid lg:grid-cols-2 gap-5">
          <div className="space-y-4">
            {visit.dispatcherNotes && (
              <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-5">
                <h4 className="text-sm font-semibold text-[hsl(var(--foreground))] mb-2">Poznámky dispečera</h4>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">{visit.dispatcherNotes}</p>
              </div>
            )}
            {visit.driverNotes && (
              <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-5">
                <h4 className="text-sm font-semibold text-[hsl(var(--foreground))] mb-2">Poznámky řidiče</h4>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">{visit.driverNotes}</p>
              </div>
            )}
            {visit.signatureUrl && (
              <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-5">
                <h4 className="text-sm font-semibold text-[hsl(var(--foreground))] mb-3">Podpis zákazníka</h4>
                <img src={visit.signatureUrl} alt="Podpis" className="max-h-24 bg-white rounded" />
              </div>
            )}
          </div>
          <div>
            {visit.location && (
              <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-5">
                <h4 className="text-sm font-semibold text-[hsl(var(--foreground))] mb-3">Lokace</h4>
                <div className="space-y-2 text-sm">
                  {[
                    ['Adresa', visit.location.address],
                    ['Otevírací hodiny', visit.location.openingHours],
                    ['Instrukce', visit.location.accessInstructions],
                  ].map(([l, v]) => v ? (
                    <div key={l as string} className="flex gap-2">
                      <span className="text-[hsl(var(--muted-foreground))] w-24 shrink-0">{l}</span>
                      <span className="text-[hsl(var(--foreground))]">{v}</span>
                    </div>
                  ) : null)}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'checklist' && (
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-6">
          {!visit.checklist ? (
            <p className="text-[hsl(var(--muted-foreground))] text-center">Žádný checklist pro tuto návštěvu</p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Výsledky checklistu</h3>
                <span className="text-sm text-[hsl(var(--muted-foreground))]">
                  {visit.checklist.items.filter((i) => i.completed).length} / {visit.checklist.items.length} dokončeno
                </span>
              </div>
              {visit.checklist.items.map((item, idx) => (
                <div key={idx} className={`flex items-start gap-3 p-3 rounded-lg ${item.completed ? 'bg-[hsl(var(--success))]/10' : 'bg-[hsl(var(--muted))]'}`}>
                  <div className={`w-5 h-5 rounded shrink-0 mt-0.5 flex items-center justify-center ${item.completed ? 'bg-[hsl(var(--success))] text-white' : 'bg-[hsl(var(--border))]'}`}>
                    {item.completed && <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-[hsl(var(--foreground))]">{item.text}</p>
                    {item.textValue && <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">{item.textValue}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'photos' && (
        <div>
          {!visit.photos || visit.photos.length === 0 ? (
            <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-10 text-center text-[hsl(var(--muted-foreground))]">
              Žádné fotografie
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {visit.photos.map((photo) => (
                <div key={photo._id} className="group relative bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl overflow-hidden">
                  <img src={photo.url ?? ''} alt={photo.caption ?? photo.category} className="w-full aspect-square object-cover" />
                  <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent">
                    <span className="text-xs text-white font-medium">
                      {photo.category === 'before' ? 'Před' : photo.category === 'after' ? 'Po' : photo.category === 'damage' ? 'Škoda' : 'Ostatní'}
                    </span>
                    {photo.caption && <p className="text-xs text-white/70 truncate">{photo.caption}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'incidents' && (
        <div className="space-y-4">
          {!visit.incidents || visit.incidents.length === 0 ? (
            <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-10 text-center">
              <div className="text-3xl mb-2">✅</div>
              <p className="text-[hsl(var(--muted-foreground))]">Žádné incidenty</p>
            </div>
          ) : visit.incidents.map((incident) => (
            <div key={incident._id} className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-5">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded ${incident.severity === 'high' ? 'bg-red-500/15 text-red-400' : incident.severity === 'medium' ? 'bg-yellow-500/15 text-yellow-400' : 'bg-blue-500/15 text-blue-400'}`}>
                      {incident.severity === 'high' ? 'Vysoká priorita' : incident.severity === 'medium' ? 'Střední' : 'Nízká'}
                    </span>
                    <span className="font-medium text-[hsl(var(--foreground))]">{INCIDENT_TYPE_LABEL[incident.type]}</span>
                  </div>
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">{incident.description}</p>
                </div>
                <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full ${incident.status === 'resolved' ? 'bg-[hsl(var(--success))]/15 text-[hsl(var(--success))]' : 'bg-[hsl(var(--destructive))]/15 text-[hsl(var(--destructive))]'}`}>
                  {incident.status === 'resolved' ? '✓ Vyřešeno' : incident.status === 'in_progress' ? 'Řeší se' : 'Otevřeno'}
                </span>
              </div>

              {incident.status === 'resolved' && incident.resolutionNote && (
                <div className="bg-[hsl(var(--success))]/10 rounded-lg p-3 text-sm text-[hsl(var(--muted-foreground))]">
                  <strong className="text-[hsl(var(--success))] text-xs">Řešení:</strong> {incident.resolutionNote}
                </div>
              )}

              {incident.status !== 'resolved' && (
                resolvingId === incident._id ? (
                  <div className="mt-3 space-y-2">
                    <textarea
                      value={resolveNote}
                      onChange={(e) => setResolveNote(e.target.value)}
                      placeholder="Popis řešení…"
                      rows={2}
                      className="w-full px-3 py-2 bg-[hsl(var(--input))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))]"
                    />
                    <div className="flex gap-2">
                      <button onClick={() => handleResolve(incident._id)} disabled={saving || !resolveNote.trim()} className="px-4 py-1.5 bg-[hsl(var(--success))] text-white rounded-lg text-sm disabled:opacity-50">
                        Označit jako vyřešeno
                      </button>
                      <button onClick={() => setResolvingId(null)} className="px-4 py-1.5 bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] rounded-lg text-sm">
                        Zrušit
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setResolvingId(incident._id)} className="mt-2 text-xs text-[hsl(var(--primary))] hover:underline">
                    Vyřešit incident →
                  </button>
                )
              )}
            </div>
          ))}
        </div>
      )}

      {activeTab === 'timeline' && (
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-6">
          {!visit.timeline || visit.timeline.length === 0 ? (
            <p className="text-center text-[hsl(var(--muted-foreground))]">Žádné záznamy</p>
          ) : (
            <div className="relative pl-8">
              <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-[hsl(var(--border))]" />
              <div className="space-y-6">
                {visit.timeline.map((event, idx) => (
                  <div key={event._id} className="relative">
                    <div className="absolute -left-8 w-6 h-6 rounded-full bg-[hsl(var(--card))] border-2 border-[hsl(var(--primary))] flex items-center justify-center text-sm">
                      {TIMELINE_ICONS[event.event] ?? '●'}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[hsl(var(--foreground))]">{event.description ?? event.event}</p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                        {new Date(event.timestamp).toLocaleString('cs-CZ', { dateStyle: 'short', timeStyle: 'medium' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </AppShell>
  )
}
