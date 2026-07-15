import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'

export const Route = createFileRoute('/mockup')({
  component: MobileDesignMockup,
})

// ─── Sample data ───────────────────────────────────────────────────────────────

const ACTIVE_RIDE = {
  id: 'r001',
  number: '3842',
  status: 'transit' as const,
  cargo: 'Balík × 2',
  pickupAddress: 'Náměstí Republiky 3, Praha 1',
  pickupContact: 'Jan Novák',
  pickupPhone: '+420 601 234 567',
  deliveryAddress: 'Budějovická 15, Praha 4',
  deliveryContact: 'Marie Svobodová',
  deliveryPhone: '+420 777 890 123',
  pickupTime: 'dnes 13:30',
  deliveryTime: 'dnes 14:15',
  price: '340 Kč',
  notes: 'Křehké – prosím opatrně',
}

const INCOMING_RIDE = {
  id: 'r002',
  number: '3843',
  status: 'pending' as const,
  cargo: 'Obálka × 1',
  pickupAddress: 'Wenceslasovo nám. 1, Praha 1',
  deliveryAddress: 'Pankrác 23, Praha 4',
  pickupTime: 'dnes 15:00',
  deliveryTime: 'dnes 15:45',
  price: '185 Kč',
  distance: '6.2 km',
}

const HISTORY_RIDES = [
  { id: 'h1', number: '3841', status: 'delivered', from: 'Vinohrady', to: 'Žižkov', time: 'dnes 11:20', price: '220 Kč' },
  { id: 'h2', number: '3840', status: 'delivered', from: 'Smíchov', to: 'Dejvice', time: 'dnes 9:05', price: '290 Kč' },
]

// ─── Status pill ───────────────────────────────────────────────────────────────

function StatusPill({ status }: { status: string }) {
  const configs: Record<string, { label: string; classes: string }> = {
    assigned:  { label: 'Přiřazeno',   classes: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
    pickup:    { label: 'Jedu vyzvednout', classes: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
    transit:   { label: 'Jedu doručit', classes: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },
    delivered: { label: 'Doručeno',    classes: 'bg-green-500/20 text-green-300 border-green-500/30' },
    pending:   { label: 'Volná zákazka', classes: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
    cancelled: { label: 'Zrušeno',     classes: 'bg-red-500/20 text-red-300 border-red-500/30' },
  }
  const c = configs[status] ?? { label: status, classes: 'bg-muted text-muted-foreground border-border' }
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border ${c.classes}`}>
      {c.label}
    </span>
  )
}

// ─── New Design: Active Ride Card ──────────────────────────────────────────────

function ActiveRideCard({ ride, showPOD = false }: { ride: typeof ACTIVE_RIDE; showPOD?: boolean }) {
  const [navOpen, setNavOpen] = useState(false)
  const isPickup = (ride.status as string) === 'pickup' || (ride.status as string) === 'assigned'
  const navAddress = isPickup ? ride.pickupAddress : ride.deliveryAddress
  const navLabel = isPickup ? 'Vyzvednutí' : 'Doručení'

  return (
    <div className="rounded-2xl overflow-hidden border border-primary/30 shadow-lg shadow-primary/10">
      {/* Top accent bar */}
      <div className="h-1 w-full bg-gradient-to-r from-primary via-primary/80 to-primary/40" />

      <div className="bg-card p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="font-heading font-black text-lg text-foreground">#{ride.number}</span>
            <StatusPill status={ride.status} />
          </div>
          <span className="text-sm font-bold text-primary">{ride.price}</span>
        </div>

        {/* Route visualization */}
        <div className="relative flex flex-col gap-0 mb-4">
          {/* Pickup */}
          <div className={`flex gap-3 items-start pb-4 relative ${ride.status === 'transit' ? 'opacity-50' : ''}`}>
            <div className="flex flex-col items-center gap-1 pt-0.5">
              <div className="w-4 h-4 rounded-full bg-green-500 border-2 border-green-400 flex-shrink-0" />
              <div className="w-0.5 h-6 bg-border" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">Vyzvednutí · {ride.pickupTime}</p>
              <p className="text-sm font-semibold text-foreground leading-tight">{ride.pickupAddress}</p>
              {ride.status !== 'transit' && (
                <a href={`tel:${ride.pickupPhone}`} className="inline-flex items-center gap-1.5 mt-1.5 px-3 py-1.5 bg-green-500/15 border border-green-500/25 text-green-400 text-xs font-bold rounded-xl">
                  📞 {ride.pickupContact}
                </a>
              )}
            </div>
          </div>

          {/* Delivery */}
          <div className="flex gap-3 items-start">
            <div className="flex flex-col items-center pt-0.5">
              <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-red-400 flex-shrink-0" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">Doručení · {ride.deliveryTime}</p>
              <p className="text-sm font-semibold text-foreground leading-tight">{ride.deliveryAddress}</p>
              <a href={`tel:${ride.deliveryPhone}`} className="inline-flex items-center gap-1.5 mt-1.5 px-3 py-1.5 bg-green-500/15 border border-green-500/25 text-green-400 text-xs font-bold rounded-xl">
                📞 {ride.deliveryContact}
              </a>
            </div>
          </div>
        </div>

        {/* Note */}
        {ride.notes && (
          <p className="text-xs text-amber-300/90 bg-amber-950/40 border border-amber-700/30 rounded-xl px-3 py-2 mb-4 flex items-start gap-2">
            <span className="flex-shrink-0">⚠️</span>{ride.notes}
          </p>
        )}

        {/* Navigation row */}
        <div className="mb-3">
          <button
            onClick={() => setNavOpen(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 bg-primary/15 border border-primary/25 text-primary font-bold text-sm rounded-xl hover:bg-primary/25 transition-colors"
          >
            <span className="flex items-center gap-2">🧭 Navigovat na {navLabel.toLowerCase()}</span>
            <span className="text-xs opacity-70">{navOpen ? '▲' : '▼'}</span>
          </button>
          {navOpen && (
            <div className="mt-2 grid grid-cols-3 gap-2">
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(navAddress)}`}
                target="_blank" rel="noopener noreferrer"
                className="flex flex-col items-center gap-1.5 py-3 bg-blue-600/20 border border-blue-600/30 text-blue-400 text-xs font-bold rounded-xl hover:bg-blue-600/30 transition-colors"
              >
                <span className="text-xl">🗺️</span>
                <span>Google Maps</span>
              </a>
              <a
                href={`https://waze.com/ul?q=${encodeURIComponent(navAddress)}&navigate=yes`}
                target="_blank" rel="noopener noreferrer"
                className="flex flex-col items-center gap-1.5 py-3 bg-cyan-600/20 border border-cyan-600/30 text-cyan-400 text-xs font-bold rounded-xl hover:bg-cyan-600/30 transition-colors"
              >
                <span className="text-xl">🔵</span>
                <span>Waze</span>
              </a>
              <a
                href={`https://maps.apple.com/?daddr=${encodeURIComponent(navAddress)}`}
                target="_blank" rel="noopener noreferrer"
                className="flex flex-col items-center gap-1.5 py-3 bg-gray-600/20 border border-gray-600/30 text-gray-400 text-xs font-bold rounded-xl hover:bg-gray-600/30 transition-colors"
              >
                <span className="text-xl">🍎</span>
                <span>Apple Maps</span>
              </a>
            </div>
          )}
        </div>

        {/* Main action */}
        {showPOD ? (
          <button className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-black text-base rounded-2xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-green-900/30">
            ✅ Dokončit — zadat doklad o doručení
          </button>
        ) : (
          <button className="w-full py-4 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-base rounded-2xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-primary/30">
            📦 Zásilku mám – jedu doručit
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Incoming ride card ────────────────────────────────────────────────────────

function IncomingRideCard({ ride }: { ride: typeof INCOMING_RIDE }) {
  const [taking, setTaking] = useState(false)
  const [taken, setTaken] = useState(false)

  if (taken) {
    return (
      <div className="rounded-2xl bg-green-950/40 border border-green-700/50 p-4 text-center">
        <p className="text-green-400 font-bold text-sm">✅ Zákazka přijata!</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-purple-500/30 bg-card shadow-md overflow-hidden">
      <div className="h-0.5 w-full bg-gradient-to-r from-purple-500 to-purple-400/40" />
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="font-heading font-black text-base text-foreground">#{ride.number}</span>
            <StatusPill status="pending" />
          </div>
          <div className="text-right">
            <p className="text-base font-black text-primary">{ride.price}</p>
            <p className="text-[11px] text-muted-foreground">{ride.distance}</p>
          </div>
        </div>

        <div className="flex gap-3 mb-4">
          <div className="flex flex-col items-center gap-1 pt-1.5">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <div className="w-0.5 h-5 bg-border" />
            <div className="w-3 h-3 rounded-full bg-red-500" />
          </div>
          <div className="flex-1 space-y-2">
            <div>
              <p className="text-[11px] text-muted-foreground font-medium">{ride.pickupTime}</p>
              <p className="text-sm font-semibold text-foreground leading-tight">{ride.pickupAddress}</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground font-medium">{ride.deliveryTime}</p>
              <p className="text-sm font-semibold text-foreground leading-tight">{ride.deliveryAddress}</p>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => { setTaking(true); setTimeout(() => setTaken(true), 800) }}
            disabled={taking}
            className="flex-1 py-3.5 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-sm rounded-xl transition-colors disabled:opacity-70"
          >
            {taking ? '⏳ Přijímám…' : '✋ Vzít zákazku'}
          </button>
          <button className="px-4 py-3.5 bg-muted border border-border text-muted-foreground text-sm font-semibold rounded-xl hover:bg-muted/80 transition-colors">
            ✕
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Compact history row ───────────────────────────────────────────────────────

function HistoryRow({ ride }: { ride: typeof HISTORY_RIDES[0] }) {
  return (
    <div className="flex items-center gap-3 py-3 px-1 border-b border-border/50 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-green-900/40 border border-green-700/30 flex items-center justify-center flex-shrink-0">
        <span className="text-green-400 text-sm">✓</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-xs font-bold text-foreground">#{ride.number}</span>
          <span className="text-xs text-muted-foreground">·</span>
          <span className="text-xs text-muted-foreground">{ride.time}</span>
        </div>
        <p className="text-xs text-muted-foreground truncate">{ride.from} → {ride.to}</p>
      </div>
      <span className="text-sm font-bold text-foreground flex-shrink-0">{ride.price}</span>
    </div>
  )
}

// ─── Phone frame wrapper ───────────────────────────────────────────────────────

function PhoneFrame({ title, children, accent = 'from-primary' }: { title: string; children: React.ReactNode; accent?: string }) {
  return (
    <div className="flex flex-col items-center">
      <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-4">{title}</p>
      <div className="relative w-[375px] rounded-[40px] border-4 border-zinc-700 bg-zinc-900 shadow-2xl overflow-hidden">
        {/* Status bar */}
        <div className="flex items-center justify-between px-6 py-2 bg-zinc-900">
          <span className="text-[11px] text-white/80 font-medium">9:41</span>
          <div className="w-24 h-5 bg-zinc-800 rounded-full mx-auto" />
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-white/80">●●●</span>
          </div>
        </div>
        {/* App header */}
        <div className={`bg-gradient-to-r ${accent} to-card/80 px-4 py-3 flex items-center justify-between border-b border-white/10`}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 10V7" />
              </svg>
            </div>
            <div>
              <p className="text-white font-black text-xs leading-none">Kuryr4You</p>
              <p className="text-white/60 text-[10px] mt-0.5">Tomáš Procházka</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-white/10 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs">💬</span>
            </div>
            <div className="w-7 h-7 bg-white/10 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs">🔔</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-background overflow-y-auto" style={{ maxHeight: '640px' }}>
          {children}
        </div>

        {/* Bottom nav */}
        <div className="bg-card border-t border-border flex">
          {[
            { icon: '🏠', label: 'Přehled', active: false },
            { icon: '📋', label: 'Zákazky', active: true },
            { icon: '📍', label: 'GPS', active: false },
            { icon: '👤', label: 'Profil', active: false },
          ].map(tab => (
            <div key={tab.label} className={`flex-1 flex flex-col items-center py-2 gap-0.5 ${tab.active ? 'text-primary' : 'text-muted-foreground'}`}>
              <span className="text-lg leading-none">{tab.icon}</span>
              <span className={`text-[10px] font-bold uppercase tracking-wide ${tab.active ? 'text-primary' : 'text-muted-foreground'}`}>{tab.label}</span>
              {tab.active && <div className="w-6 h-0.5 bg-primary rounded-full mt-0.5" />}
            </div>
          ))}
        </div>

        {/* Home indicator */}
        <div className="flex justify-center pb-2 pt-1 bg-card">
          <div className="w-24 h-1 bg-zinc-600 rounded-full" />
        </div>
      </div>
    </div>
  )
}

// ─── Main mockup page ──────────────────────────────────────────────────────────

export default function MobileDesignMockup() {
  return (
    <div className="min-h-screen bg-background">
      {/* Top banner */}
      <div className="border-b border-border bg-card px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-0.5">Mockup</p>
            <h1 className="font-heading font-black text-xl text-foreground">Návrh mobilního redesignu pro řidiče</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Ukázkové verze nového designu. Kliknutí je funkční. Data jsou fiktivní.</p>
          </div>
          <Link
            to="/ridic/zakazky"
            className="px-4 py-2 bg-muted border border-border text-sm font-semibold text-muted-foreground rounded-xl hover:bg-muted/80 transition-colors"
          >
            ← Zpět na živou verzi
          </Link>
        </div>
      </div>

      {/* Comparison grid */}
      <div className="max-w-5xl mx-auto px-6 py-10">

        {/* Section A */}
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-2">
            <span className="w-8 h-8 rounded-full bg-primary flex items-center justify-center font-black text-primary-foreground text-sm flex-shrink-0">A</span>
            <h2 className="font-heading font-black text-lg text-foreground">Aktivní zákazka + Dokončení</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-8 ml-11">Řidič je v přepravě (status: transit). Velká karta s jasnou hierarchií, výrazné tlačítko pro dokončení, navigační panel.</p>

          <div className="flex flex-wrap gap-10 justify-center">
            {/* Transit view */}
            <PhoneFrame title="Jedu doručit" accent="from-orange-900/80">
              <div className="p-4 space-y-4">
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground px-1">🔥 Aktivní zákazka</p>
                <ActiveRideCard ride={ACTIVE_RIDE} showPOD={true} />
                <div className="space-y-1">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground px-1 mb-2">📅 Dnes dokončeno</p>
                  {HISTORY_RIDES.map(r => <HistoryRow key={r.id} ride={r} />)}
                </div>
              </div>
            </PhoneFrame>

            {/* Pickup view */}
            <PhoneFrame title="Jedu vyzvednout" accent="from-amber-900/80">
              <div className="p-4 space-y-4">
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground px-1">🔥 Aktivní zákazka</p>
                <ActiveRideCard ride={{ ...ACTIVE_RIDE, status: 'pickup' as 'transit' }} showPOD={false} />
              </div>
            </PhoneFrame>
          </div>
        </div>

        {/* Section B */}
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-2">
            <span className="w-8 h-8 rounded-full bg-primary flex items-center justify-center font-black text-primary-foreground text-sm flex-shrink-0">B</span>
            <h2 className="font-heading font-black text-lg text-foreground">Navigace → Google Maps / Waze / Apple Maps</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-8 ml-11">Klikněte na „Navigovat" — rozbalí se 3 velká tlačítka s přímými odkazy do navigačních aplikací.</p>

          <div className="flex flex-wrap gap-10 justify-center">
            <PhoneFrame title="Navigace rozbalená" accent="from-blue-900/60">
              <div className="p-4 space-y-4">
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground px-1">🔥 Aktivní zákazka</p>
                {/* Show with nav pre-opened */}
                <NavOpenPreview />
              </div>
            </PhoneFrame>

            {/* Incoming ride */}
            <PhoneFrame title="Volná zákazka k převzetí" accent="from-purple-900/60">
              <div className="p-4 space-y-4">
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground px-1">📢 Nová volná zákazka</p>
                <IncomingRideCard ride={INCOMING_RIDE} />
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground px-1 mt-2">📋 Moje zákazky</p>
                <div className="rounded-2xl border border-border bg-card p-4 text-center">
                  <p className="text-muted-foreground text-sm">Zatím žádné přiřazené zákazky dnes</p>
                </div>
              </div>
            </PhoneFrame>
          </div>
        </div>

        {/* CTA */}
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 text-center">
          <h3 className="font-heading font-black text-lg text-foreground mb-2">Líbí se vám tento design?</h3>
          <p className="text-sm text-muted-foreground mb-5">Mohu nasadit tento redesign do živé aplikace. Nebo upravit cokoliv před nasazením.</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              to="/ridic/zakazky"
              className="px-6 py-3 bg-muted border border-border text-sm font-bold text-foreground rounded-xl hover:bg-muted/80 transition-colors"
            >
              Ještě ne — prohlédnu si živou verzi
            </Link>
          </div>
          <p className="text-xs text-muted-foreground mt-4">Řekněte mi co chcete změnit a nasadím to do minuty.</p>
        </div>
      </div>
    </div>
  )
}

// ─── Nav open preview (static, pre-opened nav) ────────────────────────────────

function NavOpenPreview() {
  const ride = ACTIVE_RIDE
  const navAddress = ride.deliveryAddress

  return (
    <div className="rounded-2xl overflow-hidden border border-primary/30 shadow-lg shadow-primary/10">
      <div className="h-1 w-full bg-gradient-to-r from-primary via-primary/80 to-primary/40" />
      <div className="bg-card p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="font-heading font-black text-base text-foreground">#{ride.number}</span>
            <StatusPill status={ride.status} />
          </div>
          <span className="text-sm font-bold text-primary">{ride.price}</span>
        </div>

        {/* Compressed route */}
        <div className="flex gap-2 items-center mb-4 px-1">
          <div className="flex flex-col items-center gap-0.5">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500 opacity-40" />
            <div className="w-0.5 h-3 bg-border" />
            <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-muted-foreground truncate">{ride.pickupAddress}</p>
            <p className="text-xs font-semibold text-foreground truncate">{ride.deliveryAddress}</p>
          </div>
        </div>

        {/* Nav - pre-opened */}
        <div className="mb-3">
          <div className="w-full flex items-center justify-between px-4 py-3 bg-primary/20 border border-primary/35 text-primary font-bold text-sm rounded-xl mb-2">
            <span>🧭 Navigovat na doručení</span>
            <span className="text-xs">▲</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(navAddress)}`}
              target="_blank" rel="noopener noreferrer"
              className="flex flex-col items-center gap-1.5 py-3 bg-blue-600/20 border border-blue-600/30 text-blue-400 text-xs font-bold rounded-xl hover:bg-blue-600/30 transition-colors"
            >
              <span className="text-xl">🗺️</span>
              <span>Google Maps</span>
            </a>
            <a
              href={`https://waze.com/ul?q=${encodeURIComponent(navAddress)}&navigate=yes`}
              target="_blank" rel="noopener noreferrer"
              className="flex flex-col items-center gap-1.5 py-3 bg-cyan-600/20 border border-cyan-600/30 text-cyan-400 text-xs font-bold rounded-xl hover:bg-cyan-600/30 transition-colors"
            >
              <span className="text-xl">🔵</span>
              <span>Waze</span>
            </a>
            <a
              href={`https://maps.apple.com/?daddr=${encodeURIComponent(navAddress)}`}
              target="_blank" rel="noopener noreferrer"
              className="flex flex-col items-center gap-1.5 py-3 bg-gray-600/20 border border-gray-600/30 text-gray-400 text-xs font-bold rounded-xl hover:bg-gray-600/30 transition-colors"
            >
              <span className="text-xl">🍎</span>
              <span>Apple Maps</span>
            </a>
          </div>
        </div>

        {/* Action */}
        <button className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-black text-sm rounded-2xl transition-colors flex items-center justify-center gap-2">
          ✅ Dokončit — zadat doklad o doručení
        </button>
      </div>
    </div>
  )
}
