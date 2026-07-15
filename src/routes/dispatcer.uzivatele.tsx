import { createFileRoute } from '@tanstack/react-router'
import { useConvexAuth, useMutation, useQuery, useAction } from 'convex/react'
import type { Id } from '../../convex/_generated/dataModel'
import { api } from '../../convex/_generated/api'
import { useState, useMemo } from 'react'
import { AppShell, LoadingScreen, PageHeader, StatusBadge } from '@/components/AppShell'
import { dispatcherNav } from './dispatcer'
import { AresInput } from '@/components/AresInput'

export const Route = createFileRoute('/dispatcer/uzivatele')({
  component: DispatcherUsersPage,
})

type Tab = 'customers' | 'drivers'

type UserRow = {
  _id: Id<'users'>
  _creationTime: number
  email: string
  name?: string
  phone?: string
  role: 'dispatcher' | 'driver' | 'customer'
  status: 'active' | 'pending' | 'inactive'
  corporateStatus: 'none' | 'pending' | 'approved'
  companyName?: string
  companyAddress?: string
  companyIco?: string
  companyDic?: string
  vehicleType?: string
  vehiclePlate?: string
  driverNotes?: string
  receiptEnabled?: boolean
}

type CustomerFormData = {
  name: string
  email: string
  phone: string
  companyName: string
  companyAddress: string
  companyIco: string
  companyDic: string
  corporateStatus: 'none' | 'approved'
}

const emptyForm: CustomerFormData = {
  name: '',
  email: '',
  phone: '',
  companyName: '',
  companyAddress: '',
  companyIco: '',
  companyDic: '',
  corporateStatus: 'none',
}

function CustomerModal({
  user,
  onClose,
  onSave,
  loading,
}: {
  user: UserRow | null
  onClose: () => void
  onSave: (data: CustomerFormData) => Promise<void>
  loading: boolean
}) {
  const [form, setForm] = useState<CustomerFormData>(
    user
      ? {
          name: user.name ?? '',
          email: user.email,
          phone: user.phone ?? '',
          companyName: user.companyName ?? '',
          companyAddress: user.companyAddress ?? '',
          companyIco: user.companyIco ?? '',
          companyDic: user.companyDic ?? '',
          corporateStatus: user.corporateStatus === 'approved' ? 'approved' : 'none',
        }
      : emptyForm
  )
  const [error, setError] = useState('')

  const set = (field: keyof CustomerFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.name.trim()) { setError('Jméno je povinné'); return }
    if (!form.email.trim()) { setError('E-mail je povinný'); return }
    try {
      await onSave(form)
    } catch (err: any) {
      setError(err.message ?? 'Chyba při ukládání')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-semibold text-lg">{user ? 'Upravit zákazníka' : 'Nový zákazník'}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs text-muted-foreground mb-1">Jméno a příjmení *</label>
              <input
                type="text"
                value={form.name}
                onChange={set('name')}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                placeholder="Jan Novák"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">E-mail *</label>
              <input
                type="email"
                value={form.email}
                onChange={set('email')}
                disabled={!!user}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary disabled:opacity-50"
                placeholder="jan@firma.cz"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Telefon</label>
              <input
                type="tel"
                value={form.phone}
                onChange={set('phone')}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                placeholder="+420 600 000 000"
              />
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Firemní údaje</p>
              <select
                value={form.corporateStatus}
                onChange={set('corporateStatus')}
                className="bg-background border border-border rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-primary"
              >
                <option value="none">Soukromá osoba</option>
                <option value="approved">Firemní zákazník</option>
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs text-muted-foreground mb-1">Název firmy</label>
                <input
                  type="text"
                  value={form.companyName}
                  onChange={set('companyName')}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                  placeholder="Firma s.r.o."
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs text-muted-foreground mb-1">Adresa firmy</label>
                <input
                  type="text"
                  value={form.companyAddress}
                  onChange={set('companyAddress')}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                  placeholder="Ulice 1, Praha 1, 110 00"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">IČO</label>
                <AresInput
                  ico={form.companyIco}
                  onIcoChange={(v) => setForm((f) => ({ ...f, companyIco: v }))}
                  onFilled={(data) => setForm((f) => ({
                    ...f,
                    companyName: data.companyName || f.companyName,
                    companyAddress: data.companyAddress || f.companyAddress,
                    companyDic: data.companyDic || f.companyDic,
                    corporateStatus: 'approved',
                  }))}
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">DIČ</label>
                <input
                  type="text"
                  value={form.companyDic}
                  onChange={set('companyDic')}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                  placeholder="CZ12345678"
                />
              </div>
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm border border-border rounded-lg hover:bg-secondary transition-colors"
            >
              Zrušit
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 font-medium transition-colors"
            >
              {loading ? 'Ukládám…' : user ? 'Uložit změny' : 'Přidat zákazníka'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

type DriverCreateFormData = {
  name: string
  email: string
  password: string
  phone: string
  vehicleType: string
  vehiclePlate: string
  driverNotes: string
}

function DriverCreateModal({
  onClose,
  onSave,
  loading,
}: {
  onClose: () => void
  onSave: (data: DriverCreateFormData) => Promise<void>
  loading: boolean
}) {
  const [form, setForm] = useState<DriverCreateFormData>({
    name: '',
    email: '',
    password: '',
    phone: '',
    vehicleType: '',
    vehiclePlate: '',
    driverNotes: '',
  })
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const set = (field: keyof DriverCreateFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.name.trim()) { setError('Jméno je povinné'); return }
    if (!form.email.trim()) { setError('E-mail je povinný'); return }
    if (form.password.length < 8) { setError('Heslo musí mít alespoň 8 znaků'); return }
    try { await onSave(form) } catch (err: any) { setError(err.message ?? 'Chyba při vytváření účtu') }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-semibold text-lg">Přidat řidiče</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Jméno a příjmení <span className="text-destructive">*</span></label>
            <input type="text" value={form.name} onChange={set('name')} required className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" placeholder="Jan Novák" />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">E-mail <span className="text-destructive">*</span></label>
            <input type="email" value={form.email} onChange={set('email')} required className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" placeholder="jan@example.com" />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Heslo <span className="text-destructive">*</span></label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={set('password')}
                required
                minLength={8}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:border-primary"
                placeholder="Min. 8 znaků"
              />
              <button
                type="button"
                onClick={() => setShowPassword(prev => !prev)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs px-1"
              >
                {showPassword ? 'Skrýt' : 'Zobrazit'}
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Řidič si heslo může po přihlášení změnit.</p>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Telefon</label>
            <input type="tel" value={form.phone} onChange={set('phone')} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" placeholder="+420 777 123 456" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Typ vozidla</label>
              <input type="text" value={form.vehicleType} onChange={set('vehicleType')} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" placeholder="Dodávka" />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">SPZ</label>
              <input type="text" value={form.vehiclePlate} onChange={set('vehiclePlate')} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" placeholder="1A2 3456" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Poznámky dispečera</label>
            <textarea value={form.driverNotes} onChange={set('driverNotes')} rows={2} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary resize-none" />
          </div>
          {error && <p className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 text-sm border border-border rounded-lg hover:bg-secondary transition-colors">Zrušit</button>
            <button type="submit" disabled={loading} className="flex-1 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 font-medium">
              {loading ? 'Vytvářím…' : 'Vytvořit řidiče'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function DriverEditModal({
  user,
  onClose,
  onSave,
  loading,
}: {
  user: UserRow
  onClose: () => void
  onSave: (data: { name: string; phone: string; vehicleType: string; vehiclePlate: string; driverNotes: string }) => Promise<void>
  loading: boolean
}) {
  const [form, setForm] = useState({
    name: user.name ?? '',
    phone: user.phone ?? '',
    vehicleType: user.vehicleType ?? '',
    vehiclePlate: user.vehiclePlate ?? '',
    driverNotes: user.driverNotes ?? '',
  })
  const [error, setError] = useState('')

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try { await onSave(form) } catch (err: any) { setError(err.message ?? 'Chyba') }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-semibold text-lg">Upravit řidiče</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Jméno</label>
            <input type="text" value={form.name} onChange={set('name')} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Telefon</label>
            <input type="tel" value={form.phone} onChange={set('phone')} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Typ vozidla</label>
              <input type="text" value={form.vehicleType} onChange={set('vehicleType')} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" placeholder="Dodávka" />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">SPZ</label>
              <input type="text" value={form.vehiclePlate} onChange={set('vehiclePlate')} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" placeholder="1A2 3456" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Poznámky dispečera</label>
            <textarea value={form.driverNotes} onChange={set('driverNotes')} rows={2} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary resize-none" />
          </div>
          {error && <p className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 text-sm border border-border rounded-lg hover:bg-secondary transition-colors">Zrušit</button>
            <button type="submit" disabled={loading} className="flex-1 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 font-medium">
              {loading ? 'Ukládám…' : 'Uložit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function DocumentUploadModal({
  customer,
  onClose,
}: {
  customer: UserRow
  onClose: () => void
}) {
  const generateUploadUrl = useMutation(api.documents.generateUploadUrl)
  const saveDocument = useMutation(api.documents.saveCustomerDocument)
  const deleteDocument = useMutation(api.documents.deleteCustomerDocument)
  const documents = useQuery(api.documents.getCustomerDocuments, { customerId: customer._id })

  const [uploading, setUploading] = useState(false)
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)
    setSuccess(false)
    try {
      const uploadUrl = await generateUploadUrl()
      const res = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      })
      if (!res.ok) throw new Error('Upload selhal')
      const { storageId } = await res.json()
      await saveDocument({
        customerId: customer._id,
        storageId,
        filename: file.name,
        description: description.trim() || undefined,
      })
      setSuccess(true)
      setDescription('')
      e.target.value = ''
      setTimeout(() => setSuccess(false), 3000)
      console.log(`Document uploaded for customer ${customer._id}: ${file.name}`)
    } catch (err) {
      console.error('Document upload error:', err)
      setError('Nahrání souboru selhalo. Zkuste to znovu.')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (docId: Id<'customerDocuments'>) => {
    if (!confirm('Opravdu smazat tento dokument?')) return
    await deleteDocument({ documentId: docId })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="font-heading font-bold text-base">Dokumenty zákazníka</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{customer.name || customer.email}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors text-lg">✕</button>
        </div>

        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Upload form */}
          <div className="bg-muted/30 border border-dashed border-border rounded-xl p-4 space-y-3">
            <p className="text-sm font-medium">Nahrát nový dokument</p>
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">Popis (volitelný)</label>
              <input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Faktura #2024-001, Smlouva..."
                className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">Soubor (PDF, max 10 MB)</label>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                onChange={handleUpload}
                disabled={uploading}
                className="w-full text-sm text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 disabled:opacity-50 cursor-pointer"
              />
            </div>
            {uploading && <p className="text-xs text-muted-foreground">⏳ Nahrávám soubor...</p>}
            {success && <p className="text-xs text-green-400 font-medium">✓ Soubor byl úspěšně nahrán</p>}
            {error && <p className="text-xs text-destructive bg-destructive/10 rounded px-2 py-1">{error}</p>}
          </div>

          {/* Document list */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Nahrané dokumenty ({documents?.length ?? 0})
            </p>
            {documents === undefined ? (
              <p className="text-sm text-muted-foreground text-center py-4">Načítám...</p>
            ) : documents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Žádné dokumenty</p>
            ) : (
              <div className="space-y-2">
                {documents.map(doc => (
                  <div key={doc._id} className="flex items-center gap-3 bg-muted/20 border border-border rounded-lg px-3 py-2.5">
                    <span className="text-lg flex-shrink-0">📄</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{doc.filename}</p>
                      {doc.description && <p className="text-xs text-muted-foreground truncate">{doc.description}</p>}
                      <p className="text-xs text-muted-foreground/60">
                        {new Date(doc.uploadedAt).toLocaleDateString('cs-CZ')}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {doc.url && (
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-1 text-xs bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
                        >
                          ↓ Stáhnout
                        </a>
                      )}
                      <button
                        onClick={() => handleDelete(doc._id)}
                        className="px-2 py-1 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                        title="Smazat"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="px-5 py-3 border-t border-border">
          <button onClick={onClose} className="w-full px-4 py-2 text-sm border border-border rounded-lg hover:bg-secondary transition-colors">
            Zavřít
          </button>
        </div>
      </div>
    </div>
  )
}

function ResetPasswordModal({ user, onClose, onSave }: {
  user: UserRow
  onClose: () => void
  onSave: (userId: Id<'users'>, newPassword: string) => Promise<void>
}) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [show, setShow] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError('Heslo musí mít alespoň 8 znaků'); return }
    if (password !== confirm) { setError('Hesla se neshodují'); return }
    setLoading(true)
    try {
      await onSave(user._id, password)
      onClose()
    } catch (err: any) {
      setError(err.message ?? 'Chyba')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h2 className="font-semibold text-lg">Reset hesla</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{user.name || user.email}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Nové heslo</label>
            <div className="relative">
              <input
                type={show ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary pr-16"
                placeholder="Min. 8 znaků"
                required
              />
              <button type="button" onClick={() => setShow(s => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs px-1">
                {show ? 'Skrýt' : 'Zobrazit'}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Potvrdit heslo</label>
            <input
              type={show ? 'text' : 'password'}
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
              placeholder="Zopakujte heslo"
              required
            />
          </div>
          {error && <p className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 text-sm border border-border rounded-lg hover:bg-secondary transition-colors">Zrušit</button>
            <button type="submit" disabled={loading} className="flex-1 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 font-medium">
              {loading ? 'Ukládám…' : 'Nastavit heslo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function DispatcherUsersPage() {
  const { isAuthenticated } = useConvexAuth()
  const [tab, setTab] = useState<Tab>('customers')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'name_az' | 'name_za' | 'date_new' | 'date_old'>('date_new')
  const [statusFilter, setStatusFilter] = useState<'' | 'active' | 'inactive' | 'pending'>('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showAddCustomer, setShowAddCustomer] = useState(false)
  const [showAddDriver, setShowAddDriver] = useState(false)
  const [editingUser, setEditingUser] = useState<UserRow | null>(null)
  const [docUploadUser, setDocUploadUser] = useState<UserRow | null>(null)
  const [modalLoading, setModalLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const drivers = useQuery(api.users.listUsersByRole, { role: 'driver' })
  const customers = useQuery(api.users.listUsersByRole, { role: 'customer' })

  const createDriver = useAction(api.users.adminCreateDriver)
  const createCustomer = useMutation(api.users.createCustomer)
  const updateUser = useMutation(api.users.updateUser)
  const updateStatus = useMutation(api.users.updateUserStatus)
  const approveCorporate = useMutation(api.users.approveCorporateAccount)
  const deleteUser = useMutation(api.users.deleteUser)
  const bulkUpdateStatus = useMutation(api.users.bulkUpdateStatus)
  const bulkDeleteUsers = useMutation(api.users.bulkDeleteUsers)
  const bulkApproveCorporate = useMutation(api.users.bulkApproveCorporate)
  const toggleReceipts = useMutation(api.siteSettings.toggleCustomerReceipts)
  const resetPasswordAction = useAction(api.users.adminResetPassword)
  const [resetPasswordUser, setResetPasswordUser] = useState<UserRow | null>(null)

  const allUsers = tab === 'customers' ? (customers ?? []) : (drivers ?? [])

  const filtered = useMemo(() => {
    let r = [...allUsers]
    // text search
    const q = search.toLowerCase().trim()
    if (q) {
      r = r.filter(u =>
        (u.name ?? '').toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.phone ?? '').includes(q) ||
        (u.companyName ?? '').toLowerCase().includes(q) ||
        (u.companyIco ?? '').includes(q)
      )
    }
    // status filter
    if (statusFilter === 'pending') {
      r = r.filter(u => u.status === 'pending' || u.corporateStatus === 'pending')
    } else if (statusFilter) {
      r = r.filter(u => u.status === statusFilter)
    }
    // sort
    r.sort((a, b) => {
      if (sortBy === 'name_az') return (a.name ?? a.email).localeCompare(b.name ?? b.email)
      if (sortBy === 'name_za') return (b.name ?? b.email).localeCompare(a.name ?? a.email)
      if (sortBy === 'date_old') return a._creationTime - b._creationTime
      return b._creationTime - a._creationTime // date_new
    })
    return r
  }, [allUsers, search, statusFilter, sortBy])

  const selectedList = Array.from(selected) as Id<'users'>[]
  const allSelectedOnPage = filtered.length > 0 && filtered.every(u => selected.has(u._id))

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (allSelectedOnPage) {
      setSelected(prev => {
        const next = new Set(prev)
        filtered.forEach(u => next.delete(u._id))
        return next
      })
    } else {
      setSelected(prev => {
        const next = new Set(prev)
        filtered.forEach(u => next.add(u._id))
        return next
      })
    }
  }

  const clearSelection = () => setSelected(new Set())

  const handleBulkActivate = async () => {
    if (!selectedList.length) return
    setActionLoading(true)
    try { await bulkUpdateStatus({ userIds: selectedList, status: 'active' }) }
    finally { setActionLoading(false); clearSelection() }
  }

  const handleBulkDeactivate = async () => {
    if (!selectedList.length) return
    setActionLoading(true)
    try { await bulkUpdateStatus({ userIds: selectedList, status: 'inactive' }) }
    finally { setActionLoading(false); clearSelection() }
  }

  const handleBulkDelete = async () => {
    if (!selectedList.length) return
    if (!confirm(`Opravdu smazat ${selectedList.length} uživatelů? Tato akce je nevratná.`)) return
    setActionLoading(true)
    try { await bulkDeleteUsers({ userIds: selectedList }) }
    finally { setActionLoading(false); clearSelection() }
  }

  const handleBulkApproveCorporate = async () => {
    if (!selectedList.length) return
    setActionLoading(true)
    try { await bulkApproveCorporate({ userIds: selectedList }) }
    finally { setActionLoading(false); clearSelection() }
  }

  const handleResetPassword = async (userId: Id<'users'>, newPassword: string) => {
    await resetPasswordAction({ userId, newPassword })
    alert('Heslo bylo úspěšně změněno.')
  }

  const handleSaveCustomer = async (data: CustomerFormData) => {
    setModalLoading(true)
    try {
      if (editingUser) {
        await updateUser({
          userId: editingUser._id,
          name: data.name || undefined,
          phone: data.phone || undefined,
          companyName: data.companyName || undefined,
          companyAddress: data.companyAddress || undefined,
          companyIco: data.companyIco || undefined,
          companyDic: data.companyDic || undefined,
          corporateStatus: data.corporateStatus,
        })
      } else {
        await createCustomer({
          name: data.name,
          email: data.email,
          phone: data.phone || undefined,
          companyName: data.companyName || undefined,
          companyAddress: data.companyAddress || undefined,
          companyIco: data.companyIco || undefined,
          companyDic: data.companyDic || undefined,
          corporateStatus: data.corporateStatus,
        })
      }
      setShowAddCustomer(false)
      setEditingUser(null)
    } finally {
      setModalLoading(false)
    }
  }

  const handleCreateDriver = async (data: DriverCreateFormData) => {
    setModalLoading(true)
    try {
      await createDriver({
        name: data.name,
        email: data.email,
        password: data.password,
        phone: data.phone || undefined,
        vehicleType: data.vehicleType || undefined,
        vehiclePlate: data.vehiclePlate || undefined,
        driverNotes: data.driverNotes || undefined,
      })
      setShowAddDriver(false)
    } finally {
      setModalLoading(false)
    }
  }

  const handleSaveDriver = async (data: { name: string; phone: string; vehicleType: string; vehiclePlate: string; driverNotes: string }) => {
    if (!editingUser) return
    setModalLoading(true)
    try {
      await updateUser({
        userId: editingUser._id,
        name: data.name || undefined,
        phone: data.phone || undefined,
        vehicleType: data.vehicleType || undefined,
        vehiclePlate: data.vehiclePlate || undefined,
        driverNotes: data.driverNotes || undefined,
      })
      setEditingUser(null)
    } finally {
      setModalLoading(false)
    }
  }

  const handleStatusToggle = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active'
    await updateStatus({ userId: userId as Id<'users'>, status: newStatus as any })
  }

  const handleApprove = async (userId: string, approved: boolean) => {
    await approveCorporate({ userId: userId as Id<'users'>, approved })
  }

  const handleDelete = async (userId: string) => {
    if (!confirm('Opravdu smazat uživatele? Tato akce je nevratná.')) return
    await deleteUser({ userId: userId as Id<'users'> })
  }

  const handleToggleReceipts = async (user: UserRow) => {
    // default: enabled for non-corporate, disabled for corporate
    const currentEnabled = user.receiptEnabled ?? (user.corporateStatus !== 'approved')
    await toggleReceipts({ customerId: user._id, enabled: !currentEnabled })
  }

  if (!isAuthenticated || drivers === undefined || customers === undefined) return <LoadingScreen />

  const pendingDrivers = drivers.filter(d => d.status === 'pending').length
  const pendingCorporate = customers.filter(c => c.corporateStatus === 'pending').length

  return (
    <AppShell navItems={dispatcherNav} title="Dispečer" primaryCount={4} subtitle="Řídicí centrum">
      <div className="p-4 sm:p-6 max-w-5xl mx-auto">
        <PageHeader title="Správa uživatelů" subtitle="Zákazníci, řidiči a přístupy" />

        {(pendingDrivers > 0 || pendingCorporate > 0) && (
          <div className="bg-amber-950/30 border border-amber-700/50 rounded-xl p-4 mb-5">
            <p className="text-amber-300 font-medium text-sm">
              ⏳{' '}
              {[
                pendingDrivers > 0 && `${pendingDrivers} řidičů čeká na schválení`,
                pendingCorporate > 0 && `${pendingCorporate} firemních žádostí čeká na schválení`,
              ].filter(Boolean).join(' · ')}
            </p>
          </div>
        )}

        {/* Header row: tabs + search + add button */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
          <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
            {([['customers', 'Zákazníci', customers.length], ['drivers', 'Řidiči', drivers.length]] as const).map(([key, label, count]) => (
              <button key={key} onClick={() => { setTab(key); clearSelection() }}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                  tab === key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}>
                {label}
                <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">{count}</span>
              </button>
            ))}
          </div>

          <div className="flex-1 flex flex-wrap gap-2">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={tab === 'customers' ? 'Hledat zákazníka…' : 'Hledat řidiče…'}
              className="flex-1 min-w-40 bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
            />
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as typeof sortBy)}
              className="px-3 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:border-primary text-foreground">
              <option value="date_new">↓ Nejnovější</option>
              <option value="date_old">↑ Nejstarší</option>
              <option value="name_az">A → Z</option>
              <option value="name_za">Z → A</option>
            </select>
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value as typeof statusFilter); clearSelection() }}
              className="px-3 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:border-primary text-foreground">
              <option value="">Všechny stavy</option>
              <option value="active">✓ Aktivní</option>
              <option value="inactive">✗ Neaktivní</option>
              <option value="pending">⏳ Čeká na schválení</option>
            </select>
            {tab === 'customers' && (
              <button
                onClick={() => { setEditingUser(null); setShowAddCustomer(true) }}
                className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors whitespace-nowrap"
              >
                + Přidat zákazníka
              </button>
            )}
            {tab === 'drivers' && (
              <button
                onClick={() => setShowAddDriver(true)}
                className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors whitespace-nowrap"
              >
                + Přidat řidiče
              </button>
            )}
          </div>
        </div>

        {/* Bulk action bar */}
        {selected.size > 0 && (
          <div className="bg-primary/10 border border-primary/30 rounded-xl p-3 mb-4 flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-primary mr-2">{selected.size} vybráno</span>
            <button onClick={handleBulkActivate} disabled={actionLoading}
              className="px-3 py-1.5 bg-green-700 text-white text-xs font-medium rounded-lg hover:bg-green-800 disabled:opacity-50">
              ✓ Aktivovat
            </button>
            <button onClick={handleBulkDeactivate} disabled={actionLoading}
              className="px-3 py-1.5 bg-secondary text-secondary-foreground text-xs font-medium rounded-lg hover:bg-secondary/80 disabled:opacity-50">
              Deaktivovat
            </button>
            {tab === 'customers' && (
              <button onClick={handleBulkApproveCorporate} disabled={actionLoading}
                className="px-3 py-1.5 bg-blue-700 text-white text-xs font-medium rounded-lg hover:bg-blue-800 disabled:opacity-50">
                🏢 Schválit firemní
              </button>
            )}
            <button onClick={handleBulkDelete} disabled={actionLoading}
              className="px-3 py-1.5 bg-destructive/20 text-destructive text-xs font-medium rounded-lg hover:bg-destructive/30 border border-destructive/30 disabled:opacity-50">
              🗑 Smazat
            </button>
            <button onClick={clearSelection} className="ml-auto text-xs text-muted-foreground hover:text-foreground">
              Zrušit výběr
            </button>
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-10 text-center">
            <p className="text-muted-foreground text-sm">
              {search ? 'Žádné výsledky pro hledaný výraz' : 'Žádní uživatelé'}
            </p>
            {!search && tab === 'drivers' && (
              <button
                onClick={() => setShowAddDriver(true)}
                className="mt-4 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90"
              >
                + Přidat prvního řidiče
              </button>
            )}
            {!search && tab === 'customers' && (
              <button
                onClick={() => { setEditingUser(null); setShowAddCustomer(true) }}
                className="mt-4 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90"
              >
                + Přidat prvního zákazníka
              </button>
            )}
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {/* Table header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-muted/30">
              <input
                type="checkbox"
                checked={allSelectedOnPage}
                onChange={toggleAll}
                className="rounded border-border w-4 h-4 accent-primary"
              />
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider flex-1">
                {tab === 'customers' ? `Zákazník` : 'Řidič'} · {filtered.length} záznamů
              </span>
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider hidden sm:block w-24 text-center">Stav</span>
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider w-32 text-right">Akce</span>
            </div>

            {/* Rows */}
            <div className="divide-y divide-border">
              {filtered.map((user) => (
                <div
                  key={user._id}
                  className={`flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors ${
                    selected.has(user._id) ? 'bg-primary/5' : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(user._id)}
                    onChange={() => toggleSelect(user._id)}
                    className="rounded border-border w-4 h-4 accent-primary flex-shrink-0"
                  />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{user.name || '(bez jména)'}</span>
                      {tab === 'customers' && user.corporateStatus === 'approved' && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-900/40 text-blue-400 font-medium">🏢 Firemní</span>
                      )}
                      {tab === 'customers' && user.corporateStatus === 'pending' && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-900/40 text-amber-400 font-medium">⏳ Žádost o firmu</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    {user.phone && <p className="text-xs text-muted-foreground">{user.phone}</p>}
                    {tab === 'customers' && user.companyName && (
                      <p className="text-xs text-muted-foreground/70 truncate">
                        {user.companyName}{user.companyIco ? ` · IČO ${user.companyIco}` : ''}
                      </p>
                    )}
                    {tab === 'drivers' && user.vehicleType && (
                      <p className="text-xs text-muted-foreground/70">
                        🚐 {user.vehicleType}{user.vehiclePlate ? ` · ${user.vehiclePlate}` : ''}
                      </p>
                    )}
                  </div>

                  {/* Status badge */}
                  <div className="hidden sm:flex w-24 justify-center">
                    <StatusBadge status={user.status} />
                  </div>

                  {/* Per-row actions */}
                  <div className="flex items-center gap-1 w-32 justify-end flex-shrink-0">
                    {/* Approve pending */}
                    {user.status === 'pending' && (
                      <button
                        onClick={() => handleStatusToggle(user._id, user.status)}
                        title="Schválit"
                        className="px-2 py-1 bg-green-700 text-white text-xs font-medium rounded-lg hover:bg-green-800"
                      >
                        ✓
                      </button>
                    )}

                    {/* Corporate approve */}
                    {user.corporateStatus === 'pending' && (
                      <button
                        onClick={() => handleApprove(user._id, true)}
                        title="Schválit firemní účet"
                        className="px-2 py-1 bg-blue-700 text-white text-xs font-medium rounded-lg hover:bg-blue-800"
                      >
                        🏢
                      </button>
                    )}

                    {/* Toggle active/inactive */}
                    <button
                      onClick={() => handleStatusToggle(user._id, user.status)}
                      title={user.status === 'active' ? 'Deaktivovat' : 'Aktivovat'}
                      className={`px-2 py-1 text-xs font-medium rounded-lg transition-colors ${
                        user.status === 'active'
                          ? 'text-muted-foreground hover:text-destructive hover:bg-destructive/10'
                          : 'bg-green-700 text-white hover:bg-green-800'
                      }`}
                    >
                      {user.status === 'active' ? '⏸' : '▶'}
                    </button>

                    {/* Receipt toggle (customers only) */}
                    {tab === 'customers' && (() => {
                      const u = user as UserRow
                      const receiptsOn = u.receiptEnabled ?? (u.corporateStatus !== 'approved')
                      return (
                        <button
                          onClick={() => handleToggleReceipts(u)}
                          title={receiptsOn ? 'Účtenky zapnuty – kliknout pro vypnutí' : 'Účtenky vypnuty – kliknout pro zapnutí'}
                          className={`px-2 py-1 text-xs rounded-lg transition-colors ${
                            receiptsOn
                              ? 'text-green-400 hover:bg-green-900/30'
                              : 'text-muted-foreground/40 hover:text-muted-foreground hover:bg-secondary'
                          }`}
                        >
                          🧾
                        </button>
                      )
                    })()}

                    {/* Documents (customers only) */}
                    {tab === 'customers' && (
                      <button
                        onClick={() => setDocUploadUser(user as UserRow)}
                        title="Dokumenty"
                        className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
                      >
                        📎
                      </button>
                    )}

                    {/* Reset password */}
                    <button
                      onClick={() => setResetPasswordUser(user as UserRow)}
                      title="Reset hesla"
                      className="px-2 py-1 text-xs text-muted-foreground hover:text-amber-400 hover:bg-amber-900/20 rounded-lg transition-colors"
                    >
                      🔑
                    </button>

                    {/* Edit */}
                    <button
                      onClick={() => setEditingUser(user as UserRow)}
                      title="Upravit"
                      className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
                    >
                      ✎
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(user._id)}
                      title="Smazat"
                      className="px-2 py-1 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Customer modal (add / edit) */}
      {(showAddCustomer || (editingUser && editingUser.role === 'customer')) && (
        <CustomerModal
          user={editingUser}
          onClose={() => { setShowAddCustomer(false); setEditingUser(null) }}
          onSave={handleSaveCustomer}
          loading={modalLoading}
        />
      )}

      {/* Driver create modal */}
      {showAddDriver && (
        <DriverCreateModal
          onClose={() => setShowAddDriver(false)}
          onSave={handleCreateDriver}
          loading={modalLoading}
        />
      )}

      {/* Driver edit modal */}
      {editingUser && editingUser.role === 'driver' && (
        <DriverEditModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSave={handleSaveDriver}
          loading={modalLoading}
        />
      )}

      {/* Document upload modal */}
      {docUploadUser && (
        <DocumentUploadModal
          customer={docUploadUser}
          onClose={() => setDocUploadUser(null)}
        />
      )}

      {/* Reset password modal */}
      {resetPasswordUser && (
        <ResetPasswordModal
          user={resetPasswordUser}
          onClose={() => setResetPasswordUser(null)}
          onSave={handleResetPassword}
        />
      )}
    </AppShell>
  )
}
