import { createFileRoute } from '@tanstack/react-router'
import { useConvexAuth, useMutation, useQuery, useAction } from 'convex/react'
import { useAuthActions } from '@convex-dev/auth/react'
import { api } from '../../convex/_generated/api'
import { useState, useEffect } from 'react'
import { AppShell, LoadingScreen, PageHeader } from '@/components/AppShell'
import { dispatcherNav } from './dispatcer'
import { useTheme } from '@/hooks/useTheme'

export const Route = createFileRoute('/dispatcer/nastaveni')({
  component: DispatcherSettingsPage,
})

type PayslipTemplate = {
  psCompanyName: string
  psCompanyAddress: string
  psCompanyIco: string
  psCompanyDic: string
  psCompanyPhone: string
  psCompanyEmail: string
  psLogoUrl: string
  psAccentColor: string
  psHeaderNote: string
  psFooterNote: string
  psShowHours: boolean
  psShowSignatureLine: boolean
}

type ReceiptTemplate = {
  companyName: string
  companyAddress: string
  companyIco: string
  companyDic: string
  companyWeb: string
  companyPhone: string
  emailSubject: string
  emailHeaderNote: string
  emailFooterNote: string
  showDriverName: boolean
  showCargoDescription: boolean
}

// ─── Fuel Admin Sub-section ─────────────────────────────────────────────────

function FuelAdminSection() {
  const adminInfo = useQuery(api.fuel.getFuelAdminInfo)
  const refreshFuel = useAction(api.fuel.refreshFuelData)
  const refreshCnb = useAction(api.fuel.refreshCnbRate)
  const saveFuelSettings = useMutation(api.fuel.saveFuelSettings)

  const [refreshingFuel, setRefreshingFuel] = useState(false)
  const [refreshingCnb, setRefreshingCnb] = useState(false)
  const [fuelMsg, setFuelMsg] = useState('')
  const [cnbMsg, setCnbMsg] = useState('')

  const [rateMode, setRateMode] = useState<'auto' | 'manual'>('auto')
  const [manualRate, setManualRate] = useState('')
  const [rateSaving, setRateSaving] = useState(false)
  const [rateSaved, setRateSaved] = useState(false)
  const [rateError, setRateError] = useState('')

  // Sync local state when adminInfo loads
  useEffect(() => {
    if (!adminInfo) return
    setRateMode(adminInfo.eurRateMode as 'auto' | 'manual')
    if (adminInfo.eurRateManual) setManualRate(String(adminInfo.eurRateManual))
  }, [adminInfo])

  const formatAge = (ms: number | null | undefined): string => {
    if (ms === null || ms === undefined) return 'Nikdy'
    const m = Math.floor(ms / 60000)
    if (m < 60) return `před ${m} min`
    const h = Math.floor(m / 60)
    if (h < 24) return `před ${h} h`
    return `před ${Math.floor(h / 24)} dny`
  }

  const handleRefreshFuel = async () => {
    setRefreshingFuel(true)
    setFuelMsg('')
    try {
      await refreshFuel({})
      setFuelMsg('✓ Data stanic a cen obnovena')
      console.log('[FuelAdmin] Fuel data refreshed')
    } catch (e) {
      setFuelMsg('Chyba: ' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setRefreshingFuel(false)
    }
  }

  const handleRefreshCnb = async () => {
    setRefreshingCnb(true)
    setCnbMsg('')
    try {
      const res = await refreshCnb({}) as { success: boolean; rate?: number; error?: string }
      if (res.success && res.rate) {
        setCnbMsg(`✓ Kurz ČNB: 1 EUR = ${res.rate} Kč`)
      } else {
        setCnbMsg('Chyba: ' + (res.error ?? 'Neznámá'))
      }
      console.log('[FuelAdmin] CNB rate refreshed:', res)
    } catch (e) {
      setCnbMsg('Chyba: ' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setRefreshingCnb(false)
    }
  }

  const handleSaveRate = async () => {
    setRateSaving(true)
    setRateError('')
    setRateSaved(false)
    try {
      const parsed = parseFloat(manualRate.replace(',', '.'))
      if (rateMode === 'manual' && (isNaN(parsed) || parsed < 10 || parsed > 50)) {
        throw new Error('Zadejte platný kurz mezi 10 a 50 Kč/EUR')
      }
      await saveFuelSettings({
        eurRateMode: rateMode,
        eurRateManual: rateMode === 'manual' ? parsed : undefined,
      })
      setRateSaved(true)
      console.log('[FuelAdmin] Rate settings saved:', { rateMode, parsed })
    } catch (e) {
      setRateError(e instanceof Error ? e.message : 'Chyba při ukládání')
    } finally {
      setRateSaving(false)
    }
  }

  if (!adminInfo) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
        <div className="w-4 h-4 border border-primary border-t-transparent rounded-full animate-spin" />
        Načítám stav cache…
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Cache status */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Stations */}
        <div className="bg-muted/40 border border-border rounded-xl p-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Čerpací stanice</span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${adminInfo.stationsFresh ? 'bg-green-500/15 text-green-400' : 'bg-yellow-500/15 text-yellow-400'}`}>
              {adminInfo.stationsFresh ? 'Aktuální' : 'Expirováno'}
            </span>
          </div>
          <div className="text-xl font-black font-heading text-foreground">
            {adminInfo.fuelCount} <span className="text-sm font-normal text-muted-foreground">⛽</span>{' '}
            {adminInfo.evCount} <span className="text-sm font-normal text-muted-foreground">⚡</span>
          </div>
          <div className="text-xs text-muted-foreground">
            OSM · {formatAge(adminInfo.stationsAge ?? undefined)}
          </div>
        </div>

        {/* Prices */}
        <div className="bg-muted/40 border border-border rounded-xl p-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Ceny paliv</span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${adminInfo.pricesFresh ? 'bg-green-500/15 text-green-400' : 'bg-yellow-500/15 text-yellow-400'}`}>
              {adminInfo.pricesFresh ? 'Aktuální' : adminInfo.pricesAge === null ? 'Chybí' : 'Expirováno'}
            </span>
          </div>
          <div className="text-xs text-muted-foreground leading-relaxed">
            {adminInfo.pricesAge === null
              ? 'Není k dispozici — zkontrolujte OILPRICE_API_KEY v Secrets'
              : `OilPriceAPI · ${formatAge(adminInfo.pricesAge ?? undefined)}`
            }
          </div>
        </div>

        {/* EUR rate */}
        <div className="bg-muted/40 border border-border rounded-xl p-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Kurz EUR/CZK</span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${adminInfo.eurRateMode === 'manual' ? 'bg-blue-500/15 text-blue-400' : adminInfo.cnbFresh ? 'bg-green-500/15 text-green-400' : 'bg-yellow-500/15 text-yellow-400'}`}>
              {adminInfo.eurRateMode === 'manual' ? 'Manuální' : adminInfo.cnbFresh ? 'ČNB aktuální' : 'ČNB expirováno'}
            </span>
          </div>
          <div className="text-xl font-black font-heading text-foreground">
            {adminInfo.effectiveRate.toFixed(3)} <span className="text-sm font-normal text-muted-foreground">Kč/EUR</span>
          </div>
          <div className="text-xs text-muted-foreground">
            {adminInfo.eurRateMode === 'manual'
              ? 'Manuálně nastaveno'
              : adminInfo.cnbFetchedAt
                ? `ČNB · ${formatAge(adminInfo.cnbAge ?? undefined)}`
                : 'ČNB · nikdy nenačteno'}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleRefreshFuel}
          disabled={refreshingFuel}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {refreshingFuel ? (
            <><div className="w-3.5 h-3.5 border border-primary-foreground border-t-transparent rounded-full animate-spin" /> Obnovuji…</>
          ) : (
            <><span>⟳</span> Obnovit stanice &amp; ceny</>
          )}
        </button>

        <button
          onClick={handleRefreshCnb}
          disabled={refreshingCnb || adminInfo.eurRateMode === 'manual'}
          title={adminInfo.eurRateMode === 'manual' ? 'Přepněte na automatický kurz ČNB' : ''}
          className="flex items-center gap-2 px-4 py-2 bg-muted hover:bg-muted/80 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {refreshingCnb ? (
            <><div className="w-3.5 h-3.5 border border-foreground border-t-transparent rounded-full animate-spin" /> Načítám…</>
          ) : (
            <><span>🏦</span> Aktualizovat kurz ČNB</>
          )}
        </button>
      </div>

      {fuelMsg && (
        <p className={`text-sm font-medium ${fuelMsg.startsWith('✓') ? 'text-green-400' : 'text-destructive'}`}>
          {fuelMsg}
        </p>
      )}
      {cnbMsg && (
        <p className={`text-sm font-medium ${cnbMsg.startsWith('✓') ? 'text-green-400' : 'text-destructive'}`}>
          {cnbMsg}
        </p>
      )}

      {/* EUR/CZK rate settings */}
      <div className="border-t border-border pt-4 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-0.5">Kurz EUR → CZK</h3>
          <p className="text-xs text-muted-foreground">
            Používá se pro přepočet cen paliv z EUR na koruny. Doporučujeme automatický kurz ČNB.
          </p>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-2">
          {(['auto', 'manual'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => { setRateMode(mode); setRateSaved(false) }}
              className="flex-1 py-2 text-sm font-medium rounded-lg border transition-colors"
              style={
                rateMode === mode
                  ? { background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))', borderColor: 'transparent' }
                  : { background: 'transparent', color: 'hsl(var(--muted-foreground))', borderColor: 'hsl(var(--border))' }
              }
            >
              {mode === 'auto' ? '🏦 Automaticky z ČNB' : '✏️ Zadat ručně'}
            </button>
          ))}
        </div>

        {rateMode === 'auto' && (
          <div className="bg-muted/30 rounded-lg px-4 py-3 text-xs text-muted-foreground leading-relaxed border border-border">
            <span className="font-medium text-foreground">Automatický kurz</span> — denně aktualizováno z{' '}
            <a
              href="https://www.cnb.cz/cs/financni-trhy/devizovy-trh/kurzy-devizoveho-trhu/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              České národní banky (ČNB)
            </a>
            . Platnost cache je 4 hodiny. Aktuální kurz:{' '}
            <strong className="text-foreground">
              {adminInfo.eurRateCnb ? `${adminInfo.eurRateCnb.toFixed(3)} Kč/EUR` : 'nenačten — klikněte na Aktualizovat kurz ČNB'}
            </strong>
          </div>
        )}

        {rateMode === 'manual' && (
          <div className="space-y-2">
            <label className="block text-xs text-muted-foreground">Kurz EUR/CZK (Kč za 1 EUR)</label>
            <div className="flex gap-2 items-center">
              <input
                type="number"
                step="0.001"
                min="10"
                max="50"
                value={manualRate}
                onChange={e => { setManualRate(e.target.value); setRateSaved(false) }}
                placeholder="např. 25.160"
                className="w-40 px-3 py-2 bg-input border border-border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <span className="text-sm text-muted-foreground">Kč / EUR</span>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={handleSaveRate}
            disabled={rateSaving}
            className="px-5 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {rateSaving ? 'Ukládám…' : 'Uložit nastavení kurzu'}
          </button>
          {rateSaved && <span className="text-sm text-green-400 font-medium">✓ Uloženo</span>}
          {rateError && <span className="text-sm text-destructive">{rateError}</span>}
        </div>
      </div>
    </div>
  )
}

// ─── Main component ─────────────────────────────────────────────────────────

function DispatcherSettingsPage() {
  const { isAuthenticated } = useConvexAuth()
  const { signOut } = useAuthActions()
  const { theme, toggleTheme } = useTheme()
  const template = useQuery(api.siteSettings.getReceiptTemplate)
  const saveTemplate = useMutation(api.siteSettings.saveReceiptTemplate)
  const psTemplate = useQuery(api.siteSettings.getPayslipTemplate)
  const savePsTemplate = useMutation(api.siteSettings.savePayslipTemplate)

  const [form, setForm] = useState<ReceiptTemplate | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const [psForm, setPsForm] = useState<PayslipTemplate | null>(null)
  const [psSaving, setPsSaving] = useState(false)
  const [psSaved, setPsSaved] = useState(false)
  const [psError, setPsError] = useState('')

  // Populate receipt form when template loads
  useEffect(() => {
    if (template && !form) {
      setForm({ ...template })
    }
  }, [template, form])

  // Populate payslip form when template loads
  useEffect(() => {
    if (psTemplate && !psForm) {
      setPsForm({ ...psTemplate })
    }
  }, [psTemplate, psForm])

  if (!isAuthenticated || template === undefined || !form) return <LoadingScreen />

  const set = (key: keyof ReceiptTemplate, value: string | boolean) => {
    setForm(prev => prev ? { ...prev, [key]: value } : prev)
    setSaved(false)
  }

  const psSet = (key: keyof PayslipTemplate, value: string | boolean) => {
    setPsForm(prev => prev ? { ...prev, [key]: value } : prev)
    setPsSaved(false)
  }

  const handlePsSave = async () => {
    if (!psForm) return
    setPsSaving(true)
    setPsError('')
    try {
      await savePsTemplate(psForm)
      setPsSaved(true)
      console.log('Payslip template saved')
    } catch (e: unknown) {
      setPsError(e instanceof Error ? e.message : 'Chyba při ukládání')
    } finally {
      setPsSaving(false)
    }
  }

  const handleSave = async () => {
    if (!form) return
    setSaving(true)
    setError('')
    try {
      await saveTemplate(form)
      setSaved(true)
      console.log('Receipt template saved')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Chyba při ukládání'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppShell navItems={dispatcherNav} title="Dispečer" primaryCount={4} subtitle="Řídicí centrum">
      <div className="p-4 sm:p-6 max-w-3xl mx-auto">
        <PageHeader title="Nastavení" subtitle="Šablona účtenek a firemní údaje" />

        <div className="space-y-6">
          {/* Company details */}
          <section className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Firemní údaje (zobrazeny na účtence)
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Název firmy</label>
                <input
                  type="text"
                  value={form.companyName}
                  onChange={e => set('companyName', e.target.value)}
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Telefon</label>
                <input
                  type="text"
                  value={form.companyPhone}
                  onChange={e => set('companyPhone', e.target.value)}
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs text-muted-foreground mb-1.5">Adresa</label>
                <input
                  type="text"
                  value={form.companyAddress}
                  onChange={e => set('companyAddress', e.target.value)}
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">IČO</label>
                <input
                  type="text"
                  value={form.companyIco}
                  onChange={e => set('companyIco', e.target.value)}
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">DIČ (volitelné)</label>
                <input
                  type="text"
                  value={form.companyDic}
                  onChange={e => set('companyDic', e.target.value)}
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Web</label>
                <input
                  type="text"
                  value={form.companyWeb}
                  onChange={e => set('companyWeb', e.target.value)}
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>
          </section>

          {/* Email template */}
          <section className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              E-mailová šablona
            </h2>
            <p className="text-xs text-muted-foreground -mt-2">
              Dostupné proměnné: <code className="bg-muted px-1 rounded">{'{'+'receiptNumber}'}</code>, <code className="bg-muted px-1 rounded">{'{'+'rideNumber}'}</code>
            </p>

            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">Předmět e-mailu</label>
              <input
                type="text"
                value={form.emailSubject}
                onChange={e => set('emailSubject', e.target.value)}
                className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">Úvodní text (nad účtenkou)</label>
              <textarea
                rows={3}
                value={form.emailHeaderNote}
                onChange={e => set('emailHeaderNote', e.target.value)}
                className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              />
            </div>

            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">Závěrečný text (pod účtenkou)</label>
              <textarea
                rows={3}
                value={form.emailFooterNote}
                onChange={e => set('emailFooterNote', e.target.value)}
                className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              />
            </div>
          </section>

          {/* Display options */}
          <section className="bg-card border border-border rounded-xl p-5 space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Zobrazení na účtence
            </h2>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.showDriverName}
                onChange={e => set('showDriverName', e.target.checked)}
                className="w-4 h-4 rounded accent-primary"
              />
              <span className="text-sm">Zobrazit jméno řidiče</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.showCargoDescription}
                onChange={e => set('showCargoDescription', e.target.checked)}
                className="w-4 h-4 rounded accent-primary"
              />
              <span className="text-sm">Zobrazit popis zásilky</span>
            </label>
          </section>

          {/* Save button */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving ? 'Ukládám…' : 'Uložit nastavení'}
            </button>
            {saved && (
              <span className="text-sm text-green-400 font-medium">✓ Uloženo</span>
            )}
            {error && (
              <span className="text-sm text-destructive">{error}</span>
            )}
          </div>
        </div>

        {/* ── Payslip template ── */}
        {psForm && (
          <div className="space-y-6 mt-2">
            <div className="border-t border-border pt-4">
              <h2 className="text-base font-semibold mb-1">Šablona výplatní pásky (PDF)</h2>
              <p className="text-xs text-muted-foreground">Tyto údaje se zobrazí na každé generované výplatní pásce jako PDF.</p>
            </div>

            <section className="bg-card border border-border rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Firemní údaje (výplatní páska)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Název firmy</label>
                  <input type="text" value={psForm.psCompanyName} onChange={e => psSet('psCompanyName', e.target.value)}
                    className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Telefon</label>
                  <input type="text" value={psForm.psCompanyPhone} onChange={e => psSet('psCompanyPhone', e.target.value)}
                    className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs text-muted-foreground mb-1.5">Adresa</label>
                  <input type="text" value={psForm.psCompanyAddress} onChange={e => psSet('psCompanyAddress', e.target.value)}
                    className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">IČO</label>
                  <input type="text" value={psForm.psCompanyIco} onChange={e => psSet('psCompanyIco', e.target.value)}
                    className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">DIČ (volitelné)</label>
                  <input type="text" value={psForm.psCompanyDic} onChange={e => psSet('psCompanyDic', e.target.value)}
                    className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">E-mail firmy</label>
                  <input type="email" value={psForm.psCompanyEmail} onChange={e => psSet('psCompanyEmail', e.target.value)}
                    className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Barva hlavičky</label>
                  <div className="flex gap-2">
                    <input type="color" value={psForm.psAccentColor} onChange={e => psSet('psAccentColor', e.target.value)}
                      className="w-10 h-9 rounded border border-border bg-input cursor-pointer p-0.5" />
                    <input type="text" value={psForm.psAccentColor} onChange={e => psSet('psAccentColor', e.target.value)}
                      className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="#2563eb" />
                  </div>
                </div>
              </div>
            </section>

            <section className="bg-card border border-border rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Texty a zobrazení</h3>
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Úvodní poznámka (nad tabulkou)</label>
                <textarea rows={2} value={psForm.psHeaderNote} onChange={e => psSet('psHeaderNote', e.target.value)}
                  placeholder="Volitelný text nad tabulkou mzdy…"
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Závěrečná poznámka (pod tabulkou)</label>
                <textarea rows={2} value={psForm.psFooterNote} onChange={e => psSet('psFooterNote', e.target.value)}
                  placeholder="Např. Výplatní páska je platná bez podpisu…"
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" />
              </div>
              <div className="space-y-3 pt-1">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={psForm.psShowHours} onChange={e => psSet('psShowHours', e.target.checked)} className="w-4 h-4 rounded accent-primary" />
                  <span className="text-sm">Zobrazit odpracované hodiny</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={psForm.psShowSignatureLine} onChange={e => psSet('psShowSignatureLine', e.target.checked)} className="w-4 h-4 rounded accent-primary" />
                  <span className="text-sm">Zobrazit řádky pro podpis (zaměstnanec + zaměstnavatel)</span>
                </label>
              </div>
            </section>

            <div className="flex items-center gap-3">
              <button onClick={handlePsSave} disabled={psSaving}
                className="px-6 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50">
                {psSaving ? 'Ukládám…' : 'Uložit šablonu výplatní pásky'}
              </button>
              {psSaved && <span className="text-sm text-green-400 font-medium">✓ Uloženo</span>}
              {psError && <span className="text-sm text-destructive">{psError}</span>}
            </div>
          </div>
        )}

        {/* ── Čerpací stanice – admin ── */}
        <div className="border-t border-border pt-6 mt-6">
          <div className="mb-4">
            <h2 className="text-base font-semibold mb-1">Čerpací stanice &amp; paliva</h2>
            <p className="text-xs text-muted-foreground">
              Správa dat zobrazovaných v sekci „Čerpací stanice v Praze" na landing page.
              Stanice se načítají z OpenStreetMap (zdarma), ceny z OilPriceAPI (vyžaduje API klíč).
            </p>
          </div>
          <section className="bg-card border border-border rounded-xl p-5">
            <FuelAdminSection />
          </section>
        </div>

        {/* Vzhled & Odhlášení */}
        <div className="bg-card border border-border rounded-xl p-5 mt-6">
          <h3 className="font-heading font-semibold mb-4">Vzhled &amp; Účet</h3>
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
      </div>
    </AppShell>
  )
}
