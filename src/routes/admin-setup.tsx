import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useState } from 'react'

export const Route = createFileRoute('/admin-setup')({
  component: AdminSetupPage,
})

function AdminSetupPage() {
  const me = useQuery(api.users.getMe)
  const activateDispatcher = useMutation(api.users.activateDispatcher)
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await activateDispatcher({ secretCode: code })
      setSuccess(true)
      setTimeout(() => navigate({ to: '/dispatcer/zasilky' }), 2000)
    } catch (err: any) {
      setError(err?.message ?? 'Nesprávný kód')
    } finally {
      setLoading(false)
    }
  }

  if (me === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!me) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="bg-card border border-border rounded-xl p-6 max-w-sm w-full text-center">
          <p className="text-muted-foreground mb-4">Pro nastavení účtu se nejprve přihlaste.</p>
          <Link to="/prihlaseni" className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90">
            Přihlásit se
          </Link>
        </div>
      </div>
    )
  }

  if (me.role === 'dispatcher') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="bg-card border border-border rounded-xl p-6 max-w-sm w-full text-center">
          <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-2xl">✓</span>
          </div>
          <h2 className="font-heading font-bold text-lg mb-1">Účet dispečera aktivní</h2>
          <p className="text-muted-foreground text-sm mb-4">Váš účet ({me.email}) je nastaven jako dispečer.</p>
          <Link to="/dispatcer/zasilky" className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90">
            Přejít do dispečinku →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{
      background: 'radial-gradient(ellipse at 60% 0%, hsl(38 92% 50% / 0.08) 0%, transparent 60%), hsl(var(--background))'
    }}>
      <div className="w-full max-w-sm">
        <Link to="/" className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 10V7" />
            </svg>
          </div>
          <div>
            <span className="font-heading font-bold text-lg">Kuryr4You</span>
            <p className="text-xs text-muted-foreground">Dispečink</p>
          </div>
        </Link>

        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="font-heading text-xl font-bold mb-1">Aktivace dispečera</h2>
          <p className="text-muted-foreground text-sm mb-5">
            Zadejte tajný kód pro aktivaci účtu dispečera.<br />
            Přihlášen jako: <span className="text-foreground font-medium">{me.email}</span>
          </p>

          {success ? (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg px-4 py-3 text-green-400 text-sm text-center">
              ✓ Účet dispečera aktivován! Přesměrování...
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Tajný kód</label>
                <input
                  type="text"
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  required
                  placeholder="KURYR-ADMIN-xxxx"
                  className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary font-mono"
                />
              </div>
              {error && (
                <p className="text-destructive text-sm bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">{error}</p>
              )}
              <button type="submit" disabled={loading || !code}
                className="w-full py-2.5 bg-primary text-primary-foreground font-heading font-semibold rounded-lg hover:opacity-90 disabled:opacity-50">
                {loading ? 'Ověřuji...' : 'Aktivovat dispečera'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
