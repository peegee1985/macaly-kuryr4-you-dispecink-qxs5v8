"use client"
import { useQuery, useAction } from "convex/react"
import { api } from "../../convex/_generated/api"
import { useEffect, useRef, useState } from "react"
import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Line } from "recharts"


// ─── Types ─────────────────────────────────────────────────────────────────
interface GasStation {
  id: number
  lat: number
  lng: number
  name: string
  brand: string | null
  type: "fuel" | "ev"
}
interface FuelPrices {
  dieselEur: number | null
  petrolEur: number | null
  dieselCzk: number | null
  petrolCzk: number | null
  updatedAt: number
}
interface HistoryPoint {
  date: string
  diesel: number
}

// ─── Brand colour map ───────────────────────────────────────────────────────
const BRAND_COLORS: Record<string, string> = {
  Shell: "#f7c948",
  OMV: "#c8102e",
  MOL: "#00703c",
  EuroOil: "#1a3875",
  Orlen: "#d92b2b",
  Benzina: "#e30613",
  "WestPetrol": "#0060a8",
  EG: "#e95b0c",
  Robin: "#7928ca",
}
function brandColor(brand: string | null): string {
  if (!brand) return "#f59e0b"
  return BRAND_COLORS[brand] ?? "#f59e0b"
}

// ─── Leaflet Map component (lazy, client-only) ──────────────────────────────
function FuelMap({ stations }: { stations: GasStation[] }) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<unknown>(null)

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return

    // Dynamic import to avoid SSR issues
    import("leaflet").then((L) => {
      if (!mapRef.current || mapInstance.current) return

      const map = L.map(mapRef.current, {
        center: [50.075, 14.435],
        zoom: 11,
        zoomControl: true,
      })
      mapInstance.current = map

      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
          maxZoom: 19,
        }
      ).addTo(map)

      const fuelStations = stations.filter((s) => s.type === "fuel")
      const evStations = stations.filter((s) => s.type === "ev")

      fuelStations.forEach((s) => {
        const color = brandColor(s.brand)
        const icon = L.divIcon({
          className: "",
          html: `<div style="
            width:10px;height:10px;
            background:${color};
            border:2px solid rgba(255,255,255,0.6);
            border-radius:50%;
            box-shadow:0 0 6px ${color}80;
          "></div>`,
          iconSize: [10, 10],
          iconAnchor: [5, 5],
        })
        L.marker([s.lat, s.lng], { icon })
          .addTo(map)
          .bindPopup(
            `<b style="color:#f59e0b">${s.name}</b>${s.brand ? `<br><span style="opacity:.7">${s.brand}</span>` : ""}`,
            { className: "fuel-popup" }
          )
      })

      evStations.forEach((s) => {
        const icon = L.divIcon({
          className: "",
          html: `<div style="
            width:10px;height:10px;
            background:#22d3ee;
            border:2px solid rgba(255,255,255,0.6);
            border-radius:3px;
            box-shadow:0 0 6px #22d3ee80;
          "></div>`,
          iconSize: [10, 10],
          iconAnchor: [5, 5],
        })
        L.marker([s.lat, s.lng], { icon })
          .addTo(map)
          .bindPopup(`<b style="color:#22d3ee">⚡ ${s.name}</b>`)
      })

      return () => {
        map.remove()
        mapInstance.current = null
      }
    })
  }, [stations])

  return (
    <div
      ref={mapRef}
      className="w-full h-full rounded-xl overflow-hidden"
      style={{ minHeight: "380px" }}
    />
  )
}

// ─── Price card ─────────────────────────────────────────────────────────────
function PriceCard({
  label,
  czkPrice,
  eurPrice,
  color,
  icon,
}: {
  label: string
  czkPrice: number | null
  eurPrice: number | null
  color: string
  icon: string
}) {
  return (
    <div
      className="rounded-xl p-4 border border-border flex flex-col gap-1"
      style={{ background: "hsl(222 22% 9%)" }}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xl">{icon}</span>
        <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
          {label}
        </span>
      </div>
      {czkPrice ? (
        <>
          <div className="text-2xl font-black font-heading" style={{ color }}>
            {czkPrice.toFixed(1)} <span className="text-sm font-normal text-muted-foreground">Kč/l</span>
          </div>
          {eurPrice && (
            <div className="text-xs text-muted-foreground">
              {eurPrice.toFixed(3)} EUR/l
            </div>
          )}
        </>
      ) : (
        <div className="text-sm text-muted-foreground">—</div>
      )}
    </div>
  )
}

// ─── Main export ────────────────────────────────────────────────────────────
export function FuelPricesSection() {
  const data = useQuery(api.fuel.getFuelData)
  const refresh = useAction(api.fuel.refreshFuelData)
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState<"mapa" | "trend">("mapa")

  useEffect(() => {
    setMounted(true)
  }, [])

  // Trigger refresh if stations OR prices are missing from cache
  useEffect(() => {
    if (data === undefined) return // still loading query
    if (!data.stations || !data.prices) {
      console.log("[FuelPricesSection] Missing stations or prices, triggering refresh")
      setLoading(true)
      refresh({})
        .catch((err) => console.error("[FuelPricesSection] refresh error:", err))
        .finally(() => setLoading(false))
    }
  }, [data, refresh])

  const stations = data?.stations ?? []
  const prices = data?.prices as FuelPrices | null | undefined
  const history = data?.history as HistoryPoint[] | null | undefined

  const fuelCount = stations.filter((s) => s.type === "fuel").length
  const evCount = stations.filter((s) => s.type === "ev").length

  const hasPrices = prices && (prices.dieselCzk || prices.petrolCzk)
  const hasHistory = history && history.length > 0

  // Format history for recharts
  const chartData = hasHistory
    ? history.map((h) => ({
        ...h,
        label: new Date(h.date).toLocaleDateString("cs-CZ", { day: "numeric", month: "short" }),
        dieselCzk: Math.round(h.diesel * 25.2 * 10) / 10,
      }))
    : []

  return (
    <section
      id="ceny-paliv"
      className="py-16 border-t border-border"
      style={{ background: "hsl(222 18% 7%)" }}
    >
      <div className="max-w-6xl mx-auto px-4">
        {/* Section header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 mb-3 px-3 py-1 rounded-full border border-primary/30 text-xs text-primary font-medium"
            style={{ background: "hsl(38 92% 50% / 0.08)" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            Živá data · OpenStreetMap
          </div>
          <h2 className="font-heading text-3xl font-black uppercase text-foreground mb-2">
            Čerpací stanice v Praze
          </h2>
          <p className="text-muted-foreground text-sm max-w-xl">
            Reálné polohy všech čerpacích stanic a nabíječek EV v Praze z OpenStreetMap.
            {hasPrices
              ? " Ceny paliv jsou celostátní průměry za aktuální týden."
              : " Ceny paliv budou zobrazeny po konfiguraci datového zdroje."}
          </p>
        </div>

        {/* Stats row */}
        <div className="flex flex-wrap gap-4 mb-6">
          {loading && stations.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-4 h-4 border border-primary border-t-transparent rounded-full animate-spin" />
              Načítám stanice z OpenStreetMap…
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 text-sm">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ background: "#f59e0b", boxShadow: "0 0 6px #f59e0b80" }}
                />
                <span className="text-foreground font-medium">{fuelCount}</span>
                <span className="text-muted-foreground">čerpacích stanic</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span
                  className="w-3 h-3 rounded-sm"
                  style={{ background: "#22d3ee", boxShadow: "0 0 6px #22d3ee80" }}
                />
                <span className="text-foreground font-medium">{evCount}</span>
                <span className="text-muted-foreground">nabíječek EV</span>
              </div>
            </>
          )}
        </div>

        {/* Tab toggle */}
        {hasHistory && (
          <div className="flex gap-1 mb-5 p-1 rounded-lg border border-border w-fit" style={{ background: "hsl(222 22% 6%)" }}>
            {(["mapa", "trend"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="px-4 py-1.5 rounded-md text-sm font-medium transition-all"
                style={
                  activeTab === tab
                    ? { background: "hsl(38 92% 50%)", color: "hsl(222 22% 6%)" }
                    : { color: "hsl(215 16% 57%)" }
                }
              >
                {tab === "mapa" ? "🗺 Mapa" : "📈 Vývoj cen"}
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left — price cards */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
              Průměrné ceny paliv · ČR
            </h3>

            {hasPrices ? (
              <>
                <PriceCard
                  label="Nafta"
                  czkPrice={prices!.dieselCzk}
                  eurPrice={prices!.dieselEur}
                  color="#f59e0b"
                  icon="⛽"
                />
                <PriceCard
                  label="Benzin 95"
                  czkPrice={prices!.petrolCzk}
                  eurPrice={prices!.petrolEur}
                  color="#22d3ee"
                  icon="🔵"
                />
                {prices!.updatedAt && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Aktualizováno:{" "}
                    {new Date(prices!.updatedAt).toLocaleString("cs-CZ", {
                      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
                    })}
                  </p>
                )}
              </>
            ) : (
              <div
                className="rounded-xl p-4 border border-border text-sm text-muted-foreground"
                style={{ background: "hsl(222 22% 9%)" }}
              >
                <p className="font-medium text-foreground mb-1">Ceny paliv</p>
                <p className="text-xs leading-relaxed">
                  Pro zobrazení aktuálních cen přidejte API klíč{" "}
                  <code className="text-primary">OILPRICE_API_KEY</code> do nastavení secrets.
                </p>
              </div>
            )}

            {/* Legend */}
            <div className="mt-2 rounded-xl p-3 border border-border text-xs text-muted-foreground space-y-1.5"
              style={{ background: "hsl(222 22% 9%)" }}>
              <p className="font-medium text-foreground mb-2 text-xs uppercase tracking-wider">Legenda</p>
              {[
                { color: "#f7c948", label: "Shell" },
                { color: "#c8102e", label: "OMV" },
                { color: "#e30613", label: "Benzina / Orlen" },
                { color: "#00703c", label: "MOL" },
                { color: "#f59e0b", label: "Ostatní" },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
                  {label}
                </div>
              ))}
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: "#22d3ee" }} />
                Nabíječka EV
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Zdroj poloh:{" "}
              <a
                href="https://www.openstreetmap.org"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                OpenStreetMap
              </a>
              {hasPrices && (
                <>
                  {" · "}Ceny:{" "}
                  <a
                    href="https://oilpriceapi.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    OilPriceAPI
                  </a>
                </>
              )}
            </p>
          </div>

          {/* Right — Map or Chart */}
          <div className="lg:col-span-2">
            {activeTab === "mapa" || !hasHistory ? (
              mounted && stations.length > 0 ? (
                <FuelMap stations={stations} />
              ) : (
                <div
                  className="w-full rounded-xl border border-border flex items-center justify-center"
                  style={{ minHeight: "380px", background: "hsl(222 22% 9%)" }}
                >
                  {loading || data === undefined ? (
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm">Načítám data z OpenStreetMap…</span>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">Mapa není dostupná</span>
                  )}
                </div>
              )
            ) : (
              /* Price trend chart */
              <div
                className="w-full rounded-xl border border-border p-5"
                style={{ minHeight: "380px", background: "hsl(222 22% 9%)" }}
              >
                <p className="text-sm font-medium text-foreground mb-4">
                  Vývoj ceny nafty v ČR (Kč/l, posledních 10 týdnů)
                </p>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 91% 55% / 0.1)" />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: "hsl(215 16% 57%)", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      domain={["auto", "auto"]}
                      tick={{ fill: "hsl(215 16% 57%)", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v: number) => `${v} Kč`}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(222 22% 12%)",
                        border: "1px solid hsl(217 91% 55% / 0.2)",
                        borderRadius: "8px",
                        color: "hsl(210 40% 98%)",
                        fontSize: "12px",
                      }}
                      formatter={(value) => [`${value} Kč/l`, "Nafta"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="dieselCzk"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      dot={{ fill: "#f59e0b", r: 4, strokeWidth: 0 }}
                      activeDot={{ r: 6, fill: "#f59e0b" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
