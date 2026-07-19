import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Link } from '@tanstack/react-router'

function XpProgressBar({ pct }: { pct: number }) {
  return (
    <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
      <div
        className="h-full bg-primary rounded-full transition-all duration-500"
        style={{ width: `${Math.min(pct, 100)}%` }}
      />
    </div>
  )
}

export function GamificationCard() {
  const profile = useQuery(api.gamification.getMyProfile)

  if (!profile) return null

  const { level, lifetimeXp, xpCurrentLevel, xpToNextLevel, title, currentStreak, seasonXp } = profile
  const xpInLevel = lifetimeXp - xpCurrentLevel
  const xpNeeded = xpToNextLevel - xpCurrentLevel
  const pct = xpNeeded > 0 ? Math.round((xpInLevel / xpNeeded) * 100) : 100

  return (
    <Link
      to="/ridic/gamifikace"
      className="block bg-card border border-border rounded-2xl p-4 hover:border-primary/50 active:scale-95 transition-all mb-4"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          {/* Level badge */}
          <div className="relative flex-shrink-0">
            <div className="w-12 h-12 rounded-full bg-primary/10 border-2 border-primary/40 flex items-center justify-center">
              <span className="font-heading font-bold text-lg text-primary">{level}</span>
            </div>
          </div>
          <div>
            <p className="font-heading font-bold text-sm leading-tight">{title}</p>
            <p className="text-xs text-muted-foreground">Úroveň {level}</p>
          </div>
        </div>
        <div className="text-right">
          {currentStreak > 0 && (
            <div className="flex items-center gap-1 justify-end">
              <span className="text-sm">🔥</span>
              <span className="font-heading font-bold text-sm text-amber-400">{currentStreak}</span>
              <span className="text-xs text-muted-foreground">dní</span>
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-0.5">Sezóna: {seasonXp} XP</p>
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{lifetimeXp} XP celkem</span>
          <span className="text-muted-foreground">
            {level < 30 ? `${xpInLevel} / ${xpNeeded} do úrovně ${level + 1}` : 'Max. úroveň!'}
          </span>
        </div>
        <XpProgressBar pct={pct} />
      </div>

      <p className="text-xs text-primary mt-2 font-medium text-right">Výzvy a odznaky →</p>
    </Link>
  )
}
