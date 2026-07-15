import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { useState, useRef, useCallback } from 'react'

export const Route = createFileRoute('/ridic/vending/$visitId')({
  component: DriverVisitPage,
})

const STATUS_LABEL: Record<string, string> = {
  scheduled: 'Plánováno', assigned: 'Přiřazeno', accepted: 'Přijato',
  en_route: 'Na cestě', in_progress: 'Probíhá', completed: 'Dokončeno',
  cancelled: 'Zrušeno', incident: 'Incident',
}

const STATUS_COLOR: Record<string, string> = {
  scheduled: 'text-yellow-400', assigned: 'text-blue-400', accepted: 'text-blue-300',
  en_route: 'text-[hsl(var(--info))]', in_progress: 'text-[hsl(var(--primary))]',
  completed: 'text-[hsl(var(--success))]', cancelled: 'text-[hsl(var(--muted-foreground))]',
  incident: 'text-[hsl(var(--destructive))]',
}

const INCIDENT_TYPES = [
  { value: 'machine_locked', label: 'Stroj zamčen' },
  { value: 'pin_incorrect', label: 'Chybný PIN' },
  { value: 'machine_damaged', label: 'Poškozený stroj' },
  { value: 'broken_display', label: 'Rozbité displej' },
  { value: 'no_products', label: 'Chybí produkty' },
  { value: 'wrong_products', label: 'Špatné produkty' },
  { value: 'power_failure', label: 'Výpadek proudu' },
  { value: 'vandalism', label: 'Vandalismus' },
  { value: 'other', label: 'Jiný' },
]

type Tab = 'checklist' | 'photos' | 'incident'

function DriverVisitPage() {
  const { visitId } = Route.useParams()
  const visit = useQuery(api.vending.getVisit, { visitId: visitId as Id<'serviceVisits'> })
  const navigate = useNavigate()

  const acceptVisit = useMutation(api.vending.driverAcceptVisit)
  const startNavigation = useMutation(api.vending.driverStartNavigation)
  const startVisit = useMutation(api.vending.driverStartVisit)
  const updateChecklist = useMutation(api.vending.driverUpdateChecklist)
  const completeChecklist = useMutation(api.vending.driverCompleteChecklist)
  const completeVisit = useMutation(api.vending.driverCompleteVisit)
  const addPhoto = useMutation(api.vending.addVisitPhoto)
  const generateUploadUrl = useMutation(api.vending.generateUploadUrl)
  const reportIncident = useMutation(api.vending.reportIncident)

  const [activeTab, setActiveTab] = useState<Tab>('checklist')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [driverNotes, setDriverNotes] = useState('')
  const [showComplete, setShowComplete] = useState(false)

  // Incident form
  const [incidentType, setIncidentType] = useState('machine_locked')
  const [incidentSeverity, setIncidentSeverity] = useState<'low' | 'medium' | 'high'>('medium')
  const [incidentDesc, setIncidentDesc] = useState('')
  const [incidentLoading, setIncidentLoading] = useState(false)

  // Photo upload
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [photoCategory, setPhotoCategory] = useState<'before' | 'after' | 'damage' | 'other'>('before')
  const [photoCaption, setPhotoCaption] = useState('')
  const [photoLoading, setPhotoLoading] = useState(false)

  const handleAccept = useCallback(async () => {
    if (!visit) return
    setLoading(true)
    setError('')
    try {
      await acceptVisit({ visitId: visit._id })
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [visit, acceptVisit])

  const handleStartNavigation = useCallback(() => {
    if (!visit) return
    const loc = visit.location as any
    if (loc?.lat && loc?.lng) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${loc.lat},${loc.lng}`
      window.open(url, '_blank')
    } else if (loc?.address) {
      const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc.address)}`
      window.open(url, '_blank')
    }
    startNavigation({ visitId: visit._id }).catch(console.error)
  }, [visit, startNavigation])

  const handleStartVisit = useCallback(async () => {
    if (!visit) return
    setLoading(true)
    setError('')
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
      )
      await startVisit({
        visitId: visit._id,
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      })
    } catch (e: any) {
      // Allow start without GPS if denied
      await startVisit({ visitId: visit._id, lat: 0, lng: 0 })
    } finally {
      setLoading(false)
    }
  }, [visit, startVisit])

  const handleChecklistItem = useCallback(async (checklistId: Id<'visitChecklists'>, index: number, completed: boolean, textValue?: string) => {
    try {
      await updateChecklist({ checklistId, itemIndex: index, completed, textValue })
    } catch (e: any) {
      setError(e.message)
    }
  }, [updateChecklist])

  const handleComplete = useCallback(async () => {
    if (!visit) return
    setLoading(true)
    setError('')
    try {
      // Mark checklist complete if exists
      if (visit.checklist && !visit.checklist.completedAt) {
        const allDone = visit.checklist.items.every((item: any) => item.completed)
        if (!allDone) {
          setError('Dokončete všechny položky checklistu před uzavřením')
          setLoading(false)
          return
        }
        await completeChecklist({ checklistId: visit.checklist._id })
      }
      await completeVisit({ visitId: visit._id, driverNotes: driverNotes || undefined })
      navigate({ to: '/ridic/vending' })
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [visit, driverNotes, completeChecklist, completeVisit, navigate])

  const handlePhotoUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!visit || !e.target.files?.length) return
    const file = e.target.files[0]
    setPhotoLoading(true)
    setError('')
    try {
      const uploadUrl = await generateUploadUrl()
      const res = await fetch(uploadUrl, { method: 'POST', body: file, headers: { 'Content-Type': file.type } })
      const { storageId } = await res.json()
      // Get GPS
      let lat: number | undefined
      let lng: number | undefined
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
        )
        lat = pos.coords.latitude
        lng = pos.coords.longitude
      } catch {}
      await addPhoto({
        visitId: visit._id,
        storageId,
        category: photoCategory,
        caption: photoCaption || undefined,
        lat,
        lng,
      })
      setPhotoCaption('')
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (e: any) {
      setError(e.message)
    } finally {
      setPhotoLoading(false)
    }
  }, [visit, generateUploadUrl, addPhoto, photoCategory, photoCaption])

  const handleReportIncident = useCallback(async () => {
    if (!visit || !incidentDesc.trim()) return
    setIncidentLoading(true)
    setError('')
    try {
      await reportIncident({
        visitId: visit._id,
        type: incidentType as any,
        severity: incidentSeverity,
        description: incidentDesc,
        photoStorageIds: [],
      })
      setIncidentDesc('')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setIncidentLoading(false)
    }
  }, [visit, reportIncident, incidentType, incidentSeverity, incidentDesc])

  if (visit === undefined) {
    return (
      <div className="min-h-screen bg-[hsl(var(--background))] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 rounded-full border-2 border-[hsl(var(--primary))] border-t-transparent" />
      </div>
    )
  }

  if (!visit) {
    return (
      <div className="min-h-screen bg-[hsl(var(--background))] flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-[hsl(var(--foreground))] font-semibold">Návštěva nenalezena</p>
          <Link to="/ridic/vending" className="text-[hsl(var(--primary))] text-sm mt-2 block">← Zpět</Link>
        </div>
      </div>
    )
  }

  const loc = visit.location as any
  const checklist = visit.checklist as any
  const photos = visit.photos as any[]
  const incidents = visit.incidents as any[]
  const isCompleted = visit.status === 'completed' || visit.status === 'cancelled'
  const isInProgress = visit.status === 'in_progress'
  const isAssigned = ['assigned', 'scheduled', 'accepted'].includes(visit.status)
  const isEnRoute = visit.status === 'en_route'

  const checklistProgress = checklist
    ? { done: checklist.items.filter((i: any) => i.completed).length, total: checklist.items.length }
    : null

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] pb-32">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[hsl(var(--card))] border-b border-[hsl(var(--border))] px-4 py-3 flex items-center gap-3">
        <Link to="/ridic/vending" className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-[hsl(var(--foreground))] truncate">{loc?.name ?? 'Lokace'}</p>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">{visit.visitNumber}</p>
        </div>
        <span className={`text-xs font-semibold ${STATUS_COLOR[visit.status]}`}>
          {STATUS_LABEL[visit.status]}
        </span>
      </div>

      {/* Location card */}
      <div className="p-4 space-y-3">
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[hsl(var(--primary))]/10 flex items-center justify-center text-[hsl(var(--primary))] shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[hsl(var(--foreground))]">{loc?.name}</p>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">{loc?.address}</p>
              {loc?.accessInstructions && (
                <div className="mt-2 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <p className="text-xs text-yellow-400">⚠ {loc.accessInstructions}</p>
                </div>
              )}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-[hsl(var(--border))] grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">Čas návštěvy</p>
              <p className="text-[hsl(var(--foreground))] font-medium">
                {new Date(visit.scheduledAt).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <div>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">Odhad trvání</p>
              <p className="text-[hsl(var(--foreground))] font-medium">{visit.estimatedDuration ?? '—'} min</p>
            </div>
          </div>
          {visit.dispatcherNotes && (
            <div className="mt-3 p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <p className="text-xs text-blue-400">📋 {visit.dispatcherNotes}</p>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-[hsl(var(--destructive))]/10 border border-[hsl(var(--destructive))]/20 rounded-xl p-3">
            <p className="text-sm text-[hsl(var(--destructive))]">{error}</p>
          </div>
        )}

        {/* Action buttons */}
        {!isCompleted && (
          <div className="space-y-2">
            {isAssigned && (
              <>
                <button
                  onClick={handleAccept}
                  disabled={loading || visit.status === 'accepted'}
                  className="w-full py-3 rounded-xl font-semibold bg-blue-500 text-white disabled:opacity-50 transition-all active:scale-[0.98]"
                >
                  {visit.status === 'accepted' ? '✓ Přijato' : loading ? 'Zpracovávám…' : 'Přijmout návštěvu'}
                </button>
                {visit.status === 'accepted' && (
                  <button
                    onClick={handleStartNavigation}
                    className="w-full py-3 rounded-xl font-semibold bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] transition-all active:scale-[0.98]"
                  >
                    🗺 Navigovat
                  </button>
                )}
              </>
            )}

            {(isEnRoute || isAssigned) && (
              <button
                onClick={handleStartVisit}
                disabled={loading}
                className="w-full py-3 rounded-xl font-semibold bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] disabled:opacity-50 transition-all active:scale-[0.98]"
              >
                {loading ? 'GPS…' : '📍 Zahájit návštěvu'}
              </button>
            )}

            {isInProgress && (
              <button
                onClick={() => setShowComplete(true)}
                className="w-full py-3 rounded-xl font-semibold bg-[hsl(var(--success))] text-white transition-all active:scale-[0.98]"
              >
                ✓ Uzavřít návštěvu
              </button>
            )}
          </div>
        )}

        {isCompleted && (
          <div className="bg-[hsl(var(--success))]/10 border border-[hsl(var(--success))]/20 rounded-2xl p-4 text-center">
            <p className="text-2xl mb-1">✓</p>
            <p className="font-semibold text-[hsl(var(--success))]">Návštěva dokončena</p>
            {visit.completedAt && (
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                {new Date(visit.completedAt).toLocaleString('cs-CZ')}
              </p>
            )}
          </div>
        )}

        {/* Tabs — only show when in progress */}
        {(isInProgress || isCompleted) && (
          <div className="mt-2">
            <div className="flex border border-[hsl(var(--border))] rounded-xl overflow-hidden">
              {(['checklist', 'photos', 'incident'] as Tab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                    activeTab === tab
                      ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'
                      : 'text-[hsl(var(--muted-foreground))] bg-[hsl(var(--card))]'
                  }`}
                >
                  {tab === 'checklist' ? `✅ Checklist${checklistProgress ? ` ${checklistProgress.done}/${checklistProgress.total}` : ''}` :
                   tab === 'photos' ? `📷 Foto${photos.length ? ` (${photos.length})` : ''}` :
                   `⚠ Incident${incidents.length ? ` (${incidents.length})` : ''}`}
                </button>
              ))}
            </div>

            {/* Checklist tab */}
            {activeTab === 'checklist' && (
              <div className="mt-3 space-y-2">
                {!checklist && (
                  <p className="text-center text-[hsl(var(--muted-foreground))] py-6 text-sm">Žádný checklist</p>
                )}
                {checklist?.items.map((item: any, i: number) => (
                  <div
                    key={item.itemId ?? i}
                    className={`bg-[hsl(var(--card))] border rounded-xl p-4 ${
                      item.completed ? 'border-[hsl(var(--success))]/40' : 'border-[hsl(var(--border))]'
                    }`}
                  >
                    {item.type === 'text' ? (
                      <div>
                        <p className="text-sm font-medium text-[hsl(var(--foreground))] mb-2">{item.text}</p>
                        <textarea
                          value={item.textValue ?? ''}
                          onChange={(e) => handleChecklistItem(checklist._id, i, !!e.target.value, e.target.value)}
                          disabled={isCompleted}
                          placeholder="Zadejte odpověď…"
                          className="w-full bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg p-2 text-sm text-[hsl(var(--foreground))] resize-none h-20 focus:outline-none focus:border-[hsl(var(--primary))]"
                        />
                      </div>
                    ) : (
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={item.completed}
                          onChange={(e) => handleChecklistItem(checklist._id, i, e.target.checked)}
                          disabled={isCompleted}
                          className="w-5 h-5 rounded accent-[hsl(var(--primary))]"
                        />
                        <span className={`text-sm ${item.completed ? 'line-through text-[hsl(var(--muted-foreground))]' : 'text-[hsl(var(--foreground))]'}`}>
                          {item.text}
                        </span>
                      </label>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Photos tab */}
            {activeTab === 'photos' && (
              <div className="mt-3 space-y-3">
                {!isCompleted && (
                  <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-4 space-y-3">
                    <p className="text-sm font-semibold text-[hsl(var(--foreground))]">Přidat foto</p>
                    <div className="grid grid-cols-4 gap-1">
                      {(['before', 'after', 'damage', 'other'] as const).map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setPhotoCategory(cat)}
                          className={`py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            photoCategory === cat
                              ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'
                              : 'bg-[hsl(var(--background))] text-[hsl(var(--muted-foreground))] border border-[hsl(var(--border))]'
                          }`}
                        >
                          {cat === 'before' ? 'Před' : cat === 'after' ? 'Po' : cat === 'damage' ? 'Škoda' : 'Jiné'}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      value={photoCaption}
                      onChange={(e) => setPhotoCaption(e.target.value)}
                      placeholder="Popis (volitelný)"
                      className="w-full bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg px-3 py-2 text-sm text-[hsl(var(--foreground))] focus:outline-none focus:border-[hsl(var(--primary))]"
                    />
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={photoLoading}
                      className="w-full py-3 rounded-xl bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] font-semibold disabled:opacity-50"
                    >
                      {photoLoading ? 'Nahrávám…' : '📷 Vyfotit / Vybrat'}
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  {photos.map((photo: any) => (
                    <div key={photo._id} className="relative rounded-xl overflow-hidden border border-[hsl(var(--border))] aspect-square bg-[hsl(var(--card))]">
                      <img src={photo.url} alt={photo.caption ?? ''} className="w-full h-full object-cover" />
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1">
                        <p className="text-xs text-white">
                          {photo.category === 'before' ? 'Před' : photo.category === 'after' ? 'Po' :
                           photo.category === 'damage' ? 'Škoda' : 'Jiné'}
                          {photo.caption ? ` · ${photo.caption}` : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                  {photos.length === 0 && (
                    <div className="col-span-2 text-center py-8 text-[hsl(var(--muted-foreground))] text-sm">
                      Žádná fotodokumentace
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Incident tab */}
            {activeTab === 'incident' && (
              <div className="mt-3 space-y-3">
                {incidents.map((inc: any) => (
                  <div key={inc._id} className="bg-[hsl(var(--card))] border border-[hsl(var(--destructive))]/30 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-[hsl(var(--destructive))]">
                        {INCIDENT_TYPES.find((t) => t.value === inc.type)?.label ?? inc.type}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        inc.status === 'resolved' ? 'bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]' : 'bg-[hsl(var(--destructive))]/10 text-[hsl(var(--destructive))]'
                      }`}>
                        {inc.status === 'resolved' ? 'Vyřešeno' : 'Otevřeno'}
                      </span>
                    </div>
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">{inc.description}</p>
                  </div>
                ))}

                {!isCompleted && (
                  <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-4 space-y-3">
                    <p className="text-sm font-semibold text-[hsl(var(--foreground))]">Hlásit incident</p>
                    <select
                      value={incidentType}
                      onChange={(e) => setIncidentType(e.target.value)}
                      className="w-full bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg px-3 py-2 text-sm text-[hsl(var(--foreground))] focus:outline-none"
                    >
                      {INCIDENT_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                    <div className="grid grid-cols-3 gap-1">
                      {(['low', 'medium', 'high'] as const).map((s) => (
                        <button
                          key={s}
                          onClick={() => setIncidentSeverity(s)}
                          className={`py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            incidentSeverity === s
                              ? s === 'high' ? 'bg-red-500 text-white' : s === 'medium' ? 'bg-orange-500 text-white' : 'bg-yellow-500 text-white'
                              : 'bg-[hsl(var(--background))] text-[hsl(var(--muted-foreground))] border border-[hsl(var(--border))]'
                          }`}
                        >
                          {s === 'low' ? 'Nízká' : s === 'medium' ? 'Střední' : 'Vysoká'}
                        </button>
                      ))}
                    </div>
                    <textarea
                      value={incidentDesc}
                      onChange={(e) => setIncidentDesc(e.target.value)}
                      placeholder="Popis incidentu…"
                      className="w-full bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg p-3 text-sm text-[hsl(var(--foreground))] resize-none h-24 focus:outline-none focus:border-[hsl(var(--destructive))]"
                    />
                    <button
                      onClick={handleReportIncident}
                      disabled={incidentLoading || !incidentDesc.trim()}
                      className="w-full py-3 rounded-xl bg-[hsl(var(--destructive))] text-white font-semibold disabled:opacity-50"
                    >
                      {incidentLoading ? 'Odesílám…' : '⚠ Nahlásit incident'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Complete Visit Modal */}
      {showComplete && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end justify-center">
          <div className="bg-[hsl(var(--card))] rounded-t-3xl p-6 w-full max-w-lg space-y-4">
            <h3 className="text-lg font-bold text-[hsl(var(--foreground))]">Uzavřít návštěvu</h3>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">Ověřte, že jste dokončili checklist a vyfotili potřebnou dokumentaci.</p>
            {checklistProgress && (
              <div className={`p-3 rounded-xl border ${
                checklistProgress.done === checklistProgress.total
                  ? 'border-[hsl(var(--success))]/40 bg-[hsl(var(--success))]/5'
                  : 'border-[hsl(var(--destructive))]/40 bg-[hsl(var(--destructive))]/5'
              }`}>
                <p className="text-sm">
                  Checklist: {checklistProgress.done}/{checklistProgress.total} položek dokončeno
                  {checklistProgress.done === checklistProgress.total ? ' ✓' : ' ✗'}
                </p>
              </div>
            )}
            <textarea
              value={driverNotes}
              onChange={(e) => setDriverNotes(e.target.value)}
              placeholder="Poznámky k návštěvě (volitelné)…"
              className="w-full bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl p-3 text-sm text-[hsl(var(--foreground))] resize-none h-24 focus:outline-none focus:border-[hsl(var(--primary))]"
            />
            {error && <p className="text-sm text-[hsl(var(--destructive))]">{error}</p>}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowComplete(false)}
                className="py-3 rounded-xl border border-[hsl(var(--border))] text-[hsl(var(--foreground))] font-medium"
              >
                Zrušit
              </button>
              <button
                onClick={handleComplete}
                disabled={loading}
                className="py-3 rounded-xl bg-[hsl(var(--success))] text-white font-semibold disabled:opacity-50"
              >
                {loading ? 'Ukládám…' : 'Dokončit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
