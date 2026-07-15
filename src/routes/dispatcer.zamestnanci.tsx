import { createFileRoute, Link, Outlet, useMatchRoute } from '@tanstack/react-router'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useState, useMemo } from 'react'
import type { Id } from '../../convex/_generated/dataModel'
import { AppShell, PageHeader, LoadingScreen } from '@/components/AppShell'
import { dispatcherNav } from './dispatcer'

function exportEmployeesCsv(employees: unknown[]) {
  const rows = employees as Record<string, unknown>[]
  const headers = ['Jméno', 'Příjmení', 'Email', 'Telefon', 'Pozice', 'Oddělení', 'Smlouva', 'Stav', 'Typ mzdy', 'Mzda', 'Adresa']
  const lines = [
    headers.join(';'),
    ...rows.map((e) =>
      [e.firstName, e.lastName, e.email, e.phone ?? '', e.position ?? '', e.department ?? '',
       e.contractType, e.status, e.salaryType, e.salaryAmount ?? '', e.address ?? ''].join(';')
    ),
  ]
  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `zamestnanci_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export const Route = createFileRoute('/dispatcer/zamestnanci')({
  component: EmployeesPage,
})

const CONTRACT_LABELS: Record<string, string> = { hpp: 'HPP', dpp: 'DPP', dpc: 'DPČ', osvc: 'OSVČ' }
const SALARY_LABELS: Record<string, string> = { hourly: 'Hodinová', monthly: 'Měsíční', per_delivery: 'Za doručení' }

function EmpStatusBadge({ status }: { status: string }) {
  const c: Record<string, { label: string; cls: string }> = {
    active: { label: 'Aktivní', cls: 'bg-green-500/20 text-green-300 border-green-500/30' },
    inactive: { label: 'Neaktivní', cls: 'bg-red-500/20 text-red-300 border-red-500/30' },
    trial: { label: 'Zkušební', cls: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  }
  const cfg = c[status] ?? { label: status, cls: 'bg-muted text-muted-foreground border-border' }
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${cfg.cls}`}>{cfg.label}</span>
}

function EmployeesPage() {
  const matchRoute = useMatchRoute()
  const isDetailPage = matchRoute({ to: '/dispatcer/zamestnanci/$employeeId', fuzzy: true })

  if (isDetailPage) {
    return <Outlet />
  }

  return <EmployeesListPage />
}

function EmployeesListPage() {
  const employees = useQuery(api.hr.listEmployees)
  const stats = useQuery(api.hr.getHrStats)
  const createEmployee = useMutation(api.hr.createEmployee)
  const deleteEmployee = useMutation(api.hr.deleteEmployee)

  const [search, setSearch] = useState('')
  const [contractFilter, setContractFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<any | null>(null)
  const [showImportModal, setShowImportModal] = useState(false)

  const filtered = useMemo(() => {
    if (!employees) return []
    return employees.filter((emp) => {
      const searchLower = search.toLowerCase()
      const matchSearch =
        !search ||
        `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(searchLower) ||
        emp.email.toLowerCase().includes(searchLower)
      const matchContract = !contractFilter || emp.contractType === contractFilter
      const matchStatus = !statusFilter || emp.status === statusFilter
      return matchSearch && matchContract && matchStatus
    })
  }, [employees, search, contractFilter, statusFilter])

  if (employees === undefined) return <AppShell navItems={dispatcherNav} title="Dispečer" primaryCount={4} subtitle="Řídicí centrum"><LoadingScreen /></AppShell>

  return (
    <AppShell navItems={dispatcherNav} title="Dispečer" primaryCount={4} subtitle="Řídicí centrum">
      <PageHeader title="Zaměstnanci" action={
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => exportEmployeesCsv(employees ?? [])}
            className="px-3 py-2 bg-muted text-foreground rounded-lg text-sm font-medium hover:bg-muted/80 transition border border-border"
          >
            ↓ Export CSV
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="px-3 py-2 bg-muted text-foreground rounded-lg text-sm font-medium hover:bg-muted/80 transition border border-border"
          >
            ↑ Import z řidičů
          </button>
          <button
            onClick={() => { setEditingEmployee(null); setShowModal(true) }}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition"
          >
            + Přidat zaměstnance
          </button>
        </div>
      } />

      {/* Stats bar */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Celkem zaměstnanců</p>
          <p className="text-2xl font-bold text-foreground">{stats?.totalEmployees ?? 0}</p>
        </div>
        <div className="bg-card border border-green-500/30 rounded-xl p-4">
          <p className="text-xs text-green-400 mb-1">Dnes na směně</p>
          <p className="text-2xl font-bold text-green-300">{stats?.onShiftToday ?? 0}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="text"
          placeholder="Hledat jméno nebo email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        <select
          value={contractFilter}
          onChange={(e) => setContractFilter(e.target.value)}
          className="px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="">Všechny smlouvy</option>
          <option value="hpp">HPP</option>
          <option value="dpp">DPP</option>
          <option value="dpc">DPČ</option>
          <option value="osvc">OSVČ</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="">Všechny stavy</option>
          <option value="active">Aktivní</option>
          <option value="inactive">Neaktivní</option>
          <option value="trial">Zkušební</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Jméno</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium hidden md:table-cell">Pozice</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Smlouva</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Stav</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium hidden lg:table-cell">Mzda</th>
                <th className="text-center px-4 py-3 text-muted-foreground font-medium">Na směně</th>
                <th className="text-right px-4 py-3 text-muted-foreground font-medium">Akce</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-muted-foreground">
                    Žádní zaměstnanci
                  </td>
                </tr>
              )}
              {filtered.map((emp) => (
                <tr key={emp._id} className="border-b border-border/50 hover:bg-muted/20 transition">
                  <td className="px-4 py-3">
                    <Link
                      to="/dispatcer/zamestnanci/$employeeId"
                      params={{ employeeId: emp._id }}
                      className="font-medium text-foreground hover:text-primary transition"
                    >
                      {emp.firstName} {emp.lastName}
                    </Link>
                    <p className="text-xs text-muted-foreground">{emp.email}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{emp.position || '—'}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted text-foreground border border-border">
                      {CONTRACT_LABELS[emp.contractType] || emp.contractType}
                    </span>
                  </td>
                  <td className="px-4 py-3"><EmpStatusBadge status={emp.status} /></td>
                  <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{SALARY_LABELS[emp.salaryType] || emp.salaryType}</td>
                  <td className="px-4 py-3 text-center">
                    {emp.isOnShiftToday ? (
                      <span className="inline-block w-3 h-3 rounded-full bg-green-500 animate-pulse" title="Na směně" />
                    ) : (
                      <span className="inline-block w-3 h-3 rounded-full bg-muted-foreground/30" title="Mimo směnu" />
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        to="/dispatcer/zamestnanci/$employeeId"
                        params={{ employeeId: emp._id }}
                        className="text-xs px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20 transition"
                      >
                        Detail
                      </Link>
                      <button
                        onClick={() => { setEditingEmployee(emp); setShowModal(true) }}
                        className="text-xs px-2 py-1 rounded bg-muted text-foreground hover:bg-muted/80 transition"
                      >
                        Upravit
                      </button>
                      <button
                        onClick={async () => {
                          if (confirm(`Opravdu smazat ${emp.firstName} ${emp.lastName}?`)) {
                            await deleteEmployee({ employeeId: emp._id })
                          }
                        }}
                        className="text-xs px-2 py-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 transition"
                      >
                        Smazat
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <EmployeeModal
          employee={editingEmployee}
          onClose={() => setShowModal(false)}
        />
      )}
      {showImportModal && (
        <ImportDriverModal onClose={() => setShowImportModal(false)} />
      )}
    </AppShell>
  )
}

// ── Employee Modal ──────────────────────────────────────────────────────────

function EmployeeModal({ employee, onClose }: { employee: any | null; onClose: () => void }) {
  const createEmployee = useMutation(api.hr.createEmployee)
  const updateEmployee = useMutation(api.hr.updateEmployee)

  const [firstName, setFirstName] = useState(employee?.firstName ?? '')
  const [lastName, setLastName] = useState(employee?.lastName ?? '')
  const [email, setEmail] = useState(employee?.email ?? '')
  const [phone, setPhone] = useState(employee?.phone ?? '')
  const [position, setPosition] = useState(employee?.position ?? '')
  const [department, setDepartment] = useState(employee?.department ?? '')
  const [contractType, setContractType] = useState(employee?.contractType ?? 'hpp')
  const [status, setStatus] = useState(employee?.status ?? 'active')
  const [salaryType, setSalaryType] = useState(employee?.salaryType ?? 'hourly')
  const [salaryAmount, setSalaryAmount] = useState(employee?.salaryAmount?.toString() ?? '')
  const [address, setAddress] = useState(employee?.address ?? '')
  const [bankAccount, setBankAccount] = useState(employee?.bankAccount ?? '')
  const [personalId, setPersonalId] = useState(employee?.personalId ?? '')
  const [notes, setNotes] = useState(employee?.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setError('Jméno, příjmení a email jsou povinné')
      return
    }
    setSaving(true)
    setError('')
    try {
      const data = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        position: position.trim() || undefined,
        department: department.trim() || undefined,
        contractType: contractType as 'hpp' | 'dpp' | 'dpc' | 'osvc',
        status: status as 'active' | 'inactive' | 'trial',
        salaryType: salaryType as 'hourly' | 'monthly' | 'per_delivery',
        salaryAmount: salaryAmount ? parseFloat(salaryAmount) : undefined,
        address: address.trim() || undefined,
        bankAccount: bankAccount.trim() || undefined,
        personalId: personalId.trim() || undefined,
        notes: notes.trim() || undefined,
      }

      if (employee) {
        await updateEmployee({ employeeId: employee._id, ...data })
      } else {
        await createEmployee(data)
      }
      onClose()
    } catch (e: any) {
      setError(e.message || 'Chyba při ukládání')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-card border border-border rounded-2xl p-6 shadow-2xl">
        <h2 className="text-lg font-bold text-foreground mb-4">
          {employee ? 'Upravit zaměstnance' : 'Nový zaměstnanec'}
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">{error}</div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Jméno *</label>
            <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Příjmení *</label>
            <input value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Email *</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Telefon</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Pozice</label>
            <input value={position} onChange={(e) => setPosition(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Oddělení</label>
            <input value={department} onChange={(e) => setDepartment(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Typ smlouvy</label>
            <select value={contractType} onChange={(e) => setContractType(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50">
              <option value="hpp">HPP</option>
              <option value="dpp">DPP</option>
              <option value="dpc">DPČ</option>
              <option value="osvc">OSVČ</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Stav</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50">
              <option value="active">Aktivní</option>
              <option value="inactive">Neaktivní</option>
              <option value="trial">Zkušební</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Typ mzdy</label>
            <select value={salaryType} onChange={(e) => setSalaryType(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50">
              <option value="hourly">Hodinová</option>
              <option value="monthly">Měsíční</option>
              <option value="per_delivery">Za doručení</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Výše mzdy (Kč)</label>
            <input type="number" value={salaryAmount} onChange={(e) => setSalaryAmount(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs text-muted-foreground mb-1">Adresa</label>
            <input value={address} onChange={(e) => setAddress(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Bankovní účet</label>
            <input value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Rodné číslo</label>
            <input value={personalId} onChange={(e) => setPersonalId(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs text-muted-foreground mb-1">Poznámky</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 bg-muted text-foreground rounded-lg text-sm hover:bg-muted/80 transition">
            Zrušit
          </button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition disabled:opacity-50">
            {saving ? 'Ukládám...' : employee ? 'Uložit změny' : 'Vytvořit'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Import Driver Modal ──────────────────────────────────────────────────────

function ImportDriverModal({ onClose }: { onClose: () => void }) {
  const drivers = useQuery(api.hr.listDriversForLinking)
  const importDriver = useMutation(api.hr.importDriverAsEmployee)

  const [selectedUserId, setSelectedUserId] = useState('')
  const [contractType, setContractType] = useState<'hpp' | 'dpp' | 'dpc' | 'osvc'>('dpp')
  const [salaryType, setSalaryType] = useState<'hourly' | 'monthly' | 'per_delivery'>('hourly')
  const [salaryAmount, setSalaryAmount] = useState('')
  const [position, setPosition] = useState('')
  const [department, setDepartment] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const fieldCls = 'w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50'

  async function handleImport() {
    if (!selectedUserId) { setError('Vyberte řidiče'); return }
    setSaving(true)
    setError('')
    try {
      await importDriver({
        userId: selectedUserId as Id<'users'>,
        contractType,
        salaryType,
        salaryAmount: salaryAmount ? parseFloat(salaryAmount) : undefined,
        position: position.trim() || undefined,
        department: department.trim() || undefined,
      })
      onClose()
    } catch (e: unknown) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-bold text-foreground">Import řidiče jako zaměstnance</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl leading-none">✕</button>
        </div>
        <div className="p-6 space-y-4">
          {drivers === undefined ? (
            <p className="text-sm text-muted-foreground">Načítám řidiče...</p>
          ) : drivers.length === 0 ? (
            <p className="text-sm text-muted-foreground">Všichni řidiči jsou již importováni jako zaměstnanci.</p>
          ) : (
            <>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Řidič *</label>
                <select value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)} className={fieldCls}>
                  <option value="">— Vyberte řidiče —</option>
                  {drivers.map((d) => (
                    <option key={d._id} value={d._id}>{d.name || d.email} ({d.email})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Typ smlouvy</label>
                  <select value={contractType} onChange={(e) => setContractType(e.target.value as 'hpp' | 'dpp' | 'dpc' | 'osvc')} className={fieldCls}>
                    <option value="hpp">HPP</option>
                    <option value="dpp">DPP</option>
                    <option value="dpc">DPČ</option>
                    <option value="osvc">OSVČ</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Typ mzdy</label>
                  <select value={salaryType} onChange={(e) => setSalaryType(e.target.value as 'hourly' | 'monthly' | 'per_delivery')} className={fieldCls}>
                    <option value="hourly">Hodinová</option>
                    <option value="monthly">Měsíční</option>
                    <option value="per_delivery">Za doručení</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Výše mzdy (Kč)</label>
                  <input type="number" value={salaryAmount} onChange={(e) => setSalaryAmount(e.target.value)} className={fieldCls} />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Pozice</label>
                  <input value={position} onChange={(e) => setPosition(e.target.value)} className={fieldCls} placeholder="Řidič" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-muted-foreground mb-1">Oddělení</label>
                  <input value={department} onChange={(e) => setDepartment(e.target.value)} className={fieldCls} placeholder="Rozvoz" />
                </div>
              </div>
            </>
          )}

          {error && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex gap-3 pt-2">
            {drivers && drivers.length > 0 && (
              <button
                onClick={handleImport}
                disabled={saving || !selectedUserId}
                className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
              >
                {saving ? 'Importuji...' : 'Importovat'}
              </button>
            )}
            <button onClick={onClose} className="px-4 py-2.5 bg-muted text-foreground rounded-lg text-sm hover:bg-muted/80 transition">
              Zavřít
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
