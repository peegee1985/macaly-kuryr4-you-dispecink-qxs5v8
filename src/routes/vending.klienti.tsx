import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { AppShell, PageHeader } from '@/components/AppShell'
import { vendingNav } from './vending'
import { useState } from 'react'
import type { Id } from '../../convex/_generated/dataModel'

export const Route = createFileRoute('/vending/klienti')({
  component: VendingKlientiPage,
})

type ClientForm = {
  name: string
  contactName: string
  contactEmail: string
  contactPhone: string
  address: string
  ico: string
  notes: string
  logoUrl: string
  accentColor: string
  completionEmailTemplate: string
}

const EMPTY_FORM: ClientForm = {
  name: '', contactName: '', contactEmail: '', contactPhone: '',
  address: '', ico: '', notes: '', logoUrl: '', accentColor: '', completionEmailTemplate: '',
}

function ClientFormUI({ initial, onSave, onCancel }: {
  initial: ClientForm
  onSave: (data: ClientForm) => Promise<void>
  onCancel: () => void
}) {
  const [form, setForm] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (k: keyof ClientForm, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name) { setError('Zadejte název'); return }
    setSaving(true)
    setError('')
    try { await onSave(form) } catch (e: any) { setError(e.message) } finally { setSaving(false) }
  }

  const inputCls = "w-full px-3 py-2 bg-[hsl(var(--input))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
  const labelCls = "block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 uppercase tracking-wide"

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="bg-[hsl(var(--destructive))]/15 border border-[hsl(var(--destructive))]/30 rounded-lg px-4 py-3 text-sm text-[hsl(var(--destructive))]">{error}</div>}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Název firmy *</label>
          <input className={inputCls} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="ABC Vending s.r.o." required />
        </div>
        <div>
          <label className={labelCls}>IČO</label>
          <input className={inputCls} value={form.ico} onChange={(e) => set('ico', e.target.value)} placeholder="12345678" />
        </div>
        <div>
          <label className={labelCls}>Kontaktní osoba</label>
          <input className={inputCls} value={form.contactName} onChange={(e) => set('contactName', e.target.value)} placeholder="Jan Novák" />
        </div>
        <div>
          <label className={labelCls}>Email</label>
          <input className={inputCls} type="email" value={form.contactEmail} onChange={(e) => set('contactEmail', e.target.value)} placeholder="jan@example.cz" />
        </div>
        <div>
          <label className={labelCls}>Telefon</label>
          <input className={inputCls} value={form.contactPhone} onChange={(e) => set('contactPhone', e.target.value)} placeholder="+420 600 000 000" />
        </div>
        <div>
          <label className={labelCls}>Adresa</label>
          <input className={inputCls} value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="Václavské náměstí 1, Praha 1" />
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>Poznámky</label>
          <textarea className={inputCls} rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Interní poznámky…" />
        </div>
      </div>

      {/* Branding */}
      <div className="border-t border-[hsl(var(--border))] pt-4">
        <p className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide mb-3">Branding portálu</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>URL loga</label>
            <input className={inputCls} value={form.logoUrl} onChange={(e) => set('logoUrl', e.target.value)} placeholder="https://…/logo.png" />
            {form.logoUrl && (
              <img src={form.logoUrl} alt="Logo preview" className="mt-2 h-8 object-contain rounded" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
            )}
          </div>
          <div>
            <label className={labelCls}>Akcentová barva</label>
            <div className="flex gap-2 items-center">
              <input type="color" value={form.accentColor || '#6366f1'} onChange={(e) => set('accentColor', e.target.value)}
                className="h-9 w-12 rounded border border-[hsl(var(--border))] bg-transparent cursor-pointer" />
              <input className={inputCls} value={form.accentColor} onChange={(e) => set('accentColor', e.target.value)} placeholder="#6366f1" />
            </div>
          </div>
        </div>
      </div>

      {/* Email template */}
      <div className="border-t border-[hsl(var(--border))] pt-4">
        <p className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide mb-1">Šablona e-mailu (po dokončení návštěvy)</p>
        <p className="text-xs text-[hsl(var(--muted-foreground))] mb-2">
          Proměnné: <code className="bg-[hsl(var(--muted))] px-1 rounded">{'{visitNumber}'}</code>, <code className="bg-[hsl(var(--muted))] px-1 rounded">{'{location}'}</code>, <code className="bg-[hsl(var(--muted))] px-1 rounded">{'{driver}'}</code>, <code className="bg-[hsl(var(--muted))] px-1 rounded">{'{time}'}</code>, <code className="bg-[hsl(var(--muted))] px-1 rounded">{'{notes}'}</code>
        </p>
        <textarea
          className={inputCls}
          rows={4}
          value={form.completionEmailTemplate}
          onChange={(e) => set('completionEmailTemplate', e.target.value)}
          placeholder="Prázdné = použije se výchozí šablona Kurýr4You…"
        />
      </div>

      <div className="flex gap-3">
        <button type="submit" disabled={saving} className="px-6 py-2 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] rounded-lg font-semibold text-sm disabled:opacity-50">
          {saving ? 'Ukládám…' : 'Uložit'}
        </button>
        <button type="button" onClick={onCancel} className="px-6 py-2 bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] rounded-lg text-sm">
          Zrušit
        </button>
      </div>
    </form>
  )
}

function UserAssignPanel({ clientId, onClose }: { clientId: string; onClose: () => void }) {
  const members = useQuery(api.vending.listClientUsers, { clientId: clientId as Id<'serviceClients'> })
  const customersQ = useQuery(api.users.listUsersByRole, { role: 'customer' })
  const supervisorsQ = useQuery(api.users.listUsersByRole, { role: 'vending_supervisor' })
  const addUser = useMutation(api.vending.addClientUser)
  const removeUser = useMutation(api.vending.removeClientUser)

  const [selectedUser, setSelectedUser] = useState('')
  const [selectedRole, setSelectedRole] = useState<'supervisor' | 'viewer'>('supervisor')
  const [adding, setAdding] = useState(false)

  const memberUserIds = new Set(members?.map((m) => m.userId) ?? [])
  const allUsersPool = [...(customersQ ?? []), ...(supervisorsQ ?? [])]
  const availableUsers = allUsersPool.filter((u) => !memberUserIds.has(u._id))

  const handleAdd = async () => {
    if (!selectedUser) return
    setAdding(true)
    try {
      await addUser({ clientId: clientId as Id<'serviceClients'>, userId: selectedUser as Id<'users'>, role: selectedRole })
      setSelectedUser('')
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="border-t border-[hsl(var(--border))] p-5">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-medium text-[hsl(var(--foreground))]">Uživatelé klienta</h4>
        <button onClick={onClose} className="text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">✕ Zavřít</button>
      </div>

      {/* Members list */}
      <div className="space-y-2 mb-4">
        {!members ? (
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Načítám…</p>
        ) : members.length === 0 ? (
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Žádní uživatelé</p>
        ) : members.map((m) => (
          <div key={m._id} className="flex items-center justify-between bg-[hsl(var(--muted))] rounded-lg px-3 py-2">
            <div>
              <p className="text-sm font-medium text-[hsl(var(--foreground))]">{m.user?.name ?? m.user?.email ?? '—'}</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">{m.user?.email}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[hsl(var(--primary))]">{m.role === 'supervisor' ? 'Supervisor' : 'Prohlížeč'}</span>
              <button onClick={() => removeUser({ membershipId: m._id })} className="text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))]">✕</button>
            </div>
          </div>
        ))}
      </div>

      {/* Add user */}
      <div className="flex gap-2">
        <select
          value={selectedUser}
          onChange={(e) => setSelectedUser(e.target.value)}
          className="flex-1 px-3 py-1.5 bg-[hsl(var(--input))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))]"
        >
          <option value="">— Přidat uživatele —</option>
          {availableUsers.map((u) => <option key={u._id} value={u._id}>{u.name ?? u.email}</option>)}
        </select>
        <select
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value as any)}
          className="px-3 py-1.5 bg-[hsl(var(--input))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))]"
        >
          <option value="supervisor">Supervisor</option>
          <option value="viewer">Prohlížeč</option>
        </select>
        <button onClick={handleAdd} disabled={adding || !selectedUser} className="px-4 py-1.5 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] rounded-lg text-sm disabled:opacity-50">
          {adding ? '…' : 'Přidat'}
        </button>
      </div>
    </div>
  )
}

function VendingKlientiPage() {
  const clients = useQuery(api.vending.listClients)
  const createClient = useMutation(api.vending.createClient)
  const updateClient = useMutation(api.vending.updateClient)

  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [usersPanel, setUsersPanel] = useState<string | null>(null)

  const handleCreate = async (data: ClientForm) => {
    await createClient({
      name: data.name,
      contactName: data.contactName || undefined,
      contactEmail: data.contactEmail || undefined,
      contactPhone: data.contactPhone || undefined,
      address: data.address || undefined,
      ico: data.ico || undefined,
      notes: data.notes || undefined,
      logoUrl: data.logoUrl || undefined,
      accentColor: data.accentColor || undefined,
      completionEmailTemplate: data.completionEmailTemplate || undefined,
    })
    setShowForm(false)
  }

  const handleUpdate = async (clientId: string, data: ClientForm) => {
    await updateClient({
      clientId: clientId as Id<'serviceClients'>,
      name: data.name,
      contactName: data.contactName || undefined,
      contactEmail: data.contactEmail || undefined,
      contactPhone: data.contactPhone || undefined,
      address: data.address || undefined,
      ico: data.ico || undefined,
      notes: data.notes || undefined,
      logoUrl: data.logoUrl || undefined,
      accentColor: data.accentColor || undefined,
      completionEmailTemplate: data.completionEmailTemplate || undefined,
    })
    setEditId(null)
  }

  const getEditInitial = (c: any): ClientForm => ({
    name: c.name ?? '', contactName: c.contactName ?? '', contactEmail: c.contactEmail ?? '',
    contactPhone: c.contactPhone ?? '', address: c.address ?? '', ico: c.ico ?? '', notes: c.notes ?? '',
    logoUrl: c.logoUrl ?? '', accentColor: c.accentColor ?? '', completionEmailTemplate: c.completionEmailTemplate ?? '',
  })

  return (
    <AppShell navItems={vendingNav} title="Klienti" primaryCount={5}>
      <PageHeader
        title="Klientské workspace"
        subtitle={`${clients?.length ?? 0} klientů`}
        action={
          <button
            onClick={() => { setShowForm(true); setEditId(null) }}
            className="flex items-center gap-2 px-4 py-2 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] rounded-lg font-semibold text-sm hover:opacity-90"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Nový klient
          </button>
        }
      />

      {showForm && (
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--primary))]/30 rounded-xl p-6 mb-5">
          <h3 className="font-semibold mb-4">Nový klient</h3>
          <ClientFormUI initial={EMPTY_FORM} onSave={handleCreate} onCancel={() => setShowForm(false)} />
        </div>
      )}

      <div className="space-y-4">
        {!clients ? (
          <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-8 text-center text-[hsl(var(--muted-foreground))]">Načítám…</div>
        ) : clients.length === 0 ? (
          <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-12 text-center">
            <div className="text-4xl mb-3">🏢</div>
            <p className="text-[hsl(var(--muted-foreground))]">Žádní klienti</p>
          </div>
        ) : clients.filter((c): c is NonNullable<typeof c> => c !== null).map((client) => (
          <div key={client._id} className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl overflow-hidden">
            {editId === client._id ? (
              <div className="p-6">
                <h3 className="font-semibold mb-4">Upravit klienta</h3>
                <ClientFormUI
                  initial={getEditInitial(client)}
                  onSave={(data) => handleUpdate(client._id, data)}
                  onCancel={() => setEditId(null)}
                />
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between px-5 py-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {(client as any).logoUrl && (
                        <img src={(client as any).logoUrl} alt="" className="h-6 object-contain rounded" />
                      )}
                      {(client as any).accentColor && (
                        <span className="w-3 h-3 rounded-full border border-[hsl(var(--border))] inline-block shrink-0" style={{ background: (client as any).accentColor }} />
                      )}
                      <h3 className="font-bold text-[hsl(var(--foreground))]">{client.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${client.active ? 'bg-[hsl(var(--success))]/15 text-[hsl(var(--success))]' : 'bg-[hsl(var(--muted))]/50 text-[hsl(var(--muted-foreground))]'}`}>
                        {client.active ? 'Aktivní' : 'Neaktivní'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-3 text-sm text-[hsl(var(--muted-foreground))]">
                      {client.contactName && <span>👤 {client.contactName}</span>}
                      {client.contactEmail && <a href={`mailto:${client.contactEmail}`} className="hover:text-[hsl(var(--primary))]">✉ {client.contactEmail}</a>}
                      {client.contactPhone && <a href={`tel:${client.contactPhone}`} className="hover:text-[hsl(var(--primary))]">📞 {client.contactPhone}</a>}
                      {client.ico && <span>IČO: {client.ico}</span>}
                    </div>
                    {client.address && <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">📍 {client.address}</p>}
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    <Link
                      to="/vending/kpi"
                      className="text-xs text-[hsl(var(--primary))] hover:underline"
                    >
                      KPI
                    </Link>
                    <Link
                      to="/vending/lokace"
                      className="text-xs text-[hsl(var(--primary))] hover:underline"
                    >
                      Lokace
                    </Link>
                    <button onClick={() => setEditId(client._id)} className="text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">
                      Upravit
                    </button>
                    <button
                      onClick={() => setUsersPanel(usersPanel === client._id ? null : client._id)}
                      className="text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                    >
                      Uživatelé
                    </button>
                  </div>
                </div>

                {usersPanel === client._id && (
                  <UserAssignPanel
                    clientId={client._id}
                    onClose={() => setUsersPanel(null)}
                  />
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </AppShell>
  )
}
