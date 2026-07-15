import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Link } from '@tanstack/react-router'

export const Route = createFileRoute('/sledovani/$token')({
  component: TrackingPage,
})

const STATUS_STEPS = ['pending', 'approved', 'assigned', 'pickup', 'transit', 'delivered']
const STATUS_LABELS: Record<string, { label: string; desc: string; icon: string }> = {
  pending: { label: 'Přijato', desc: 'Zásilka byla přijata a čeká na zpracování', icon: '📋' },
  approved: { label: 'Schváleno', desc: 'Zásilka je schválena, hledáme řidiče', icon: '✅' },
  assigned: { label: 'Přiřazeno', desc: 'Kurýr byl přiřazen k zásilce', icon: '👤' },
  pickup: { label: 'Vyzvedávám', desc: 'Kurýr je na cestě k vyzvednutí', icon: '🚗' },
  transit: { label: 'Na cestě', desc: 'Zásilka je přepravována k vám', icon: '📦' },
  delivered: { label: 'Doručeno', desc: 'Zásilka byla úspěšně doručena', icon: '🎉' },
  cancelled: { label: 'Zrušeno', desc: 'Zásilka byla zrušena', icon: '❌' },
}

function TrackingPage() {
  const { token } = Route.useParams()
  const ride = useQuery(api.rides.getRideByTrackingToken, { token })
  const podData = useQuery(
    api.rides.getPODData,
    ride?._id ? { rideId: ride._id } : 'skip'
  )

  const currentStepIdx = ride?.status ? STATUS_STEPS.indexOf(ride.status) : -1
  const isCancelled = ride?.status === 'cancelled'

  return (
    <div className="min-h-screen" style={{
      background: 'radial-gradient(ellipse at 60% 0%, hsl(38 92% 50% / 0.06) 0%, transparent 50%), hsl(var(--background))'
    }}>
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 10V7" />
              </svg>
            </div>
            <span className="font-heading font-bold">Kuryr4You</span>
          </Link>
          <span className="text-xs text-muted-foreground">Sledování zásilky</span>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {ride === undefined && (
          <div className="text-center py-20">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">Načítám zásilku...</p>
          </div>
        )}

        {ride === null && (
          <div className="text-center py-20">
            <div className="text-4xl mb-4">🔍</div>
            <h2 className="font-heading text-xl font-bold mb-2">Zásilka nenalezena</h2>
            <p className="text-muted-foreground text-sm">Tracking kód není platný nebo zásilka neexistuje.</p>
          </div>
        )}

        {ride && (
          <div className="space-y-5">
            {/* Main status card */}
            <div className={`rounded-2xl p-6 text-center ${
              isCancelled ? 'bg-destructive/10 border border-destructive/30' :
              ride.status === 'delivered' ? 'bg-green-950/30 border border-green-700/40' :
              'bg-card border border-border'
            }`}>
              <div className="text-4xl mb-2">{STATUS_LABELS[ride.status]?.icon || '📦'}</div>
              <h1 className="font-heading text-2xl font-bold mb-1">
                {STATUS_LABELS[ride.status]?.label || ride.status}
              </h1>
              <p className="text-muted-foreground text-sm">{STATUS_LABELS[ride.status]?.desc}</p>
              <div className="mt-3 inline-block bg-muted px-3 py-1 rounded-full text-xs font-mono text-muted-foreground">
                #{ride.rideNumber}
              </div>
            </div>

            {/* Progress bar */}
            {!isCancelled && (
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="relative">
                  {/* Line */}
                  <div className="absolute top-4 left-4 right-4 h-0.5 bg-muted" />
                  <div
                    className="absolute top-4 left-4 h-0.5 bg-primary transition-all duration-700"
                    style={{ width: currentStepIdx >= 0 ? `${(currentStepIdx / (STATUS_STEPS.length - 1)) * (100 - (8 / STATUS_STEPS.length) * 100)}%` : '0%' }}
                  />
                  {/* Steps */}
                  <div className="relative flex justify-between">
                    {STATUS_STEPS.map((status, idx) => {
                      const done = idx <= currentStepIdx
                      const current = idx === currentStepIdx
                      return (
                        <div key={status} className="flex flex-col items-center gap-1">
                          <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm z-10 transition-all ${
                            done ? 'bg-primary border-primary text-primary-foreground' :
                            'bg-card border-border text-muted-foreground'
                          } ${current ? 'ring-2 ring-primary ring-offset-2 ring-offset-card' : ''}`}>
                            {done && idx < currentStepIdx ? '✓' : STATUS_LABELS[status]?.icon}
                          </div>
                          <span className={`text-xs text-center leading-tight max-w-[50px] ${done ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {STATUS_LABELS[status]?.label}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Route details */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="font-heading font-semibold mb-4">Detaily zásilky</h3>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="flex flex-col items-center pt-1">
                    <div className="w-3 h-3 bg-primary rounded-full" />
                    <div className="w-0.5 h-10 bg-border my-1" />
                    <div className="w-3 h-3 bg-green-500 rounded-full" />
                  </div>
                  <div className="space-y-4 flex-1 min-w-0">
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Vyzvednutí</p>
                      <p className="font-medium text-sm">{ride.pickupAddress}</p>
                      <p className="text-xs text-muted-foreground">{new Date(ride.requestedPickupAt).toLocaleString('cs-CZ')}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Doručení</p>
                      <p className="font-medium text-sm">{ride.deliveryAddress}</p>
                      <p className="text-xs text-muted-foreground">{new Date(ride.requestedDeliveryAt).toLocaleString('cs-CZ')}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* POD info if delivered */}
            {ride.status === 'delivered' && podData && (
              <div className="bg-green-950/20 border border-green-700/30 rounded-xl p-5">
                <h3 className="font-heading font-semibold text-green-400 mb-3">✅ Potvrzení doručení</h3>
                {podData.podDeliveredAt && (
                  <p className="text-sm text-muted-foreground mb-1">
                    Doručeno: <span className="text-foreground font-medium">{new Date(podData.podDeliveredAt).toLocaleString('cs-CZ')}</span>
                  </p>
                )}
                {podData.podRecipientName && (
                  <p className="text-sm text-muted-foreground mb-3">
                    Převzal: <span className="text-foreground font-medium">{podData.podRecipientName}</span>
                  </p>
                )}
                {/* Signature */}
                {podData.signatureUrl && (
                  <div className="mb-4">
                    <p className="text-xs text-muted-foreground mb-1.5">Podpis příjemce</p>
                    <div className="bg-white rounded-lg p-2 inline-block">
                      <img src={podData.signatureUrl} alt="Podpis" className="max-h-24 max-w-full object-contain" />
                    </div>
                  </div>
                )}
                {/* Photos */}
                {podData.photoUrls.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Fotodokumentace</p>
                    <div className="grid grid-cols-2 gap-2">
                      {podData.photoUrls.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                          className="block rounded-lg overflow-hidden aspect-video bg-muted hover:opacity-90 transition-opacity">
                          <img src={url} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
