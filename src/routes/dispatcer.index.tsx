import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { AppShell, PageHeader, StatusBadge } from '@/components/AppShell'
import { dispatcherNav } from './dispatcer'
import { AreaChart, Area, Tooltip, ResponsiveContainer, XAxis } from 'recharts'

export const Route = createFileRoute('/dispatcer/')({
  component: DispatcherDashboard,
})

const STATUS_LABELS: Record<string, string> = {
  pending: 'Čeká', approved: 'Schváleno', assigned: 'Přiřazeno',
  pickup: 'Vyzvedávám', transit: 'Na cestě', delivered: 'Doručeno',
  cancelled: 'Zrušeno', failed: 'Nedoručeno',
}

const STATUS_ICONS: Record<string, string> = {
  pending: '🔔', approved: '✅', assigned: '👤',
  pickup: '🚚', transit: '📦', delivered: '✅',
  cancelled: '❌', failed: '⚠️',
}

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000)
  if (diff < 60) return 'Právě teď'
  if (diff < 3600) return `před ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `před ${Math.floor(diff / 3600)} hod`
  return `před ${Math.floor(diff / 86400)} dny`
}

function DispatcherDashboard() {
  const me = useQuery(api.users.getMe)
  const allRides = useQuery(api.rides.getAllRides, {})
  const activity = useQuery(api.rides.getRecentActivity)

  const pending = allRides?.filter(r => r.status === 'pending') ?? []
  const active = allRides?.filter(r => ['approved', 'assigned', 'pickup', 'transit'].includes(r.status)) ?? []
  const delivered = allRides?.filter(r => r.status === 'delivered') ?? []
  const deliveredToday = delivered.filter(r => new Date(r.podDeliveredAt ?? r._creationTime).toDateString() === new Date().toDateString())

  // Build 7-day trend chart data
  const trendData = (() => {
    if (!allRides) return []
    const days: { day: string; zásilky: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      d.setHours(0, 0, 0, 0)
      const next = new Date(d)
      next.setDate(d.getDate() + 1)
      const label = d.toLocaleDateString('cs-CZ', { weekday: 'short', day: 'numeric' })
      const count = allRides.filter(r => r._creationTime >= d.getTime() && r._creationTime < next.getTime()).length
      days.push({ day: label, zásilky: count })
    }
    return days
  })()

  return (
    <AppShell navItems={dispatcherNav} title="Dispečer" subtitle="Řídicí centrum" primaryCount={pending.length}>
      <div className="p-4 md:p-6 max-w-5xl mx-auto">
        <PageHeader
          title="Řídicí centrum"
          subtitle={`${new Date().toLocaleDateString('cs-CZ', { weekday: 'long', day: 'numeric', month: 'long' })}`}
          action={
            <Link to="/dispatcer/zasilky"
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-heading font-semibold rounded-lg hover:opacity-90 text-sm">
              Správa zásilek →
            </Link>
          }
        />

        {/* Alert for pending */}
        {pending.length > 0 && (
          <div className="bg-amber-950/30 border border-amber-700/50 rounded-xl p-4 mb-6 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🔔</span>
              <div>
                <p className="font-medium text-amber-300">{pending.length} zásilek čeká na schválení</p>
                <p className="text-sm text-amber-400/80">Přiřaďte řidiče nebo schvalte zásilky</p>
              </div>
            </div>
            <Link to="/dispatcer/zasilky"
              className="flex-shrink-0 px-3 py-1.5 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700">
              Vyřešit →
            </Link>
          </div>
        )}

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Čeká na schválení', value: pending.length, color: 'text-amber-400', link: '/dispatcer/zasilky' },
            { label: 'Aktivní zásilky', value: active.length, color: 'text-primary', link: '/dispatcer/zasilky' },
            { label: 'Doručeno dnes', value: deliveredToday.length, color: 'text-green-400', link: '/dispatcer/zasilky' },
            { label: 'Celkem zásilek', value: allRides?.length ?? 0, color: 'text-foreground', link: '/dispatcer/zasilky' },
          ].map((s) => (
            <Link key={s.label} to={s.link}
              className="bg-card border border-border rounded-xl p-4 hover:border-primary/50 transition-colors">
              <p className="text-muted-foreground text-xs mb-1">{s.label}</p>
              <p className={`font-heading text-2xl font-bold ${s.color}`}>{s.value}</p>
            </Link>
          ))}
        </div>

        {/* Trend chart + Quick access */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* 7-day trend */}
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-heading font-semibold text-sm">Zásilky za 7 dní</h2>
              <Link to="/dispatcer/statistiky" className="text-xs text-primary hover:opacity-80">Statistiky →</Link>
            </div>
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={100}>
                <AreaChart data={trendData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '8px', fontSize: '12px' }}
                    itemStyle={{ color: 'var(--color-foreground)' }}
                    cursor={{ stroke: 'var(--color-primary)', strokeWidth: 1, strokeDasharray: '4 4' }}
                  />
                  <Area type="monotone" dataKey="zásilky" stroke="var(--color-primary)" strokeWidth={2} fill="url(#trendGrad)" dot={false} activeDot={{ r: 4, fill: 'var(--color-primary)' }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-24 flex items-center justify-center text-muted-foreground text-sm">Načítám data…</div>
            )}
          </div>

          {/* Quick access */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { to: '/dispatcer/mapa', icon: '🗺️', label: 'Živá mapa', desc: 'GPS řidičů' },
              { to: '/dispatcer/zasilky', icon: '📦', label: 'Zásilky', desc: 'Správa a přiřazení' },
              { to: '/dispatcer/fakturace', icon: '🧾', label: 'Fakturace', desc: 'Generovat faktury' },
              { to: '/dispatcer/kalendar', icon: '📅', label: 'Kalendář', desc: 'Dostupnost řidičů' },
              { to: '/vending', icon: '🏧', label: 'Vending', desc: 'Správa automatů' },
            ].map((item) => (
              <Link key={item.to} to={item.to}
                className="bg-card border border-border rounded-xl p-3 hover:border-primary/50 transition-colors">
                <div className="text-xl mb-1">{item.icon}</div>
                <p className="font-medium text-sm mb-0.5">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* Activity feed + Recent rides */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Live activity feed */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-heading font-semibold flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                </span>
                Živá aktivita
              </h2>
              <Link to="/dispatcer/zasilky" className="text-sm text-primary hover:opacity-80">Vše →</Link>
            </div>
            {activity === undefined ? (
              <div className="bg-card border border-border rounded-xl p-6 text-center text-muted-foreground text-sm">Načítám…</div>
            ) : activity.length === 0 ? (
              <div className="bg-card border border-border rounded-xl p-6 text-center text-muted-foreground text-sm">Zatím žádná aktivita</div>
            ) : (
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                {activity.slice(0, 8).map((item, i) => (
                  <div key={item._id} className={`flex items-start gap-3 p-3 ${i < Math.min(activity.length, 8) - 1 ? 'border-b border-border' : ''} hover:bg-muted/20 transition-colors`}>
                    <span className="text-lg flex-shrink-0 mt-0.5">{STATUS_ICONS[item.status] ?? '📦'}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-heading font-semibold text-sm">#{item.rideNumber}</span>
                        <span className="text-xs text-muted-foreground flex-shrink-0">{timeAgo(item.updatedAt ?? item._creationTime)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {STATUS_LABELS[item.status] ?? item.status}
                        {item.driverName ? ` · ${item.driverName}` : ''}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">→ {item.deliveryAddress}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent rides table */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-heading font-semibold">Poslední zásilky</h2>
              <Link to="/dispatcer/zasilky" className="text-sm text-primary hover:opacity-80">Zobrazit vše →</Link>
            </div>
            {!allRides || allRides.length === 0 ? (
              <div className="bg-card border border-border rounded-xl p-8 text-center">
                <p className="text-muted-foreground text-sm">Zatím žádné zásilky</p>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left text-xs text-muted-foreground font-medium p-3">Číslo</th>
                      <th className="text-left text-xs text-muted-foreground font-medium p-3 hidden md:table-cell">Doručení</th>
                      <th className="text-left text-xs text-muted-foreground font-medium p-3">Stav</th>
                      <th className="text-right text-xs text-muted-foreground font-medium p-3">Cena</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allRides.slice(0, 8).map((ride, i) => (
                      <tr key={ride._id} className={`${i < Math.min(allRides.length, 8) - 1 ? 'border-b border-border' : ''} hover:bg-muted/30 transition-colors`}>
                        <td className="p-3 font-heading font-semibold">#{ride.rideNumber}</td>
                        <td className="p-3 hidden md:table-cell text-muted-foreground max-w-[160px] truncate">{ride.deliveryAddress}</td>
                        <td className="p-3"><StatusBadge status={ride.status} /></td>
                        <td className="p-3 text-right font-medium">{ride.price ? `${ride.price} ${ride.currency || 'CZK'}` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
