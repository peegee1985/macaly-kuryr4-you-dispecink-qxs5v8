import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { AppShell, PageHeader } from '@/components/AppShell'
import { vendingNav } from './vending'
import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
import type { Id } from '../../convex/_generated/dataModel'

export const Route = createFileRoute('/vending/kpi')({
  component: VendingKpiPage,
})

function KpiCard({ title, value, unit, sub, colorClass = 'text-[hsl(var(--primary))]' }: {
  title: string; value: string | number; unit?: string; sub?: string; colorClass?: string
}) {
  return (
    <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-5">
      <p className="text-xs text-[hsl(var(--muted-foreground))] uppercase tracking-wide mb-2">{title}</p>
      <div className="flex items-end gap-1">
        <span className={`text-3xl font-bold ${colorClass}`}>{value}</span>
        {unit && <span className="text-sm text-[hsl(var(--muted-foreground))] mb-1">{unit}</span>}
      </div>
      {sub && <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">{sub}</p>}
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-lg p-3 shadow-xl">
      <p className="text-xs font-medium text-[hsl(var(--foreground))] mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="text-xs" style={{ color: p.color }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  )
}

function VendingKpiPage() {
  const clients = useQuery(api.vending.listClients)
  const [selectedClientId, setSelectedClientId] = useState('')
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month')

  const activeClientId = selectedClientId || clients?.[0]?._id

  const kpi = useQuery(
    api.vending.getClientKpi,
    activeClientId ? { clientId: activeClientId as Id<'serviceClients'> } : 'skip'
  )

  const chartData = useQuery(
    api.vending.getVisitChartData,
    activeClientId ? { clientId: activeClientId as Id<'serviceClients'>, period } : 'skip'
  )

  return (
    <AppShell navItems={vendingNav} title="KPI" primaryCount={5}>
      <PageHeader title="KPI Dashboard" subtitle="Statistiky a výkonnost" />

      {/* Client + period selector */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={selectedClientId}
          onChange={(e) => setSelectedClientId(e.target.value)}
          className="px-3 py-2 bg-[hsl(var(--input))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))]"
        >
          {!clients ? <option>Načítám…</option> : clients.map((c) => (
            <option key={c._id} value={c._id}>{c.name}</option>
          ))}
        </select>

        <div className="flex bg-[hsl(var(--muted))] p-1 rounded-lg">
          {(['week', 'month', 'year'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 rounded-md text-sm transition-all ${period === p ? 'bg-[hsl(var(--card))] text-[hsl(var(--foreground))] shadow-sm' : 'text-[hsl(var(--muted-foreground))]'}`}
            >
              {p === 'week' ? 'Týden' : p === 'month' ? 'Měsíc' : 'Rok'}
            </button>
          ))}
        </div>
      </div>

      {!activeClientId ? (
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-12 text-center text-[hsl(var(--muted-foreground))]">
          Žádní klienti — nejdříve vytvořte klienta
        </div>
      ) : (
        <>
          {/* KPI Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <KpiCard
              title="Celkem návštěv"
              value={kpi?.totalVisits ?? '—'}
              sub={`${kpi?.completedVisits ?? 0} dokončeno`}
            />
            <KpiCard
              title="Míra plnění"
              value={kpi?.completionRate ?? '—'}
              unit="%"
              colorClass={kpi && kpi.completionRate >= 90 ? 'text-[hsl(var(--success))]' : kpi && kpi.completionRate >= 70 ? 'text-yellow-400' : 'text-[hsl(var(--destructive))]'}
            />
            <KpiCard
              title="Průměr. trvání"
              value={kpi?.avgDurationMin ?? '—'}
              unit="min"
              colorClass="text-[hsl(var(--info))]"
            />
            <KpiCard
              title="Včasnost příjezdu"
              value={kpi?.onTimePct ?? '—'}
              unit="%"
              colorClass={kpi && kpi.onTimePct >= 90 ? 'text-[hsl(var(--success))]' : 'text-yellow-400'}
            />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <KpiCard
              title="Otevřené incidenty"
              value={kpi?.openIncidents ?? '—'}
              colorClass={kpi && kpi.openIncidents > 0 ? 'text-[hsl(var(--destructive))]' : 'text-[hsl(var(--success))]'}
            />
            <KpiCard
              title="Celkem incidentů"
              value={kpi?.totalIncidents ?? '—'}
              colorClass="text-[hsl(var(--muted-foreground))]"
            />
            <KpiCard
              title="Nahraných fotek"
              value={kpi?.photosUploaded ?? '—'}
              colorClass="text-[hsl(var(--primary))]"
            />
            <KpiCard
              title="Aktivní lokace"
              value={kpi?.activeLocations ?? '—'}
              sub={`z ${kpi?.totalLocations ?? 0} celkem`}
              colorClass="text-[hsl(var(--success))]"
            />
          </div>

          {/* Chart */}
          <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-6">
            <h3 className="font-semibold text-[hsl(var(--foreground))] mb-4">Přehled návštěv</h3>
            {!chartData ? (
              <div className="h-48 flex items-center justify-center text-[hsl(var(--muted-foreground))]">Načítám…</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chartData} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}
                    formatter={(value) => value === 'completed' ? 'Dokončeno' : value === 'incidents' ? 'Incidenty' : 'Celkem'}
                  />
                  <Bar dataKey="completed" name="completed" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="incidents" name="incidents" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </>
      )}
    </AppShell>
  )
}
