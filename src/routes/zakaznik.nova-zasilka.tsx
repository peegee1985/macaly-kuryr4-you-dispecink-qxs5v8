import { customerNav } from './zakaznik'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useConvexAuth, useMutation, useQuery, useAction } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useState } from 'react'
import { AppShell, LoadingScreen, PageHeader } from '@/components/AppShell'
import { AddressInput } from '@/components/AddressInput'
import { Link } from '@tanstack/react-router'

export const Route = createFileRoute('/zakaznik/nova-zasilka')({
  component: NewOrderPage,
})

// Typ zásilky → česky
const cargoLabels: Record<string, string> = {
  envelope: 'Obálka / dopis',
  parcel: 'Balík',
  box: 'Krabice',
  pallet: 'Paleta',
  other: 'Jiné',
}

type PricingResult = {
  doporucenaCena: number
  odhadnutaVzdalenost: string
  typVozidla: string
  zduvodneni: string
  urgence: string
  konkurence: { firma: string; cena: number }[]
}

type PricingStep = 'idle' | 'pricing' | 'confirming' | 'creating'

type FormValues = {
  pickupAddress: string
  pickupLat: number | undefined
  pickupLng: number | undefined
  pickupContactName: string
  pickupContactPhone: string
  pickupDate: string
  pickupTime: string
  deliveryAddress: string
  deliveryLat: number | undefined
  deliveryLng: number | undefined
  deliveryContactName: string
  deliveryContactPhone: string
  deliveryDate: string
  deliveryTime: string
  cargoType: string
  cargoDescription: string
  weight: number | undefined
  quantity: number
  notes: string | undefined
}

function NewOrderPage() {
  const { isAuthenticated } = useConvexAuth()
  const me = useQuery(api.users.getMe)
  const createRide = useMutation(api.rides.createRide)
  const createRideAndCheckout = useAction(api.rides.createRideAndCheckout)
  const suggestPrice = useAction(api.aiPricing.suggestPrice)
  const saveTemplate = useMutation(api.templates.saveTemplate)
  const navigate = useNavigate()

  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [saveAsTemplate, setSaveAsTemplate] = useState(false)
  const [templateName, setTemplateName] = useState('')

  const [pickupAddress, setPickupAddress] = useState({ address: '', lat: undefined as number | undefined, lng: undefined as number | undefined })
  const [deliveryAddress, setDeliveryAddress] = useState({ address: '', lat: undefined as number | undefined, lng: undefined as number | undefined })

  // Pricing state machine
  const [pricingStep, setPricingStep] = useState<PricingStep>('idle')
  const [pricingResult, setPricingResult] = useState<PricingResult | null>(null)
  const [pendingFormValues, setPendingFormValues] = useState<FormValues | null>(null)

  if (!isAuthenticated || me === undefined) return <LoadingScreen />

  const today = new Date().toISOString().split('T')[0]
  const nowTime = new Date().toTimeString().slice(0, 5)

  // Korporátní zákazník s preferencí faktury → přeskočí pricing
  const isCorporateInvoice =
    me?.corporateStatus === 'approved' && (me?.paymentPreference ?? 'invoice') !== 'card'

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    if (!pickupAddress.address.trim()) { setError('Zadejte adresu vyzvednutí'); return }
    if (!deliveryAddress.address.trim()) { setError('Zadejte adresu doručení'); return }

    const fd = new FormData(e.currentTarget)
    const formValues: FormValues = {
      pickupAddress: pickupAddress.address,
      pickupLat: pickupAddress.lat,
      pickupLng: pickupAddress.lng,
      pickupContactName: fd.get('pickupContactName') as string,
      pickupContactPhone: fd.get('pickupContactPhone') as string,
      pickupDate: fd.get('pickupDate') as string,
      pickupTime: fd.get('pickupTime') as string,
      deliveryAddress: deliveryAddress.address,
      deliveryLat: deliveryAddress.lat,
      deliveryLng: deliveryAddress.lng,
      deliveryContactName: fd.get('deliveryContactName') as string,
      deliveryContactPhone: fd.get('deliveryContactPhone') as string,
      deliveryDate: fd.get('deliveryDate') as string,
      deliveryTime: fd.get('deliveryTime') as string,
      cargoType: fd.get('cargoType') as string,
      cargoDescription: fd.get('cargoDescription') as string,
      weight: fd.get('weight') ? Number(fd.get('weight')) : undefined,
      quantity: Number(fd.get('quantity')) || 1,
      notes: (fd.get('notes') as string) || undefined,
    }

    // Korporátní zákazník s fakturou → klasický průběh (bez AI nacenění)
    if (isCorporateInvoice) {
      await doCreateRideClassic(formValues, fd)
      return
    }

    // Spuštění AI nacenění
    setPendingFormValues(formValues)
    setPricingStep('pricing')

    try {
      const result = await suggestPrice({
        pickupAddress: formValues.pickupAddress,
        deliveryAddress: formValues.deliveryAddress,
        cargoType: formValues.cargoType,
        cargoDescription: formValues.cargoDescription,
        weight: formValues.weight,
        quantity: formValues.quantity,
        notes: formValues.notes,
        requestedPickupAt: new Date(`${formValues.pickupDate}T${formValues.pickupTime}:00`).getTime(),
        requestedDeliveryAt: new Date(`${formValues.deliveryDate}T${formValues.deliveryTime}:00`).getTime(),
      })
      console.log('[nova-zasilka] AI pricing result:', result)
      setPricingResult(result)
      setPricingStep('confirming')
    } catch (err) {
      console.error('[nova-zasilka] AI pricing failed, falling back:', err)
      // AI pricing selhalo → fallback na klasický průběh
      setPricingStep('idle')
      await doCreateRideClassic(formValues, fd)
    }
  }

  // Klasický průběh: vytvoř zásilku bez okamžité platby (pro firmy nebo fallback)
  const doCreateRideClassic = async (formValues: FormValues, fd?: FormData) => {
    try {
      const rideId = await createRide({
        pickupAddress: formValues.pickupAddress,
        pickupLat: formValues.pickupLat,
        pickupLng: formValues.pickupLng,
        pickupContactName: formValues.pickupContactName,
        pickupContactPhone: formValues.pickupContactPhone,
        requestedPickupAt: new Date(`${formValues.pickupDate}T${formValues.pickupTime}:00`).getTime(),
        deliveryAddress: formValues.deliveryAddress,
        deliveryLat: formValues.deliveryLat,
        deliveryLng: formValues.deliveryLng,
        deliveryContactName: formValues.deliveryContactName,
        deliveryContactPhone: formValues.deliveryContactPhone,
        requestedDeliveryAt: new Date(`${formValues.deliveryDate}T${formValues.deliveryTime}:00`).getTime(),
        cargoType: formValues.cargoType as any,
        cargoDescription: formValues.cargoDescription,
        weight: formValues.weight,
        quantity: formValues.quantity,
        notes: formValues.notes,
      })
      console.log('[nova-zasilka] Created ride (classic):', rideId)
      await maybeSaveTemplate(formValues, fd)
      setSuccess('Zásilka byla úspěšně odeslána! Dispečer ji brzy zpracuje.')
      setTimeout(() => navigate({ to: '/zakaznik/zasilky' }), 2000)
    } catch (err: any) {
      setPricingStep('idle')
      setError(err.message || 'Nepodařilo se vytvořit zásilku.')
    }
  }

  // Po potvrzení ceny: vytvoř zásilku + Stripe checkout synchronně
  const handleConfirmPayment = async () => {
    if (!pendingFormValues || !pricingResult) return
    setError(null)
    setPricingStep('creating')

    try {
      const result = await createRideAndCheckout({
        pickupAddress: pendingFormValues.pickupAddress,
        pickupLat: pendingFormValues.pickupLat,
        pickupLng: pendingFormValues.pickupLng,
        pickupContactName: pendingFormValues.pickupContactName,
        pickupContactPhone: pendingFormValues.pickupContactPhone,
        requestedPickupAt: new Date(`${pendingFormValues.pickupDate}T${pendingFormValues.pickupTime}:00`).getTime(),
        deliveryAddress: pendingFormValues.deliveryAddress,
        deliveryLat: pendingFormValues.deliveryLat,
        deliveryLng: pendingFormValues.deliveryLng,
        deliveryContactName: pendingFormValues.deliveryContactName,
        deliveryContactPhone: pendingFormValues.deliveryContactPhone,
        requestedDeliveryAt: new Date(`${pendingFormValues.deliveryDate}T${pendingFormValues.deliveryTime}:00`).getTime(),
        cargoType: pendingFormValues.cargoType as any,
        cargoDescription: pendingFormValues.cargoDescription,
        weight: pendingFormValues.weight,
        quantity: pendingFormValues.quantity,
        notes: pendingFormValues.notes,
        price: Math.round(pricingResult.doporucenaCena),
      })
      console.log('[nova-zasilka] createRideAndCheckout result:', result)

      await maybeSaveTemplate(pendingFormValues)

      if (result.checkoutUrl) {
        // Přesměruj na Stripe checkout
        window.location.href = result.checkoutUrl
      } else {
        // Fallback: zásilka vytvořena, ale platební odkaz nebyl vygenerován
        setSuccess('Zásilka odeslána! Platební odkaz vám zašleme e-mailem.')
        setTimeout(() => navigate({ to: '/zakaznik/zasilky' }), 2500)
      }
    } catch (err: any) {
      console.error('[nova-zasilka] createRideAndCheckout failed:', err)
      setError(err.message || 'Chyba při vytváření zásilky. Zkuste to prosím znovu.')
      setPricingStep('confirming')
    }
  }

  const maybeSaveTemplate = async (formValues: FormValues, _fd?: FormData) => {
    if (saveAsTemplate && templateName.trim()) {
      try {
        await saveTemplate({
          title: templateName.trim(),
          rideTemplate: {
            pickupAddress: formValues.pickupAddress,
            pickupContactName: formValues.pickupContactName,
            pickupContactPhone: formValues.pickupContactPhone,
            deliveryAddress: formValues.deliveryAddress,
            deliveryContactName: formValues.deliveryContactName,
            deliveryContactPhone: formValues.deliveryContactPhone,
            cargoType: formValues.cargoType as any,
            cargoDescription: formValues.cargoDescription,
            weight: formValues.weight,
            quantity: formValues.quantity,
            notes: formValues.notes,
          },
        })
        console.log('[nova-zasilka] Template saved:', templateName)
      } catch (err) {
        console.error('[nova-zasilka] Failed to save template:', err)
      }
    }
  }

  // ── Overlay stavy ──────────────────────────────────────────────────────────

  if (success) {
    return (
      <AppShell navItems={customerNav} title="Zákazník" subtitle="Zákaznický portál" primaryCount={5}>
        <div className="p-4 md:p-6 max-w-2xl mx-auto">
          <div className="bg-card border border-border rounded-xl p-8 text-center">
            <div className="text-4xl mb-3">✅</div>
            <h3 className="font-heading text-lg font-bold mb-2">Zásilka odeslána!</h3>
            <p className="text-muted-foreground text-sm">{success}</p>
          </div>
        </div>
      </AppShell>
    )
  }

  if (pricingStep === 'pricing') {
    return (
      <AppShell navItems={customerNav} title="Zákazník" subtitle="Zákaznický portál" primaryCount={5}>
        <div className="p-4 md:p-6 max-w-2xl mx-auto">
          <PageHeader title="Nová zásilka" subtitle="Počítám cenu přepravy..." />
          <div className="bg-card border border-border rounded-xl p-10 text-center">
            <div className="flex justify-center mb-5">
              <svg className="animate-spin w-10 h-10 text-primary" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
            <h3 className="font-heading font-semibold text-lg mb-2">Nacenění zásilky</h3>
            <p className="text-muted-foreground text-sm">AI analyzuje trasu a počítá optimální cenu…</p>
          </div>
        </div>
      </AppShell>
    )
  }

  if (pricingStep === 'confirming' && pricingResult && pendingFormValues) {
    const price = Math.round(pricingResult.doporucenaCena)
    return (
      <AppShell navItems={customerNav} title="Zákazník" subtitle="Zákaznický portál" primaryCount={5}>
        <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4">
          <PageHeader title="Potvrzení objednávky" subtitle="Zkontrolujte cenu a potvrďte platbu" />

          {/* Cena a detaily */}
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Cena přepravy</p>
                <p className="text-4xl font-heading font-bold text-primary">{price.toLocaleString('cs-CZ')} Kč</p>
                <p className="text-xs text-muted-foreground mt-1">vč. DPH · platba kartou online</p>
              </div>
              <span className="bg-primary/10 text-primary text-xs font-medium px-3 py-1.5 rounded-full">{pricingResult.urgence}</span>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
              <div className="bg-background rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-0.5">Trasa</p>
                <p className="font-medium">{pricingResult.odhadnutaVzdalenost}</p>
              </div>
              <div className="bg-background rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-0.5">Typ vozidla</p>
                <p className="font-medium">{pricingResult.typVozidla}</p>
              </div>
            </div>

            <div className="bg-background rounded-lg p-3 mb-4 text-sm">
              <p className="text-xs text-muted-foreground mb-1">Zdůvodnění ceny</p>
              <p className="text-sm">{pricingResult.zduvodneni}</p>
            </div>

            {/* Adresy */}
            <div className="border-t border-border pt-4 space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5">↑</span>
                <div>
                  <p className="text-xs text-muted-foreground">Vyzvednutí</p>
                  <p className="font-medium">{pendingFormValues.pickupAddress}</p>
                  <p className="text-xs text-muted-foreground">{pendingFormValues.pickupContactName} · {pendingFormValues.pickupContactPhone}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 bg-primary/20 text-primary rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5">↓</span>
                <div>
                  <p className="text-xs text-muted-foreground">Doručení</p>
                  <p className="font-medium">{pendingFormValues.deliveryAddress}</p>
                  <p className="text-xs text-muted-foreground">{pendingFormValues.deliveryContactName} · {pendingFormValues.deliveryContactPhone}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Srovnání s konkurencí */}
          {pricingResult.konkurence.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-5">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">Srovnání s konkurencí</p>
              <div className="space-y-2">
                {pricingResult.konkurence.map((k) => (
                  <div key={k.firma} className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">{k.firma}</span>
                    <span className="font-medium">{k.cena.toLocaleString('cs-CZ')} Kč</span>
                  </div>
                ))}
                <div className="flex justify-between items-center text-sm border-t border-border pt-2 mt-2">
                  <span className="font-semibold text-primary">Kuryr4You</span>
                  <span className="font-bold text-primary">{price.toLocaleString('cs-CZ')} Kč</span>
                </div>
              </div>
            </div>
          )}

          {error && (
            <p className="text-destructive text-sm bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">{error}</p>
          )}

          {/* Akce */}
          <div className="space-y-3">
            <button
              onClick={handleConfirmPayment}
              className="w-full py-3.5 bg-primary text-primary-foreground font-heading font-semibold rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              Potvrdit a zaplatit {price.toLocaleString('cs-CZ')} Kč
            </button>
            <button
              onClick={() => { setPricingStep('idle'); setError(null) }}
              className="w-full py-2.5 bg-card border border-border text-sm font-medium rounded-lg hover:bg-background transition-colors"
            >
              ← Zpět k úpravě zásilky
            </button>
          </div>
        </div>
      </AppShell>
    )
  }

  if (pricingStep === 'creating') {
    return (
      <AppShell navItems={customerNav} title="Zákazník" subtitle="Zákaznický portál" primaryCount={5}>
        <div className="p-4 md:p-6 max-w-2xl mx-auto">
          <PageHeader title="Nová zásilka" subtitle="Vytváříme zásilku a připravujeme platbu..." />
          <div className="bg-card border border-border rounded-xl p-10 text-center">
            <div className="flex justify-center mb-5">
              <svg className="animate-spin w-10 h-10 text-primary" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
            <h3 className="font-heading font-semibold text-lg mb-2">Příprava platby</h3>
            <p className="text-muted-foreground text-sm">Zásilka se vytváří a připravuje se platební brána…</p>
          </div>
        </div>
      </AppShell>
    )
  }

  // ── Hlavní formulář (idle) ─────────────────────────────────────────────────
  return (
    <AppShell navItems={customerNav} title="Zákazník" subtitle="Zákaznický portál" primaryCount={5}>
      <div className="p-4 md:p-6 max-w-2xl mx-auto">
        <PageHeader title="Nová zásilka" subtitle={isCorporateInvoice ? 'Firemní zásilka – platba fakturou' : 'Vyplňte detaily přepravy – cena bude spočítána automaticky'} />

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Pickup */}
          <section className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-heading font-semibold mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-primary/20 rounded-md flex items-center justify-center text-primary text-xs font-bold">1</span>
              Vyzvednutí
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1.5">Adresa vyzvednutí *</label>
                <AddressInput
                  value={pickupAddress.address}
                  onChange={(addr, lat, lng) => setPickupAddress({ address: addr, lat, lng })}
                  placeholder="Václavské náměstí 1, Praha 1"
                  required
                  className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Kontaktní osoba *</label>
                  <input name="pickupContactName" type="text" required
                    className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                    placeholder="Jan Novák" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Telefon *</label>
                  <input name="pickupContactPhone" type="tel" required
                    className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                    placeholder="+420 777 111 222" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Datum vyzvednutí *</label>
                  <input name="pickupDate" type="date" required defaultValue={today} min={today}
                    className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Čas vyzvednutí *</label>
                  <input name="pickupTime" type="time" required defaultValue={nowTime}
                    className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary" />
                </div>
              </div>
            </div>
          </section>

          {/* Delivery */}
          <section className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-heading font-semibold mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-primary/20 rounded-md flex items-center justify-center text-primary text-xs font-bold">2</span>
              Doručení
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1.5">Adresa doručení *</label>
                <AddressInput
                  value={deliveryAddress.address}
                  onChange={(addr, lat, lng) => setDeliveryAddress({ address: addr, lat, lng })}
                  placeholder="Náměstí Míru 3, Praha 2"
                  required
                  className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Kontaktní osoba *</label>
                  <input name="deliveryContactName" type="text" required
                    className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                    placeholder="Marie Nováková" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Telefon *</label>
                  <input name="deliveryContactPhone" type="tel" required
                    className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                    placeholder="+420 777 333 444" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Datum doručení *</label>
                  <input name="deliveryDate" type="date" required defaultValue={today} min={today}
                    className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Čas doručení *</label>
                  <input name="deliveryTime" type="time" required defaultValue="18:00"
                    className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary" />
                </div>
              </div>
            </div>
          </section>

          {/* Cargo */}
          <section className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-heading font-semibold mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-primary/20 rounded-md flex items-center justify-center text-primary text-xs font-bold">3</span>
              Zásilka
            </h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Typ zásilky *</label>
                  <select name="cargoType" required
                    className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary">
                    {Object.entries(cargoLabels).map(([v, label]) => (
                      <option key={v} value={v}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Počet kusů *</label>
                  <input name="quantity" type="number" required min="1" defaultValue="1"
                    className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Hmotnost (kg)</label>
                  <input name="weight" type="number" step="0.1" min="0"
                    className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                    placeholder="2.5" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Popis zásilky *</label>
                <input name="cargoDescription" type="text" required
                  className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                  placeholder="Smlouvy – křehké, nepřekládat" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Poznámky pro kurýra</label>
                <textarea name="notes" rows={3}
                  className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary resize-none"
                  placeholder="Zazvoňte na 3. patro, kód domofonu 1234..." />
              </div>
            </div>
          </section>

          {/* Save as template option */}
          <div className="bg-card border border-border rounded-xl p-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={saveAsTemplate}
                onChange={e => setSaveAsTemplate(e.target.checked)}
                className="w-4 h-4 rounded border-border accent-primary"
              />
              <div>
                <p className="text-sm font-medium">Uložit jako šablonu</p>
                <p className="text-xs text-muted-foreground">Pro snadné opakování objednávky příště</p>
              </div>
              <Link to="/zakaznik/sablony" className="ml-auto text-xs text-primary hover:opacity-80">Moje šablony →</Link>
            </label>
            {saveAsTemplate && (
              <input
                type="text"
                value={templateName}
                onChange={e => setTemplateName(e.target.value)}
                placeholder="Název šablony (např. Sklad → Praha centrum)"
                className="mt-3 w-full px-3 py-2 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            )}
          </div>

          {/* Info banner pro platbu kartou */}
          {!isCorporateInvoice && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex gap-3 text-sm">
              <svg className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-muted-foreground">Po odeslání formuláře AI spočítá cenu přepravy. Poté potvrdíte a zaplatíte online kartou – zásilka bude ihned zaevidována.</p>
            </div>
          )}

          {error && (
            <p className="text-destructive text-sm bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">{error}</p>
          )}

          <button type="submit"
            className="w-full py-3 bg-primary text-primary-foreground font-heading font-semibold rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
            {isCorporateInvoice ? (
              'Odeslat zásilku'
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Pokračovat k nacenění
              </>
            )}
          </button>
        </form>
      </div>
    </AppShell>
  )
}
