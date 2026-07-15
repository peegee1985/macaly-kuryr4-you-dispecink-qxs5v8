import { createFileRoute, Link } from '@tanstack/react-router'
import { useAction } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useState } from 'react'
import { AddressInput } from '@/components/AddressInput'

export const Route = createFileRoute('/objednat')({
  component: ObjednatPage,
})

const inputClass =
  'w-full px-3 py-2.5 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary'

type CargoType = 'envelope' | 'parcel' | 'box' | 'pallet' | 'other'

const cargoLabels: Record<CargoType, string> = {
  envelope: 'Obálka / dopis',
  parcel: 'Balík',
  box: 'Krabice',
  pallet: 'Paleta',
  other: 'Jiné',
}

interface PriceResult {
  doporucenaCena: number
  odhadnutaVzdalenost: string
  typVozidla: string
  urgence: string
  zduvodneni: string
  konkurence: { firma: string; cena: number }[]
}

function ObjednatPage() {
  const suggestPrice = useAction(api.aiPricing.suggestPrice)
  const createCheckoutSession = useAction(api.guestCheckout.createGuestCheckoutSession)

  // Address state
  const [pickup, setPickup] = useState({ address: '', lat: undefined as number | undefined, lng: undefined as number | undefined })
  const [delivery, setDelivery] = useState({ address: '', lat: undefined as number | undefined, lng: undefined as number | undefined })

  // Form field state
  const [pickupContactName, setPickupContactName] = useState('')
  const [pickupContactPhone, setPickupContactPhone] = useState('')
  const [pickupDate, setPickupDate] = useState(today())
  const [pickupTime, setPickupTime] = useState(nowTime())
  const [deliveryContactName, setDeliveryContactName] = useState('')
  const [deliveryContactPhone, setDeliveryContactPhone] = useState('')
  const [deliveryDate, setDeliveryDate] = useState(today())
  const [deliveryTime, setDeliveryTime] = useState('18:00')
  const [cargoType, setCargoType] = useState<CargoType>('parcel')
  const [cargoDescription, setCargoDescription] = useState('')
  const [weight, setWeight] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [notes, setNotes] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')

  // Pricing state
  const [pricing, setPricing] = useState<PriceResult | null>(null)
  const [pricingLoading, setPricingLoading] = useState(false)
  const [pricingError, setPricingError] = useState<string | null>(null)

  // Checkout state
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)

  const todayStr = today()

  function buildTimestamp(date: string, time: string): number {
    return new Date(`${date}T${time}:00`).getTime()
  }

  function validateForm(): string | null {
    if (!pickup.address.trim()) return 'Zadejte adresu vyzvednutí'
    if (!delivery.address.trim()) return 'Zadejte adresu doručení'
    if (!pickupContactName.trim()) return 'Zadejte kontaktní osobu pro vyzvednutí'
    if (!pickupContactPhone.trim()) return 'Zadejte telefon pro vyzvednutí'
    if (!deliveryContactName.trim()) return 'Zadejte kontaktní osobu pro doručení'
    if (!deliveryContactPhone.trim()) return 'Zadejte telefon pro doručení'
    if (!cargoDescription.trim()) return 'Zadejte popis zásilky'
    return null
  }

  async function handleGetPrice() {
    const err = validateForm()
    if (err) { setPricingError(err); return }
    setPricingError(null)
    setPricingLoading(true)
    setPricing(null)
    try {
      const result = await suggestPrice({
        pickupAddress: pickup.address,
        deliveryAddress: delivery.address,
        cargoType,
        cargoDescription,
        weight: weight ? Number(weight) : undefined,
        quantity: Number(quantity) || 1,
        notes: notes || undefined,
        requestedPickupAt: buildTimestamp(pickupDate, pickupTime),
        requestedDeliveryAt: buildTimestamp(deliveryDate, deliveryTime),
      })
      console.log('[objednat] AI pricing result:', result)
      setPricing(result)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      setPricingError('Nepodařilo se nacenit zásilku. Zkuste to znovu.')
      console.error('[objednat] pricing error:', msg)
    } finally {
      setPricingLoading(false)
    }
  }

  async function handleCheckout() {
    if (!pricing) return
    if (!contactName.trim()) { setCheckoutError('Zadejte své jméno'); return }
    if (!contactEmail.trim() || !contactEmail.includes('@')) { setCheckoutError('Zadejte platný e-mail'); return }
    if (!contactPhone.trim()) { setCheckoutError('Zadejte telefon'); return }

    setCheckoutError(null)
    setCheckoutLoading(true)
    try {
      const result = await createCheckoutSession({
        contactName,
        contactEmail,
        contactPhone,
        pickupAddress: pickup.address,
        pickupContactName,
        pickupContactPhone,
        requestedPickupAt: buildTimestamp(pickupDate, pickupTime),
        deliveryAddress: delivery.address,
        deliveryContactName,
        deliveryContactPhone,
        requestedDeliveryAt: buildTimestamp(deliveryDate, deliveryTime),
        cargoType,
        cargoDescription,
        weight: weight ? Number(weight) : undefined,
        quantity: Number(quantity) || 1,
        notes: notes || undefined,
      })

      console.log('[objednat] checkout result:', result)

      if (result.success && result.checkoutUrl) {
        window.location.href = result.checkoutUrl
      } else {
        setCheckoutError(result.error ?? 'Nepodařilo se spustit platbu. Zkuste to znovu.')
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      setCheckoutError('Nepodařilo se spustit platbu. Zkuste to znovu.')
      console.error('[objednat] checkout error:', msg)
    } finally {
      setCheckoutLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Minimal nav */}
      <nav className="sticky top-0 z-50 border-b border-border" style={{ background: 'hsl(222 20% 8% / 0.97)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-3xl mx-auto px-4 flex items-center justify-between h-14">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-primary rounded-md flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
              </svg>
            </div>
            <span className="text-sm font-heading font-bold text-foreground">KURÝR4YOU</span>
          </Link>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Zabezpečená objednávka
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Page title */}
        <div className="mb-8">
          <h1 className="font-heading text-2xl font-black uppercase text-foreground">Objednat kurýra</h1>
          <p className="text-muted-foreground text-sm mt-1">Bez registrace · Platba kartou online · Potvrzení na e-mail</p>
        </div>

        <div className="space-y-4">
          {/* Section 1 – Pickup */}
          <section className="bg-card border border-border rounded-xl p-5">
            <h2 className="font-heading font-semibold mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-primary/20 rounded-md flex items-center justify-center text-primary text-xs font-bold">1</span>
              Vyzvednutí
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1.5">Adresa vyzvednutí *</label>
                <AddressInput
                  value={pickup.address}
                  onChange={(addr, lat, lng) => setPickup({ address: addr, lat, lng })}
                  placeholder="Václavské náměstí 1, Praha 1"
                  required
                  className={inputClass}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Kontaktní osoba *</label>
                  <input value={pickupContactName} onChange={e => setPickupContactName(e.target.value)} type="text" required className={inputClass} placeholder="Jan Novák" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Telefon *</label>
                  <input value={pickupContactPhone} onChange={e => setPickupContactPhone(e.target.value)} type="tel" required className={inputClass} placeholder="+420 777 111 222" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Datum *</label>
                  <input value={pickupDate} onChange={e => setPickupDate(e.target.value)} type="date" required min={todayStr} className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Čas *</label>
                  <input value={pickupTime} onChange={e => setPickupTime(e.target.value)} type="time" required className={inputClass} />
                </div>
              </div>
            </div>
          </section>

          {/* Section 2 – Delivery */}
          <section className="bg-card border border-border rounded-xl p-5">
            <h2 className="font-heading font-semibold mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-primary/20 rounded-md flex items-center justify-center text-primary text-xs font-bold">2</span>
              Doručení
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1.5">Adresa doručení *</label>
                <AddressInput
                  value={delivery.address}
                  onChange={(addr, lat, lng) => setDelivery({ address: addr, lat, lng })}
                  placeholder="Náměstí Míru 3, Praha 2"
                  required
                  className={inputClass}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Kontaktní osoba *</label>
                  <input value={deliveryContactName} onChange={e => setDeliveryContactName(e.target.value)} type="text" required className={inputClass} placeholder="Marie Nováková" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Telefon *</label>
                  <input value={deliveryContactPhone} onChange={e => setDeliveryContactPhone(e.target.value)} type="tel" required className={inputClass} placeholder="+420 777 333 444" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Datum *</label>
                  <input value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} type="date" required min={todayStr} className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Čas *</label>
                  <input value={deliveryTime} onChange={e => setDeliveryTime(e.target.value)} type="time" required className={inputClass} />
                </div>
              </div>
            </div>
          </section>

          {/* Section 3 – Cargo */}
          <section className="bg-card border border-border rounded-xl p-5">
            <h2 className="font-heading font-semibold mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-primary/20 rounded-md flex items-center justify-center text-primary text-xs font-bold">3</span>
              Zásilka
            </h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Typ zásilky *</label>
                  <select value={cargoType} onChange={e => setCargoType(e.target.value as CargoType)} className={inputClass}>
                    {(Object.entries(cargoLabels) as [CargoType, string][]).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Počet kusů *</label>
                  <input value={quantity} onChange={e => setQuantity(e.target.value)} type="number" required min="1" className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Hmotnost (kg)</label>
                  <input value={weight} onChange={e => setWeight(e.target.value)} type="number" step="0.1" min="0" className={inputClass} placeholder="2.5" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Popis zásilky *</label>
                  <input value={cargoDescription} onChange={e => setCargoDescription(e.target.value)} type="text" required className={inputClass} placeholder="Smlouvy – křehké" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Poznámky pro kurýra</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className={inputClass + ' resize-none'} placeholder="Zazvoňte na 3. patro, kód domofonu 1234..." />
              </div>
            </div>
          </section>

          {/* Price calculation */}
          <div>
            {pricingError && (
              <p className="text-destructive text-sm bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2 mb-3">{pricingError}</p>
            )}
            <button
              type="button"
              onClick={handleGetPrice}
              disabled={pricingLoading}
              className="w-full py-3 rounded-xl font-heading font-bold text-sm border-2 border-primary text-primary hover:bg-primary/10 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {pricingLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  Počítám cenu…
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Spočítat cenu
                </>
              )}
            </button>
          </div>

          {/* Pricing result */}
          {pricing && (
            <section className="bg-card border border-primary/30 rounded-xl p-5 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Orientační cena</p>
                  <p className="font-heading text-4xl font-black text-primary">{pricing.doporucenaCena.toLocaleString('cs-CZ')} Kč</p>
                </div>
                <div className="text-right text-sm text-muted-foreground space-y-0.5">
                  <p>🚗 {pricing.typVozidla}</p>
                  <p>📍 {pricing.odhadnutaVzdalenost}</p>
                  <p>⏱ {pricing.urgence}</p>
                </div>
              </div>

              <p className="text-sm text-muted-foreground border-t border-border pt-3">{pricing.zduvodneni}</p>



              {/* Contact info for confirmation */}
              <div className="border-t border-border pt-4">
                <h3 className="font-heading font-semibold text-sm mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 bg-primary/20 rounded-md flex items-center justify-center text-primary text-xs font-bold">4</span>
                  Vaše kontaktní údaje
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Jméno a příjmení *</label>
                    <input value={contactName} onChange={e => setContactName(e.target.value)} type="text" required className={inputClass} placeholder="Jan Novák" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-1.5">E-mail *</label>
                      <input value={contactEmail} onChange={e => setContactEmail(e.target.value)} type="email" required className={inputClass} placeholder="jan@firma.cz" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Telefon *</label>
                      <input value={contactPhone} onChange={e => setContactPhone(e.target.value)} type="tel" required className={inputClass} placeholder="+420 777 000 111" />
                    </div>
                  </div>
                </div>
              </div>

              {checkoutError && (
                <p className="text-destructive text-sm bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">{checkoutError}</p>
              )}

              <button
                type="button"
                onClick={handleCheckout}
                disabled={checkoutLoading}
                className="w-full py-3.5 bg-primary text-primary-foreground font-heading font-bold rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
              >
                {checkoutLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                    Připravuji platbu…
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    Objednat a zaplatit {pricing.doporucenaCena.toLocaleString('cs-CZ')} Kč
                  </>
                )}
              </button>

              <p className="text-center text-xs text-muted-foreground">
                Platba probíhá přes <strong>Stripe</strong> · Vaše údaje jsou v bezpečí
              </p>
            </section>
          )}
        </div>

        {/* Back to homepage */}
        <div className="mt-8 text-center">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← Zpět na hlavní stránku
          </Link>
        </div>
      </div>
    </div>
  )
}

function today(): string {
  return new Date().toISOString().split('T')[0]
}

function nowTime(): string {
  return new Date().toTimeString().slice(0, 5)
}
