import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useAuthActions } from '@convex-dev/auth/react'
import { useConvexAuth, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useState, useEffect } from 'react'

export const Route = createFileRoute('/registrace')({
  component: RegisterPage,
})

type Step = 'form' | { type: 'verify'; email: string; formData: RegisterFormData }

interface RegisterFormData {
  email: string
  password: string
  name: string
  phone: string
  role: 'customer' | 'driver'
  vehicleType?: string
  vehiclePlate?: string
}

function RegisterPage() {
  const { signIn } = useAuthActions()
  const { isAuthenticated } = useConvexAuth()
  const createProfile = useMutation(api.users.createUserProfile)
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('form')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [role, setRole] = useState<'customer' | 'driver'>('customer')
  // Store pending profile data to create after auth token propagates
  const [pendingProfile, setPendingProfile] = useState<RegisterFormData | null>(null)

  useEffect(() => {
    if (isAuthenticated && pendingProfile) {
      // Auth token is now propagated — safe to create profile
      createProfile({
        email: pendingProfile.email,
        name: pendingProfile.name,
        phone: pendingProfile.phone || undefined,
        role: pendingProfile.role,
        vehicleType: pendingProfile.vehicleType,
        vehiclePlate: pendingProfile.vehiclePlate,
      }).catch((err) => {
        console.log('Profile creation error (may already exist):', err)
      }).finally(() => {
        setPendingProfile(null)
        navigate({ to: '/' })
      })
    } else if (isAuthenticated && !pendingProfile) {
      navigate({ to: '/' })
    }
  }, [isAuthenticated, pendingProfile])

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    const data: RegisterFormData = {
      email: fd.get('email') as string,
      password: fd.get('password') as string,
      name: fd.get('name') as string,
      phone: fd.get('phone') as string,
      role,
      vehicleType: fd.get('vehicleType') as string || undefined,
      vehiclePlate: fd.get('vehiclePlate') as string || undefined,
    }
    try {
      await signIn('password', fd)
      setStep({ type: 'verify', email: data.email, formData: data })
    } catch (err: any) {
      const msg = err?.message ?? ''
      if (msg.includes('already exists')) setError('Účet s tímto e-mailem již existuje.')
      else setError('Registrace se nezdařila. Zkuste to znovu.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    if (typeof step !== 'object') return
    try {
      // Save profile data first, then trigger signIn
      // The useEffect will call createProfile once auth token propagates
      setPendingProfile(step.formData)
      await signIn('password', fd)
      // Navigation handled by useEffect after isAuthenticated becomes true
    } catch {
      setPendingProfile(null)
      setError('Neplatný nebo prošlý kód. Zkuste zadat kód znovu nebo požádejte o nový.')
      setLoading(false)
    }
  }

  const handleResendCode = async () => {
    if (typeof step !== 'object') return
    setError(null)
    setLoading(true)
    try {
      // Sign in with existing credentials to trigger OTP resend for unverified account
      const fd = new FormData()
      fd.append('flow', 'signIn')
      fd.append('email', step.formData.email)
      fd.append('password', step.formData.password)
      await signIn('password', fd)
      console.log('[registrace] OTP resent to', step.formData.email)
    } catch {
      setError('Nepodařilo se odeslat nový kód. Zkuste to za chvíli.')
    } finally {
      setLoading(false)
    }
  }

  if (typeof step === 'object' && step.type === 'verify') {
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
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-6">
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
                {loading ? 'Ověřuji...' : 'Ověřit a dokončit registraci'}
              </button>
              <div className="flex gap-2">
                <button type="button" onClick={() => { setStep('form'); setError(null) }}
                  className="flex-1 py-2 bg-secondary text-secondary-foreground font-medium rounded-lg hover:bg-secondary/80 text-sm">
                  ← Zpět
                </button>
                <button type="button" onClick={handleResendCode} disabled={loading}
                  className="flex-1 py-2 bg-secondary text-secondary-foreground font-medium rounded-lg hover:bg-secondary/80 text-sm disabled:opacity-50">
                  Znovu odeslat
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 py-10" style={{
      background: 'radial-gradient(ellipse at 60% 0%, hsl(38 92% 50% / 0.08) 0%, transparent 60%), hsl(var(--background))'
    }}>
      <div className="w-full max-w-md">
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
          <h2 className="font-heading text-xl font-bold mb-1">Nový účet</h2>
          <p className="text-muted-foreground text-sm mb-5">Vytvořte si přístup do systému</p>

          {/* Role selector */}
          <div className="grid grid-cols-2 gap-2 mb-5 p-1 bg-muted rounded-lg">
            {(['customer', 'driver'] as const).map((r) => (
              <button key={r} type="button" onClick={() => setRole(r)}
                className={`py-2 px-3 rounded-md text-sm font-medium transition-all ${
                  role === r ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}>
                {r === 'customer' ? '📦 Zákazník' : '🚐 Řidič'}
              </button>
            ))}
          </div>



          <form onSubmit={handleRegister} className="space-y-4">
            <input type="hidden" name="flow" value="signUp" />
            <input type="hidden" name="role" value={role} />

            <div className="grid grid-cols-1 gap-4">
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
                  placeholder="jan@email.cz" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Telefon</label>
                <input name="phone" type="tel"
                  className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                  placeholder="+420 777 123 456" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Heslo *</label>
                <input name="password" type="password" required minLength={8}
                  className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                  placeholder="Min. 8 znaků" />
              </div>

              {role === 'driver' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Typ vozidla</label>
                    <select name="vehicleType"
                      className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary">
                      <option value="">Vyberte typ</option>
                      <option value="osobní">Osobní auto</option>
                      <option value="dodávka">Dodávka</option>
                      <option value="nákladní">Nákladní auto</option>
                      <option value="motorka">Motorka / scooter</option>
                      <option value="kolo">Kolo / e-bike</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">SPZ vozidla</label>
                    <input name="vehiclePlate" type="text"
                      className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                      placeholder="1AB 2345" />
                  </div>
                </>
              )}
            </div>

            {role === 'driver' && (
              <p className="text-xs text-muted-foreground bg-muted/50 border border-border rounded-lg p-3">
                ⏳ Řidičský účet musí být schválen dispečerem před prvním přihlášením.
              </p>
            )}

            {error && <p className="text-destructive text-sm bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">{error}</p>}

            <button type="submit" disabled={loading}
              className="w-full py-2.5 bg-primary text-primary-foreground font-heading font-semibold rounded-lg hover:opacity-90 disabled:opacity-50">
              {loading ? 'Registruji...' : 'Vytvořit účet'}
            </button>
          </form>

          <div className="mt-4 text-center text-sm">
            <span className="text-muted-foreground">Máte již účet? </span>
            <Link to="/prihlaseni" className="text-primary hover:opacity-80 font-medium">Přihlásit se</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
