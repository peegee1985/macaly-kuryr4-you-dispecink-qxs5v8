import { createFileRoute } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { Flame, Target } from 'lucide-react'
import { api } from '../../convex/_generated/api'
import { DriverShell } from '@/components/DriverShell'

export const Route = createFileRoute('/ridic/gamifikace')({
  component: GamifikacePage,
})

const TIER_COLORS: Record<string, string> = {
  bronze: 'text-amber-600',
  silver: 'text-slate-300',
  gold: 'text-yellow-400',
  platinum: 'text-cyan-300',
}

const TIER_BG: Record<string, string> = {
  bronze: 'bg-amber-600/10 border-amber-600/30',
  silver: 'bg-slate-300/10 border-slate-300/30',
  gold: 'bg-yellow-400/10 border-yellow-400/30',
  platinum: 'bg-cyan-300/10 border-cyan-300/30',
}

const TIER_LABELS: Record<string, string> = {
  bronze: 'Bronz',
  silver: 'Stříbro',
  gold: 'Zlato',
  platinum: 'Platina',
}

function ChallengeCard({
  name,
  description,
  progress,
  target,
  xpReward,
  status,
  expiresAt,
}: {
  name: string
  description: string
  progress: number
  target: number
  xpReward: number
  status: string
  expiresAt: number
}) {
  const pct = target > 0 ? Math.round((progress / target) * 100) : 0
  const completed = status === 'completed'
  const expired = status === 'expired'
  const timeLeft = expiresAt - Date.now()
  const hoursLeft = Math.max(0, Math.floor(timeLeft / 3600000))
  const daysLeft = Math.floor(hoursLeft / 24)

  return (
    <div
      className={`bg-card border rounded-xl p-4 ${
        completed
          ? 'border-primary/40 bg-primary/5'
          : expired
          ? 'border-border opacity-60'
          : 'border-border'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <p className="font-heading font-semibold text-sm leading-tight">{name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
        <div className="flex-shrink-0 text-right">
          <span className="font-heading font-bold text-sm text-primary">+{xpReward} XP</span>
          {completed && <p className="text-xs text-primary mt-0.5">✓ Splněno</p>}
        </div>
      </div>

      {!completed && !expired && (
        <>
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>
              {progress} / {target}
            </span>
            <span>
              {daysLeft > 0
                ? `${daysLeft}d`
                : hoursLeft > 0
                ? `${hoursLeft}h`
                : 'Vyprší brzy'}
            </span>
          </div>
          <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
        </>
      )}
      {expired && (
        <p className="text-xs text-muted-foreground mt-1">Výzva vypršela</p>
      )}
    </div>
  )
}

function BadgeCard({
  name,
  description,
  iconKey,
  currentTier,
  metricValue,
  nextTier,
  nextTierThreshold,
}: {
  name: string
  description: string
  iconKey: string
  currentTier?: string
  metricValue: number
  nextTier?: string
  nextTierThreshold?: number
}) {
  const earned = !!currentTier
  const pct =
    nextTierThreshold && nextTierThreshold > 0
      ? Math.round((metricValue / nextTierThreshold) * 100)
      : 0

  return (
    <div
      className={`bg-card border rounded-xl p-4 ${
        earned
          ? `${TIER_BG[currentTier!]} border-opacity-50`
          : 'border-border opacity-70'
      }`}
    >
      <div className="flex items-center gap-3 mb-2">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${
            earned ? TIER_BG[currentTier!] : 'bg-secondary'
          } border`}
        >
          <svg className="w-7 h-7" aria-hidden="true">
            <use href={`/gamification/badge-sprite.svg#${iconKey}`} />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-heading font-semibold text-sm leading-tight">{name}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        {earned && (
          <span
            className={`text-xs font-bold ${TIER_COLORS[currentTier!]} flex-shrink-0`}
          >
            {TIER_LABELS[currentTier!]}
          </span>
        )}
      </div>

      {nextTier && nextTierThreshold !== undefined && (
        <>
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>
              {metricValue} / {nextTierThreshold} → {TIER_LABELS[nextTier]}
            </span>
            <span>{Math.min(pct, 100)}%</span>
          </div>
          <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                currentTier ? 'bg-primary' : 'bg-muted-foreground/40'
              }`}
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
        </>
      )}

      {!nextTier && earned && (
        <p className="text-xs text-primary font-medium mt-1">Nejvyšší stupeň dosažen!</p>
      )}
    </div>
  )
}

function GamifikacePage() {
  const initialize = useMutation(api.gamification.initializeMyGamification)
  const profile = useQuery(api.gamification.getMyProfile)
  const dailyChallenges = useQuery(api.gamification.getMyChallenges, { cadence: 'daily' })
  const weeklyChallenges = useQuery(api.gamification.getMyChallenges, { cadence: 'weekly' })
  const monthlyChallenges = useQuery(api.gamification.getMyChallenges, { cadence: 'monthly' })
  const badges = useQuery(api.gamification.getMyBadges)

  useEffect(() => {
    void initialize({}).catch(error => {
      console.warn('[gamification] initialization failed', error)
    })
  }, [initialize])

  const level = profile?.level ?? 1
  const xpCurrentLevel = profile?.xpCurrentLevel ?? 0
  const xpToNextLevel = profile?.xpToNextLevel ?? 250
  const lifetimeXp = profile?.lifetimeXp ?? 0
  const xpInLevel = lifetimeXp - xpCurrentLevel
  const xpNeeded = xpToNextLevel - xpCurrentLevel
  const pct = xpNeeded > 0 ? Math.round((xpInLevel / xpNeeded) * 100) : 100

  const earnedBadges = badges?.filter(b => b.currentTier) ?? []
  const unearnedBadges = badges?.filter(b => !b.currentTier) ?? []

  return (
    <DriverShell>
      <div className="px-4 pt-5 pb-6 space-y-6">
        {/* Profile header */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 border-2 border-primary/50 flex items-center justify-center flex-shrink-0">
              <span className="font-heading font-bold text-3xl text-primary">{level}</span>
            </div>
            <div>
              <p className="font-heading font-bold text-lg leading-tight">
                {profile?.title ?? 'Nováček'}
              </p>
              <p className="text-sm text-muted-foreground">Úroveň {level}</p>
              {profile && profile.currentStreak > 0 && (
                <div className="flex items-center gap-1 mt-1">
                  <Flame className="w-4 h-4" aria-hidden="true" />
                  <span className="text-sm font-medium text-amber-400">
                    {profile.currentStreak} dní v řadě
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{lifetimeXp} XP celkem</span>
              <span>
                {level < 30
                  ? `${xpInLevel} / ${xpNeeded} XP do úrovně ${level + 1}`
                  : 'Max. úroveň!'}
              </span>
            </div>
            <div className="w-full h-2.5 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${Math.min(pct, 100)}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-4">
            {[
              { label: 'Sezóna XP', value: profile?.seasonXp ?? 0 },
              { label: 'Nejdel. série', value: profile?.longestStreak ?? 0 },
              { label: 'Odznaky', value: earnedBadges.length },
            ].map(s => (
              <div key={s.label} className="bg-secondary/50 rounded-xl p-2.5 text-center">
                <p className="font-heading font-bold text-xl text-primary">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Challenges */}
        {[
          { label: 'Denní výzvy', items: dailyChallenges },
          { label: 'Týdenní výzvy', items: weeklyChallenges },
          { label: 'Měsíční výzvy', items: monthlyChallenges },
        ].map(({ label, items }) =>
          items && items.length > 0 ? (
            <section key={label}>
              <h2 className="font-heading font-bold text-base mb-3">{label}</h2>
              <div className="space-y-3">
                {items.map(c => (
                  <ChallengeCard key={c._id} {...c} />
                ))}
              </div>
            </section>
          ) : null
        )}

        {dailyChallenges !== undefined &&
          weeklyChallenges !== undefined &&
          monthlyChallenges !== undefined &&
          (dailyChallenges.length + weeklyChallenges.length + monthlyChallenges.length) === 0 && (
            <div className="bg-card border border-border rounded-2xl p-6 text-center">
              <Target className="w-8 h-8 text-primary mx-auto mb-2" aria-hidden="true" />
              <p className="font-medium">Zatím žádné výzvy</p>
              <p className="text-sm text-muted-foreground mt-1">
                Výzvy se přiřadí automaticky po prvním doručení.
              </p>
            </div>
          )}

        {/* Badges */}
        {badges !== undefined && badges.length > 0 && (
          <section>
            <h2 className="font-heading font-bold text-base mb-3">Odznaky</h2>

            {earnedBadges.length > 0 && (
              <div className="space-y-3 mb-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Získané</p>
                {earnedBadges.map(b => (
                  <BadgeCard key={b.code} {...b} />
                ))}
              </div>
            )}

            {unearnedBadges.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">V dosahu</p>
                {unearnedBadges.map(b => (
                  <BadgeCard key={b.code} {...b} />
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </DriverShell>
  )
}
