import { createFileRoute } from '@tanstack/react-router'
import { useConvexAuth, useMutation, useQuery } from 'convex/react'
import { useAuthActions } from '@convex-dev/auth/react'
import { api } from '../../convex/_generated/api'
import { useState, useCallback } from 'react'
import { LoadingScreen, PageHeader } from '@/components/AppShell'
import { DriverShell } from '@/components/DriverShell'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { useTheme } from '@/hooks/useTheme'

// ── Výplatní pásky ────────────────────────────────────────────────────────
function PayslipStatusBadge({ status }: { status: string }) {
  const configs: Record<string, { label: string; cls: string }> = {
    draft: { label: 'Koncept', cls: 'bg-muted text-muted-foreground border-border' },
    finalized: { label: 'Finalizováno', cls: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
    sent: { label: 'Odesláno', cls: 'bg-green-500/20 text-green-300 border-green-500/30' },
  }
  const c = configs[status] ?? configs.draft
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${c.cls}`}>{c.label}</span>
}

const MONTH_NAMES_CS = ['Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen', 'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec']

function PayslipsSection() {
  const payslips = useQuery(api.hr.getMyPayslips)
  const myEmployee = useQuery(api.hr.getMyEmployee)
  const payslipTemplate = useQuery(api.siteSettings.getPayslipTemplate)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [pdfGenerating, setPdfGenerating] = useState<string | null>(null)

  async function handleDownloadPdf(p: NonNullable<typeof payslips>[0]) {
    if (!payslipTemplate) return
    const name = myEmployee ? `${myEmployee.firstName} ${myEmployee.lastName}` : ''
    const [first, ...rest] = name.split(' ')
    const { generatePayslipPdf } = await import('@/lib/payslipPdf')
    setPdfGenerating(p._id)
    try {
      await generatePayslipPdf([{
        firstName: first ?? '',
        lastName: rest.join(' '),
        position: myEmployee?.position,
        contractType: myEmployee?.contractType,
        periodMonth: p.periodMonth,
        periodYear: p.periodYear,
        hoursWorked: p.hoursWorked,
        grossSalary: p.grossSalary,
        socialInsurance: p.socialInsurance,
        healthInsurance: p.healthInsurance,
        taxAdvance: p.taxAdvance,
        otherDeductions: p.otherDeductions,
        otherDeductionsNote: p.otherDeductionsNote,
        bonuses: p.bonuses,
        netSalary: p.netSalary,
        notes: p.notes,
        status: p.status,
      }], payslipTemplate, name)
    } finally {
      setPdfGenerating(null)
    }
  }

  if (payslips === undefined) {
    return (
      <div className="bg-card border border-border rounded-xl p-5 mt-5">
        <h3 className="font-heading font-semibold mb-1">Výplatní pásky</h3>
        <p className="text-sm text-muted-foreground">Načítám...</p>
      </div>
    )
  }

  if (payslips === null || payslips.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-5 mt-5">
        <h3 className="font-heading font-semibold mb-1">Výplatní pásky</h3>
        <p className="text-sm text-muted-foreground mt-2">
          {payslips === null
            ? 'Váš účet není propojen se zaměstnaneckým záznamem. Kontaktujte dispečera.'
            : 'Zatím nemáte žádné výplatní pásky.'}
        </p>
      </div>
    )
  }

  return (
    <div className="bg-card border border-border rounded-xl p-5 mt-5">
      <h3 className="font-heading font-semibold mb-1">Výplatní pásky</h3>
      <p className="text-sm text-muted-foreground mb-4">Historie vašich výplatních pásek vydaných dispečerem.</p>
      <div className="space-y-2">
        {payslips.map(p => {
          const periodLabel = `${MONTH_NAMES_CS[(p.periodMonth - 1)] ?? p.periodMonth} ${p.periodYear}`
          const totalDeductions = (p.socialInsurance ?? 0) + (p.healthInsurance ?? 0) + (p.taxAdvance ?? 0) + (p.otherDeductions ?? 0)
          return (
            <div key={p._id} className="border border-border rounded-lg overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors text-left"
                onClick={() => setExpanded(expanded === p._id ? null : p._id)}
              >
                <div className="flex items-center gap-3">
                  <svg className="w-4 h-4 text-muted-foreground shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium">{periodLabel}</p>
                    <p className="text-xs text-muted-foreground">Hrubá mzda</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <PayslipStatusBadge status={p.status} />
                  <span className="text-sm font-semibold">{p.grossSalary.toLocaleString('cs-CZ')} Kč</span>
                  <svg className={`w-4 h-4 text-muted-foreground transition-transform ${expanded === p._id ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>
              {expanded === p._id && (
                <div className="border-t border-border px-4 py-4 bg-muted/20 text-sm space-y-3">
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                    <span className="text-muted-foreground">Hrubá mzda</span>
                    <span className="font-medium">{p.grossSalary.toLocaleString('cs-CZ')} Kč</span>
                    <span className="text-muted-foreground">Čistá mzda</span>
                    <span className="font-medium text-green-300">{p.netSalary.toLocaleString('cs-CZ')} Kč</span>
                    {p.hoursWorked != null && (
                      <><span className="text-muted-foreground">Odpracované hodiny</span><span className="font-medium">{p.hoursWorked} h</span></>
                    )}
                    {p.bonuses != null && p.bonuses > 0 && (
                      <><span className="text-muted-foreground">Bonusy</span><span className="font-medium text-blue-300">+{p.bonuses.toLocaleString('cs-CZ')} Kč</span></>
                    )}
                    {totalDeductions > 0 && (
                      <><span className="text-muted-foreground">Celkové srážky</span><span className="font-medium text-red-300">-{totalDeductions.toLocaleString('cs-CZ')} Kč</span></>
                    )}
                    {p.socialInsurance > 0 && (
                      <><span className="text-muted-foreground pl-3 text-xs">Sociální pojištění</span><span className="text-xs">{p.socialInsurance.toLocaleString('cs-CZ')} Kč</span></>
                    )}
                    {p.healthInsurance > 0 && (
                      <><span className="text-muted-foreground pl-3 text-xs">Zdravotní pojištění</span><span className="text-xs">{p.healthInsurance.toLocaleString('cs-CZ')} Kč</span></>
                    )}
                    {p.taxAdvance > 0 && (
                      <><span className="text-muted-foreground pl-3 text-xs">Záloha na daň</span><span className="text-xs">{p.taxAdvance.toLocaleString('cs-CZ')} Kč</span></>
                    )}
                    {p.otherDeductions != null && p.otherDeductions > 0 && (
                      <><span className="text-muted-foreground pl-3 text-xs">{p.otherDeductionsNote || 'Ostatní srážky'}</span><span className="text-xs">{p.otherDeductions.toLocaleString('cs-CZ')} Kč</span></>
                    )}
                  </div>
                  {p.notes && (
                    <div>
                      <p className="text-muted-foreground mb-0.5">Poznámky</p>
                      <p className="text-foreground whitespace-pre-line">{p.notes}</p>
                    </div>
                  )}
                  {payslipTemplate && (
                    <button
                      onClick={() => handleDownloadPdf(p)}
                      disabled={pdfGenerating !== null}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-muted text-foreground border border-border rounded-lg text-xs hover:bg-muted/80 transition disabled:opacity-50"
                    >
                      {pdfGenerating === p._id ? '⏳ Generuji…' : '📄 Stáhnout PDF'}
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export const Route = createFileRoute('/ridic/profil')({
  component: DriverProfilePage,
})

function DriverProfilePage() {
  const { isAuthenticated } = useConvexAuth()
  const me = useQuery(api.users.getMe)
  const { signIn, signOut } = useAuthActions()
  const updateProfile = useMutation(api.users.updateMyProfile)
  const updateNotifPrefs = useMutation(api.users.updateNotifPrefs)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const push = usePushNotifications()
  const [prefSaving, setPrefSaving] = useState(false)
  const { theme, toggleTheme } = useTheme()

  const handlePrefToggle = useCallback(async (pref: 'driverPushAssigned' | 'driverPushAvailable' | 'driverEmailAssigned', value: boolean) => {
    setPrefSaving(true)
    try {
      await updateNotifPrefs({ [pref]: value })
    } finally {
      setPrefSaving(false)
    }
  }, [updateNotifPrefs])

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

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true)
    const fd = new FormData(e.currentTarget)
    try {
      await updateProfile({
        name: fd.get('name') as string,
        phone: fd.get('phone') as string,
        vehicleType: fd.get('vehicleType') as string,
        vehiclePlate: fd.get('vehiclePlate') as string,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <DriverShell>
      <div className="px-4 pt-5 max-w-2xl mx-auto">
        <PageHeader title="Profil" subtitle="Vaše osobní a vozidlové údaje" />

        <div className="bg-card border border-border rounded-xl p-5">
          <form onSubmit={handleSave} className="space-y-4">
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
            <hr className="border-border" />
            <h3 className="font-heading font-semibold text-sm text-muted-foreground uppercase tracking-wider">Vozidlo</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Typ vozidla</label>
                <select name="vehicleType" defaultValue={me.vehicleType || ''}
                  className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                  <option value="">Nevybráno</option>
                  <option value="osobní">Osobní auto</option>
                  <option value="dodávka">Dodávka</option>
                  <option value="nákladní">Nákladní auto</option>
                  <option value="motorka">Motorka / scooter</option>
                  <option value="kolo">Kolo / e-bike</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">SPZ</label>
                <input name="vehiclePlate" type="text" defaultValue={me.vehiclePlate || ''}
                  className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="1AB 2345" />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <span className={`w-2 h-2 rounded-full ${me.status === 'active' ? 'bg-green-500' : 'bg-amber-500'}`} />
              <span className="text-sm text-muted-foreground">
                Stav účtu: <span className="text-foreground font-medium">{me.status === 'active' ? 'Aktivní' : 'Čeká na schválení'}</span>
              </span>
            </div>

            <button type="submit" disabled={saving}
              className="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:opacity-90 disabled:opacity-50 text-sm">
              {saved ? '✓ Uloženo' : saving ? 'Ukládám...' : 'Uložit změny'}
            </button>
          </form>
        </div>

        {/* Push notifications */}
        <div className="bg-card border border-border rounded-xl p-5 mt-5">
          <h3 className="font-heading font-semibold mb-1">Push notifikace</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Dostávejte okamžité upozornění o nových zakázkách i bez otevřené aplikace.
          </p>

          {!push.isSupported ? (
            <div className="bg-muted border border-border rounded-lg px-3 py-2">
              <p className="text-sm text-muted-foreground">Váš prohlížeč nepodporuje push notifikace.</p>
            </div>
          ) : push.permission === 'denied' ? (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
              <p className="text-sm text-destructive">Přístup k notifikacím byl v prohlížeči zamítnut. Povolte je v nastavení prohlížeče.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-4">
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

              {push.isSubscribed && (
                <div className="border-t border-border pt-4 space-y-3">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-2">Co chcete dostávat</p>

                  {/* Assigned order push */}
                  <label className={`flex items-center justify-between gap-3 cursor-pointer ${prefSaving ? 'opacity-60 pointer-events-none' : ''}`}>
                    <div>
                      <span className="text-sm font-medium">🚚 Přiřazené zakázky</span>
                      <p className="text-xs text-muted-foreground">Push při přiřazení nové zakázky</p>
                    </div>
                    <button
                      role="switch"
                      aria-checked={me?.driverPushAssigned !== false}
                      onClick={() => handlePrefToggle('driverPushAssigned', me?.driverPushAssigned === false ? true : false)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                        me?.driverPushAssigned !== false ? 'bg-primary' : 'bg-muted-foreground/30'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        me?.driverPushAssigned !== false ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </label>

                  {/* Available orders push */}
                  <label className={`flex items-center justify-between gap-3 cursor-pointer ${prefSaving ? 'opacity-60 pointer-events-none' : ''}`}>
                    <div>
                      <span className="text-sm font-medium">🆕 Nové volné zakázky</span>
                      <p className="text-xs text-muted-foreground">Push při schválení volné zakázky (max 1× za 30 min)</p>
                    </div>
                    <button
                      role="switch"
                      aria-checked={me?.driverPushAvailable !== false}
                      onClick={() => handlePrefToggle('driverPushAvailable', me?.driverPushAvailable === false ? true : false)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                        me?.driverPushAvailable !== false ? 'bg-primary' : 'bg-muted-foreground/30'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        me?.driverPushAvailable !== false ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </label>
                </div>
              )}
            </>
          )}

          {push.error && (
            <p className="mt-2 text-destructive text-sm bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">{push.error}</p>
          )}
        </div>

        {/* Email notifications */}
        <div className="bg-card border border-border rounded-xl p-5 mt-5">
          <h3 className="font-heading font-semibold mb-1">E-mailové notifikace</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Nastavte, kdy vám má systém posílat e-mail.
          </p>
          <label className={`flex items-center justify-between gap-3 cursor-pointer ${prefSaving ? 'opacity-60 pointer-events-none' : ''}`}>
            <div>
              <span className="text-sm font-medium">✉️ Nová přiřazená zakázka</span>
              <p className="text-xs text-muted-foreground">E-mail při každém přiřazení zakázky</p>
            </div>
            <button
              role="switch"
              aria-checked={me?.driverEmailAssigned !== false}
              onClick={() => handlePrefToggle('driverEmailAssigned', me?.driverEmailAssigned === false ? true : false)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                me?.driverEmailAssigned !== false ? 'bg-primary' : 'bg-muted-foreground/30'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                me?.driverEmailAssigned !== false ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </label>
        </div>

        {/* Password change */}
        <div className="bg-card border border-border rounded-xl p-5 mt-5">
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
        {/* Vzhled & Odhlášení */}
        <div className="bg-card border border-border rounded-xl p-5 mt-5 mb-6">
          <h3 className="font-heading font-semibold mb-4">Vzhled & Účet</h3>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium">Téma vzhledu</p>
              <p className="text-xs text-muted-foreground">{theme === 'dark' ? 'Tmavý režim je zapnutý' : 'Světlý režim je zapnutý'}</p>
            </div>
            <button
              onClick={toggleTheme}
              className="flex items-center gap-2 px-3 py-2 bg-muted hover:bg-muted/80 text-sm font-medium rounded-lg transition-colors"
            >
              {theme === 'dark' ? (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <circle cx="12" cy="12" r="5" /><path strokeLinecap="round" d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
                  </svg>
                  Světlé
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                  </svg>
                  Tmavé
                </>
              )}
            </button>
          </div>
          <hr className="border-border my-3" />
          <button
            onClick={() => signOut()}
            className="flex items-center gap-2 w-full px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Odhlásit se
          </button>
        </div>

        {/* Výplatní pásky */}
        <PayslipsSection />
      </div>
    </DriverShell>
  )
}
