import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { AppShell, PageHeader } from '@/components/AppShell'
import { vendingNav } from './vending'
import { useState } from 'react'
import type { Id } from '../../convex/_generated/dataModel'

export const Route = createFileRoute('/vending/sablony')({
  component: VendingSablonyPage,
})

const LOCATION_TYPES = [
  { value: 'vending_machine', label: 'Automat' },
  { value: 'parcel_locker', label: 'Parcel locker' },
  { value: 'coffee_machine', label: 'Kávovar' },
  { value: 'water_dispenser', label: 'Výdejník vody' },
  { value: 'other', label: 'Jiné' },
]

const DEFAULT_CHECKLIST_ITEMS = [
  { text: 'Potvrdit příjezd', required: true, type: 'checkbox' as const },
  { text: 'Otevřít stroj', required: true, type: 'checkbox' as const },
  { text: 'Doplnit produkty', required: true, type: 'checkbox' as const },
  { text: 'Kontrola FEFO (First Expired, First Out)', required: true, type: 'checkbox' as const },
  { text: 'Kontrola expirace', required: true, type: 'checkbox' as const },
  { text: 'Vyčistit stroj', required: true, type: 'checkbox' as const },
  { text: 'Uzavřít stroj', required: true, type: 'checkbox' as const },
  { text: 'Foto PŘED', required: true, type: 'photo' as const, hint: 'Fotografie stavu před servisem' },
  { text: 'Foto PO', required: true, type: 'photo' as const, hint: 'Fotografie stavu po servisu' },
  { text: 'Doplňující komentář', required: false, type: 'text' as const },
]

type ChecklistItem = {
  text: string
  required: boolean
  type: 'checkbox' | 'text' | 'photo'
  hint?: string
}

function ChecklistItemRow({
  item,
  index,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: {
  item: ChecklistItem
  index: number
  onChange: (item: ChecklistItem) => void
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  isFirst: boolean
  isLast: boolean
}) {
  return (
    <div className="flex items-start gap-3 p-3 bg-[hsl(var(--muted))] rounded-lg">
      <div className="flex flex-col gap-0.5">
        <button onClick={onMoveUp} disabled={isFirst} className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] disabled:opacity-30 p-0.5">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
          </svg>
        </button>
        <button onClick={onMoveDown} disabled={isLast} className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] disabled:opacity-30 p-0.5">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
        <input
          value={item.text}
          onChange={(e) => onChange({ ...item, text: e.target.value })}
          placeholder="Název položky"
          className="sm:col-span-2 px-3 py-1.5 bg-[hsl(var(--input))] border border-[hsl(var(--border))] rounded text-sm text-[hsl(var(--foreground))]"
        />
        <select
          value={item.type}
          onChange={(e) => onChange({ ...item, type: e.target.value as any })}
          className="px-3 py-1.5 bg-[hsl(var(--input))] border border-[hsl(var(--border))] rounded text-sm text-[hsl(var(--foreground))]"
        >
          <option value="checkbox">Zaškrtávátko</option>
          <option value="text">Textové pole</option>
          <option value="photo">Foto</option>
        </select>
        <input
          value={item.hint ?? ''}
          onChange={(e) => onChange({ ...item, hint: e.target.value || undefined })}
          placeholder="Nápověda (volitelné)"
          className="sm:col-span-2 px-3 py-1.5 bg-[hsl(var(--input))] border border-[hsl(var(--border))] rounded text-sm text-[hsl(var(--foreground))] text-[hsl(var(--muted-foreground))]"
        />
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={item.required}
            onChange={(e) => onChange({ ...item, required: e.target.checked })}
            className="rounded"
          />
          <span className="text-xs text-[hsl(var(--muted-foreground))]">Povinná</span>
        </label>
      </div>

      <button onClick={onDelete} className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] p-1 mt-1">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  )
}

function TemplateForm({ initial, onSave, onCancel }: {
  initial?: any
  onSave: (data: any) => Promise<void>
  onCancel: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [locationTypes, setLocationTypes] = useState<string[]>(initial?.locationTypes ?? ['vending_machine'])
  const [items, setItems] = useState<ChecklistItem[]>(initial?.items ?? DEFAULT_CHECKLIST_ITEMS)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const toggleLocType = (val: string) => {
    setLocationTypes((prev) => prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val])
  }

  const addItem = () => setItems((prev) => [...prev, { text: '', required: false, type: 'checkbox' }])

  const updateItem = (idx: number, item: ChecklistItem) => setItems((prev) => prev.map((it, i) => i === idx ? item : it))
  const deleteItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx))
  const moveItem = (idx: number, dir: -1 | 1) => {
    const next = idx + dir
    if (next < 0 || next >= items.length) return
    const arr = [...items]
    ;[arr[idx], arr[next]] = [arr[next], arr[idx]]
    setItems(arr)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name) { setError('Zadejte název šablony'); return }
    if (items.some((i) => !i.text)) { setError('Vyplňte všechny položky checklistu'); return }
    setSaving(true)
    setError('')
    try {
      await onSave({ name, description: description || undefined, locationTypes, items })
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const inputCls = "w-full px-3 py-2 bg-[hsl(var(--input))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && <div className="bg-[hsl(var(--destructive))]/15 border border-[hsl(var(--destructive))]/30 rounded-lg px-4 py-3 text-sm text-[hsl(var(--destructive))]">{error}</div>}

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 uppercase tracking-wide">Název šablony *</label>
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Standardní servis automatu" required />
        </div>
        <div>
          <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 uppercase tracking-wide">Popis</label>
          <input className={inputCls} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Volitelný popis…" />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-2 uppercase tracking-wide">Typ zařízení</label>
        <div className="flex flex-wrap gap-2">
          {LOCATION_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => toggleLocType(t.value)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${locationTypes.includes(t.value) ? 'bg-[hsl(var(--primary))]/20 border-[hsl(var(--primary))]/40 text-[hsl(var(--primary))]' : 'border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--primary))]/40'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wide">
            Položky checklistu ({items.length})
          </label>
          <button type="button" onClick={addItem} className="text-xs text-[hsl(var(--primary))] hover:underline">
            + Přidat položku
          </button>
        </div>
        <div className="space-y-2">
          {items.map((item, idx) => (
            <ChecklistItemRow
              key={idx}
              item={item}
              index={idx}
              onChange={(item) => updateItem(idx, item)}
              onDelete={() => deleteItem(idx)}
              onMoveUp={() => moveItem(idx, -1)}
              onMoveDown={() => moveItem(idx, 1)}
              isFirst={idx === 0}
              isLast={idx === items.length - 1}
            />
          ))}
          {items.length === 0 && (
            <div className="py-6 text-center text-sm text-[hsl(var(--muted-foreground))] bg-[hsl(var(--muted))] rounded-lg">
              Žádné položky — klikněte na „Přidat položku"
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={saving} className="px-6 py-2 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] rounded-lg font-semibold text-sm disabled:opacity-50">
          {saving ? 'Ukládám…' : 'Uložit šablonu'}
        </button>
        <button type="button" onClick={onCancel} className="px-6 py-2 bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] rounded-lg text-sm">
          Zrušit
        </button>
      </div>
    </form>
  )
}

function VendingSablonyPage() {
  const templates = useQuery(api.vending.listChecklistTemplates)
  const createTemplate = useMutation(api.vending.createChecklistTemplate)
  const updateTemplate = useMutation(api.vending.updateChecklistTemplate)

  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const editTemplate = templates?.find((t) => t._id === editId)

  const handleCreate = async (data: any) => {
    await createTemplate(data)
    setShowForm(false)
  }

  const handleUpdate = async (data: any) => {
    if (!editId) return
    await updateTemplate({ templateId: editId as Id<'visitChecklistTemplates'>, ...data })
    setEditId(null)
  }

  const handleToggleActive = async (t: any) => {
    await updateTemplate({ templateId: t._id, active: !t.active })
  }

  return (
    <AppShell navItems={vendingNav} title="Šablony" primaryCount={5}>
      <PageHeader
        title="Šablony checklistů"
        subtitle="Konfigurovatelné šablony pro servisní návštěvy"
        action={
          <button
            onClick={() => { setShowForm(true); setEditId(null) }}
            className="flex items-center gap-2 px-4 py-2 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] rounded-lg font-semibold text-sm hover:opacity-90"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Nová šablona
          </button>
        }
      />

      {showForm && !editId && (
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--primary))]/30 rounded-xl p-6 mb-5">
          <h3 className="font-semibold text-[hsl(var(--foreground))] mb-4">Nová šablona</h3>
          <TemplateForm onSave={handleCreate} onCancel={() => setShowForm(false)} />
        </div>
      )}

      <div className="space-y-4">
        {!templates ? (
          <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-8 text-center text-[hsl(var(--muted-foreground))]">Načítám…</div>
        ) : templates.length === 0 ? (
          <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-12 text-center">
            <div className="text-4xl mb-3">✅</div>
            <p className="text-[hsl(var(--muted-foreground))]">Žádné šablony. Vytvořte první!</p>
          </div>
        ) : templates.map((t) => (
          <div key={t._id} className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl overflow-hidden">
            {editId === t._id ? (
              <div className="p-6">
                <h3 className="font-semibold mb-4">Upravit šablonu</h3>
                <TemplateForm
                  initial={t}
                  onSave={handleUpdate}
                  onCancel={() => setEditId(null)}
                />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between px-5 py-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-[hsl(var(--foreground))]">{t.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${t.active ? 'bg-[hsl(var(--success))]/15 text-[hsl(var(--success))]' : 'bg-[hsl(var(--muted))]/50 text-[hsl(var(--muted-foreground))]'}`}>
                        {t.active ? 'Aktivní' : 'Neaktivní'}
                      </span>
                    </div>
                    {t.description && <p className="text-sm text-[hsl(var(--muted-foreground))] mt-0.5">{t.description}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setExpandedId(expandedId === t._id ? null : t._id)} className="text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">
                      {expandedId === t._id ? 'Skrýt' : 'Zobrazit'} položky
                    </button>
                    <button onClick={() => setEditId(t._id)} className="text-xs text-[hsl(var(--primary))] hover:underline">
                      Upravit
                    </button>
                    <button onClick={() => handleToggleActive(t)} className="text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">
                      {t.active ? 'Deaktivovat' : 'Aktivovat'}
                    </button>
                  </div>
                </div>

                {expandedId === t._id && (
                  <div className="border-t border-[hsl(var(--border))] px-5 py-4">
                    <p className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-3 uppercase">Položky</p>
                    <div className="space-y-1">
                      {((t as any).items ?? []).map((item: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-2 text-sm">
                          <span className="text-[hsl(var(--muted-foreground))]">
                            {item.type === 'checkbox' ? '☐' : item.type === 'photo' ? '📷' : '✍️'}
                          </span>
                          <span className={item.required ? 'text-[hsl(var(--foreground))]' : 'text-[hsl(var(--muted-foreground))]'}>
                            {item.text}
                          </span>
                          {item.required && <span className="text-[hsl(var(--destructive))] text-xs">*</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </AppShell>
  )
}
