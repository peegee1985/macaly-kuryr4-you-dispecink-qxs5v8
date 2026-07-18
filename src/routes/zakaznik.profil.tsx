import { customerNav } from './zakaznik'
import { createFileRoute } from '@tanstack/react-router'
import { useConvexAuth, useMutation, useQuery } from 'convex/react'
import { useAuthActions } from '@convex-dev/auth/react'
import { api } from '../../convex/_generated/api'
import { useState } from 'react'
import { AppShell, LoadingScreen, PageHeader } from '@/components/AppShell'
import { usePushNotifications } from '@/hooks/usePushNotifications'

export const Route = createFileRoute('/zakaznik/profil')({
  component: CustomerProfilePage,
})


function CustomerProfilePage() {
  const { isAuthenticated } = useConvexAuth()
  const me = useQuery(api.users.getMe)
  const updateProfile = useMutation(api.users.updateMyProfile)
  const requestCorporate = useMutation(api.users.requestCorporateAccount)
  const { signIn } = useAuthActions()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [corporateLoading, setCorporateLoading] = useState(false)
  const push = usePushNotifications()
  const [showCorporateForm, setShowCorporateForm] = useState(false)
  const [paymentPrefLoading, setPaymentPrefLoading] = useState(false)

  // Password change state
  type PwdStep = 'idle' | 'sent' | 'done'
  const [pwdStep, setPwdStep] = useState<PwdStep>('idle')
  const [pwdLoading, setPwdLoading] = useState(false)
  const [pwdError, setPwdError] = useState<string | null>(null)

  const handleSendPwdOtp = async () => {
    if (!me?.email) return
    setPwdLoading(true)
    setPwdError(null)
    const form = new FormData()
    form.set('flow', 'reset')
    form.set('email', me.email)
    try {
      await signIn('password', form)
      setPwdStep('sent')
    } catch {
      setPwdError('Nepodařilo se odeslat kód. Zkuste to znovu.')
    } finally {
      setPwdLoading(false)
    }
  }

  const handleChangePwd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setPwdLoading(true)
    setPwdError(null)
    const fd = new FormData(e.currentTarget)
    fd.set('flow', 'reset-verification')
    fd.set('email', me?.email ?? '')
    try {
      await signIn('password', fd)
      setPwdStep('done')
      setTimeout(() => setPwdStep('idle'), 4000)
    } catch {
      setPwdError('Neplatný kód nebo heslo příliš krátké (min. 8 znaků).')
    } finally {
      setPwdLoading(false)
    }
  }

  if (!isAuthenticated || me === undefined) return <LoadingScreen />
  if (!me) return null

  const handleProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true)
    const fd = new FormData(e.currentTarget)
    try {
      await updateProfile({
        name: fd.get('name') as string,
        phone: fd.get('phone') as string,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  const handleCorporate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setCorporateLoading(true)
    const fd = new FormData(e.currentTarget)
    try {
      await requestCorporate({
        companyName: fd.get('companyName') as string,
        companyAddress: fd.get('companyAddress') as string,
        companyIco: fd.get('companyIco') as string || undefined,
        companyDic: fd.get('companyDic') as string || undefined,
      })
      setShowCorporateForm(false)
    } finally {
      setCorporateLoading(false)
    }
  }

  return (
    <AppShell navItems={customerNav} title="Zákazník" subtitle="Zákaznický portál" primaryCount={5}>
      <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
        <PageHeader title="Profil" subtitle="Správa osobních údajů" />

        {/* Profile form */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-heading font-semibold mb-4">Osobní údaje</h3>
          <form onSubmit={handleProfile} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Celé jméno</label>
              <input name="name" type="text" defaultValue={me.name || ''}
                className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">E-mail</label>
              <input type="email" value={me.email} disabled
                className="w-full px-3 py-2.5 bg-muted border border-border rounded-lg text-sm text-muted-foreground cursor-not-allowed" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Telefon</label>
              <input name="phone" type="tel" defaultValue={me.phone || ''}
                className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <button type="submit" disabled={saving}
              className="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:opacity-90 disabled:opacity-50 text-sm">
              {saved ? '✓ Uloženo' : saving ? 'Ukládám...' : 'Uložit změny'}
            </button>
          </form>
        </div>

        {/* Password change */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-heading font-semibold mb-1">Změna hesla</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Na váš e-mail pošleme ověřovací kód, poté zadáte nové heslo.
          </p>

          {pwdStep === 'idle' && (
            <button
              onClick={handleSendPwdOtp}
              disabled={pwdLoading}
              className="px-4 py-2 bg-secondary text-secondary-foreground font-medium rounded-lg hover:bg-secondary/80 disabled:opacity-50 text-sm"
            >
              {pwdLoading ? 'Odesílám kód...' : 'Odeslat ověřovací kód'}
            </button>
          )}

          {pwdStep === 'sent' && (
            <form onSubmit={handleChangePwd} className="space-y-3">
              <div className="bg-primary/10 border border-primary/20 rounded-lg px-3 py-2">
                <p className="text-sm text-primary">Kód byl odeslán na {me?.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">6-místný kód z e-mailu</label>
                <input name="code" type="text" inputMode="numeric" pattern="\d{6}" required
                  className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="123456" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Nové heslo</label>
                <input name="newPassword" type="password" required minLength={8}
                  className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Min. 8 znaků" />
              </div>
              {pwdError && (
                <p className="text-destructive text-sm bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">{pwdError}</p>
              )}
              <div className="flex gap-2">
                <button type="submit" disabled={pwdLoading}
                  className="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:opacity-90 disabled:opacity-50 text-sm">
                  {pwdLoading ? 'Ukládám...' : 'Nastavit nové heslo'}
                </button>
                <button type="button" onClick={() => { setPwdStep('idle'); setPwdError(null) }}
                  className="px-4 py-2 bg-secondary text-secondary-foreground font-medium rounded-lg hover:bg-secondary/80 text-sm">
                  Zrušit
                </button>
              </div>
            </form>
          )}

          {pwdStep === 'done' && (
            <div className="bg-green-900/30 border border-green-700/50 rounded-lg px-3 py-2">
              <p className="text-green-400 text-sm font-medium">✓ Heslo bylo úspěšně změněno</p>
            </div>
          )}

          {pwdStep === 'idle' && pwdError && (
            <p className="mt-2 text-destructive text-sm bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">{pwdError}</p>
          )}
        </div>

        {/* Corporate account */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-heading font-semibold">Firemní účet</h3>
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
              me.corporateStatus === 'approved' ? 'bg-green-900/50 text-green-400' :
              me.corporateStatus === 'pending' ? 'bg-amber-900/50 text-amber-400' :
              'bg-muted text-muted-foreground'
            }`}>
              {me.corporateStatus === 'approved' ? 'Schválen' : me.corporateStatus === 'pending' ? 'Čeká na schválení' : 'Nestandardní'}
            </span>
          </div>

          {me.corporateStatus === 'approved' && me.companyName && (
            <div className="text-sm space-y-1 text-muted-foreground mb-4">
              <p><span className="text-foreground font-medium">{me.companyName}</span></p>
              {me.companyAddress && <p>{me.companyAddress}</p>}
              {me.companyIco && <p>IČO: {me.companyIco}</p>}
              {me.companyDic && <p>DIČ: {me.companyDic}</p>}
            </div>
          )}

          {me.corporateStatus === 'approved' && (
            <div className="border border-border rounded-lg p-4">
              <p className="text-sm font-medium text-foreground mb-1">Výchozí způsob platby</p>
              <p className="text-xs text-muted-foreground mb-3">
                Platí pro objednávky z mobilní aplikace. Dispečer může vždy poslat platební odkaz ručně.
              </p>
              <div className="flex gap-2">
                <button
                  disabled={paymentPrefLoading}
                  onClick={async () => {
                    if (me.paymentPreference === 'invoice' || !me.paymentPreference) return
                    setPaymentPrefLoading(true)
                    try { await updateProfile({ paymentPreference: 'invoice' }) } finally { setPaymentPrefLoading(false) }
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                    (me.paymentPreference ?? 'invoice') === 'invoice'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Faktura (14 dnů)
                </button>
                <button
                  disabled={paymentPrefLoading}
                  onClick={async () => {
                    if (me.paymentPreference === 'card') return
                    setPaymentPrefLoading(true)
                    try { await updateProfile({ paymentPreference: 'card' }) } finally { setPaymentPrefLoading(false) }
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                    me.paymentPreference === 'card'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  Platba kartou
                </button>
              </div>
            </div>
          )}

          {me.corporateStatus === 'pending' && (
            <p className="text-sm text-muted-foreground">Vaše žádost je zpracovávána dispečerem.</p>
          )}

          {me.corporateStatus === 'none' && !showCorporateForm && (
            <div>
              <p className="text-sm text-muted-foreground mb-3">
                Firemní účet umožňuje 14denní fakturaci a souhrnné reporty.
              </p>
              <button onClick={() => setShowCorporateForm(true)}
                className="px-4 py-2 bg-secondary text-secondary-foreground font-medium rounded-lg hover:bg-secondary/80 text-sm">
                Požádat o firemní účet
              </button>
            </div>
          )}

          {showCorporateForm && (
            <form onSubmit={handleCorporate} className="space-y-3 mt-3">
              <div>
                <label className="block text-sm font-medium mb-1.5">Název firmy *</label>
                <input name="companyName" type="text" required
                  className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Fakturační adresa *</label>
                <input name="companyAddress" type="text" required
                  className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5">IČO</label>
                  <input name="companyIco" type="text"
                    className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">DIČ</label>
                  <input name="companyDic" type="text"
                    className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={corporateLoading}
                  className="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:opacity-90 disabled:opacity-50 text-sm">
                  {corporateLoading ? 'Odesílám...' : 'Odeslat žádost'}
                </button>
                <button type="button" onClick={() => setShowCorporateForm(false)}
                  className="px-4 py-2 bg-secondary text-secondary-foreground font-medium rounded-lg hover:bg-secondary/80 text-sm">
                  Zrušit
                </button>
              </div>
            </form>
          )}
        </div>
        {/* Push notifications */}
        <div className="bg-card border border-border rounded-xl p-5 mt-5">
          <h3 className="font-heading font-semibold mb-1">Push notifikace</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Dostávejte upozornění o změnách stavu vašich zásilek i bez otevřené aplikace.
          </p>

          {!push.isSupported ? (
            <div className="bg-muted border border-border rounded-lg px-3 py-2">
              <p className="text-sm text-muted-foreground">Váš prohlížeč nepodporuje push notifikace.</p>
            </div>
          ) : push.permission === 'denied' ? (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
              <p className="text-sm text-destructive">Přístup k notifikacím byl zamítnut. Povolte je v nastavení prohlížeče.</p>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <button
                onClick={push.isSubscribed ? push.unsubscribe : push.subscribe}
                disabled={push.isLoading}
                className={`px-4 py-2 font-medium rounded-lg text-sm disabled:opacity-50 transition-colors ${
                  push.isSubscribed
                    ? 'bg-destructive/10 text-destructive border border-destructive/30 hover:bg-destructive/20'
                    : 'bg-primary text-primary-foreground hover:opacity-90'
                }`}
              >
                {push.isLoading
                  ? 'Načítám...'
                  : push.isSubscribed
                    ? '🔕 Vypnout notifikace'
                    : '🔔 Zapnout notifikace'}
              </button>
              {push.isSubscribed && (
                <span className="text-xs text-green-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                  Aktivní
                </span>
              )}
            </div>
          )}

          {push.error && (
            <p className="mt-2 text-destructive text-sm bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">{push.error}</p>
          )}
        </div>

      </div>
    </AppShell>
  )
}
