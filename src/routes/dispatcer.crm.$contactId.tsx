import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useState } from 'react'
import type { Id } from '../../convex/_generated/dataModel'
import { AppShell, LoadingScreen } from '@/components/AppShell'
import { dispatcherNav } from './dispatcer'

export const Route = createFileRoute('/dispatcer/crm/$contactId')({
  component: CrmContactDetailPage,
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

const NOTE_TYPE_ICONS: Record<string, string> = {
  note: '\u{1F4DD}',
  call: '\u{1F4DE}',
  email: '\u{2709}\u{FE0F}',
  meeting: '\u{1F91D}',
}

const NOTE_TYPE_LABELS: Record<string, string> = {
  note: 'Poznámka',
  call: 'Hovor',
  email: 'E-mail',
  meeting: 'Schůzka',
}

function EditModal({ contact, onClose }: {
  contact: {
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
  }
  onClose: () => void
}) {
  const updateContact = useMutation(api.crm.updateContact)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    type: contact.type,
    name: contact.name,
    companyName: contact.companyName ?? '',
    email: contact.email ?? '',
    phone: contact.phone ?? '',
    address: contact.address ?? '',
    city: contact.city ?? '',
    ico: contact.ico ?? '',
    dic: contact.dic ?? '',
    tags: contact.tags.join(', '),
    status: contact.status,
    notes: contact.notes ?? '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { setError('Jméno je povinné'); return }
    setLoading(true)
    setError(null)
    try {
      const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean)
      await updateContact({
        contactId: contact._id,
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
      })
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
          <h2 className="font-heading font-bold text-lg">Upravit kontakt</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted text-muted-foreground">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-2">{error}</div>}

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Typ</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="type" value="company" checked={form.type === 'company'} onChange={() => setForm(f => ({ ...f, type: 'company' as const }))} className="accent-primary" />
                <span className="text-sm">Firma</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="type" value="person" checked={form.type === 'person'} onChange={() => setForm(f => ({ ...f, type: 'person' as const }))} className="accent-primary" />
                <span className="text-sm">Osoba</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Jméno / Název *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>

          {form.type === 'company' && (
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Název firmy</label>
              <input value={form.companyName} onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))} className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
          )}

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

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Štítky (oddělte čárkou)</label>
            <input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Status</label>
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as 'lead' | 'active' | 'inactive' }))} className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="lead">Lead</option>
              <option value="active">Aktivní</option>
              <option value="inactive">Neaktivní</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Poznámky</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-border text-muted-foreground hover:bg-muted">Zrušit</button>
            <button type="submit" disabled={loading} className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50">
              {loading ? 'Ukládám...' : 'Uložit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function CrmContactDetailPage() {
  const { contactId } = Route.useParams()
  const contact = useQuery(api.crm.getContact, { contactId: contactId as Id<"crmContacts"> })
  const notes = useQuery(api.crm.getContactNotes, { contactId: contactId as Id<"crmContacts"> })
  const activities = useQuery(api.crm.getContactActivities, { contactId: contactId as Id<"crmContacts"> })
  const addNote = useMutation(api.crm.addNote)
  const deleteNote = useMutation(api.crm.deleteNote)

  const [activeTab, setActiveTab] = useState<'notes' | 'activity'>('notes')
  const [showEdit, setShowEdit] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [noteType, setNoteType] = useState<'note' | 'call' | 'email' | 'meeting'>('note')
  const [noteLoading, setNoteLoading] = useState(false)

  if (contact === undefined) {
    return (
      <AppShell navItems={dispatcherNav} title="Dispečer" primaryCount={4} subtitle="Řídicí centrum">
        <LoadingScreen />
      </AppShell>
    )
  }

  if (contact === null) {
    return (
      <AppShell navItems={dispatcherNav} title="Dispečer" primaryCount={4} subtitle="Řídicí centrum">
        <div className="p-4 md:p-6">
          <Link to="/dispatcer/crm" className="text-primary hover:underline text-sm">&larr; Zpět na kontakty</Link>
          <p className="mt-4 text-muted-foreground">Kontakt nenalezen.</p>
        </div>
      </AppShell>
    )
  }

  const handleAddNote = async () => {
    if (!noteText.trim()) return
    setNoteLoading(true)
    try {
      await addNote({ contactId: contactId as Id<"crmContacts">, text: noteText.trim(), type: noteType })
      setNoteText('')
    } catch {
      // silently fail
    } finally {
      setNoteLoading(false)
    }
  }

  const handleDeleteNote = (noteId: Id<"crmNotes">) => {
    if (confirm('Smazat tuto poznámku?')) {
      deleteNote({ noteId })
    }
  }

  return (
    <AppShell navItems={dispatcherNav} title="Dispečer" primaryCount={4} subtitle="Řídicí centrum">
      <div className="p-4 md:p-6 max-w-5xl mx-auto">
        {/* Back link */}
        <Link to="/dispatcer/crm" className="inline-flex items-center gap-1 text-sm text-primary hover:underline mb-4">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          Zpět na kontakty
        </Link>

        {/* Contact Header Card */}
        <div className="bg-card border border-border rounded-xl p-5 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="font-heading text-xl font-bold">{contact.name}</h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground border border-border">
                  {contact.type === 'company' ? 'Firma' : 'Osoba'}
                </span>
                <CrmStatusBadge status={contact.status} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-muted-foreground mt-3">
                {contact.email && (
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    {contact.email}
                  </div>
                )}
                {contact.phone && (
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                    {contact.phone}
                  </div>
                )}
                {(contact.address || contact.city) && (
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    {[contact.address, contact.city].filter(Boolean).join(', ')}
                  </div>
                )}
                {contact.ico && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">IČO</span>
                    {contact.ico}
                  </div>
                )}
                {contact.dic && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">DIČ</span>
                    {contact.dic}
                  </div>
                )}
              </div>

              {contact.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {contact.tags.map(tag => (
                    <span key={tag} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20">{tag}</span>
                  ))}
                </div>
              )}

              {contact.notes && (
                <p className="text-sm text-muted-foreground mt-3 italic">{contact.notes}</p>
              )}
            </div>

            <button onClick={() => setShowEdit(true)} className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 flex items-center gap-2 self-start">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              Upravit
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 border-b border-border">
          <button onClick={() => setActiveTab('notes')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'notes' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            Poznámky
          </button>
          <button onClick={() => setActiveTab('activity')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'activity' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            Aktivita
          </button>
        </div>

        {/* Tab Content: Notes */}
        {activeTab === 'notes' && (
          <div>
            {/* Add Note Form */}
            <div className="bg-card border border-border rounded-xl p-4 mb-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <textarea
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  placeholder="Napište poznámku..."
                  rows={2}
                  className="flex-1 px-3 py-2 bg-muted border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
                <div className="flex sm:flex-col gap-2">
                  <select value={noteType} onChange={e => setNoteType(e.target.value as typeof noteType)} className="px-3 py-2 bg-muted border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                    <option value="note">Poznámka</option>
                    <option value="call">Hovor</option>
                    <option value="email">E-mail</option>
                    <option value="meeting">Schůzka</option>
                  </select>
                  <button onClick={handleAddNote} disabled={noteLoading || !noteText.trim()} className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50">
                    {noteLoading ? '...' : 'Přidat'}
                  </button>
                </div>
              </div>
            </div>

            {/* Notes List */}
            <div className="space-y-3">
              {notes?.length === 0 && (
                <p className="text-muted-foreground text-sm text-center py-6">Zatím žádné poznámky</p>
              )}
              {notes?.map(note => (
                <div key={note._id} className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 min-w-0">
                      <span className="text-lg flex-shrink-0">{NOTE_TYPE_ICONS[note.type] ?? NOTE_TYPE_ICONS.note}</span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-muted-foreground">{NOTE_TYPE_LABELS[note.type] ?? 'Poznámka'}</span>
                          <span className="text-xs text-muted-foreground">{new Date(note._creationTime).toLocaleString('cs-CZ')}</span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap break-words">{note.text}</p>
                      </div>
                    </div>
                    <button onClick={() => handleDeleteNote(note._id)} className="p-1 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400 flex-shrink-0" title="Smazat">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab Content: Activity */}
        {activeTab === 'activity' && (
          <div className="bg-card border border-border rounded-xl p-4">
            {activities?.length === 0 && (
              <p className="text-muted-foreground text-sm text-center py-6">Zatím žádná aktivita</p>
            )}
            <div className="space-y-4">
              {activities?.map(activity => (
                <div key={activity._id} className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{activity.action}</p>
                    {activity.detail && <p className="text-xs text-muted-foreground mt-0.5 truncate">{activity.detail}</p>}
                    <p className="text-xs text-muted-foreground mt-0.5">{new Date(activity._creationTime).toLocaleString('cs-CZ')}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {showEdit && (
          <EditModal
            contact={{
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
            }}
            onClose={() => setShowEdit(false)}
          />
        )}
      </div>
    </AppShell>
  )
}
