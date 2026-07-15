import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { useState } from 'react'
import { AppShell, PageHeader } from '@/components/AppShell'
import { dispatcherNav } from './dispatcer'

export const Route = createFileRoute('/dispatcer/tymy')({
  component: TeamsPage,
})

const TEAM_COLORS = [
  { value: '#f59e0b', label: 'Oranžová' },
  { value: '#3b82f6', label: 'Modrá' },
  { value: '#10b981', label: 'Zelená' },
  { value: '#ef4444', label: 'Červená' },
  { value: '#8b5cf6', label: 'Fialová' },
  { value: '#ec4899', label: 'Růžová' },
  { value: '#06b6d4', label: 'Tyrkysová' },
]

type Team = {
  _id: Id<'teams'>
  name: string
  description?: string
  color?: string
  memberCount: number
}

type Member = {
  memberId: Id<'teamMembers'>
  driverId: Id<'users'>
  name?: string
  email: string
  vehicleType?: string
  vehiclePlate?: string
}

function TeamFormModal({
  initial,
  onClose,
  onSave,
}: {
  initial?: Team
  onClose: () => void
  onSave: (data: { name: string; description?: string; color?: string }) => Promise<void>
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [color, setColor] = useState(initial?.color ?? TEAM_COLORS[0].value)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { setError('Název týmu je povinný'); return }
    setSaving(true)
    try {
      await onSave({ name: name.trim(), description: description.trim() || undefined, color })
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Chyba při ukládání')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-background border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-lg font-bold text-primary">{initial ? 'Upravit tým' : 'Nový tým'}</h2>
          <button onClick={onClose} className="text-secondary hover:text-primary transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-secondary mb-1.5">Název týmu *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-primary text-sm focus:outline-none focus:border-primary/50"
              placeholder="např. Severní tým"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary mb-1.5">Popis (nepovinný)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-primary text-sm focus:outline-none focus:border-primary/50 resize-none"
              placeholder="Krátký popis týmu..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary mb-2">Barva týmu</label>
            <div className="flex gap-2 flex-wrap">
              {TEAM_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  title={c.label}
                  className="w-8 h-8 rounded-full border-2 transition-all"
                  style={{
                    backgroundColor: c.value,
                    borderColor: color === c.value ? 'white' : 'transparent',
                    transform: color === c.value ? 'scale(1.2)' : 'scale(1)',
                  }}
                />
              ))}
            </div>
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-white/15 text-secondary hover:text-primary transition-colors text-sm">
              Zrušit
            </button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-black font-bold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50">
              {saving ? 'Ukládám...' : (initial ? 'Uložit' : 'Vytvořit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function TeamDetail({
  teamId,
  onBack,
}: {
  teamId: Id<'teams'>
  onBack: () => void
}) {
  const team = useQuery(api.teams.getTeamWithMembers, { teamId })
  const allDrivers = useQuery(api.users.listActiveDrivers)
  const addMember = useMutation(api.teams.addMember)
  const removeMember = useMutation(api.teams.removeMember)
  const [search, setSearch] = useState('')
  const [adding, setAdding] = useState<string | null>(null)
  const [removing, setRemoving] = useState<string | null>(null)

  if (!team || !allDrivers) return (
    <div className="flex items-center justify-center h-48 text-secondary text-sm">Načítám...</div>
  )

  const memberDriverIds = new Set(team.members.map((m: Member) => m.driverId))
  const availableDrivers = allDrivers.filter((d) =>
    !memberDriverIds.has(d._id) &&
    (search === '' || (d.name ?? d.email).toLowerCase().includes(search.toLowerCase()))
  )

  const handleAdd = async (driverId: Id<'users'>) => {
    setAdding(driverId)
    try { await addMember({ teamId, driverId }) } finally { setAdding(null) }
  }

  const handleRemove = async (driverId: Id<'users'>) => {
    setRemoving(driverId)
    try { await removeMember({ teamId, driverId }) } finally { setRemoving(null) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-secondary hover:text-primary transition-colors flex items-center gap-1.5 text-sm">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Zpět na týmy
        </button>
      </div>

      <div className="flex items-center gap-3">
        {team.color && (
          <span className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: team.color }} />
        )}
        <div>
          <h2 className="text-xl font-bold text-primary">{team.name}</h2>
          {team.description && <p className="text-secondary text-sm mt-0.5">{team.description}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current members */}
        <div className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/8 flex items-center justify-between">
            <h3 className="font-semibold text-primary text-sm">Členové týmu</h3>
            <span className="text-xs bg-white/10 rounded-full px-2.5 py-1 text-secondary">{team.members.length}</span>
          </div>
          {team.members.length === 0 ? (
            <div className="p-5 text-center text-secondary text-sm">
              Žádní řidiči v týmu. Přidejte je z pravého sloupce.
            </div>
          ) : (
            <ul className="divide-y divide-white/5">
              {team.members.map((m: Member) => (
                <li key={m.memberId} className="px-5 py-3.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-primary text-sm font-medium truncate">{m.name ?? m.email}</p>
                    {m.name && <p className="text-secondary text-xs truncate">{m.email}</p>}
                    {(m.vehicleType || m.vehiclePlate) && (
                      <p className="text-secondary text-xs mt-0.5">
                        {m.vehicleType} {m.vehiclePlate && `· ${m.vehiclePlate}`}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleRemove(m.driverId)}
                    disabled={removing === m.driverId}
                    className="flex-shrink-0 text-red-400 hover:text-red-300 disabled:opacity-40 transition-colors p-1"
                    title="Odebrat z týmu"
                  >
                    {removing === m.driverId ? (
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
                      </svg>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Add drivers */}
        <div className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/8">
            <h3 className="font-semibold text-primary text-sm mb-3">Přidat řidiče</h3>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Hledat řidiče..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-primary text-sm focus:outline-none focus:border-primary/50"
            />
          </div>
          {availableDrivers.length === 0 ? (
            <div className="p-5 text-center text-secondary text-sm">
              {search ? 'Žádný řidič neodpovídá hledání.' : 'Všichni dostupní řidiči jsou již v týmu.'}
            </div>
          ) : (
            <ul className="divide-y divide-white/5 max-h-72 overflow-y-auto">
              {availableDrivers.map((d) => (
                <li key={d._id} className="px-5 py-3.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-primary text-sm font-medium truncate">{d.name ?? d.email}</p>
                    {d.name && <p className="text-secondary text-xs truncate">{d.email}</p>}
                  </div>
                  <button
                    onClick={() => handleAdd(d._id)}
                    disabled={adding === d._id}
                    className="flex-shrink-0 text-xs bg-primary/15 hover:bg-primary/25 text-primary border border-primary/30 rounded-lg px-3 py-1.5 font-medium transition-colors disabled:opacity-40"
                  >
                    {adding === d._id ? 'Přidávám...' : 'Přidat'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

function TeamsPage() {
  const teams = useQuery(api.teams.listTeams)
  const createTeam = useMutation(api.teams.createTeam)
  const updateTeam = useMutation(api.teams.updateTeam)
  const deleteTeam = useMutation(api.teams.deleteTeam)

  const [showForm, setShowForm] = useState(false)
  const [editingTeam, setEditingTeam] = useState<Team | null>(null)
  const [selectedTeamId, setSelectedTeamId] = useState<Id<'teams'> | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const handleCreate = async (data: { name: string; description?: string; color?: string }) => {
    await createTeam(data)
  }

  const handleUpdate = async (data: { name: string; description?: string; color?: string }) => {
    if (!editingTeam) return
    await updateTeam({ teamId: editingTeam._id, ...data })
  }

  const handleDelete = async (teamId: Id<'teams'>) => {
    setDeletingId(teamId)
    try { await deleteTeam({ teamId }) } finally {
      setDeletingId(null)
      setConfirmDeleteId(null)
    }
  }

  if (selectedTeamId) {
    return (
      <AppShell navItems={dispatcherNav} title="Dispečer" primaryCount={4}>
        <div className="p-4 md:p-6 max-w-5xl mx-auto">
          <TeamDetail teamId={selectedTeamId} onBack={() => setSelectedTeamId(null)} />
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell navItems={dispatcherNav} title="Dispečer" primaryCount={4}>
      <div className="p-4 md:p-6 max-w-5xl mx-auto">
        <PageHeader
          title="Týmy řidičů"
          subtitle="Skupiny řidičů sdílejí navzájem dostupnost v kalendáři"
          action={
            <button
              onClick={() => { setEditingTeam(null); setShowForm(true) }}
              className="flex items-center gap-2 bg-primary text-black font-bold px-4 py-2 rounded-xl text-sm hover:bg-primary/90 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Nový tým
            </button>
          }
        />

        {teams === undefined ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white/3 border border-white/8 rounded-2xl h-36 animate-pulse" />
            ))}
          </div>
        ) : teams.length === 0 ? (
          <div className="mt-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-primary font-semibold mb-1">Zatím žádné týmy</h3>
            <p className="text-secondary text-sm mb-6">Vytvořte první tým a přiřaďte k němu řidiče.</p>
            <button
              onClick={() => { setEditingTeam(null); setShowForm(true) }}
              className="inline-flex items-center gap-2 bg-primary text-black font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-primary/90 transition-colors"
            >
              Vytvořit první tým
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
            {teams.map((team) => (
              <div
                key={team._id}
                className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden hover:border-white/15 transition-colors group"
              >
                {/* Color strip */}
                <div
                  className="h-1.5 w-full"
                  style={{ backgroundColor: team.color ?? '#f59e0b' }}
                />
                <div className="p-5">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="min-w-0">
                      <h3 className="font-bold text-primary text-base leading-tight">{team.name}</h3>
                      {team.description && (
                        <p className="text-secondary text-xs mt-1 line-clamp-2">{team.description}</p>
                      )}
                    </div>
                    <div className="flex gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => { setEditingTeam(team); setShowForm(true) }}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-secondary hover:text-primary transition-colors"
                        title="Upravit"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(team._id)}
                        className="p-1.5 rounded-lg hover:bg-red-500/15 text-secondary hover:text-red-400 transition-colors"
                        title="Smazat"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-secondary text-xs flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {team.memberCount} {team.memberCount === 1 ? 'řidič' : team.memberCount >= 2 && team.memberCount <= 4 ? 'řidiči' : 'řidičů'}
                    </span>
                    <button
                      onClick={() => setSelectedTeamId(team._id)}
                      className="text-xs text-primary/70 hover:text-primary font-medium transition-colors flex items-center gap-1"
                    >
                      Spravovat
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create/Edit modal */}
        {showForm && (
          <TeamFormModal
            initial={editingTeam ?? undefined}
            onClose={() => { setShowForm(false); setEditingTeam(null) }}
            onSave={editingTeam ? handleUpdate : handleCreate}
          />
        )}

        {/* Delete confirm */}
        {confirmDeleteId && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-background border border-white/10 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
              <h3 className="text-primary font-bold text-lg mb-2">Smazat tým?</h3>
              <p className="text-secondary text-sm mb-6">Tým bude trvale smazán. Řidiči zůstanou v systému, pouze budou odebráni z tohoto týmu.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDeleteId(null)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-white/15 text-secondary hover:text-primary transition-colors text-sm"
                >
                  Zrušit
                </button>
                <button
                  onClick={() => handleDelete(confirmDeleteId as Id<'teams'>)}
                  disabled={deletingId === confirmDeleteId}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-sm transition-colors disabled:opacity-50"
                >
                  {deletingId === confirmDeleteId ? 'Mažu...' : 'Smazat'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
