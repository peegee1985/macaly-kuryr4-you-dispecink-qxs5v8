import { useState } from "react"
import { useAction } from "convex/react"
import { api } from "../../convex/_generated/api"

interface RideForPricing {
  _id: string
  pickupAddress: string
  deliveryAddress: string
  cargoType: string
  cargoDescription: string
  weight?: number
  quantity: number
  notes?: string
  requestedPickupAt: number
  requestedDeliveryAt: number
  isMultiStop?: boolean
  stops?: unknown[]
}

interface AiPricingResult {
  doporucenaCena: number
  odhadnutaVzdalenost: string
  typVozidla: string
  urgence: string
  zduvodneni: string
  konkurence: Array<{ firma: string; cena: number }>
}

interface Props {
  ride: RideForPricing
  onApplyPrice: (price: number) => void
  onClose: () => void
}

const vehicleIcon: Record<string, string> = {
  "motocykl": "🏍️",
  "osobní auto": "🚗",
  "dodávka": "🚐",
}

const urgenceColor: Record<string, string> = {
  "standardní": "text-muted-foreground",
  "same-day": "text-amber-400",
  "expres": "text-orange-400",
  "noční": "text-blue-400",
}

export function AiPricingPanel({ ride, onApplyPrice, onClose }: Props) {
  const suggestPrice = useAction(api.aiPricing.suggestPrice)
  const [result, setResult] = useState<AiPricingResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAnalyze = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await suggestPrice({
        pickupAddress: ride.pickupAddress,
        deliveryAddress: ride.deliveryAddress,
        cargoType: ride.cargoType,
        cargoDescription: ride.cargoDescription,
        weight: ride.weight,
        quantity: ride.quantity,
        notes: ride.notes,
        requestedPickupAt: ride.requestedPickupAt,
        requestedDeliveryAt: ride.requestedDeliveryAt,
        isMultiStop: ride.isMultiStop,
        stopCount: ride.stops?.length,
      })
      setResult(res)
    } catch (err) {
      console.error("[AiPricing] Error:", err)
      setError("Nepodařilo se získat odhad. Zkuste to znovu.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="border border-primary/30 bg-primary/5 rounded-xl mx-4 my-2 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-primary/20">
        <div className="flex items-center gap-2">
          <span className="text-lg">🤖</span>
          <span className="font-heading font-semibold text-sm text-primary">AI Nacenění</span>
          <span className="text-xs text-muted-foreground">— analýza dle konkurence v Praze</span>
        </div>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground transition-colors text-lg leading-none"
        >×</button>
      </div>

      <div className="px-4 py-3">
        {/* Idle state */}
        {!result && !loading && !error && (
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">
                AI analyzuje trasu, typ zásilky a porovná ceny s konkurencí (Messenger Praha, eKuryr, Mesik.cz).
              </p>
            </div>
            <button
              onClick={handleAnalyze}
              className="shrink-0 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
            >
              Analyzovat
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center gap-3 py-2">
            <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">AI analyzuje zásilku a hledá nejlepší cenu…</p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-destructive">{error}</p>
            <button
              onClick={handleAnalyze}
              className="shrink-0 px-3 py-1.5 bg-secondary text-secondary-foreground text-xs font-medium rounded-lg hover:bg-secondary/80"
            >
              Zkusit znovu
            </button>
          </div>
        )}

        {/* Result */}
        {result && !loading && (
          <div className="space-y-3">
            {/* Main price recommendation */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Doporučená cena</p>
                <p className="text-2xl font-heading font-bold text-primary">
                  {result.doporucenaCena.toLocaleString("cs-CZ")} Kč
                </p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1.5 justify-end text-xs text-muted-foreground mb-1">
                  <span>{vehicleIcon[result.typVozidla] ?? "🚗"}</span>
                  <span>{result.typVozidla}</span>
                </div>
                <div className="flex items-center gap-1.5 justify-end text-xs text-muted-foreground mb-1">
                  <span>📍</span>
                  <span>~{result.odhadnutaVzdalenost}</span>
                </div>
                <div className={`text-xs font-medium ${urgenceColor[result.urgence] ?? "text-muted-foreground"}`}>
                  ⚡ {result.urgence}
                </div>
              </div>
            </div>

            {/* Competitor comparison */}
            {result.konkurence.length > 0 && (
              <div className="bg-background/50 border border-border rounded-lg p-3">
                <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Konkurence</p>
                <div className="space-y-1.5">
                  {result.konkurence.map((k) => (
                    <div key={k.firma} className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{k.firma}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium">{k.cena.toLocaleString("cs-CZ")} Kč</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          result.doporucenaCena <= k.cena
                            ? "bg-green-900/40 text-green-400"
                            : "bg-amber-900/40 text-amber-400"
                        }`}>
                          {result.doporucenaCena <= k.cena
                            ? `−${(k.cena - result.doporucenaCena).toLocaleString("cs-CZ")} Kč`
                            : `+${(result.doporucenaCena - k.cena).toLocaleString("cs-CZ")} Kč`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reasoning */}
            {result.zduvodneni && (
              <p className="text-xs text-muted-foreground leading-relaxed border-l-2 border-primary/30 pl-3">
                {result.zduvodneni}
              </p>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => { onApplyPrice(result.doporucenaCena); onClose() }}
                className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
              >
                ✓ Použít {result.doporucenaCena.toLocaleString("cs-CZ")} Kč
              </button>
              <button
                onClick={() => { setResult(null); setError(null) }}
                className="px-3 py-2.5 bg-secondary text-secondary-foreground text-xs font-medium rounded-lg hover:bg-secondary/80"
              >
                Přepočítat
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
