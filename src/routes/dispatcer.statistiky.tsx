import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { AppShell, PageHeader } from '@/components/AppShell'
import { dispatcherNav } from './dispatcer'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

export const Route = createFileRoute('/dispatcer/statistiky')({
  component: StatisticsPage,
})

const COLORS = ['#f97316', '#3b82f6', '#22c55e', '#a855f7', '#f59e0b', '#ec4899', '#14b8a6']

const STATUS_LABELS: Record<string, string> = {
  pending: 'Čeká',
  approved: 'Schváleno',
  assigned: 'Přiřazeno',
  pickup: 'Vyzvednutí',
  transit: 'Na cestě',
  delivered: 'Doručeno',
  cancelled: 'Zrušeno',
}

function StatCard({ label, value, sub, color = 'text-foreground' }: {
  label: string; value: string | number; sub?: string; color?: string
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-3xl font-heading font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-lg font-heading font-semibold text-foreground mb-4 mt-8 border-b border-border pb-2">
      {children}
    </h2>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-xl h-24" />
        ))}
      </div>
      <div className="bg-card border border-border rounded-xl h-64" />
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl h-64" />
        <div className="bg-card border border-border rounded-xl h-64" />
      </div>
    </div>
  )
}

function StatisticsPage() {
  const stats = useQuery(api.rides.getAdminStats)

  if (!stats) {
    return (
      <AppShell navItems={dispatcherNav} title="Dispečer" primaryCount={4} subtitle="Statistiky">
        <div className="p-4 md:p-6 max-w-6xl mx-auto">
          <PageHeader title="Statistiky" subtitle="Komplexní přehled výkonnosti" />
          <LoadingSkeleton />
        </div>
      </AppShell>
    )
  }

  const completionRate = stats.totalRides > 0
    ? Math.round((stats.deliveredRides / stats.totalRides) * 100)
    : 0

  const avgRevenue = stats.deliveredRides > 0
    ? Math.round(stats.totalRevenue / stats.deliveredRides)
    : 0

  // Format chart data: show last 14 days for readability
  const chartData = stats.last30Days.slice(-14).map(d => ({
    date: new Date(d.date).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' }),
    Zásilky: d.count,
    Doručeno: d.delivered,
    Tržby: d.revenue,
  }))

  const statusData = stats.statusBreakdown.map(s => ({
    name: STATUS_LABELS[s.status] ?? s.status,
    value: s.count,
  }))

  const cargoData = stats.cargoBreakdown.map(c => ({
    name: c.type,
    Počet: c.count,
  }))

  return (
    <AppShell navItems={dispatcherNav} title="Dispečer" primaryCount={4} subtitle="Statistiky">
      <div className="p-4 md:p-6 max-w-6xl mx-auto">
        <PageHeader
          title="Statistiky"
          subtitle="Komplexní přehled výkonnosti dispečinku"
        />

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Celkem zásilek" value={stats.totalRides} color="text-foreground" />
          <StatCard label="Doručeno" value={stats.deliveredRides} color="text-green-400"
            sub={`${completionRate}% úspěšnost`} />
          <StatCard label="Aktivní nyní" value={stats.activeRides} color="text-primary"
            sub="přiřazeno + na cestě" />
          <StatCard label="Čekající" value={stats.pendingRides} color="text-amber-400"
            sub="ke schválení" />
          <StatCard label="Celkem tržby" value={`${stats.totalRevenue.toLocaleString('cs-CZ')} Kč`}
            color="text-primary" sub="zaplacené zásilky" />
          <StatCard label="Průměr / zásilka" value={`${avgRevenue.toLocaleString('cs-CZ')} Kč`}
            sub="průměrná hodnota" />
          <StatCard label="Průměrná doba doručení"
            value={stats.avgDeliveryTimeMinutes > 0
              ? `${Math.round(stats.avgDeliveryTimeMinutes)} min`
              : 'N/A'}
            sub="od vytvoření po doručení" />
          <StatCard label="Včasnost doručení"
            value={`${Math.round(stats.onTimeRate)} %`}
            color={stats.onTimeRate >= 80 ? 'text-green-400' : stats.onTimeRate >= 60 ? 'text-amber-400' : 'text-red-400'}
            sub="doručeno v termínu" />
        </div>

        {/* 14-day trend */}
        <SectionTitle>Vývoj zásilek — posledních 14 dní</SectionTitle>
        <div className="bg-card border border-border rounded-xl p-4">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradZasilky" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradDoruceno" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1c1c1e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#e5e7eb' }}
              />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              <Area type="monotone" dataKey="Zásilky" stroke="#f97316" strokeWidth={2} fill="url(#gradZasilky)" />
              <Area type="monotone" dataKey="Doručeno" stroke="#22c55e" strokeWidth={2} fill="url(#gradDoruceno)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue trend */}
        <SectionTitle>Tržby — posledních 14 dní (Kč)</SectionTitle>
        <div className="bg-card border border-border rounded-xl p-4">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1c1c1e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#e5e7eb' }}
                formatter={(v: unknown) => [`${Number(v).toLocaleString('cs-CZ')} Kč`, 'Tržby']}
              />
              <Bar dataKey="Tržby" fill="#f97316" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Status + Cargo breakdown */}
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <SectionTitle>Rozložení stavů zásilek</SectionTitle>
            <div className="bg-card border border-border rounded-xl p-4">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ''} ${Math.round((percent ?? 0) * 100)}%`}
                    labelLine={false}
                  >
                    {statusData.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1c1c1e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <SectionTitle>Typy zásilky</SectionTitle>
            <div className="bg-card border border-border rounded-xl p-4">
              {cargoData.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={cargoData} layout="vertical" margin={{ top: 0, right: 20, left: 60, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                    <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fill: '#e5e7eb', fontSize: 11 }} axisLine={false} tickLine={false} width={55} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1c1c1e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                    />
                    <Bar dataKey="Počet" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground text-sm text-center py-10">Žádná data</p>
              )}
            </div>
          </div>
        </div>

        {/* Driver performance table */}
        {stats.driverStats.length > 0 && (
          <>
            <SectionTitle>Výkonnost řidičů</SectionTitle>
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium text-xs uppercase">Řidič</th>
                    <th className="text-right px-4 py-3 text-muted-foreground font-medium text-xs uppercase">Přiřazeno</th>
                    <th className="text-right px-4 py-3 text-muted-foreground font-medium text-xs uppercase">Doručeno</th>
                    <th className="text-right px-4 py-3 text-muted-foreground font-medium text-xs uppercase">Zrušeno</th>
                    <th className="text-right px-4 py-3 text-muted-foreground font-medium text-xs uppercase hidden md:table-cell">Aktivní</th>
                    <th className="text-right px-4 py-3 text-muted-foreground font-medium text-xs uppercase hidden md:table-cell">Tržby</th>
                    <th className="text-right px-4 py-3 text-muted-foreground font-medium text-xs uppercase">Úspěšnost</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.driverStats.map((d, i) => {
                    const rate = d.totalAssigned > 0 ? Math.round((d.delivered / d.totalAssigned) * 100) : 0
                    return (
                      <tr key={d.driverId} className={`border-b border-border/50 hover:bg-white/[0.02] ${i % 2 === 0 ? '' : 'bg-white/[0.01]'}`}>
                        <td className="px-4 py-3 font-medium">{d.driverName}</td>
                        <td className="px-4 py-3 text-right">{d.totalAssigned}</td>
                        <td className="px-4 py-3 text-right text-green-400">{d.delivered}</td>
                        <td className="px-4 py-3 text-right text-red-400">{d.cancelled}</td>
                        <td className="px-4 py-3 text-right text-primary hidden md:table-cell">{d.activeNow}</td>
                        <td className="px-4 py-3 text-right hidden md:table-cell">{d.totalRevenue.toLocaleString('cs-CZ')} Kč</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-semibold ${rate >= 80 ? 'text-green-400' : rate >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
                            {rate} %
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Top customers table */}
        {stats.topCustomers.length > 0 && (
          <>
            <SectionTitle>Top zákazníci (podle počtu zásilek)</SectionTitle>
            <div className="bg-card border border-border rounded-xl overflow-hidden mb-8">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium text-xs uppercase">#</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium text-xs uppercase">Zákazník</th>
                    <th className="text-right px-4 py-3 text-muted-foreground font-medium text-xs uppercase">Zásilek</th>
                    <th className="text-right px-4 py-3 text-muted-foreground font-medium text-xs uppercase">Celkem utratil</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.topCustomers.map((c, i) => (
                    <tr key={c.customerId} className={`border-b border-border/50 hover:bg-white/[0.02] ${i % 2 === 0 ? '' : 'bg-white/[0.01]'}`}>
                      <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                      <td className="px-4 py-3 font-medium">{c.customerName}</td>
                      <td className="px-4 py-3 text-right">{c.totalOrders}</td>
                      <td className="px-4 py-3 text-right text-primary">{c.totalSpent.toLocaleString('cs-CZ')} Kč</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </AppShell>
  )
}
