import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { AppShell, PageHeader } from '@/components/AppShell'
import { vendingNav } from './vending'
import { useState } from 'react'
import type { Id } from '../../convex/_generated/dataModel'

export const Route = createFileRoute('/vending/lokace')({
  component: VendingLokacePage,
})

const LOCATION_STATUS_COLORS: Record<string, string> = {
  active: 'bg-[hsl(var(--success))]/15 text-[hsl(var(--success))]',
  offline: 'bg-[hsl(var(--muted))]/50 text-[hsl(var(--muted-foreground))]',
  maintenance: 'bg-yellow-500/15 text-yellow-400',
  inactive: 'bg-[hsl(var(--destructive))]/15 text-[hsl(var(--destructive))]',
}

const LOCATION_STATUS_LABEL: Record<string, string> = {
  active: 'Aktivní',
  offline: 'Offline',
  maintenance: 'Údržba',
  inactive: 'Neaktivní',
}

const LOCATION_TYPES = [
  { value: 'vending_machine', label: 'Automat' },
  { value: 'parcel_locker', label: 'Parcel locker' },
  { value: 'coffee_machine', label: 'Kávovar' },
  { value: 'water_dispenser', label: 'Výdejník vody' },
  { value: 'advertising_display', label: 'Reklamní display' },
  { value: 'charging_station', label: 'Nabíjecí stanice' },
  { value: 'smart_locker', label: 'Chytrý trezor' },
  { value: 'medical_device', label: 'Zdravotnické zařízení' },
  { value: 'industrial', label: 'Průmyslové zařízení' },
  { value: 'other', label: 'Jiné' },
]

type LocationFormData = {
  clientId: string
  name: string
  locationCode: string
  locationType: string
  address: string
  city: string
  lat: string
  lng: string
  openingHours: string
  accessInstructions: string
  pinCode: string
  internalNotes: string
  publicNotes: string
}

const EMPTY_FORM: LocationFormData = {
  clientId: '',
  name: '',
  locationCode: '',
  locationType: 'vending_machine',
  address: '',
  city: '',
  lat: '',
  lng: '',
  openingHours: '',
  accessInstructions: '',
  pinCode: '',
  internalNotes: '',
  publicNotes: '',
}

function LocationForm({
  initial,
  onSave,
  onCancel,
  clients,
  drivers,
}: {
  initial: LocationFormData
  onSave: (data: LocationFormData) => Promise<void>
  onCancel: () => void
  clients: any[]
  drivers: any[]
}) {
  const [form, setForm] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (k: keyof LocationFormData, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.clientId) { setError('Vyberte klienta'); return }
    if (!form.name) { setError('Zadejte název'); return }
    if (!form.locationCode) { setError('Zadejte kód lokace'); return }
    if (!form.address) { setError('Zadejte adresu'); return }
    setSaving(true)
    setError('')
    try {
      await onSave(form)
    } catch (e: any) {
      setError(e.message ?? 'Chyba při ukládání')
    } finally {
      setSaving(false)
    }
  }

  const inputCls = "w-full px-3 py-2 bg-[hsl(var(--input))] border border-[hsl(var(--border))] rounded-lg text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
  const labelCls = "block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 uppercase tracking-wide"

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-[hsl(var(--destructive))]/15 border border-[hsl(var(--destructive))]/30 rounded-lg px-4 py-3 text-sm text-[hsl(var(--destructive))]">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className={labelCls}>Klient *</label>
          <select className={inputCls} value={form.clientId} onChange={(e) => set('clientId', e.target.value)} required>
            <option value="">— Vyberte klienta —</option>
            {clients.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
        </div>

        <div>
          <label className={labelCls}>Název lokace *</label>
          <input className={inputCls} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Automat - OC Palladium 1F" required />
        </div>

        <div>
          <label className={labelCls}>Kód lokace *</label>
          <input className={inputCls} value={form.locationCode} onChange={(e) => set('locationCode', e.target.value.toUpperCase())} placeholder="LOC-001" required />
        </div>

        <div>
          <label className={labelCls}>Typ zařízení</label>
          <select className={inputCls} value={form.locationType} onChange={(e) => set('locationType', e.target.value)}>
            {LOCATION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>

        <div>
          <label className={labelCls}>Město</label>
          <input className={inputCls} value={form.city} onChange={(e) => set('city', e.target.value)} placeholder="Praha" />
        </div>

        <div className="sm:col-span-2">
          <label className={labelCls}>Adresa *</label>
          <input className={inputCls} value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="Náměstí Republiky 1, Praha 1" required />
        </div>

        <div>
          <label className={labelCls}>GPS Latitude</label>
          <input className={inputCls} type="number" step="any" value={form.lat} onChange={(e) => set('lat', e.target.value)} placeholder="50.0875" />
        </div>

        <div>
          <label className={labelCls}>GPS Longitude</label>
          <input className={inputCls} type="number" step="any" value={form.lng} onChange={(e) => set('lng', e.target.value)} placeholder="14.4213" />
        </div>

        <div>
          <label className={labelCls}>Otevírací hodiny</label>
          <input className={inputCls} value={form.openingHours} onChange={(e) => set('openingHours', e.target.value)} placeholder="Po-Pá 8:00-20:00" />
        </div>

        <div>
          <label className={labelCls}>PIN kód</label>
          <input className={inputCls} type="password" value={form.pinCode} onChange={(e) => set('pinCode', e.target.value)} placeholder="••••" />
        </div>

        <div className="sm:col-span-2">
          <label className={labelCls}>Přístupové instrukce</label>
          <textarea className={inputCls} rows={2} value={form.accessInstructions} onChange={(e) => set('accessInstructions', e.target.value)} placeholder="Vstup přes boční vchod, kód 1234" />
        </div>

        <div>
          <label className={labelCls}>Interní poznámky</label>
          <textarea className={inputCls} rows={2} value={form.internalNotes} onChange={(e) => set('internalNotes', e.target.value)} placeholder="Pouze pro dispečery" />
        </div>

        <div>
          <label className={labelCls}>Veřejné poznámky</label>
          <textarea className={inputCls} rows={2} value={form.publicNotes} onChange={(e) => set('publicNotes', e.target.value)} placeholder="Viditelné pro zákazníka" />
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={saving} className="flex-1 sm:flex-none px-6 py-2 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] rounded-lg font-semibold text-sm hover:opacity-90 disabled:opacity-50 transition-opacity">
          {saving ? 'Ukládám…' : 'Uložit'}
        </button>
        <button type="button" onClick={onCancel} className="px-6 py-2 bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] rounded-lg text-sm hover:opacity-90 transition-opacity">
          Zrušit
        </button>
      </div>
    </form>
  )
}

function VendingLokacePage() {
  const locations = useQuery(api.vending.listLocations, {})
  const clients = useQuery(api.vending.listClients)
  const regularDrivers = useQuery(api.users.listUsersByRole, { role: 'driver' })
  const serviceDrivers = useQuery(api.users.listUsersByRole, { role: 'service_driver' })
  const createLocation = useMutation(api.vending.createLocation)
  const updateLocation = useMutation(api.vending.updateLocation)
  const deleteLocation = useMutation(api.vending.deleteLocation)

  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterClient, setFilterClient] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const drivers = [...(regularDrivers ?? []), ...(serviceDrivers ?? [])]

  const filtered = (locations ?? []).filter((l) => {
    if (filterStatus && l.status !== filterStatus) return false
    if (filterClient && l.clientId !== filterClient) return false
    if (search) {
      const q = search.toLowerCase()
      return l.name.toLowerCase().includes(q) || l.locationCode.toLowerCase().includes(q) || l.address.toLowerCase().includes(q)
    }
    return true
  })

  const handleCreate = async (data: LocationFormData) => {
    await createLocation({
      clientId: data.clientId as Id<'serviceClients'>,
      name: data.name,
      locationCode: data.locationCode,
      locationType: data.locationType,
      address: data.address,
      city: data.city || undefined,
      lat: data.lat ? parseFloat(data.lat) : undefined,
      lng: data.lng ? parseFloat(data.lng) : undefined,
      openingHours: data.openingHours || undefined,
      accessInstructions: data.accessInstructions || undefined,
      pinCode: data.pinCode || undefined,
      internalNotes: data.internalNotes || undefined,
      publicNotes: data.publicNotes || undefined,
    })
    setShowForm(false)
  }

  const handleUpdate = async (locationId: string, data: LocationFormData) => {
    await updateLocation({
      locationId: locationId as Id<'serviceLocations'>,
      name: data.name,
      locationCode: data.locationCode,
      locationType: data.locationType,
      address: data.address,
      city: data.city || undefined,
      lat: data.lat ? parseFloat(data.lat) : undefined,
      lng: data.lng ? parseFloat(data.lng) : undefined,
      openingHours: data.openingHours || undefined,
      accessInstructions: data.accessInstructions || undefined,
      pinCode: data.pinCode || undefined,
      internalNotes: data.internalNotes || undefined,
      publicNotes: data.publicNotes || undefined,
    })
    setEditId(null)
  }

  const handleDelete = async (locationId: string) => {
    await deleteLocation({ locationId: locationId as Id<'serviceLocations'> })
    setDeleteConfirm(null)
  }

  const getEditInitial = (loc: any): LocationFormData => ({
    clientId: loc.clientId ?? '',
    name: loc.name ?? '',
    locationCode: loc.locationCode ?? '',
    locationType: loc.locationType ?? 'vending_machine',
    address: loc.address ?? '',
    city: loc.city ?? '',
    lat: loc.lat?.toString() ?? '',
    lng: loc.lng?.toString() ?? '',
    openingHours: loc.openingHours ?? '',
    accessInstructions: loc.accessInstructions ?? '',
    pinCode: '',
    internalNotes: loc.internalNotes ?? '',
    publicNotes: loc.publicNotes ?? '',
  })

  const clientMap = Object.fromEntries((clients ?? []).map((c) => [c._id, c.name]))

  return (
    <AppShell navItems={vendingNav} title="Lokace" subtitle="Správa servisních lokací" primaryCount={5}>
      <PageHeader
        title="Servisní lokace"
        subtitle={`${filtered.length} lokací`}
        action={
          <button
            onClick={() => { setShowForm(true); setEditId(null) }}
            className="flex items-center gap-2 px-4 py-2 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Přidat lokaci
          </button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Hledat název, kód, adresu…"
          className="flex-1 min-w-48 px-3 py-2 bg-[hsl(var(--input))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 bg-[hsl(var(--input))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
        >
          <option value="">Všechny stavy</option>
          <option value="active">Aktivní</option>
          <option value="offline">Offline</option>
          <option value="maintenance">Údržba</option>
          <option value="inactive">Neaktivní</option>
        </select>
        <select
          value={filterClient}
          onChange={(e) => setFilterClient(e.target.value)}
          className="px-3 py-2 bg-[hsl(var(--input))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
        >
          <option value="">Všichni klienti</option>
          {(clients ?? []).map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--primary))]/30 rounded-xl p-6 mb-5">
          <h3 className="font-semibold text-[hsl(var(--foreground))] mb-4">Nová lokace</h3>
          <LocationForm
            initial={EMPTY_FORM}
            onSave={handleCreate}
            onCancel={() => setShowForm(false)}
            clients={clients ?? []}
            drivers={drivers}
          />
        </div>
      )}

      {/* Locations table */}
      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl overflow-hidden">
        {!locations ? (
          <div className="p-8 text-center text-[hsl(var(--muted-foreground))]">Načítám…</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-3">📍</div>
            <p className="text-[hsl(var(--muted-foreground))]">Žádné lokace nenalezeny</p>
            <button onClick={() => setShowForm(true)} className="mt-4 text-[hsl(var(--primary))] text-sm hover:underline">
              Přidat první lokaci →
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[hsl(var(--border))]">
                  {['Kód', 'Název', 'Klient', 'Typ', 'Adresa', 'Stav', 'Poslední návštěva', ''].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[hsl(var(--border))]">
                {filtered.map((loc) => (
                  editId === loc._id ? (
                    <tr key={loc._id} className="bg-[hsl(var(--muted))]">
                      <td colSpan={8} className="p-6">
                        <LocationForm
                          initial={getEditInitial(loc)}
                          onSave={(data) => handleUpdate(loc._id, data)}
                          onCancel={() => setEditId(null)}
                          clients={clients ?? []}
                          drivers={drivers}
                        />
                      </td>
                    </tr>
                  ) : (
                    <tr key={loc._id} className="hover:bg-[hsl(var(--muted))]/50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-[hsl(var(--primary))] bg-[hsl(var(--primary))]/10 px-2 py-0.5 rounded">
                          {loc.locationCode}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          to="/vending/lokace/$locationId"
                          params={{ locationId: loc._id }}
                          className="text-sm font-medium text-[hsl(var(--foreground))] hover:text-[hsl(var(--primary))] transition-colors"
                        >
                          {loc.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-[hsl(var(--muted-foreground))]">
                        {clientMap[loc.clientId] ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-[hsl(var(--muted-foreground))]">
                        {LOCATION_TYPES.find((t) => t.value === loc.locationType)?.label ?? loc.locationType}
                      </td>
                      <td className="px-4 py-3 text-sm text-[hsl(var(--muted-foreground))] max-w-xs truncate">
                        {loc.address}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${LOCATION_STATUS_COLORS[loc.status]}`}>
                          {LOCATION_STATUS_LABEL[loc.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-[hsl(var(--muted-foreground))]">
                        {loc.lastVisitAt ? new Date(loc.lastVisitAt).toLocaleDateString('cs-CZ') : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Link
                            to="/vending/lokace/$locationId"
                            params={{ locationId: loc._id }}
                            className="text-xs text-[hsl(var(--primary))] hover:underline"
                          >
                            Detail
                          </Link>
                          <button
                            onClick={() => setEditId(loc._id)}
                            className="text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                          >
                            Upravit
                          </button>
                          {deleteConfirm === loc._id ? (
                            <div className="flex items-center gap-1">
                              <button onClick={() => handleDelete(loc._id)} className="text-xs text-[hsl(var(--destructive))] font-semibold">Potvrdit</button>
                              <button onClick={() => setDeleteConfirm(null)} className="text-xs text-[hsl(var(--muted-foreground))]">Zrušit</button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirm(loc._id)}
                              className="text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))]"
                            >
                              Smazat
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  )
}
