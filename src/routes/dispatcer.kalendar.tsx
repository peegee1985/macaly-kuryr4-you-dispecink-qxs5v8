import { createFileRoute } from '@tanstack/react-router'
import { useConvexAuth, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useState } from 'react'
import { AppShell, LoadingScreen, PageHeader } from '@/components/AppShell'
import { dispatcherNav } from './dispatcer'

export const Route = createFileRoute('/dispatcer/kalendar')({
  component: DispatcherCalendarPage,
})

const DAY_NAMES = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne']

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

function DispatcherCalendarPage() {
  const { isAuthenticated } = useConvexAuth()
  const [weekOffset, setWeekOffset] = useState(0)
  const weekDates = getWeekDates(weekOffset)

  const calendarData = useQuery(api.availability.getAvailabilityForRange, {
    startDate: weekDates[0],
    endDate: weekDates[6],
  })
  // Fetch ALL active drivers — show them even if no availability is set
  const allDrivers = useQuery(api.users.listActiveDrivers)

  if (!isAuthenticated || calendarData === undefined || allDrivers === undefined) return <LoadingScreen />

  const weekStart = new Date(weekDates[0]).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long' })
  const weekEnd = new Date(weekDates[6]).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' })

  // Build a map: date -> driverId -> availability entry
  const availMap = new Map<string, Map<string, any>>()
  calendarData.forEach(item => {
    if (!availMap.has(item.date)) availMap.set(item.date, new Map())
    availMap.get(item.date)!.set(item.driverId, item)
  })

  // Use ALL active drivers as rows (not just those who set availability)
  const drivers: [string, string][] = allDrivers.map(d => [d._id, d.name || d.email || 'Neznámý řidič'])

  return (
    <AppShell navItems={dispatcherNav} title="Dispečer" primaryCount={4} subtitle="Řídicí centrum">
      <div className="p-4 md:p-6 max-w-6xl mx-auto">
        <PageHeader title="Kalendář dostupnosti" subtitle="Přehled dostupnosti řidičů" />

        {/* Week navigation */}
        <div className="flex items-center justify-between mb-5">
          <button onClick={() => setWeekOffset(w => w - 1)}
            className="p-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80">←</button>
          <div className="text-center">
            <p className="font-medium">{weekStart} – {weekEnd}</p>
            {weekOffset === 0 && <p className="text-xs text-primary">Tento týden</p>}
          </div>
          <button onClick={() => setWeekOffset(w => w + 1)}
            className="p-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80">→</button>
        </div>

        {drivers.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-8 text-center">
            <p className="text-muted-foreground text-sm">Žádní aktivní řidiči. Přidejte řidiče v sekci Uživatelé.</p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-3 font-medium text-muted-foreground w-40">Řidič</th>
                    {weekDates.map((date, i) => (
                      <th key={date} className={`p-3 text-center font-medium min-w-[90px] ${
                        date === new Date().toISOString().split('T')[0] ? 'text-primary' : 'text-muted-foreground'
                      }`}>
                        <div>{DAY_NAMES[i]}</div>
                        <div className="text-xs">{new Date(date).getDate()}.{new Date(date).getMonth() + 1}.</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {drivers.map(([driverId, driverName], i) => (
                    <tr key={driverId} className={i < drivers.length - 1 ? 'border-b border-border' : ''}>
                      <td className="p-3 font-medium truncate max-w-[160px]">{driverName}</td>
                      {weekDates.map((date) => {
                        const avail = availMap.get(date)?.get(driverId)
                        return (
                          <td key={date} className="p-2 text-center">
                            {avail?.available ? (
                              <div className="inline-block">
                                <div className="w-3 h-3 bg-green-500 rounded-full mx-auto mb-1" />
                                {avail.startTime && avail.endTime && (
                                  <div className="text-xs text-muted-foreground whitespace-nowrap">
                                    {avail.startTime}–{avail.endTime}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="w-3 h-3 bg-muted rounded-full mx-auto opacity-30" />
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-border p-3 flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 bg-green-500 rounded-full" />
                Dostupný
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 bg-muted rounded-full" />
                Nedostupný / nevyplněno
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
