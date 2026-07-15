import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useAuthActions } from '@convex-dev/auth/react'
import { useConvexAuth } from 'convex/react'
import { useState, useEffect } from 'react'

export const Route = createFileRoute('/prihlaseni')({
  component: LoginPage,
})

type Step = 'login' | 'forgot' | { type: 'reset'; email: string } | { type: 'verify'; email: string; password: string }

function LoginPage() {
  const { signIn } = useAuthActions()
  const { isAuthenticated } = useConvexAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('login')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isAuthenticated) navigate({ to: '/' })
  }, [isAuthenticated, navigate])

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const form = new FormData(e.currentTarget)
    const email = form.get('email') as string
    const password = form.get('password') as string
    try {
      const result = await signIn('password', form)
      // If signingIn is false and no redirect, the account needs email verification (OTP was sent)
      if (result && !result.signingIn && !result.redirect) {
        setStep({ type: 'verify', email, password })
      }
      // If signingIn is true, useEffect will redirect automatically
    } catch (err: any) {
      const msg = (err?.message ?? '').toLowerCase()
      if (msg.includes('invalid') || msg.includes('password') || msg.includes('credentials') || msg.includes('not found')) {
        setError('Nesprávný e-mail nebo heslo.')
      } else {
        setError('Přihlášení selhalo. Zkontrolujte připojení a zkuste znovu.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const form = new FormData(e.currentTarget)
    try {
      await signIn('password', form)
      // Navigation handled by useEffect after isAuthenticated becomes true
    } catch {
      setError('Neplatný nebo prošlý kód. Zkuste to znovu nebo požádejte o nový kód.')
      setLoading(false)
    }
  }

  const handleResendVerify = async () => {
    if (typeof step !== 'object' || step.type !== 'verify') return
    setError(null)
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('flow', 'signIn')
      fd.append('email', step.email)
      fd.append('password', step.password)
      const result = await signIn('password', fd)
      if (result && !result.signingIn && !result.redirect) {
        setError(null)
        // Show brief success feedback via error state (green would need more work, reuse as info)
        console.log('[prihlaseni] OTP resent to', step.email)
      }
    } catch {
      setError('Nepodařilo se odeslat nový kód. Zkuste se přihlásit znovu.')
    } finally {
      setLoading(false)
    }
  }

  const handleForgot = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const form = new FormData(e.currentTarget)
    try {
      await signIn('password', form)
      setStep({ type: 'reset', email: form.get('email') as string })
    } catch {
      setError('Nepodařilo se odeslat kód. Zkontrolujte e-mail.')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const form = new FormData(e.currentTarget)
    try {
      await signIn('password', form)
    } catch {
      setError('Neplatný kód nebo heslo příliš krátké (min. 8 znaků).')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{
      background: 'radial-gradient(ellipse at 60% 0%, hsl(38 92% 50% / 0.08) 0%, transparent 60%), hsl(var(--background))'
    }}>
      <div className="w-full max-w-sm">
        {/* Logo */}
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
          {step === 'login' && (
            <>
              <h2 className="font-heading text-xl font-bold mb-1">Přihlášení</h2>
              <p className="text-muted-foreground text-sm mb-5">Zadejte svůj e-mail a heslo</p>

              <form onSubmit={handleLogin} className="space-y-4">
                <input type="hidden" name="flow" value="signIn" />
                <div>
                  <label className="block text-sm font-medium mb-1.5">E-mail</label>
                  <input name="email" type="email" required
                    className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                    placeholder="vas@email.cz" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Heslo</label>
                  <input name="password" type="password" required
                    className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                    placeholder="••••••••" />
                </div>
                {error && <p className="text-destructive text-sm bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">{error}</p>}
                <button type="submit" disabled={loading}
                  className="w-full py-2.5 bg-primary text-primary-foreground font-heading font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50">
                  {loading ? 'Přihlašuji...' : 'Přihlásit se'}
                </button>
              </form>
              <div className="mt-4 flex justify-between text-sm">
                <button onClick={() => { setStep('forgot'); setError(null) }} className="text-muted-foreground hover:text-primary transition-colors">
                  Zapomenuté heslo?
                </button>
                <Link to="/registrace" className="text-primary hover:opacity-80 font-medium">
                  Registrace →
                </Link>
              </div>
            </>
          )}

          {/* OTP email verification step — triggered when account email is not yet verified */}
          {typeof step === 'object' && step.type === 'verify' && (
            <>
              <h2 className="font-heading text-xl font-bold mb-1">Ověření e-mailu</h2>
              <p className="text-muted-foreground text-sm mb-6">
                Odeslali jsme 6-místný kód na <span className="text-foreground font-medium">{step.email}</span>.<br />
                <span className="text-xs">Zkontrolujte také složku Spam.</span>
              </p>
              <form onSubmit={handleVerify} className="space-y-4">
                <input type="hidden" name="flow" value="email-verification" />
                <input type="hidden" name="email" value={step.email} />
                <div>
                  <label className="block text-sm font-medium mb-1.5">Ověřovací kód</label>
                  <input name="code" type="text" inputMode="numeric" pattern="\d{6}" required
                    className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary tracking-widest text-center text-lg"
                    placeholder="123456" maxLength={6} autoFocus />
                </div>
                {error && <p className="text-destructive text-sm bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">{error}</p>}
                <button type="submit" disabled={loading}
                  className="w-full py-2.5 bg-primary text-primary-foreground font-heading font-semibold rounded-lg hover:opacity-90 disabled:opacity-50">
                  {loading ? 'Ověřuji...' : 'Potvrdit kód'}
                </button>
                <div className="flex gap-2">
                  <button type="button" onClick={() => { setStep('login'); setError(null) }}
                    className="flex-1 py-2 bg-secondary text-secondary-foreground font-medium rounded-lg hover:bg-secondary/80 text-sm">
                    ← Zpět
                  </button>
                  <button type="button" onClick={handleResendVerify} disabled={loading}
                    className="flex-1 py-2 bg-secondary text-secondary-foreground font-medium rounded-lg hover:bg-secondary/80 text-sm disabled:opacity-50">
                    Znovu odeslat
                  </button>
                </div>
              </form>
            </>
          )}

          {step === 'forgot' && (
            <>
              <h2 className="font-heading text-xl font-bold mb-1">Obnova hesla</h2>
              <p className="text-muted-foreground text-sm mb-6">Pošleme kód na váš e-mail</p>
              <form onSubmit={handleForgot} className="space-y-4">
                <input type="hidden" name="flow" value="reset" />
                <div>
                  <label className="block text-sm font-medium mb-1.5">E-mail</label>
                  <input name="email" type="email" required
                    className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                    placeholder="vas@email.cz" />
                </div>
                {error && <p className="text-destructive text-sm bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">{error}</p>}
                <button type="submit" disabled={loading}
                  className="w-full py-2.5 bg-primary text-primary-foreground font-heading font-semibold rounded-lg hover:opacity-90 disabled:opacity-50">
                  {loading ? 'Odesílám...' : 'Odeslat kód'}
                </button>
                <button type="button" onClick={() => { setStep('login'); setError(null) }}
                  className="w-full py-2.5 bg-secondary text-secondary-foreground font-medium rounded-lg hover:bg-secondary/80 text-sm">
                  ← Zpět na přihlášení
                </button>
              </form>
            </>
          )}

          {typeof step === 'object' && step.type === 'reset' && (
            <>
              <h2 className="font-heading text-xl font-bold mb-1">Nové heslo</h2>
              <p className="text-muted-foreground text-sm mb-6">Zadejte kód z e-mailu a nové heslo</p>
              <form onSubmit={handleReset} className="space-y-4">
                <input type="hidden" name="flow" value="reset-verification" />
                <input type="hidden" name="email" value={step.email} />
                <div>
                  <label className="block text-sm font-medium mb-1.5">6-místný kód</label>
                  <input name="code" type="text" inputMode="numeric" pattern="\d{6}" required
                    className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                    placeholder="123456" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Nové heslo</label>
                  <input name="newPassword" type="password" required minLength={8}
                    className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                    placeholder="Min. 8 znaků" />
                </div>
                {error && <p className="text-destructive text-sm bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">{error}</p>}
                <button type="submit" disabled={loading}
                  className="w-full py-2.5 bg-primary text-primary-foreground font-heading font-semibold rounded-lg hover:opacity-90 disabled:opacity-50">
                  {loading ? 'Ukládám...' : 'Nastavit heslo'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
