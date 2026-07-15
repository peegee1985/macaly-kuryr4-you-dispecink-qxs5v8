import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useState, useMemo } from 'react'
import type { Id } from '../../convex/_generated/dataModel'
import { AppShell, PageHeader, LoadingScreen } from '@/components/AppShell'
import { dispatcherNav } from './dispatcer'

// ── Import z řidičů modal ──────────────────────────────────────────────────
function ImportDriverModal({ onClose }: { onClose: () => void }) {
  const drivers = useQuery(api.crm.listDriversForCrmImport)
  const importDriver = useMutation(api.crm.importDriverAsCrmContact)
  const [selectedId, setSelectedId] = useState<Id<'users'> | ''>('')
  const [loading, setLoading] = useState(false)

  const handleImport = async () => {
    if (!selectedId) return
    setLoading(true)
    try {
      await importDriver({ userId: selectedId as Id<'users'> })
      onClose()
    } catch (e) {
      console.error('Import řidiče selhal:', e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-heading font-bold mb-1">Import řidiče jako kontakt</h2>
        <p className="text-sm text-muted-foreground mb-5">Vyberte řidiče, který bude přidán do CRM jako kontakt se štítkem „řidič".</p>
        {drivers === undefined ? (
          <p className="text-sm text-muted-foreground">Načítám...</p>
        ) : drivers.length === 0 ? (
          <p className="text-sm text-muted-foreground">Všichni řidiči jsou již v CRM.</p>
        ) : (
          <select
            value={selectedId}
            onChange={e => setSelectedId(e.target.value as Id<'users'>)}
            className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">— Vyberte řidiče —</option>
            {drivers.map(d => (
              <option key={d._id} value={d._id}>{d.name || d.email}</option>
            ))}
          </select>
        )}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-border text-muted-foreground hover:bg-muted">Zrušit</button>
          <button onClick={handleImport} disabled={!selectedId || loading} className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50">
            {loading ? 'Importuji...' : 'Importovat'}
          </button>
        </div>
      </div>
    </div>
  )
}

export const Route = createFileRoute('/dispatcer/crm')({
  component: CrmPage,
})

function CrmStatusBadge({ status }: { status: string }) {
  const configs: Record<string, { label: string; cls: string }> = {
    active: { label: 'Aktivní', cls: 'bg-green-500/20 text-green-300 border-green-500/30' },
    inactive: { label: 'Neaktivní', cls: 'bg-red-500/20 text-red-300 border-red-500/30' },
    lead: { label: 'Lead', cls: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  }
  const c = configs[status] ?? { label: status, cls: 'bg-muted text-muted-foreground border-border' }
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${c.cls}`}>{c.label}</span>
}

function ContactModal({ onClose, editContact }: {
  onClose: () => void
  editContact?: {
    _id: Id<"crmContacts">
    type: "company" | "person"
    name: string
    companyName?: string
    email?: string
    phone?: string
    address?: string
    city?: string
    ico?: string
    dic?: string
    tags: string[]
    status: "lead" | "active" | "inactive"
    notes?: string
  } | null
}) {
  const createContact = useMutation(api.crm.createContact)
  const updateContact = useMutation(api.crm.updateContact)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    type: editContact?.type ?? 'company' as 'company' | 'person',
    name: editContact?.name ?? '',
    companyName: editContact?.companyName ?? '',
    email: editContact?.email ?? '',
    phone: editContact?.phone ?? '',
    address: editContact?.address ?? '',
    city: editContact?.city ?? '',
    ico: editContact?.ico ?? '',
    dic: editContact?.dic ?? '',
    tags: editContact?.tags?.join(', ') ?? '',
    status: editContact?.status ?? 'lead' as 'lead' | 'active' | 'inactive',
    notes: editContact?.notes ?? '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('Jméno je povinné')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean)
      const data = {
        type: form.type,
        name: form.name.trim(),
        companyName: form.companyName.trim() || undefined,
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        address: form.address.trim() || undefined,
        city: form.city.trim() || undefined,
        ico: form.ico.trim() || undefined,
        dic: form.dic.trim() || undefined,
        tags,
        status: form.status,
        notes: form.notes.trim() || undefined,
      }
      if (editContact) {
        await updateContact({ contactId: editContact._id, ...data })
      } else {
        await createContact(data)
      }
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Chyba při ukládání')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-heading font-bold text-lg">{editContact ? 'Upravit kontakt' : 'Nový kontakt'}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted text-muted-foreground">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-2">{error}</div>}

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Typ</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="type" value="company" checked={form.type === 'company'} onChange={() => setForm(f => ({ ...f, type: 'company' }))} className="accent-primary" />
                <span className="text-sm">Firma</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="type" value="person" checked={form.type === 'person'} onChange={() => setForm(f => ({ ...f, type: 'person' }))} className="accent-primary" />
                <span className="text-sm">Osoba</span>
              </label>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Jméno / Název *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" placeholder="Jan Novák / Firma s.r.o." />
          </div>

          {/* Company Name */}
          {form.type === 'company' && (
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Název firmy</label>
              <input value={form.companyName} onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))} className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
          )}

          {/* Email + Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">E-mail</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Telefon</label>
              <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
          </div>

          {/* Address + City */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Adresa</label>
              <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Město</label>
              <input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
          </div>

          {/* ICO + DIC */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">IČO</label>
              <input value={form.ico} onChange={e => setForm(f => ({ ...f, ico: e.target.value }))} className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">DIČ</label>
              <input value={form.dic} onChange={e => setForm(f => ({ ...f, dic: e.target.value }))} className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Štítky (oddělte čárkou)</label>
            <input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" placeholder="VIP, Praha, stálý zákazník" />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Status</label>
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as 'lead' | 'active' | 'inactive' }))} className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="lead">Lead</option>
              <option value="active">Aktivní</option>
              <option value="inactive">Neaktivní</option>
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Poznámky</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-border text-muted-foreground hover:bg-muted">Zrušit</button>
            <button type="submit" disabled={loading} className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50">
              {loading ? 'Ukládám...' : editContact ? 'Uložit' : 'Vytvořit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function CrmPage() {
  const contacts = useQuery(api.crm.listContacts)
  const exportData = useQuery(api.crm.exportContacts)
  const stats = useQuery(api.crm.getContactStats)
  const deleteContact = useMutation(api.crm.deleteContact)

  const [showModal, setShowModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [editContact, setEditContact] = useState<Parameters<typeof ContactModal>[0]['editContact']>(null)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterType, setFilterType] = useState('')

  const exportCsv = () => {
    if (!exportData) return
    const header = ['Jméno', 'Typ', 'Firma', 'E-mail', 'Telefon', 'Město', 'IČO', 'Status', 'Štítky', 'Poznámky']
    const rows = exportData.map(c => [
      c.name, c.type === 'company' ? 'Firma' : 'Osoba', c.companyName || '', c.email || '',
      c.phone || '', c.city || '', c.ico || '', c.status, c.tags.join('; '), (c.notes || '').replace(/\n/g, ' ')
    ])
    const csv = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'crm-kontakty.csv'; a.click()
    URL.revokeObjectURL(url)
    console.log('CRM export CSV hotový, počet řádků:', exportData.length)
  }

  const filtered = useMemo(() => {
    if (!contacts) return []
    return contacts.filter(c => {
      const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || (c.email?.toLowerCase().includes(search.toLowerCase()))
      const matchStatus = !filterStatus || c.status === filterStatus
      const matchType = !filterType || c.type === filterType
      return matchSearch && matchStatus && matchType
    })
  }, [contacts, search, filterStatus, filterType])

  if (contacts === undefined) {
    return (
      <AppShell navItems={dispatcherNav} title="Dispečer" primaryCount={4} subtitle="Řídicí centrum">
        <LoadingScreen />
      </AppShell>
    )
  }

  const handleDelete = (contactId: Id<"crmContacts">, name: string) => {
    if (confirm(`Opravdu smazat kontakt "${name}"? Tato akce je nevratná.`)) {
      deleteContact({ contactId })
    }
  }

  const handleEdit = (contact: typeof contacts[number]) => {
    setEditContact({
      _id: contact._id,
      type: contact.type,
      name: contact.name,
      companyName: contact.companyName,
      email: contact.email,
      phone: contact.phone,
      address: contact.address,
      city: contact.city,
      ico: contact.ico,
      dic: contact.dic,
      tags: contact.tags,
      status: contact.status,
      notes: contact.notes,
    })
    setShowModal(true)
  }

  return (
    <AppShell navItems={dispatcherNav} title="Dispečer" primaryCount={4} subtitle="Řídicí centrum">
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        <PageHeader
          title="CRM Kontakty"
          subtitle="Správa kontaktů a obchodních vztahů"
          action={
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={exportCsv} disabled={!exportData} className="px-3 py-2 bg-muted border border-border text-sm font-medium rounded-lg hover:bg-muted/80 flex items-center gap-1.5 disabled:opacity-40">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Export CSV
              </button>
              <button onClick={() => setShowImportModal(true)} className="px-3 py-2 bg-muted border border-border text-sm font-medium rounded-lg hover:bg-muted/80 flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                Import z řidičů
              </button>
              <button onClick={() => { setEditContact(null); setShowModal(true) }} className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                Nový kontakt
              </button>
            </div>
          }
        />

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Celkem kontaktů</p>
            <p className="text-2xl font-bold mt-1">{stats?.total ?? 0}</p>
          </div>
          <div className="bg-card border border-green-500/20 rounded-xl p-4">
            <p className="text-green-400 text-xs font-medium uppercase tracking-wide">Aktivní</p>
            <p className="text-2xl font-bold mt-1 text-green-300">{stats?.active ?? 0}</p>
          </div>
          <div className="bg-card border border-amber-500/20 rounded-xl p-4">
            <p className="text-amber-400 text-xs font-medium uppercase tracking-wide">Leady</p>
            <p className="text-2xl font-bold mt-1 text-amber-300">{stats?.leads ?? 0}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Hledat podle jména nebo e-mailu..."
            className="flex-1 px-3 py-2 bg-muted border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 bg-muted border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary">
            <option value="">Vše (status)</option>
            <option value="active">Aktivní</option>
            <option value="lead">Lead</option>
            <option value="inactive">Neaktivní</option>
          </select>
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className="px-3 py-2 bg-muted border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary">
            <option value="">Vše (typ)</option>
            <option value="company">Firma</option>
            <option value="person">Osoba</option>
          </select>
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Jméno</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Typ</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">E-mail</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Telefon</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Akce</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      {contacts.length === 0 ? 'Zatím nemáte žádné kontakty' : 'Žádné kontakty neodpovídají filtru'}
                    </td>
                  </tr>
                )}
                {filtered.map(contact => (
                  <tr key={contact._id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <Link to="/dispatcer/crm/$contactId" params={{ contactId: contact._id }} className="font-medium hover:text-primary transition-colors">
                        {contact.name}
                      </Link>
                      {contact.tags.length > 0 && (
                        <div className="flex gap-1 mt-0.5 flex-wrap">
                          {contact.tags.slice(0, 3).map(tag => (
                            <span key={tag} className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{tag}</span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {contact.type === 'company' ? 'Firma' : 'Osoba'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{contact.email || '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{contact.phone || '—'}</td>
                    <td className="px-4 py-3"><CrmStatusBadge status={contact.status} /></td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={(e) => { e.stopPropagation(); handleEdit(contact) }} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground" title="Upravit">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(contact._id, contact.name) }} className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400" title="Smazat">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modals */}
        {showModal && <ContactModal onClose={() => setShowModal(false)} editContact={editContact} />}
        {showImportModal && <ImportDriverModal onClose={() => setShowImportModal(false)} />}
      </div>
    </AppShell>
  )
}
