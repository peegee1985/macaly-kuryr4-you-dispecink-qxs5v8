import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import React, { useState, useMemo, useRef } from 'react'
import type { Id } from '../../convex/_generated/dataModel'
import { AppShell, PageHeader, LoadingScreen } from '@/components/AppShell'
import { dispatcherNav } from './dispatcer'
import { calcAll2025, parsePayslipsCsv as parsePayslipsCsvUtil, RATES_2025 } from '@/lib/payslipCalc'

export const Route = createFileRoute('/dispatcer/zamestnanci/$employeeId')({
  component: EmployeeDetailPage,
})

const CONTRACT_LABELS: Record<string, string> = { hpp: 'HPP', dpp: 'DPP', dpc: 'DPČ', osvc: 'OSVČ' }
const SALARY_LABELS: Record<string, string> = { hourly: 'Hodinová', monthly: 'Měsíční', per_delivery: 'Za doručení' }
const LEAVE_TYPE_LABELS: Record<string, string> = { vacation: 'Dovolená', sick: 'Nemocenská', unpaid: 'Neplacené', other: 'Ostatní' }
const MONTH_NAMES = ['Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen', 'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec']

function LeaveStatusBadge({ status }: { status: string }) {
  const c: Record<string, { label: string; cls: string }> = {
    pending: { label: 'Čeká', cls: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
    approved: { label: 'Schváleno', cls: 'bg-green-500/20 text-green-300 border-green-500/30' },
    rejected: { label: 'Zamítnuto', cls: 'bg-red-500/20 text-red-300 border-red-500/30' },
  }
  const cfg = c[status] ?? { label: status, cls: 'bg-muted text-muted-foreground border-border' }
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${cfg.cls}`}>{cfg.label}</span>
}

function PayslipStatusBadge({ status }: { status: string }) {
  const c: Record<string, { label: string; cls: string }> = {
    draft: { label: 'Koncept', cls: 'bg-muted text-muted-foreground border-border' },
    finalized: { label: 'Finalizováno', cls: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
    sent: { label: 'Odesláno', cls: 'bg-green-500/20 text-green-300 border-green-500/30' },
  }
  const cfg = c[status] ?? { label: status, cls: 'bg-muted text-muted-foreground border-border' }
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${cfg.cls}`}>{cfg.label}</span>
}

function EmployeeDetailPage() {
  const { employeeId } = Route.useParams()
  const employee = useQuery(api.hr.getEmployee, { employeeId: employeeId as Id<'employees'> })
  const drivers = useQuery(api.hr.listDriversForLinking)
  const linkMutation = useMutation(api.hr.linkEmployeeToUser)
  const [tab, setTab] = useState<'shifts' | 'leave' | 'payslips' | 'payslip'>('shifts')
  const [linkingDriver, setLinkingDriver] = useState(false)
  const [selectedDriver, setSelectedDriver] = useState('')
  const [linking, setLinking] = useState(false)

  if (employee === undefined) {
    return <AppShell navItems={dispatcherNav} title="Dispečer" primaryCount={4} subtitle="Řídicí centrum"><LoadingScreen /></AppShell>
  }

  if (!employee) {
    return (
      <AppShell navItems={dispatcherNav} title="Dispečer" primaryCount={4} subtitle="Řídicí centrum">
        <div className="text-center py-12 text-muted-foreground">
          Zaměstnanec nenalezen.{' '}
          <Link to="/dispatcer/zamestnanci" className="text-primary hover:underline">Zpět na seznam</Link>
        </div>
      </AppShell>
    )
  }

  async function handleLink() {
    if (!selectedDriver) return
    setLinking(true)
    try {
      await linkMutation({ employeeId: employeeId as Id<'employees'>, userId: selectedDriver as Id<'users'> })
      setLinkingDriver(false)
      setSelectedDriver('')
    } catch (e: unknown) {
      alert((e as Error).message)
    } finally {
      setLinking(false)
    }
  }

  async function handleUnlink() {
    if (!confirm('Odpojit přiřazeného řidiče?')) return
    setLinking(true)
    try {
      await linkMutation({ employeeId: employeeId as Id<'employees'>, userId: undefined })
    } finally {
      setLinking(false)
    }
  }

  return (
    <AppShell navItems={dispatcherNav} title="Dispečer" primaryCount={4} subtitle="Řídicí centrum">
      {/* Header */}
      <div className="mb-6">
        <Link to="/dispatcer/zamestnanci" className="text-sm text-muted-foreground hover:text-primary transition mb-2 inline-block">
          &larr; Zpět na seznam
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{employee.firstName} {employee.lastName}</h1>
            <p className="text-sm text-muted-foreground">
              {employee.position || 'Bez pozice'} &middot; {CONTRACT_LABELS[employee.contractType]} &middot; {SALARY_LABELS[employee.salaryType]}
              {employee.salaryAmount ? ` (${employee.salaryAmount} Kč)` : ''}
            </p>
          </div>
          {/* Driver link badge */}
          <div className="flex items-center gap-2">
            {employee.linkedUserId ? (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 border border-primary/30 rounded-lg text-xs font-medium text-primary">
                  🔗 Propojeno s řidičem
                </span>
                <button
                  onClick={handleUnlink}
                  disabled={linking}
                  className="text-xs px-2 py-1.5 rounded-lg bg-muted text-muted-foreground hover:bg-red-500/10 hover:text-red-400 transition"
                >
                  Odpojit
                </button>
              </div>
            ) : (
              <button
                onClick={() => setLinkingDriver(!linkingDriver)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted border border-border rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground transition"
              >
                🔗 Propojit s řidičem
              </button>
            )}
          </div>
        </div>

        {/* Link driver panel */}
        {linkingDriver && !employee.linkedUserId && (
          <div className="mt-3 p-4 bg-card border border-border rounded-xl flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-48">
              <label className="block text-xs text-muted-foreground mb-1">Vyberte řidiče</label>
              <select
                value={selectedDriver}
                onChange={(e) => setSelectedDriver(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">— Vyberte řidiče —</option>
                {(drivers ?? []).map((d) => (
                  <option key={d._id} value={d._id}>{d.name || d.email} ({d.email})</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleLink}
                disabled={!selectedDriver || linking}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
              >
                {linking ? 'Ukládám...' : 'Propojit'}
              </button>
              <button
                onClick={() => { setLinkingDriver(false); setSelectedDriver('') }}
                className="px-4 py-2 bg-muted text-foreground rounded-lg text-sm hover:bg-muted/80 transition"
              >
                Zrušit
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-muted/30 rounded-lg p-1 overflow-x-auto w-fit max-w-full">
        {[
          { key: 'shifts' as const, label: 'Směny' },
          { key: 'leave' as const, label: 'Dovolená' },
          { key: 'payslips' as const, label: 'Výplatní pásky' },
          { key: 'payslip' as const, label: 'Nastavení výplaty' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition whitespace-nowrap ${
              tab === t.key
                ? 'bg-card text-foreground shadow-sm border border-border'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'shifts' && <ShiftsTab employeeId={employeeId as Id<'employees'>} hasLinkedUser={!!employee.linkedUserId} employeeName={`${employee.firstName} ${employee.lastName}`} />}
      {tab === 'leave' && <LeaveTab employeeId={employeeId as Id<'employees'>} />}
      {tab === 'payslips' && <PayslipsTab employeeId={employeeId as Id<'employees'>} employeeName={`${employee.firstName} ${employee.lastName}`} employeePosition={employee.position} employeeContractType={employee.contractType} />}
      {tab === 'payslip' && <PayslipSettingsTab employeeId={employeeId as Id<'employees'>} />}
    </AppShell>
  )
}

// ── Shifts Tab ──────────────────────────────────────────────────────────────

type ShiftType = 'regular' | 'overtime' | 'night' | 'holiday'
const SHIFT_TYPE_LABELS: Record<ShiftType, string> = {
  regular: 'Běžná', overtime: 'Přesčas', night: 'Noční', holiday: 'Svátek',
}
const WEEKDAY_LABELS = ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So']

function emptyShiftForm() {
  return {
    date: new Date().toISOString().slice(0, 10),
    plannedStart: '', plannedEnd: '',
    clockInTime: '', clockOutTime: '',
    type: 'regular' as ShiftType,
    notes: '',
  }
}

function exportShiftsCsv(shifts: Array<{
  date: string; plannedStart?: string; plannedEnd?: string
  clockIn?: number; clockOut?: number; hoursWorked?: number
  type: string; notes?: string
}>, employeeName: string) {
  const headers = ['Datum', 'Plánovaný příchod', 'Plánovaný odchod', 'Skutečný příchod', 'Skutečný odchod', 'Odpracováno (h)', 'Typ', 'Poznámka']
  const rows = shifts.map((s) => [
    s.date,
    s.plannedStart ?? '',
    s.plannedEnd ?? '',
    s.clockIn ? new Date(s.clockIn).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' }) : '',
    s.clockOut ? new Date(s.clockOut).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' }) : '',
    s.hoursWorked != null ? s.hoursWorked.toFixed(2) : '',
    SHIFT_TYPE_LABELS[s.type as ShiftType] ?? s.type,
    s.notes ?? '',
  ])
  const lines = [headers.join(';'), ...rows.map((r) => r.join(';'))]
  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `dochazka_${employeeName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function ShiftFormFields({
  form,
  onChange,
}: {
  form: ReturnType<typeof emptyShiftForm>
  onChange: (key: string, val: string) => void
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      <div className="col-span-2 md:col-span-1">
        <label className="block text-xs text-muted-foreground mb-1">Datum *</label>
        <input type="date" value={form.date} onChange={(e) => onChange('date', e.target.value)}
          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
      </div>
      <div>
        <label className="block text-xs text-muted-foreground mb-1">Plán příchod</label>
        <input type="time" value={form.plannedStart} onChange={(e) => onChange('plannedStart', e.target.value)}
          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
      </div>
      <div>
        <label className="block text-xs text-muted-foreground mb-1">Plán odchod</label>
        <input type="time" value={form.plannedEnd} onChange={(e) => onChange('plannedEnd', e.target.value)}
          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
      </div>
      <div>
        <label className="block text-xs text-muted-foreground mb-1">Skutečný příchod</label>
        <input type="time" value={form.clockInTime} onChange={(e) => onChange('clockInTime', e.target.value)}
          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
      </div>
      <div>
        <label className="block text-xs text-muted-foreground mb-1">Skutečný odchod</label>
        <input type="time" value={form.clockOutTime} onChange={(e) => onChange('clockOutTime', e.target.value)}
          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
      </div>
      <div>
        <label className="block text-xs text-muted-foreground mb-1">Typ směny</label>
        <select value={form.type} onChange={(e) => onChange('type', e.target.value)}
          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50">
          {Object.entries(SHIFT_TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>
      <div className="col-span-2 md:col-span-3">
        <label className="block text-xs text-muted-foreground mb-1">Poznámka</label>
        <input value={form.notes} onChange={(e) => onChange('notes', e.target.value)} placeholder="Volitelná poznámka"
          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
      </div>
    </div>
  )
}

function ShiftsTab({ employeeId, hasLinkedUser, employeeName }: { employeeId: Id<'employees'>; hasLinkedUser: boolean; employeeName: string }) {
  const shifts = useQuery(api.hr.getEmployeeShifts, { employeeId })
  const clockInMut = useMutation(api.hr.clockIn)
  const clockOutMut = useMutation(api.hr.clockOut)
  const importAvailability = useMutation(api.hr.importAvailabilityAsShifts)
  const createShift = useMutation(api.hr.createShift)
  const updateShift = useMutation(api.hr.updateShift)
  const deleteShiftMut = useMutation(api.hr.deleteShift)
  const copyShiftToDays = useMutation(api.hr.copyShiftToDays)

  const [loading, setLoading] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [importMonth, setImportMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [importResult, setImportResult] = useState<{ created: number; skipped: number; error?: string } | null>(null)
  const [importing, setImporting] = useState(false)

  // Add / Edit form
  const [showAddForm, setShowAddForm] = useState(false)
  const [addForm, setAddForm] = useState(emptyShiftForm)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState(emptyShiftForm)

  // Copy to days
  const [showCopy, setShowCopy] = useState(false)
  const [copyForm, setCopyForm] = useState({
    plannedStart: '', plannedEnd: '', clockInTime: '', clockOutTime: '',
    type: 'regular' as ShiftType, notes: '',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
    weekdays: [1, 2, 3, 4, 5] as number[],
    skipExisting: true,
  })
  const [copyResult, setCopyResult] = useState<{ created: number; skipped: number } | null>(null)
  const [copying, setCopying] = useState(false)

  // Filter by month
  const [filterMonth, setFilterMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })

  // useMemo must be before any early return — hooks rules
  const filteredShifts = useMemo(() => {
    if (!shifts) return []
    if (!filterMonth) return shifts
    return shifts.filter((s) => s.date.startsWith(filterMonth))
  }, [shifts, filterMonth])

  const totalHours = useMemo(() => filteredShifts.reduce((acc, s) => acc + (s.hoursWorked ?? 0), 0), [filteredShifts])

  if (shifts === undefined) return <LoadingScreen />

  const activeShift = shifts.find((s) => s.clockIn && !s.clockOut)

  function formatTime(ts: number | undefined) {
    if (!ts) return '—'
    return new Date(ts).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })
  }

  // --- handlers ---
  async function handleImport() {
    setImporting(true)
    setImportResult(null)
    try {
      const [year, month] = importMonth.split('-').map(Number)
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`
      const lastDay = new Date(year, month, 0).getDate()
      const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
      const result = await importAvailability({ employeeId, startDate, endDate })
      setImportResult(result)
    } catch (e: unknown) {
      setImportResult({ created: 0, skipped: 0, error: (e as Error).message })
    } finally {
      setImporting(false)
    }
  }

  async function handleAddShift() {
    if (!addForm.date) return
    setSaving(true)
    try {
      await createShift({
        employeeId,
        date: addForm.date,
        plannedStart: addForm.plannedStart || undefined,
        plannedEnd: addForm.plannedEnd || undefined,
        clockInTime: addForm.clockInTime || undefined,
        clockOutTime: addForm.clockOutTime || undefined,
        type: addForm.type,
        notes: addForm.notes || undefined,
      })
      setShowAddForm(false)
      setAddForm(emptyShiftForm())
    } catch (e: unknown) {
      alert((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  type ShiftItem = NonNullable<typeof shifts>[number]
  function startEdit(shift: ShiftItem) {
    setEditId(shift._id)
    setEditForm({
      date: shift.date,
      plannedStart: shift.plannedStart ?? '',
      plannedEnd: shift.plannedEnd ?? '',
      clockInTime: shift.clockIn ? new Date(shift.clockIn).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit', hour12: false }) : '',
      clockOutTime: shift.clockOut ? new Date(shift.clockOut).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit', hour12: false }) : '',
      type: shift.type as ShiftType,
      notes: shift.notes ?? '',
    })
  }

  async function handleSaveEdit() {
    if (!editId) return
    setSaving(true)
    try {
      await updateShift({
        shiftId: editId as Id<'shifts'>,
        date: editForm.date,
        plannedStart: editForm.plannedStart || undefined,
        plannedEnd: editForm.plannedEnd || undefined,
        clockInTime: editForm.clockInTime || '',
        clockOutTime: editForm.clockOutTime || '',
        type: editForm.type,
        notes: editForm.notes || undefined,
      })
      setEditId(null)
    } catch (e: unknown) {
      alert((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(shiftId: string) {
    if (!confirm('Smazat tuto směnu?')) return
    await deleteShiftMut({ shiftId: shiftId as Id<'shifts'> })
  }

  async function handleCopy() {
    setCopying(true)
    setCopyResult(null)
    try {
      const result = await copyShiftToDays({
        employeeId,
        plannedStart: copyForm.plannedStart || undefined,
        plannedEnd: copyForm.plannedEnd || undefined,
        clockInTime: copyForm.clockInTime || undefined,
        clockOutTime: copyForm.clockOutTime || undefined,
        type: copyForm.type,
        notes: copyForm.notes || undefined,
        startDate: copyForm.startDate,
        endDate: copyForm.endDate,
        weekdays: copyForm.weekdays,
        skipExisting: copyForm.skipExisting,
      })
      setCopyResult(result)
    } catch (e: unknown) {
      alert((e as Error).message)
    } finally {
      setCopying(false)
    }
  }

  function toggleWeekday(day: number) {
    setCopyForm((prev) => ({
      ...prev,
      weekdays: prev.weekdays.includes(day) ? prev.weekdays.filter((d) => d !== day) : [...prev.weekdays, day],
    }))
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <button
          onClick={() => { setShowAddForm(!showAddForm); setShowCopy(false) }}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition"
        >
          + Přidat směnu
        </button>
        <button
          onClick={() => { setShowCopy(!showCopy); setShowAddForm(false) }}
          className="px-4 py-2 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-lg text-sm font-medium hover:bg-blue-500/30 transition"
        >
          📋 Kopírovat na dny
        </button>
        {hasLinkedUser && (
          <button
            onClick={() => { setImportOpen(!importOpen); setImportResult(null) }}
            className="px-4 py-2 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-lg text-sm font-medium hover:bg-blue-500/30 transition"
          >
            📅 Importovat z dostupnosti
          </button>
        )}
        <button
          onClick={() => exportShiftsCsv(filteredShifts, employeeName)}
          className="px-4 py-2 bg-muted text-muted-foreground border border-border rounded-lg text-sm font-medium hover:bg-muted/80 transition"
        >
          ⬇ Export CSV
        </button>
        <div className="ml-auto flex items-center gap-2">
          <label className="text-xs text-muted-foreground">Měsíc:</label>
          <input
            type="month" value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="bg-input border border-border rounded-lg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="mb-4 p-4 bg-card border border-border rounded-xl">
          <p className="text-sm font-semibold text-foreground mb-3">Nová směna</p>
          <ShiftFormFields form={addForm} onChange={(k, v) => setAddForm((f) => ({ ...f, [k]: v }))} />
          <div className="flex gap-2 mt-4">
            <button onClick={handleAddShift} disabled={saving || !addForm.date}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition disabled:opacity-50">
              {saving ? 'Ukládám...' : 'Uložit'}
            </button>
            <button onClick={() => { setShowAddForm(false); setAddForm(emptyShiftForm()) }}
              className="px-4 py-2 bg-muted text-foreground rounded-lg text-sm hover:bg-muted/80 transition">
              Zrušit
            </button>
          </div>
        </div>
      )}

      {/* Copy to days form */}
      {showCopy && (
        <div className="mb-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
          <p className="text-sm font-semibold text-blue-300 mb-3">Kopírovat směnu na dny</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Plán příchod</label>
              <input type="time" value={copyForm.plannedStart} onChange={(e) => setCopyForm((f) => ({ ...f, plannedStart: e.target.value }))}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Plán odchod</label>
              <input type="time" value={copyForm.plannedEnd} onChange={(e) => setCopyForm((f) => ({ ...f, plannedEnd: e.target.value }))}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Skutečný příchod</label>
              <input type="time" value={copyForm.clockInTime} onChange={(e) => setCopyForm((f) => ({ ...f, clockInTime: e.target.value }))}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Skutečný odchod</label>
              <input type="time" value={copyForm.clockOutTime} onChange={(e) => setCopyForm((f) => ({ ...f, clockOutTime: e.target.value }))}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Od</label>
              <input type="date" value={copyForm.startDate} onChange={(e) => setCopyForm((f) => ({ ...f, startDate: e.target.value }))}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Do</label>
              <input type="date" value={copyForm.endDate} onChange={(e) => setCopyForm((f) => ({ ...f, endDate: e.target.value }))}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Typ směny</label>
              <select value={copyForm.type} onChange={(e) => setCopyForm((f) => ({ ...f, type: e.target.value as ShiftType }))}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50">
                {Object.entries(SHIFT_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                <input type="checkbox" checked={copyForm.skipExisting} onChange={(e) => setCopyForm((f) => ({ ...f, skipExisting: e.target.checked }))}
                  className="rounded border-border" />
                Přeskočit existující
              </label>
            </div>
          </div>
          {/* Weekday selector */}
          <div className="mb-4">
            <label className="block text-xs text-muted-foreground mb-2">Dny v týdnu</label>
            <div className="flex gap-2 flex-wrap">
              {WEEKDAY_LABELS.map((label, idx) => (
                <button key={idx} onClick={() => toggleWeekday(idx)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition border ${copyForm.weekdays.includes(idx) ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground border-border hover:border-primary/50'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleCopy} disabled={copying || !copyForm.startDate || !copyForm.endDate}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition disabled:opacity-50">
              {copying ? 'Kopíruji...' : 'Vytvořit směny'}
            </button>
            <button onClick={() => { setShowCopy(false); setCopyResult(null) }}
              className="px-4 py-2 bg-muted text-muted-foreground rounded-lg text-sm font-medium hover:bg-muted/80 transition">
              Zrušit
            </button>
          </div>
          {copyResult && (
            <div className="mt-3 text-sm rounded-lg px-3 py-2 bg-green-500/10 text-green-300 border border-green-500/30">
              ✓ Vytvořeno {copyResult.created} směn{copyResult.skipped > 0 ? `, přeskočeno ${copyResult.skipped}` : ''}
            </div>
          )}
        </div>
      )}

      {/* Import from availability */}
      {importOpen && hasLinkedUser && (
        <div className="mb-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
          <p className="text-sm font-medium text-blue-300 mb-3">Importovat dostupnost jako plánované směny</p>
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Měsíc</label>
              <input type="month" value={importMonth} onChange={(e) => setImportMonth(e.target.value)}
                className="bg-input border border-border rounded-lg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={handleImport} disabled={importing}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition disabled:opacity-50">
                {importing ? 'Importuji…' : 'Importovat'}
              </button>
              <button onClick={() => { setImportOpen(false); setImportResult(null) }}
                className="px-4 py-2 bg-muted text-muted-foreground rounded-lg text-sm font-medium hover:bg-muted/80 transition">
                Zrušit
              </button>
            </div>
          </div>
          {importResult && (
            <div className={`mt-3 text-sm rounded-lg px-3 py-2 ${importResult.error ? 'bg-red-500/10 text-red-300 border border-red-500/30' : 'bg-green-500/10 text-green-300 border border-green-500/30'}`}>
              {importResult.error ? `⚠ ${importResult.error}` : `✓ Naimportováno ${importResult.created} směn${importResult.skipped > 0 ? `, přeskočeno ${importResult.skipped}` : ''}`}
            </div>
          )}
        </div>
      )}

      {/* Active shift banner */}
      {activeShift && (
        <div className="mb-4 p-4 bg-green-500/10 border border-green-500/30 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-green-300">Aktivní směna</p>
            <p className="text-xs text-green-400">Příchod: {formatTime(activeShift.clockIn)}</p>
          </div>
          <button
            onClick={async () => { setLoading(true); await clockOutMut({ shiftId: activeShift._id }); setLoading(false) }}
            disabled={loading}
            className="px-4 py-2 bg-red-500/20 text-red-300 border border-red-500/30 rounded-lg text-sm font-medium hover:bg-red-500/30 transition disabled:opacity-50"
          >
            Odepsat směnu
          </button>
        </div>
      )}

      {/* Summary */}
      {filteredShifts.length > 0 && (
        <div className="mb-4 flex gap-4 text-sm text-muted-foreground">
          <span>{filteredShifts.length} záznamů</span>
          <span>Celkem: <strong className="text-foreground">{totalHours.toFixed(2)} h</strong></span>
        </div>
      )}

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Datum</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Plán</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Příchod</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Odchod</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Hodiny</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Typ</th>
                <th className="text-right px-4 py-3 text-muted-foreground font-medium">Akce</th>
              </tr>
            </thead>
            <tbody>
              {filteredShifts.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-muted-foreground">Žádné záznamy pro vybraný měsíc</td>
                </tr>
              )}
              {filteredShifts.map((shift) => (
                <React.Fragment key={shift._id}>
                  {editId === shift._id ? (
                    <tr className="border-b border-border bg-muted/10">
                      <td colSpan={7} className="px-4 py-4">
                        <ShiftFormFields form={editForm} onChange={(k, v) => setEditForm((f) => ({ ...f, [k]: v }))} />
                        <div className="flex gap-2 mt-3">
                          <button onClick={handleSaveEdit} disabled={saving}
                            className="px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition disabled:opacity-50">
                            {saving ? 'Ukládám...' : 'Uložit'}
                          </button>
                          <button onClick={() => setEditId(null)}
                            className="px-4 py-1.5 bg-muted text-foreground rounded-lg text-sm hover:bg-muted/80 transition">
                            Zrušit
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr className="border-b border-border/50 hover:bg-muted/20 transition">
                      <td className="px-4 py-3 text-foreground font-medium">{shift.date}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {shift.plannedStart && shift.plannedEnd ? `${shift.plannedStart}–${shift.plannedEnd}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-foreground">{formatTime(shift.clockIn)}</td>
                      <td className="px-4 py-3 text-foreground">{formatTime(shift.clockOut)}</td>
                      <td className="px-4 py-3 text-foreground">
                        {shift.hoursWorked != null ? `${shift.hoursWorked.toFixed(2)} h` : '—'}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {SHIFT_TYPE_LABELS[shift.type as ShiftType] ?? shift.type}
                        {shift.notes && <span className="ml-1 text-xs opacity-60" title={shift.notes}>💬</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => startEdit(shift)}
                            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition" title="Editovat">
                            ✏️
                          </button>
                          <button onClick={() => handleDelete(shift._id)}
                            className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition" title="Smazat">
                            🗑
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── Leave Tab ───────────────────────────────────────────────────────────────

function LeaveTab({ employeeId }: { employeeId: Id<'employees'> }) {
  const requests = useQuery(api.hr.getEmployeeLeaveRequests, { employeeId })
  const createLeave = useMutation(api.hr.createLeaveRequest)
  const updateStatus = useMutation(api.hr.updateLeaveStatus)
  const [showForm, setShowForm] = useState(false)
  const [leaveType, setLeaveType] = useState<'vacation' | 'sick' | 'unpaid' | 'other'>('vacation')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [days, setDays] = useState('1')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  if (requests === undefined) return <LoadingScreen />

  async function handleSubmitLeave() {
    if (!startDate || !endDate) return
    setSaving(true)
    await createLeave({
      employeeId,
      type: leaveType,
      startDate,
      endDate,
      days: parseInt(days) || 1,
      notes: notes.trim() || undefined,
    })
    setSaving(false)
    setShowForm(false)
    setStartDate('')
    setEndDate('')
    setDays('1')
    setNotes('')
  }

  return (
    <div>
      <button
        onClick={() => setShowForm(!showForm)}
        className="mb-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition"
      >
        + Nová žádost
      </button>

      {showForm && (
        <div className="mb-6 p-4 bg-card border border-border rounded-xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Typ</label>
              <select value={leaveType} onChange={(e) => setLeaveType(e.target.value as 'vacation' | 'sick' | 'unpaid' | 'other')} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50">
                <option value="vacation">Dovolená</option>
                <option value="sick">Nemocenská</option>
                <option value="unpaid">Neplacené</option>
                <option value="other">Ostatní</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Počet dnů</label>
              <input type="number" value={days} onChange={(e) => setDays(e.target.value)} min="1" className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Od</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Do</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-muted-foreground mb-1">Poznámka</label>
              <input value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleSubmitLeave} disabled={saving} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition disabled:opacity-50">
              {saving ? 'Ukládám...' : 'Odeslat žádost'}
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-muted text-foreground rounded-lg text-sm hover:bg-muted/80 transition">
              Zrušit
            </button>
          </div>
        </div>
      )}

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Typ</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Od</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Do</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Dnů</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Stav</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium hidden md:table-cell">Poznámka</th>
                <th className="text-right px-4 py-3 text-muted-foreground font-medium">Akce</th>
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-muted-foreground">Žádné žádosti o volno</td>
                </tr>
              )}
              {requests.map((req) => (
                <tr key={req._id} className="border-b border-border/50 hover:bg-muted/20 transition">
                  <td className="px-4 py-3 text-foreground">{LEAVE_TYPE_LABELS[req.type] || req.type}</td>
                  <td className="px-4 py-3 text-foreground">{req.startDate}</td>
                  <td className="px-4 py-3 text-foreground">{req.endDate}</td>
                  <td className="px-4 py-3 text-foreground">{req.days}</td>
                  <td className="px-4 py-3"><LeaveStatusBadge status={req.status} /></td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{req.notes || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    {req.status === 'pending' && (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => updateStatus({ leaveId: req._id, status: 'approved' })}
                          className="text-xs px-2 py-1 rounded bg-green-500/10 text-green-400 hover:bg-green-500/20 transition"
                        >
                          Schválit
                        </button>
                        <button
                          onClick={() => updateStatus({ leaveId: req._id, status: 'rejected' })}
                          className="text-xs px-2 py-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 transition"
                        >
                          Zamítnout
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── Payslips Tab ────────────────────────────────────────────────────────────

const CSV_HEADERS = ['Měsíc', 'Rok', 'Hodiny', 'Hrubá mzda', 'Sociální', 'Zdravotní', 'Záloha na daň', 'Bonusy', 'Ostatní srážky', 'Popis srážek', 'Čistá mzda', 'Poznámka']

function exportPayslipsCsv(payslips: Array<{
  periodMonth: number; periodYear: number; hoursWorked?: number
  grossSalary: number; socialInsurance: number; healthInsurance: number
  taxAdvance: number; bonuses?: number; otherDeductions?: number
  otherDeductionsNote?: string; netSalary: number; notes?: string
}>, employeeName: string) {
  const rows = payslips.map((p) => [
    p.periodMonth, p.periodYear, p.hoursWorked ?? '',
    p.grossSalary, p.socialInsurance, p.healthInsurance,
    p.taxAdvance, p.bonuses ?? '', p.otherDeductions ?? '',
    p.otherDeductionsNote ?? '', p.netSalary, p.notes ?? '',
  ])
  const lines = [CSV_HEADERS.join(';'), ...rows.map((r) => r.join(';'))]
  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `vyplatni_pasky_${employeeName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function parsePayslipsCsv(text: string): PayslipForm[] {
  return parsePayslipsCsvUtil(text)
}

type PayslipForm = {
  periodMonth: string
  periodYear: string
  hoursWorked: string
  grossSalary: string
  socialInsurance: string
  healthInsurance: string
  taxBase: string
  taxCredit: string
  taxBonus: string
  taxAdvance: string
  employerSocialIns: string
  employerHealthIns: string
  otherDeductions: string
  otherDeductionsNote: string
  bonuses: string
  netSalary: string
  vacationDaysTotal: string
  vacationDaysTaken: string
  notes: string
}

const emptyPayslipForm = (): PayslipForm => ({
  periodMonth: String(new Date().getMonth() + 1),
  periodYear: String(new Date().getFullYear()),
  hoursWorked: '',
  grossSalary: '',
  socialInsurance: '',
  healthInsurance: '',
  taxBase: '',
  taxCredit: '2570',
  taxBonus: '0',
  taxAdvance: '',
  employerSocialIns: '',
  employerHealthIns: '',
  otherDeductions: '',
  otherDeductionsNote: '',
  bonuses: '',
  netSalary: '',
  vacationDaysTotal: '',
  vacationDaysTaken: '',
  notes: '',
})

function PayslipsTab({ employeeId, employeeName, employeePosition, employeeContractType }: { employeeId: Id<'employees'>; employeeName: string; employeePosition?: string; employeeContractType?: string }) {
  const payslips = useQuery(api.hr.listPayslips, { employeeId })
  const payslipTemplate = useQuery(api.siteSettings.getPayslipTemplate)
  const createPayslip = useMutation(api.hr.createPayslip)
  const updatePayslip = useMutation(api.hr.updatePayslip)
  const deletePayslip = useMutation(api.hr.deletePayslip)
  const copyPayslip = useMutation(api.hr.copyPayslip)
  const bulkPayslipAction = useMutation(api.hr.bulkPayslipAction)
  const importPayslips = useMutation(api.hr.importPayslips)

  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState<Id<'payslips'> | null>(null)
  const [editWarning, setEditWarning] = useState(false)
  const [form, setForm] = useState<PayslipForm>(emptyPayslipForm())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [filterStatus, setFilterStatus] = useState<'all' | 'draft' | 'finalized' | 'sent'>('all')
  const [filterYear, setFilterYear] = useState<string>('all')
  const [filterMonth, setFilterMonth] = useState<string>('all')

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)

  // Import
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importPreview, setImportPreview] = useState<PayslipForm[] | null>(null)
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)

  // PDF
  const [pdfGenerating, setPdfGenerating] = useState<string | null>(null) // payslip id or 'all'
  const [pdfError, setPdfError] = useState<string | null>(null)

  // Row expansion
  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  const years = useMemo(() => {
    if (!payslips) return []
    const s = new Set((payslips as Array<{ periodYear: number }>).map(p => String(p.periodYear)))
    return Array.from(s).sort((a, b) => Number(b) - Number(a))
  }, [payslips])

  const filtered = useMemo(() => {
    if (!payslips) return []
    return (payslips as Array<{ _id: string; periodMonth: number; periodYear: number; status: string; grossSalary: number; netSalary: number; hoursWorked?: number; bonuses?: number; otherDeductions?: number; otherDeductionsNote?: string; notes?: string; socialInsurance: number; healthInsurance: number; taxBase?: number; taxCredit?: number; taxBonus?: number; taxAdvance: number; employerSocialIns?: number; employerHealthIns?: number; vacationDaysTotal?: number; vacationDaysTaken?: number }>).filter(p => {
      if (filterStatus !== 'all' && p.status !== filterStatus) return false
      if (filterYear !== 'all' && String(p.periodYear) !== filterYear) return false
      if (filterMonth !== 'all' && String(p.periodMonth) !== filterMonth) return false
      return true
    })
  }, [payslips, filterStatus, filterYear, filterMonth])

  if (payslips === undefined) return <LoadingScreen />

  function toggleSelect(id: string) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  function toggleAll() {
    if (selected.size === filtered.length) setSelected(new Set())
    else setSelected(new Set(filtered.map(p => p._id)))
  }

  function openCreate() {
    setEditId(null)
    setEditWarning(false)
    setForm(emptyPayslipForm())
    setError(null)
    setShowModal(true)
  }

  function openEdit(p: typeof filtered[0]) {
    setEditId(p._id as Id<'payslips'>)
    setEditWarning(p.status !== 'draft')
    setForm({
      periodMonth: String(p.periodMonth),
      periodYear: String(p.periodYear),
      hoursWorked: p.hoursWorked != null ? String(p.hoursWorked) : '',
      grossSalary: String(p.grossSalary),
      socialInsurance: String(p.socialInsurance),
      healthInsurance: String(p.healthInsurance),
      taxBase: p.taxBase != null ? String(p.taxBase) : '',
      taxCredit: p.taxCredit != null ? String(p.taxCredit) : '2570',
      taxBonus: p.taxBonus != null ? String(p.taxBonus) : '0',
      taxAdvance: String(p.taxAdvance),
      employerSocialIns: p.employerSocialIns != null ? String(p.employerSocialIns) : '',
      employerHealthIns: p.employerHealthIns != null ? String(p.employerHealthIns) : '',
      otherDeductions: p.otherDeductions != null ? String(p.otherDeductions) : '',
      otherDeductionsNote: p.otherDeductionsNote ?? '',
      bonuses: p.bonuses != null ? String(p.bonuses) : '',
      netSalary: String(p.netSalary),
      vacationDaysTotal: p.vacationDaysTotal != null ? String(p.vacationDaysTotal) : '',
      vacationDaysTaken: p.vacationDaysTaken != null ? String(p.vacationDaysTaken) : '',
      notes: p.notes ?? '',
    })
    setError(null)
    setShowModal(true)
  }

  function setField(key: keyof PayslipForm, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSave() {
    const parsed = {
      periodMonth: parseInt(form.periodMonth),
      periodYear: parseInt(form.periodYear),
      hoursWorked: form.hoursWorked ? parseFloat(form.hoursWorked) : undefined,
      grossSalary: parseFloat(form.grossSalary),
      socialInsurance: parseFloat(form.socialInsurance) || 0,
      healthInsurance: parseFloat(form.healthInsurance) || 0,
      taxBase: form.taxBase ? parseFloat(form.taxBase) : undefined,
      taxCredit: form.taxCredit ? parseFloat(form.taxCredit) : undefined,
      taxBonus: form.taxBonus ? parseFloat(form.taxBonus) : undefined,
      taxAdvance: parseFloat(form.taxAdvance) || 0,
      employerSocialIns: form.employerSocialIns ? parseFloat(form.employerSocialIns) : undefined,
      employerHealthIns: form.employerHealthIns ? parseFloat(form.employerHealthIns) : undefined,
      otherDeductions: form.otherDeductions ? parseFloat(form.otherDeductions) : undefined,
      otherDeductionsNote: form.otherDeductionsNote.trim() || undefined,
      bonuses: form.bonuses ? parseFloat(form.bonuses) : undefined,
      netSalary: parseFloat(form.netSalary),
      vacationDaysTotal: form.vacationDaysTotal ? parseFloat(form.vacationDaysTotal) : undefined,
      vacationDaysTaken: form.vacationDaysTaken ? parseFloat(form.vacationDaysTaken) : undefined,
      notes: form.notes.trim() || undefined,
    }
    if (!parsed.grossSalary || !parsed.netSalary) {
      setError('Vyplňte hrubou a čistou mzdu.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      if (editId) {
        await updatePayslip({ payslipId: editId, ...parsed })
      } else {
        await createPayslip({ employeeId, ...parsed })
      }
      setShowModal(false)
    } catch (e: unknown) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(payslipId: Id<'payslips'>, status: string) {
    const msg = status === 'draft'
      ? 'Smazat tento koncept výplatní pásky?'
      : status === 'finalized'
        ? 'Tato páska je finalizovaná. Opravdu ji chcete smazat?'
        : 'Tato páska byla již odeslána. Opravdu ji chcete trvale smazat?'
    if (!confirm(msg)) return
    try {
      await deletePayslip({ payslipId })
      setSelected(prev => { const n = new Set(prev); n.delete(payslipId); return n })
      if (expandedRow === payslipId) setExpandedRow(null)
    } catch (e: unknown) {
      alert((e as Error).message)
    }
  }

  // Přepočítat vše dle sazeb 2025 (zákon č. 586/1992 Sb.)
  function handleCalcAll2025() {
    const result = calcAll2025({
      grossSalary: parseFloat(form.grossSalary) || 0,
      bonuses: parseFloat(form.bonuses) || 0,
      otherDeductions: parseFloat(form.otherDeductions) || 0,
      taxCredit: parseFloat(form.taxCredit) || RATES_2025.defaultTaxCredit,
      taxBonus: parseFloat(form.taxBonus) || 0,
    })
    setForm(f => ({
      ...f,
      socialInsurance: String(result.socialInsurance),
      healthInsurance: String(result.healthInsurance),
      taxBase: String(result.taxBase),
      taxAdvance: String(result.taxAdvance),
      employerSocialIns: String(result.employerSocialIns),
      employerHealthIns: String(result.employerHealthIns),
      netSalary: String(result.netSalary),
    }))
    console.log('calcAll2025 result:', result)
  }

  function calcNetSalary() {
    const gross = parseFloat(form.grossSalary) || 0
    const social = parseFloat(form.socialInsurance) || 0
    const health = parseFloat(form.healthInsurance) || 0
    const tax = parseFloat(form.taxAdvance) || 0
    const other = parseFloat(form.otherDeductions) || 0
    const bonus = parseFloat(form.bonuses) || 0
    const net = gross + bonus - social - health - tax - other
    setField('netSalary', String(Math.max(0, Math.round(net))))
  }

  async function handleStatusChange(payslipId: Id<'payslips'>, status: 'draft' | 'finalized' | 'sent') {
    await updatePayslip({ payslipId, status })
  }

  async function handleCopy(payslipId: Id<'payslips'>) {
    try {
      await copyPayslip({ payslipId })
    } catch (e: unknown) {
      alert((e as Error).message)
    }
  }

  async function handleDownloadPdf(p: typeof filtered[0]) {
    if (!payslipTemplate) return
    const [first, ...rest] = employeeName.split(' ')
    setPdfGenerating(p._id)
    setPdfError(null)
    try {
      const { generatePayslipPdf } = await import('@/lib/payslipPdf')
      await generatePayslipPdf([{
        firstName: first ?? '',
        lastName: rest.join(' '),
        position: employeePosition,
        contractType: employeeContractType,
        periodMonth: p.periodMonth,
        periodYear: p.periodYear,
        hoursWorked: p.hoursWorked,
        grossSalary: p.grossSalary,
        socialInsurance: p.socialInsurance,
        healthInsurance: p.healthInsurance,
        taxBase: p.taxBase,
        taxCredit: p.taxCredit,
        taxBonus: p.taxBonus,
        taxAdvance: p.taxAdvance,
        employerSocialIns: p.employerSocialIns,
        employerHealthIns: p.employerHealthIns,
        otherDeductions: p.otherDeductions,
        otherDeductionsNote: p.otherDeductionsNote,
        bonuses: p.bonuses,
        netSalary: p.netSalary,
        vacationDaysTotal: p.vacationDaysTotal,
        vacationDaysTaken: p.vacationDaysTaken,
        notes: p.notes,
        status: p.status,
      }], payslipTemplate, employeeName)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error('PDF generation error:', e)
      setPdfError(`Chyba při generování PDF: ${msg}`)
    } finally {
      setPdfGenerating(null)
    }
  }

  async function handleDownloadAllPdf() {
    if (!payslipTemplate || filtered.length === 0) return
    const [first, ...rest] = employeeName.split(' ')
    setPdfGenerating('all')
    setPdfError(null)
    try {
      const { generatePayslipPdf } = await import('@/lib/payslipPdf')
      await generatePayslipPdf(filtered.map(p => ({
        firstName: first ?? '',
        lastName: rest.join(' '),
        position: employeePosition,
        contractType: employeeContractType,
        periodMonth: p.periodMonth,
        periodYear: p.periodYear,
        hoursWorked: p.hoursWorked,
        grossSalary: p.grossSalary,
        socialInsurance: p.socialInsurance,
        healthInsurance: p.healthInsurance,
        taxBase: p.taxBase,
        taxCredit: p.taxCredit,
        taxBonus: p.taxBonus,
        taxAdvance: p.taxAdvance,
        employerSocialIns: p.employerSocialIns,
        employerHealthIns: p.employerHealthIns,
        otherDeductions: p.otherDeductions,
        otherDeductionsNote: p.otherDeductionsNote,
        bonuses: p.bonuses,
        netSalary: p.netSalary,
        vacationDaysTotal: p.vacationDaysTotal,
        vacationDaysTaken: p.vacationDaysTaken,
        notes: p.notes,
        status: p.status,
      })), payslipTemplate, employeeName)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error('PDF generation error (all):', e)
      setPdfError(`Chyba při generování PDF: ${msg}`)
    } finally {
      setPdfGenerating(null)
    }
  }

  async function handleBulkAction(action: 'delete' | 'finalize' | 'mark_sent' | 'mark_draft') {
    if (selected.size === 0) return
    const ids = Array.from(selected) as Id<'payslips'>[]
    const msgs: Record<string, string> = {
      delete: `Smazat ${ids.length} výplatních pásek (pouze koncepty)?`,
      finalize: `Finalizovat ${ids.length} vybraných pásek?`,
      mark_sent: `Označit ${ids.length} pásek jako odesláno?`,
      mark_draft: `Vrátit ${ids.length} pásek do konceptu?`,
    }
    if (!confirm(msgs[action])) return
    setBulkLoading(true)
    try {
      const count = await bulkPayslipAction({ payslipIds: ids, action })
      setSelected(new Set())
      console.log(`Bulk action ${action}: processed ${count}`)
    } catch (e: unknown) {
      alert((e as Error).message)
    } finally {
      setBulkLoading(false)
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImportError(null)
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      try {
        const rows = parsePayslipsCsv(text)
        if (rows.length === 0) { setImportError('Soubor neobsahuje žádná data.'); return }
        setImportPreview(rows)
      } catch {
        setImportError('Chyba při zpracování souboru. Zkontrolujte formát CSV.')
      }
    }
    reader.readAsText(file, 'UTF-8')
    e.target.value = ''
  }

  async function handleImport() {
    if (!importPreview || importPreview.length === 0) return
    setImporting(true)
    setImportError(null)
    try {
      const rows = importPreview.map(f => ({
        periodMonth: parseInt(f.periodMonth),
        periodYear: parseInt(f.periodYear),
        hoursWorked: f.hoursWorked ? parseFloat(f.hoursWorked) : undefined,
        grossSalary: parseFloat(f.grossSalary) || 0,
        socialInsurance: parseFloat(f.socialInsurance) || 0,
        healthInsurance: parseFloat(f.healthInsurance) || 0,
        taxAdvance: parseFloat(f.taxAdvance) || 0,
        otherDeductions: f.otherDeductions ? parseFloat(f.otherDeductions) : undefined,
        otherDeductionsNote: f.otherDeductionsNote.trim() || undefined,
        bonuses: f.bonuses ? parseFloat(f.bonuses) : undefined,
        netSalary: parseFloat(f.netSalary) || 0,
        notes: f.notes.trim() || undefined,
      }))
      const count = await importPayslips({ employeeId, rows })
      console.log(`Imported ${count} payslips`)
      setImportPreview(null)
    } catch (e: unknown) {
      setImportError((e as Error).message)
    } finally {
      setImporting(false)
    }
  }

  const fieldCls = 'w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50'
  const selCls = 'px-3 py-1.5 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50'

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h3 className="text-base font-semibold text-foreground">Výplatní pásky ({payslips.length})</h3>
        <div className="flex flex-wrap gap-2">
          <button onClick={handleDownloadAllPdf} disabled={pdfGenerating !== null || !payslipTemplate || filtered.length === 0}
            className="px-3 py-1.5 bg-muted text-foreground border border-border rounded-lg text-sm hover:bg-muted/80 transition disabled:opacity-50">
            {pdfGenerating === 'all' ? '⏳ Generuji…' : '📄 PDF (vše)'}
          </button>
          <button onClick={() => exportPayslipsCsv(payslips as Parameters<typeof exportPayslipsCsv>[0], employeeName)}
            className="px-3 py-1.5 bg-muted text-foreground border border-border rounded-lg text-sm hover:bg-muted/80 transition">
            ↓ Export CSV
          </button>
          <button onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 bg-muted text-foreground border border-border rounded-lg text-sm hover:bg-muted/80 transition">
            ↑ Import CSV
          </button>
          <button onClick={openCreate}
            className="px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition">
            + Nová výplatní páska
          </button>
          <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileChange} />
        </div>
      </div>

      {/* PDF error banner */}
      {pdfError && (
        <div className="mb-4 flex items-start gap-2 px-3 py-2.5 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-300">
          <span className="mt-0.5">⚠</span>
          <span className="flex-1">{pdfError}</span>
          <button onClick={() => setPdfError(null)} className="text-red-400 hover:text-red-200 transition ml-2 font-bold">✕</button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4 p-3 bg-muted/20 border border-border rounded-xl">
        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value as typeof filterStatus); setSelected(new Set()) }} className={selCls}>
          <option value="all">Všechny stavy</option>
          <option value="draft">Koncept</option>
          <option value="finalized">Finalizováno</option>
          <option value="sent">Odesláno</option>
        </select>
        <select value={filterYear} onChange={e => { setFilterYear(e.target.value); setSelected(new Set()) }} className={selCls}>
          <option value="all">Všechny roky</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={filterMonth} onChange={e => { setFilterMonth(e.target.value); setSelected(new Set()) }} className={selCls}>
          <option value="all">Všechny měsíce</option>
          {MONTH_NAMES.map((m, i) => <option key={i} value={String(i + 1)}>{m}</option>)}
        </select>
        {(filterStatus !== 'all' || filterYear !== 'all' || filterMonth !== 'all') && (
          <button onClick={() => { setFilterStatus('all'); setFilterYear('all'); setFilterMonth('all'); setSelected(new Set()) }}
            className="text-xs px-2 py-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 transition">
            ✕ Zrušit filtry
          </button>
        )}
        {filtered.length !== payslips.length && (
          <span className="text-xs text-muted-foreground self-center">Zobrazeno {filtered.length} z {payslips.length}</span>
        )}
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-4 px-4 py-3 bg-primary/10 border border-primary/30 rounded-xl">
          <span className="text-sm font-medium text-primary">Vybráno: {selected.size}</span>
          <div className="flex flex-wrap gap-1.5 ml-auto">
            <button disabled={bulkLoading} onClick={() => handleBulkAction('finalize')}
              className="text-xs px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 transition disabled:opacity-50">
              Finalizovat koncepty
            </button>
            <button disabled={bulkLoading} onClick={() => handleBulkAction('mark_sent')}
              className="text-xs px-3 py-1.5 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20 transition disabled:opacity-50">
              Označit jako odesláno
            </button>
            <button disabled={bulkLoading} onClick={() => handleBulkAction('mark_draft')}
              className="text-xs px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20 transition disabled:opacity-50">
              Vrátit do konceptu
            </button>
            <button disabled={bulkLoading} onClick={() => handleBulkAction('delete')}
              className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition disabled:opacity-50">
              Smazat koncepty
            </button>
            <button onClick={() => setSelected(new Set())} className="text-xs px-2 py-1.5 text-muted-foreground hover:text-foreground transition">
              Zrušit výběr
            </button>
          </div>
        </div>
      )}

      {/* Import preview */}
      {importPreview && (
        <div className="mb-4 p-4 bg-card border border-primary/30 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-foreground">Náhled importu ({importPreview.length} pásek)</p>
            <button onClick={() => setImportPreview(null)} className="text-xs text-muted-foreground hover:text-foreground">✕ Zrušit</button>
          </div>
          <div className="overflow-x-auto mb-3">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/30 border-b border-border">
                  {['Měsíc', 'Rok', 'Hodiny', 'Hrubá', 'Sociální', 'Zdravotní', 'Daň', 'Bonusy', 'Čistá'].map(h => (
                    <th key={h} className="px-2 py-1.5 text-left text-muted-foreground font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {importPreview.slice(0, 5).map((r, i) => (
                  <tr key={i} className="border-b border-border/30">
                    <td className="px-2 py-1.5">{MONTH_NAMES[parseInt(r.periodMonth) - 1] ?? r.periodMonth}</td>
                    <td className="px-2 py-1.5">{r.periodYear}</td>
                    <td className="px-2 py-1.5">{r.hoursWorked || '—'}</td>
                    <td className="px-2 py-1.5">{r.grossSalary ? `${Number(r.grossSalary).toLocaleString('cs-CZ')} Kč` : '—'}</td>
                    <td className="px-2 py-1.5">{r.socialInsurance || '—'}</td>
                    <td className="px-2 py-1.5">{r.healthInsurance || '—'}</td>
                    <td className="px-2 py-1.5">{r.taxAdvance || '—'}</td>
                    <td className="px-2 py-1.5">{r.bonuses || '—'}</td>
                    <td className="px-2 py-1.5 text-green-400 font-semibold">{r.netSalary ? `${Number(r.netSalary).toLocaleString('cs-CZ')} Kč` : '—'}</td>
                  </tr>
                ))}
                {importPreview.length > 5 && (
                  <tr><td colSpan={9} className="px-2 py-1.5 text-muted-foreground italic">... a dalších {importPreview.length - 5} řádků</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {importError && <p className="text-sm text-red-400 mb-2">{importError}</p>}
          <div className="flex gap-2">
            <button onClick={handleImport} disabled={importing}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition disabled:opacity-50">
              {importing ? 'Importuji...' : `Importovat ${importPreview.length} pásek`}
            </button>
            <button onClick={() => setImportPreview(null)} className="px-4 py-2 bg-muted text-foreground rounded-lg text-sm hover:bg-muted/80 transition">Zrušit</button>
          </div>
        </div>
      )}

      {importError && !importPreview && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">{importError}</div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground bg-card border border-border rounded-xl">
          <p className="text-4xl mb-2">💰</p>
          <p className="font-medium">{payslips.length === 0 ? 'Zatím žádné výplatní pásky' : 'Žádné pásky neodpovídají filtru'}</p>
          <p className="text-sm mt-1">{payslips.length === 0 ? 'Klikněte na „+ Nová výplatní páska" a přidejte první.' : 'Zkuste změnit nebo zrušit filtr.'}</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-3 py-3 w-10">
                    <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleAll}
                      className="rounded border-border accent-primary cursor-pointer" />
                  </th>
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium">Období</th>
                  <th className="text-right px-4 py-3 text-muted-foreground font-medium">Hrubá mzda</th>
                  <th className="text-right px-4 py-3 text-muted-foreground font-medium hidden md:table-cell">Hodiny</th>
                  <th className="text-right px-4 py-3 text-muted-foreground font-medium">Čistá mzda</th>
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium">Stav</th>
                  <th className="text-right px-4 py-3 text-muted-foreground font-medium">Akce</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <React.Fragment key={p._id}>
                    <tr className={`border-b border-border/50 hover:bg-muted/20 transition ${selected.has(p._id) ? 'bg-primary/5' : ''} ${expandedRow === p._id ? 'bg-muted/10' : ''}`}>
                      <td className="px-3 py-3">
                        <input type="checkbox" checked={selected.has(p._id)} onChange={() => toggleSelect(p._id)}
                          className="rounded border-border accent-primary cursor-pointer" />
                      </td>
                      <td className="px-4 py-3 font-medium">
                        <button
                          onClick={() => setExpandedRow(expandedRow === p._id ? null : p._id)}
                          className="flex items-center gap-1.5 hover:text-primary transition text-left text-foreground"
                          title={expandedRow === p._id ? 'Skrýt detail' : 'Zobrazit detail'}
                        >
                          <span className="text-muted-foreground text-[10px]">{expandedRow === p._id ? '▼' : '▶'}</span>
                          {MONTH_NAMES[(p.periodMonth - 1)] ?? p.periodMonth} {p.periodYear}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right text-foreground">{p.grossSalary.toLocaleString('cs-CZ')} Kč</td>
                      <td className="px-4 py-3 text-right text-muted-foreground hidden md:table-cell">
                        {p.hoursWorked != null ? `${p.hoursWorked} h` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-green-400 font-semibold">{p.netSalary.toLocaleString('cs-CZ')} Kč</td>
                      <td className="px-4 py-3"><PayslipStatusBadge status={p.status} /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1 flex-wrap">
                          <button onClick={() => openEdit(p)} className="text-xs px-2 py-1 rounded bg-muted text-foreground hover:bg-muted/80 transition" title="Upravit">✏️</button>
                          <button onClick={() => handleCopy(p._id as Id<'payslips'>)} className="text-xs px-2 py-1 rounded bg-muted text-foreground hover:bg-muted/80 transition" title="Kopírovat jako nový koncept">📋</button>
                          <button onClick={() => handleDownloadPdf(p)} disabled={pdfGenerating !== null || !payslipTemplate}
                            className="text-xs px-2 py-1 rounded bg-muted text-foreground hover:bg-muted/80 transition disabled:opacity-50" title="Stáhnout PDF">
                            {pdfGenerating === p._id ? '⏳' : '📄'}
                          </button>
                          {p.status === 'draft' && (
                            <button onClick={() => handleStatusChange(p._id as Id<'payslips'>, 'finalized')}
                              className="text-xs px-2 py-1 rounded bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition">
                              Finalizovat
                            </button>
                          )}
                          {p.status === 'finalized' && (
                            <button onClick={() => handleStatusChange(p._id as Id<'payslips'>, 'sent')}
                              className="text-xs px-2 py-1 rounded bg-green-500/10 text-green-400 hover:bg-green-500/20 transition">
                              Odeslat
                            </button>
                          )}
                          {(p.status === 'finalized' || p.status === 'sent') && (
                            <button onClick={() => handleStatusChange(p._id as Id<'payslips'>, 'draft')}
                              className="text-xs px-2 py-1 rounded bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition" title="Vrátit do konceptu">
                              ↩
                            </button>
                          )}
                          <button onClick={() => handleDelete(p._id as Id<'payslips'>, p.status)}
                            className={`text-xs px-2 py-1 rounded transition ${p.status === 'draft' ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-red-500/5 text-red-400/50 hover:bg-red-500/15 hover:text-red-400'}`}
                            title="Smazat">
                            🗑
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedRow === p._id && (
                      <tr className="border-b border-border/20 bg-muted/5">
                        <td colSpan={7} className="px-6 py-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                            <div className="space-y-1.5">
                              <p className="text-muted-foreground uppercase tracking-wide font-semibold text-[10px]">Příjmy</p>
                              <p className="text-foreground">Hrubá mzda: <span className="font-semibold">{p.grossSalary.toLocaleString('cs-CZ')} Kč</span></p>
                              {p.bonuses ? <p className="text-foreground">Bonusy: <span className="font-semibold text-green-400">+{p.bonuses.toLocaleString('cs-CZ')} Kč</span></p> : null}
                              {p.hoursWorked != null ? <p className="text-muted-foreground">Odpracováno: {p.hoursWorked} h</p> : null}
                              {(p.vacationDaysTotal != null || p.vacationDaysTaken != null) ? (
                                <p className="text-muted-foreground">Dovolená: {p.vacationDaysTaken ?? '?'}/{p.vacationDaysTotal ?? '?'} dní</p>
                              ) : null}
                            </div>
                            <div className="space-y-1.5">
                              <p className="text-muted-foreground uppercase tracking-wide font-semibold text-[10px]">Odvody zaměstnance</p>
                              <p className="text-foreground">Soc. poj. (7,1&nbsp;%): <span className="text-red-400">−{p.socialInsurance.toLocaleString('cs-CZ')} Kč</span></p>
                              <p className="text-foreground">Zdrav. poj. (4,5&nbsp;%): <span className="text-red-400">−{p.healthInsurance.toLocaleString('cs-CZ')} Kč</span></p>
                            </div>
                            <div className="space-y-1.5">
                              <p className="text-muted-foreground uppercase tracking-wide font-semibold text-[10px]">Daň z příjmu</p>
                              {p.taxBase != null ? <p className="text-foreground">Základ daně: {p.taxBase.toLocaleString('cs-CZ')} Kč</p> : null}
                              {p.taxCredit != null ? <p className="text-foreground">Sleva na popl.: <span className="text-green-400">−{p.taxCredit.toLocaleString('cs-CZ')} Kč</span></p> : null}
                              {p.taxBonus ? <p className="text-foreground">Daňový bonus: <span className="text-green-400">+{p.taxBonus.toLocaleString('cs-CZ')} Kč</span></p> : null}
                              <p className="text-foreground">Záloha na daň: <span className="text-red-400">−{p.taxAdvance.toLocaleString('cs-CZ')} Kč</span></p>
                              {p.otherDeductions ? <p className="text-foreground">{p.otherDeductionsNote || 'Ostatní'}: <span className="text-red-400">−{p.otherDeductions.toLocaleString('cs-CZ')} Kč</span></p> : null}
                            </div>
                            <div className="space-y-1.5 border-l border-border/50 pl-4">
                              <p className="text-muted-foreground uppercase tracking-wide font-semibold text-[10px]">Čistá mzda</p>
                              <p className="text-green-400 text-base font-bold">{p.netSalary.toLocaleString('cs-CZ')} Kč</p>
                              {(p.employerSocialIns != null || p.employerHealthIns != null) ? (
                                <div className="mt-2 pt-2 border-t border-border/30">
                                  <p className="text-muted-foreground text-[10px] uppercase tracking-wide font-semibold mb-1">Náklady zaměstnavatele</p>
                                  {p.employerSocialIns != null ? <p className="text-muted-foreground">SZ (24,8&nbsp;%): {p.employerSocialIns.toLocaleString('cs-CZ')} Kč</p> : null}
                                  {p.employerHealthIns != null ? <p className="text-muted-foreground">ZP (9&nbsp;%): {p.employerHealthIns.toLocaleString('cs-CZ')} Kč</p> : null}
                                </div>
                              ) : null}
                              {p.notes ? <p className="text-muted-foreground italic mt-2 text-[11px]">„{p.notes}"</p> : null}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CSV format hint */}
      <details className="mt-3">
        <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition">Formát CSV pro import</summary>
        <div className="mt-2 p-3 bg-muted/20 border border-border rounded-lg text-xs font-mono text-muted-foreground">
          Měsíc;Rok;Hodiny;Hrubá mzda;Sociální;Zdravotní;Záloha na daň;Bonusy;Ostatní srážky;Popis srážek;Čistá mzda;Poznámka<br />
          1;2026;160;45000;4050;2025;6750;0;0;;32175;
        </div>
      </details>

      {/* Payslip Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-lg font-bold text-foreground">{editId ? 'Upravit výplatní pásku' : 'Nová výplatní páska'}</h2>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground text-xl leading-none">✕</button>
            </div>
            <div className="p-6 space-y-4">
              {editWarning && (
                <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-sm text-amber-300">
                  <span>⚠️</span>
                  <span>Tato páska je již finalizovaná nebo odeslaná. Změny budou uloženy, ale stav se nezmění automaticky.</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Měsíc</label>
                  <select value={form.periodMonth} onChange={(e) => setField('periodMonth', e.target.value)} className={fieldCls}>
                    {MONTH_NAMES.map((m, i) => (<option key={i} value={i + 1}>{m}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Rok</label>
                  <input type="number" value={form.periodYear} onChange={(e) => setField('periodYear', e.target.value)} className={fieldCls} />
                </div>
              </div>

              {/* Auto-calculate button */}
              <button type="button" onClick={handleCalcAll2025}
                className="w-full py-2.5 bg-primary/10 border border-primary/30 rounded-lg text-sm font-medium text-primary hover:bg-primary/20 transition"
                title="Automaticky doplní SZ, ZP, základ daně, zálohu na daň a čistou mzdu podle sazeb platných od 2021">
                ⚡ Automaticky spočítat dle sazeb 2025 (SZ 7,1&nbsp;%&nbsp;|&nbsp;ZP 4,5&nbsp;%&nbsp;|&nbsp;Daň 15&nbsp;%)
              </button>

              {/* Základní informace */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Základní informace</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Hrubá mzda (Kč) *</label>
                    <input type="number" value={form.grossSalary} onChange={(e) => setField('grossSalary', e.target.value)} className={fieldCls} placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Bonusy / příplatky (Kč)</label>
                    <input type="number" value={form.bonuses} onChange={(e) => setField('bonuses', e.target.value)} className={fieldCls} placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Odpracováno hodin</label>
                    <input type="number" step="0.5" value={form.hoursWorked} onChange={(e) => setField('hoursWorked', e.target.value)} className={fieldCls} placeholder="0" />
                  </div>
                </div>
              </div>

              {/* Odvody zaměstnance */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Odvody zaměstnance</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Sociální pojištění 7,1&nbsp;% (Kč)</label>
                    <input type="number" value={form.socialInsurance} onChange={(e) => setField('socialInsurance', e.target.value)} className={fieldCls} placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Zdravotní pojištění 4,5&nbsp;% (Kč)</label>
                    <input type="number" value={form.healthInsurance} onChange={(e) => setField('healthInsurance', e.target.value)} className={fieldCls} placeholder="0" />
                  </div>
                </div>
              </div>

              {/* Výpočet daně */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Výpočet daně z příjmu</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Základ daně (Kč)</label>
                    <input type="number" value={form.taxBase} onChange={(e) => setField('taxBase', e.target.value)} className={fieldCls} placeholder="= hrubá mzda (od 2021)" />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Sleva na poplatníka (Kč/měs.)</label>
                    <input type="number" value={form.taxCredit} onChange={(e) => setField('taxCredit', e.target.value)} className={fieldCls} placeholder="2570" />
                    <p className="text-[10px] text-muted-foreground mt-0.5">Základní sleva = 2 570 Kč/měs. (2025)</p>
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Daňový bonus (Kč)</label>
                    <input type="number" value={form.taxBonus} onChange={(e) => setField('taxBonus', e.target.value)} className={fieldCls} placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Záloha na daň po slevě (Kč)</label>
                    <input type="number" value={form.taxAdvance} onChange={(e) => setField('taxAdvance', e.target.value)} className={fieldCls} placeholder="0" />
                  </div>
                </div>
              </div>

              {/* Odvody zaměstnavatele (informativně) */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Odvody zaměstnavatele (informativně, nevstupují do výplaty)</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Soc. pojištění zaměstnavatel 24,8&nbsp;% (Kč)</label>
                    <input type="number" value={form.employerSocialIns} onChange={(e) => setField('employerSocialIns', e.target.value)} className={fieldCls} placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Zdrav. pojištění zaměstnavatel 9&nbsp;% (Kč)</label>
                    <input type="number" value={form.employerHealthIns} onChange={(e) => setField('employerHealthIns', e.target.value)} className={fieldCls} placeholder="0" />
                  </div>
                </div>
              </div>

              {/* Ostatní srážky */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Ostatní srážky</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Ostatní srážky (Kč)</label>
                    <input type="number" value={form.otherDeductions} onChange={(e) => setField('otherDeductions', e.target.value)} className={fieldCls} placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Popis ostatních srážek</label>
                    <input type="text" value={form.otherDeductionsNote} onChange={(e) => setField('otherDeductionsNote', e.target.value)} className={fieldCls} />
                  </div>
                </div>
              </div>

              {/* Čistá mzda */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Výsledek</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Čistá mzda k výplatě (Kč) *</label>
                    <div className="flex gap-2">
                      <input type="number" value={form.netSalary} onChange={(e) => setField('netSalary', e.target.value)} className={`${fieldCls} font-semibold flex-1`} placeholder="0" />
                      <button type="button" onClick={calcNetSalary}
                        className="px-3 py-2 bg-muted border border-border rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/80 transition whitespace-nowrap"
                        title="Spočítat čistou mzdu z aktuálně zadaných hodnot">
                        = Čistá
                      </button>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Hrubá + bonusy − SZ − ZP − daň − srážky</p>
                  </div>
                </div>
              </div>

              {/* Dovolená */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Dovolená (volitelně)</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Nárok na dovolenou (dní/rok)</label>
                    <input type="number" value={form.vacationDaysTotal} onChange={(e) => setField('vacationDaysTotal', e.target.value)} className={fieldCls} placeholder="20" />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Čerpáno dovolené (dní)</label>
                    <input type="number" value={form.vacationDaysTaken} onChange={(e) => setField('vacationDaysTaken', e.target.value)} className={fieldCls} placeholder="0" />
                  </div>
                </div>
              </div>

              {/* Poznámka */}
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Poznámka</label>
                <textarea value={form.notes} onChange={(e) => setField('notes', e.target.value)} rows={2} className={`${fieldCls} resize-none`} />
              </div>

              {error && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}

              <div className="flex gap-3 pt-2">
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition disabled:opacity-50">
                  {saving ? 'Ukládám...' : (editId ? 'Uložit změny' : 'Vytvořit výplatní pásku')}
                </button>
                <button onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 bg-muted text-foreground rounded-lg text-sm hover:bg-muted/80 transition">
                  Zrušit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Payslip Settings Tab ────────────────────────────────────────────────────

function PayslipSettingsTab({ employeeId }: { employeeId: Id<'employees'> }) {
  const settings = useQuery(api.hr.getPayslipSettings, { employeeId })
  const upsert = useMutation(api.hr.upsertPayslipSettings)

  const [hourlyRate, setHourlyRate] = useState('')
  const [monthlyRate, setMonthlyRate] = useState('')
  const [bonusAmount, setBonusAmount] = useState('')
  const [overtimeMultiplier, setOvertimeMultiplier] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)

  if (settings !== undefined && !loaded) {
    setHourlyRate(settings?.hourlyRate?.toString() ?? '')
    setMonthlyRate(settings?.monthlyRate?.toString() ?? '')
    setBonusAmount(settings?.bonusAmount?.toString() ?? '')
    setOvertimeMultiplier(settings?.overtimeMultiplier?.toString() ?? '')
    setNotes(settings?.notes ?? '')
    setLoaded(true)
  }

  if (settings === undefined) return <LoadingScreen />

  async function handleSave() {
    setSaving(true)
    await upsert({
      employeeId,
      hourlyRate: hourlyRate ? parseFloat(hourlyRate) : undefined,
      monthlyRate: monthlyRate ? parseFloat(monthlyRate) : undefined,
      bonusAmount: bonusAmount ? parseFloat(bonusAmount) : undefined,
      overtimeMultiplier: overtimeMultiplier ? parseFloat(overtimeMultiplier) : undefined,
      notes: notes.trim() || undefined,
    })
    setSaving(false)
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6 max-w-xl">
      <h3 className="text-base font-semibold text-foreground mb-4">Nastavení výplaty</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Hodinová sazba (Kč)</label>
          <input type="number" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Měsíční sazba (Kč)</label>
          <input type="number" value={monthlyRate} onChange={(e) => setMonthlyRate(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Bonus (Kč)</label>
          <input type="number" value={bonusAmount} onChange={(e) => setBonusAmount(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Příplatek za přesčas (násobek)</label>
          <input type="number" step="0.1" value={overtimeMultiplier} onChange={(e) => setOvertimeMultiplier(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs text-muted-foreground mb-1">Poznámka</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" />
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
      >
        {saving ? 'Ukládám...' : 'Uložit nastavení'}
      </button>
    </div>
  )
}
