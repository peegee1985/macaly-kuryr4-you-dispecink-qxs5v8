import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { AppShell, PageHeader } from '@/components/AppShell'
import { dispatcherNav } from './dispatcer'

export const Route = createFileRoute('/dispatcer/gamifikace')({
  component: GamifikacePage,
})

const TIER_COLORS: Record<string, string> = {
  bronze: 'text-amber-600',
  silver: 'text-slate-400',
  gold: 'text-yellow-400',
  platinum: 'text-cyan-300',
}

const LEVEL_COLORS = [
  { max: 5, bg: 'bg-slate-700', text: 'text-slate-300', label: 'Nováček' },
  { max: 10, bg: 'bg-green-900', text: 'text-green-400', label: 'Junior' },
  { max: 15, bg: 'bg-blue-900', text: 'text-blue-400', label: 'Senior' },
  { max: 20, bg: 'bg-purple-900', text: 'text-purple-400', label: 'Expert' },
  { max: 25, bg: 'bg-orange-900', text: 'text-orange-400', label: 'Mistr' },
  { max: 30, bg: 'bg-yellow-900', text: 'text-yellow-400', label: 'Legenda' },
]

function getLevelTier(level: number) {
  return LEVEL_COLORS.find(l => level <= l.max) ?? LEVEL_COLORS[LEVEL_COLORS.length - 1]
}

function XpBar({ xpInLevel, xpForNextLevel, small }: { xpInLevel: number; xpForNextLevel: number; small?: boolean }) {
  const pct = xpForNextLevel > 0 ? Math.min(100, Math.round((xpInLevel / xpForNextLevel) * 100)) : 100
  return (
    <div className={`w-full bg-background rounded-full overflow-hidden ${small ? 'h-1.5' : 'h-2'}`}>
      <div
        className="h-full bg-primary rounded-full transition-all duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

function MedalIcon({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-xl">🥇</span>
  if (rank === 2) return <span className="text-xl">🥈</span>
  if (rank === 3) return <span className="text-xl">🥉</span>
  return <span className="text-sm font-mono text-muted-foreground w-7 text-center">{rank}</span>
}

function DriverRow({ driver, rank }: {
  driver: {
    userId: string
    name: string
    role: string
    level: number
    lifetimeXp: number
    xpInLevel: number
    xpForNextLevel: number
    currentStreak: number
    longestStreak: number
    badgeCount: number
    pendingLevelUp: boolean
  }
  rank: number
}) {
  const tier = getLevelTier(driver.level)
  const pct = driver.xpForNextLevel > 0
    ? Math.min(100, Math.round((driver.xpInLevel / driver.xpForNextLevel) * 100))
    : 100

  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-accent/20 transition-colors">
      {/* Rank */}
      <div className="flex-shrink-0 w-8 flex justify-center">
        <MedalIcon rank={rank} />
      </div>

      {/* Avatar */}
      <div className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${tier.bg} ${tier.text}`}>
        {driver.name.charAt(0).toUpperCase()}
      </div>

      {/* Name + XP bar */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-foreground text-sm truncate">{driver.name}</span>
          {driver.pendingLevelUp && (
            <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-medium">↑ Level up!</span>
          )}
          <span className="text-xs text-muted-foreground ml-auto flex-shrink-0">
            {driver.currentStreak > 0 && `🔥 ${driver.currentStreak}d`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <XpBar xpInLevel={driver.xpInLevel} xpForNextLevel={driver.xpForNextLevel} small />
          <span className="text-xs text-muted-foreground flex-shrink-0">{pct}%</span>
        </div>
      </div>

      {/* Level badge */}
      <div className="flex-shrink-0 text-right">
        <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${tier.bg} ${tier.text}`}>
          Lvl {driver.level}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{driver.lifetimeXp.toLocaleString('cs-CZ')} XP</p>
      </div>

      {/* Badges */}
      <div className="flex-shrink-0 w-10 text-center">
        <span className="text-base">🏅</span>
        <p className="text-xs text-muted-foreground">{driver.badgeCount}</p>
      </div>
    </div>
  )
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-heading font-bold text-foreground">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  )
}

function GamifikacePage() {
  const drivers = useQuery(api.gamification.getAllDriversLeaderboard)

  const totalDrivers = drivers?.length ?? 0
  const activeDrivers = drivers?.filter(d => d.lifetimeXp > 0).length ?? 0
  const topDriver = drivers?.[0]
  const avgLevel = drivers && drivers.length > 0
    ? Math.round(drivers.reduce((s, d) => s + d.level, 0) / drivers.length)
    : 0
  const totalBadges = drivers?.reduce((s, d) => s + d.badgeCount, 0) ?? 0

  return (
    <AppShell navItems={dispatcherNav} title="Dispečer" primaryCount={4} subtitle="Gamifikace">
      <PageHeader
        title="🏆 Gamifikace řidičů"
        subtitle="Přehled XP, levelů a úspěchů všech řidičů"
      />

      {/* Souhrn */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Celkem řidičů" value={totalDrivers} sub="všechny role" />
        <StatCard label="Aktivní v systému" value={activeDrivers} sub="s alespoň 1 XP" />
        <StatCard label="Průměrný level" value={avgLevel || '—'} sub="všichni řidiči" />
        <StatCard label="Odznaky celkem" value={totalBadges} sub="uděleno" />
      </div>

      {/* Leaderboard */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <span className="text-base font-heading font-semibold text-foreground">Žebříček</span>
          {topDriver && (
            <span className="text-xs text-muted-foreground ml-auto">
              1. místo: <span className="text-foreground font-medium">{topDriver.name}</span>
              {' '}({topDriver.lifetimeXp.toLocaleString('cs-CZ')} XP, Lvl {topDriver.level})
            </span>
          )}
        </div>

        {/* Column labels */}
        <div className="flex items-center gap-3 px-4 py-2 text-xs text-muted-foreground uppercase tracking-wider border-b border-border/50">
          <div className="w-8 text-center">#</div>
          <div className="w-9" />
          <div className="flex-1">Řidič / Postup</div>
          <div className="w-20 text-right">Level / XP</div>
          <div className="w-10 text-center">Odznaky</div>
        </div>

        {/* Rows */}
        {drivers === undefined ? (
          <div className="p-8 text-center text-muted-foreground animate-pulse">Načítání…</div>
        ) : drivers.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <p className="text-3xl mb-2">🏁</p>
            <p className="font-medium">Zatím žádní řidiči</p>
            <p className="text-sm mt-1">XP profil se vytvoří automaticky při první zásilce.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {drivers.map((driver, i) => (
              <DriverRow key={driver.userId} driver={driver} rank={i + 1} />
            ))}
          </div>
        )}
      </div>

      {/* Legenda levelů */}
      <div className="mt-6 bg-card border border-border rounded-xl p-4">
        <h3 className="text-sm font-heading font-semibold text-foreground mb-3">Úrovně řidičů</h3>
        <div className="flex flex-wrap gap-2">
          {LEVEL_COLORS.map(tier => (
            <div key={tier.label} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${tier.bg} ${tier.text}`}>
              {tier.label} (Lvl {tier.max - 4}–{tier.max})
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  )
}
