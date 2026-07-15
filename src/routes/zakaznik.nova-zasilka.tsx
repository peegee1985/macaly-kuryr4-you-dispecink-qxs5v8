import { customerNav } from './zakaznik'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useConvexAuth, useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useState } from 'react'
import { AppShell, LoadingScreen, PageHeader } from '@/components/AppShell'
import { AddressInput } from '@/components/AddressInput'
import { Link } from '@tanstack/react-router'

export const Route = createFileRoute('/zakaznik/nova-zasilka')({
  component: NewOrderPage,
})


function NewOrderPage() {
  const { isAuthenticated } = useConvexAuth()
  const me = useQuery(api.users.getMe)
  const createRide = useMutation(api.rides.createRide)
  const saveTemplate = useMutation(api.templates.saveTemplate)
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [saveAsTemplate, setSaveAsTemplate] = useState(false)
  const [templateName, setTemplateName] = useState('')

  const [pickupAddress, setPickupAddress] = useState({ address: '', lat: undefined as number | undefined, lng: undefined as number | undefined })
  const [deliveryAddress, setDeliveryAddress] = useState({ address: '', lat: undefined as number | undefined, lng: undefined as number | undefined })

  if (!isAuthenticated || me === undefined) return <LoadingScreen />

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    if (!pickupAddress.address.trim()) { setError('Zadejte adresu vyzvednutí'); return }
    if (!deliveryAddress.address.trim()) { setError('Zadejte adresu doručení'); return }
    setLoading(true)
    const fd = new FormData(e.currentTarget)

    try {
      const pickupDatetime = `${fd.get('pickupDate')}T${fd.get('pickupTime')}:00`
      const deliveryDatetime = `${fd.get('deliveryDate')}T${fd.get('deliveryTime')}:00`

      const rideId = await createRide({
        pickupAddress: pickupAddress.address,
        pickupLat: pickupAddress.lat,
        pickupLng: pickupAddress.lng,
        pickupContactName: fd.get('pickupContactName') as string,
        pickupContactPhone: fd.get('pickupContactPhone') as string,
        requestedPickupAt: new Date(pickupDatetime).getTime(),
        deliveryAddress: deliveryAddress.address,
        deliveryLat: deliveryAddress.lat,
        deliveryLng: deliveryAddress.lng,
        deliveryContactName: fd.get('deliveryContactName') as string,
        deliveryContactPhone: fd.get('deliveryContactPhone') as string,
        requestedDeliveryAt: new Date(deliveryDatetime).getTime(),
        cargoType: fd.get('cargoType') as any,
        cargoDescription: fd.get('cargoDescription') as string,
        weight: fd.get('weight') ? Number(fd.get('weight')) : undefined,
        quantity: Number(fd.get('quantity')) || 1,
        notes: fd.get('notes') as string || undefined,
      })
      console.log('Created ride:', rideId)
      // Optionally save as template
      if (saveAsTemplate && templateName.trim()) {
        try {
          await saveTemplate({
            title: templateName.trim(),
            rideTemplate: {
              pickupAddress: pickupAddress.address,
              pickupContactName: fd.get('pickupContactName') as string,
              pickupContactPhone: fd.get('pickupContactPhone') as string,
              deliveryAddress: deliveryAddress.address,
              deliveryContactName: fd.get('deliveryContactName') as string,
              deliveryContactPhone: fd.get('deliveryContactPhone') as string,
              cargoType: fd.get('cargoType') as any,
              cargoDescription: fd.get('cargoDescription') as string,
              weight: fd.get('weight') ? Number(fd.get('weight')) : undefined,
              quantity: Number(fd.get('quantity')) || 1,
              notes: fd.get('notes') as string || undefined,
            },
          })
          console.log('Template saved:', templateName)
        } catch (err) {
          console.error('Failed to save template:', err)
        }
      }
      setSuccess('Zásilka byla úspěšně odeslána! Dispečer ji brzy zpracuje.')
      setTimeout(() => navigate({ to: '/zakaznik/zasilky' }), 2000)
    } catch (err: any) {
      setError(err.message || 'Nepodařilo se vytvořit zásilku.')
    } finally {
      setLoading(false)
    }
  }

  const today = new Date().toISOString().split('T')[0]
  const nowTime = new Date().toTimeString().slice(0, 5)

  return (
    <AppShell navItems={customerNav} title="Zákazník" subtitle="Zákaznický portál" primaryCount={5}>
      <div className="p-4 md:p-6 max-w-2xl mx-auto">
        <PageHeader title="Nová zásilka" subtitle="Vyplňte detaily přepravy" />

        {success ? (
          <div className="bg-card border border-border rounded-xl p-8 text-center">
            <div className="text-4xl mb-3">✅</div>
            <h3 className="font-heading text-lg font-bold mb-2">Zásilka odeslána!</h3>
            <p className="text-muted-foreground text-sm">{success}</p>
          </div>
        ) : (
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
                      <option value="envelope">Obálka / dopis</option>
                      <option value="parcel">Balík</option>
                      <option value="box">Krabice</option>
                      <option value="pallet">Paleta</option>
                      <option value="other">Jiné</option>
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

            {error && (
              <p className="text-destructive text-sm bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">{error}</p>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-3 bg-primary text-primary-foreground font-heading font-semibold rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity">
              {loading ? 'Odesílám zásilku...' : 'Odeslat zásilku'}
            </button>
          </form>
        )}
      </div>
    </AppShell>
  )
}
