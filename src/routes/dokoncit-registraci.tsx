import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useConvexAuth, useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useState, useEffect } from 'react'

export const Route = createFileRoute('/dokoncit-registraci')({
  component: CompleteRegistrationPage,
})

function CompleteRegistrationPage() {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const me = useQuery(api.users.getMe)
  const createProfile = useMutation(api.users.createUserProfile)
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) navigate({ to: '/prihlaseni' })
  }, [isAuthenticated, isLoading, navigate])

  // If profile already exists, redirect to correct portal
  useEffect(() => {
    if (me) {
      if (me.role === 'customer') navigate({ to: '/zakaznik' })
      else if (me.role === 'driver') navigate({ to: '/ridic' })
      else if (me.role === 'dispatcher') navigate({ to: '/dispatcer' })
    }
  }, [me, navigate])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setSaving(true)
    const fd = new FormData(e.currentTarget)
    try {
      await createProfile({
        email: fd.get('email') as string,
        name: fd.get('name') as string,
        phone: (fd.get('phone') as string) || undefined,
        role: 'customer',
      })
      navigate({ to: '/zakaznik' })
    } catch (err: any) {
      setError(err?.message ?? 'Nepodařilo se dokončit registraci.')
    } finally {
      setSaving(false)
    }
  }

  if (isLoading || me === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{
      background: 'radial-gradient(ellipse at 60% 0%, hsl(38 92% 50% / 0.08) 0%, transparent 60%), hsl(var(--background))'
    }}>
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 10V7" />
            </svg>
          </div>
          <div>
            <span className="font-heading font-bold text-lg">Kuryr4You</span>
            <p className="text-xs text-muted-foreground">Dispečink</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h2 className="font-heading text-xl font-bold mb-1">Dokončit registraci</h2>
          <p className="text-muted-foreground text-sm mb-6">
            Přihlásili jste se přes Google. Vyplňte prosím zbývající údaje.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Celé jméno *</label>
              <input name="name" type="text" required
                className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                placeholder="Jan Novák" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">E-mail *</label>
              <input name="email" type="email" required
                className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                placeholder="vas@email.cz" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Telefon <span className="text-muted-foreground">(nepovinné)</span></label>
              <input name="phone" type="tel"
                className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                placeholder="+420 777 123 456" />
            </div>

            {error && (
              <p className="text-destructive text-sm bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">{error}</p>
            )}

            <button type="submit" disabled={saving}
              className="w-full py-2.5 bg-primary text-primary-foreground font-heading font-semibold rounded-lg hover:opacity-90 disabled:opacity-50">
              {saving ? 'Ukládám...' : 'Dokončit registraci'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
