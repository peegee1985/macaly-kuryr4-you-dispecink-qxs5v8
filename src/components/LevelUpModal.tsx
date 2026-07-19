import { useState, useEffect } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'

export function LevelUpModal() {
  const profile = useQuery(api.gamification.getMyProfile)
  const acknowledge = useMutation(api.gamification.acknowledgeLevelUp)
  const [visible, setVisible] = useState(false)
  const [animating, setAnimating] = useState(false)

  useEffect(() => {
    if (profile?.pendingLevelUp) {
      setVisible(true)
      setTimeout(() => setAnimating(true), 50)
    }
  }, [profile?.pendingLevelUp])

  if (!visible || !profile?.pendingLevelUp) return null

  const handleClose = async () => {
    setAnimating(false)
    setTimeout(async () => {
      setVisible(false)
      try {
        await acknowledge({})
      } catch (e) {
        console.error('[LevelUpModal] acknowledge error', e)
      }
    }, 300)
  }

  const level = profile.pendingLevelUpLevel ?? profile.level
  const title = profile.pendingLevelUpTitle ?? profile.title

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${
        animating ? 'bg-black/60 backdrop-blur-sm' : 'bg-transparent'
      }`}
      onClick={handleClose}
    >
      <div
        className={`relative bg-card border border-primary/40 rounded-3xl p-8 max-w-xs w-full text-center shadow-2xl transition-all duration-300 ${
          animating ? 'scale-100 opacity-100' : 'scale-90 opacity-0'
        }`}
        onClick={e => e.stopPropagation()}
      >
        {/* Glow effect */}
        <div className="absolute inset-0 rounded-3xl bg-primary/5 pointer-events-none" />

        {/* Stars */}
        <div className="text-4xl mb-1 animate-bounce">⭐</div>

        <p className="text-muted-foreground text-sm font-medium mb-1">POSTUP NA ÚROVEŇ</p>

        {/* Level number */}
        <div className="w-24 h-24 rounded-full bg-primary/10 border-4 border-primary flex items-center justify-center mx-auto my-4">
          <span className="font-heading font-bold text-5xl text-primary">{level}</span>
        </div>

        <h2 className="font-heading font-bold text-2xl mb-1">{title}</h2>
        <p className="text-muted-foreground text-sm mb-6">
          Gratulujeme! Dosáhli jste nové úrovně.
        </p>

        <button
          onClick={handleClose}
          className="w-full bg-primary text-primary-foreground font-heading font-bold py-3 rounded-xl hover:opacity-90 active:scale-95 transition-all"
        >
          Pokračovat 🎉
        </button>
      </div>
    </div>
  )
}
