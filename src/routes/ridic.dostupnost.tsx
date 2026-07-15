import { createFileRoute } from '@tanstack/react-router'
import { useConvexAuth, useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useState } from 'react'
import { LoadingScreen, PageHeader } from '@/components/AppShell'
import { DriverShell } from '@/components/DriverShell'

export const Route = createFileRoute('/ridic/dostupnost')({
  component: DriverAvailabilityPage,
})

function getWeekDates(offset = 0): string[] {
  const today = new Date()
  const monday = new Date(today)
  monday.setDate(today.getDate() - today.getDay() + 1 + offset * 7)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d.toISOString().split('T')[0]
  })
}

const dayNames = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne']
const DAY_SHORT = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne']

function DriverAvailabilityPage() {
  const { isAuthenticated } = useConvexAuth()
  const [weekOffset, setWeekOffset] = useState(0)
  const [tab, setTab] = useState<'me' | 'team'>('me')
  const weekDates = getWeekDates(weekOffset)

  const setAvailability = useMutation(api.availability.setAvailability)
  const availability = useQuery(api.availability.getMyAvailability, {
    startDate: weekDates[0],
    endDate: weekDates[6],
  })
  const teamAvailability = useQuery(api.availability.getTeamAvailability, {
    startDate: weekDates[0],
    endDate: weekDates[6],
  })
  // Fetch ALL teammates regardless of whether they set availability
  const teammates = useQuery(api.teams.getMyTeammates)

  if (!isAuthenticated || availability === undefined || teamAvailability === undefined || teammates === undefined) return <LoadingScreen />

  type AvailEntry = { date: string; available: boolean; startTime?: string; endTime?: string; notes?: string }
  const availMap = new Map<string, AvailEntry>(availability.map(a => [a.date, a as AvailEntry]))

  const handleToggle = async (date: string) => {
    const existing = availMap.get(date)
    await setAvailability({
      date,
      available: !(existing?.available ?? false),
      startTime: existing?.startTime || '08:00',
      endTime: existing?.endTime || '18:00',
    })
  }

  const handleTimeUpdate = async (date: string, field: 'startTime' | 'endTime', value: string) => {
    const existing = availMap.get(date)
    await setAvailability({
      date,
      available: existing?.available ?? true,
      startTime: field === 'startTime' ? value : (existing?.startTime || '08:00'),
      endTime: field === 'endTime' ? value : (existing?.endTime || '18:00'),
    })
  }

  const weekStart = new Date(weekDates[0]).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long' })
  const weekEnd = new Date(weekDates[6]).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' })

  // Build team grid using teammates list as authoritative rows
  // (teammates shows everyone, even those who haven't set availability this week)
  type TeamEntry = { driverId: string; driverName?: string; teamName?: string; teamColor?: string; date: string; available: boolean; startTime?: string; endTime?: string }
  const teamEntries = teamAvailability as TeamEntry[]

  // Rows = ALL teammates (not just those with availability records)
  const driverIds = teammates.map(t => t.driverId)
  const driverNames = new Map<string, string>(teammates.map(t => [t.driverId, t.name || t.email || 'Neznámý řidič']))
  const driverTeamColors = new Map<string, string>(
    teammates.filter(t => t.teamColor).map(t => [t.driverId, t.teamColor!])
  )
  // Map driverId+date → entry (availability data overlay)
  const teamMap = new Map<string, TeamEntry>()
  teamEntries.forEach(e => teamMap.set(`${e.driverId}:${e.date}`, e))

  return (
    <DriverShell>
      <div className="px-4 pt-5 max-w-2xl mx-auto">
        <PageHeader title="Dostupnost" subtitle="Nastavte svou dostupnost pro dispečera" />

        {/* Tabs */}
        <div className="flex gap-2 mb-5">
          <button
            onClick={() => setTab('me')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'me' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground border border-border hover:border-primary/40'}`}>
            Moje dostupnost
          </button>
          <button
            onClick={() => setTab('team')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'team' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground border border-border hover:border-primary/40'}`}>
            Kolegové ({teammates.length})
          </button>
        </div>

        {/* Week navigation */}
        <div className="flex items-center justify-between mb-5">
          <button onClick={() => setWeekOffset(w => w - 1)}
            className="p-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">
            ←
          </button>
          <div className="text-center">
            <p className="font-medium text-sm">{weekStart} – {weekEnd}</p>
            {weekOffset === 0 && <p className="text-xs text-primary">Tento týden</p>}
          </div>
          <button onClick={() => setWeekOffset(w => w + 1)}
            className="p-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">
            →
          </button>
        </div>

        {/* MY AVAILABILITY TAB */}
        {tab === 'me' && (
          <div className="space-y-2">
            {weekDates.map((date, i) => {
              const avail = availMap.get(date)
              const isAvailable = avail?.available ?? false
              const isPast = new Date(date) < new Date(new Date().toDateString())
              const isToday = date === new Date().toISOString().split('T')[0]

              return (
                <div key={date} className={`bg-card border rounded-xl p-4 transition-colors ${
                  isToday ? 'border-primary/50' : 'border-border'
                } ${isPast ? 'opacity-50' : ''}`}>
                  <div className="flex items-center gap-3">
                    <div className="text-center w-12">
                      <p className="text-xs text-muted-foreground">{dayNames[i]}</p>
                      <p className="font-heading font-bold text-lg leading-tight">
                        {new Date(date).getDate()}
                      </p>
                      {isToday && <p className="text-xs text-primary">dnes</p>}
                    </div>

                    <div className="flex-1">
                      {isAvailable ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          <input type="time" defaultValue={avail?.startTime || '08:00'}
                            disabled={isPast}
                            onChange={(e) => handleTimeUpdate(date, 'startTime', e.target.value)}
                            className="px-2 py-1.5 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                          <span className="text-muted-foreground text-sm">–</span>
                          <input type="time" defaultValue={avail?.endTime || '18:00'}
                            disabled={isPast}
                            onChange={(e) => handleTimeUpdate(date, 'endTime', e.target.value)}
                            className="px-2 py-1.5 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                          <span className="text-xs text-green-400 font-medium">Dostupný</span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Nedostupný</span>
                      )}
                    </div>

                    <button
                      onClick={() => !isPast && handleToggle(date)}
                      disabled={isPast}
                      className={`w-12 h-6 rounded-full transition-colors relative flex-shrink-0 ${
                        isAvailable ? 'bg-green-500' : 'bg-muted'
                      } disabled:cursor-not-allowed`}>
                      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow ${
                        isAvailable ? 'left-7' : 'left-1'
                      }`} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* TEAM TAB */}
        {tab === 'team' && (
          <div>
            {driverIds.length === 0 ? (
              <div className="bg-card border border-border rounded-xl p-6 text-center">
                <p className="text-muted-foreground text-sm font-medium mb-1">Nejste v žádném týmu</p>
                <p className="text-muted-foreground text-xs">Dispečer vás musí přiřadit do týmu, aby se zde zobrazila dostupnost kolegů.</p>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-4 px-4">
                <table className="w-full text-sm border-collapse min-w-[380px]">
                  <thead>
                    <tr>
                      <th className="text-left text-xs text-muted-foreground font-medium pb-2 pr-3 whitespace-nowrap">Řidič</th>
                      {weekDates.map((date, i) => {
                        const isToday = date === new Date().toISOString().split('T')[0]
                        return (
                          <th key={date} className={`text-center text-xs font-medium pb-2 px-1 ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                            <div>{DAY_SHORT[i]}</div>
                            <div className={`text-base font-bold leading-tight ${isToday ? 'text-primary' : 'text-foreground'}`}>
                              {new Date(date).getDate()}
                            </div>
                          </th>
                        )
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {driverIds.map(driverId => {
                      const name = driverNames.get(driverId) ?? 'Neznámý řidič'
                      return (
                        <tr key={driverId} className="border-t border-border/50">
                          <td className="py-2 pr-3 font-medium text-foreground whitespace-nowrap max-w-[100px] truncate" title={name}>
                            <span className="flex items-center gap-1.5">
                              {driverTeamColors.get(driverId) && (
                                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: driverTeamColors.get(driverId) }} />
                              )}
                              {name}
                            </span>
                          </td>
                          {weekDates.map(date => {
                            const entry = teamMap.get(`${driverId}:${date}`)
                            const isPast = new Date(date) < new Date(new Date().toDateString())
                            if (!entry || !entry.available) {
                              return (
                                <td key={date} className={`text-center py-2 px-1 ${isPast ? 'opacity-40' : ''}`}>
                                  <span className="inline-block w-6 h-6 rounded-full bg-muted/40 text-muted-foreground text-xs leading-6">–</span>
                                </td>
                              )
                            }
                            return (
                              <td key={date} className="text-center py-2 px-1">
                                <div className="flex flex-col items-center gap-0.5">
                                  <span className="inline-block w-6 h-6 rounded-full bg-green-500/20 border border-green-500/40 text-green-400 text-xs leading-6">✓</span>
                                  {entry.startTime && (
                                    <span className="text-[10px] text-muted-foreground leading-none">{entry.startTime}</span>
                                  )}
                                </div>
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-4 text-center">
              ✓ = dostupný · – = nedostupný nebo nenastaveno
            </p>
          </div>
        )}

        <div className="h-8" />
      </div>
    </DriverShell>
  )
}
