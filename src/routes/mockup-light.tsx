import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/mockup-light')({
  component: LightThemeMockup,
})

// Light theme CSS variable overrides injected at wrapper level
const LIGHT_VARS = {
  '--background': '220 16% 96%',
  '--foreground': '222 30% 10%',
  '--card': '0 0% 100%',
  '--card-foreground': '222 30% 10%',
  '--popover': '0 0% 100%',
  '--popover-foreground': '222 30% 10%',
  '--primary': '38 90% 40%',
  '--primary-foreground': '0 0% 100%',
  '--secondary': '220 14% 88%',
  '--secondary-foreground': '222 25% 25%',
  '--muted': '220 12% 91%',
  '--muted-foreground': '222 15% 42%',
  '--accent': '38 90% 40%',
  '--accent-foreground': '0 0% 100%',
  '--destructive': '0 72% 48%',
  '--destructive-foreground': '0 0% 98%',
  '--border': '220 14% 80%',
  '--input': '0 0% 97%',
  '--ring': '38 90% 40%',
  '--success': '142 60% 36%',
  '--success-foreground': '0 0% 98%',
  '--warning': '38 90% 40%',
  '--info': '199 80% 40%',
  '--sidebar-background': '222 28% 14%',
  '--sidebar-foreground': '210 15% 75%',
  '--sidebar-primary': '38 90% 40%',
  '--sidebar-primary-foreground': '0 0% 100%',
  '--sidebar-accent': '222 20% 20%',
  '--sidebar-accent-foreground': '210 20% 90%',
  '--sidebar-border': '222 20% 20%',
  '--sidebar-ring': '38 90% 40%',
} as React.CSSProperties

import React from 'react'

const navItems = [
  { icon: '📦', label: 'Zakázky', active: true },
  { icon: '🗺️', label: 'Mapa' },
  { icon: '👥', label: 'Uživatelé' },
  { icon: '📅', label: 'Kalendář' },
  { icon: '📊', label: 'Analytika' },
  { icon: '🧾', label: 'Fakturace' },
  { icon: '⚙️', label: 'Nastavení' },
]

const rides = [
  { id: 'K-2481', from: 'Náměstí Míru 14', to: 'Holešovice, U Průhonu 6', driver: 'Jan Kovář', status: 'transit', price: '340 Kč', time: '14:30' },
  { id: 'K-2482', from: 'Wenceslas Square 1', to: 'Dejvice, Evropská 33', driver: 'Marie Nováková', status: 'pickup', price: '280 Kč', time: '14:45' },
  { id: 'K-2483', from: 'Vinohrady, Mánesova 5', to: 'Letňany, Tupolevova 12', driver: '—', status: 'approved', price: '520 Kč', time: '15:00' },
  { id: 'K-2484', from: 'Smíchov, Plzeňská 3', to: 'Žižkov, Seifertova 9', driver: 'Pavel Šimánek', status: 'delivered', price: '190 Kč', time: '13:10' },
  { id: 'K-2485', from: 'Nusle, Bělehradská 20', to: 'Nové Město, Spalená 14', driver: '—', status: 'pending', price: 'Dle dohody', time: '15:20' },
]

const statusLabel: Record<string, string> = {
  pending: 'Čeká', approved: 'Schváleno', transit: 'Na cestě', pickup: 'Vyzvednutí', delivered: 'Doručeno', cancelled: 'Zrušeno',
}
const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 border border-amber-300',
  approved: 'bg-sky-100 text-sky-700 border border-sky-300',
  transit: 'bg-violet-100 text-violet-700 border border-violet-300',
  pickup: 'bg-orange-100 text-orange-700 border border-orange-300',
  delivered: 'bg-green-100 text-green-700 border border-green-300',
  cancelled: 'bg-red-100 text-red-600 border border-red-200',
}

function LightThemeMockup() {
  return (
    <div style={{ fontFamily: "'Nunito Sans', system-ui, sans-serif" }}>
      {/* Top comparison bar */}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-3 bg-gray-900 text-white text-sm border-b border-gray-700">
        <div className="flex items-center gap-3">
          <span className="text-amber-400 font-bold">🎨 Mockup — světlé téma</span>
          <span className="text-gray-400">|</span>
          <span className="text-gray-300">Pouze náhled, nic není implementováno</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/mockup" className="px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-xs transition-colors">
            ← Zpět na tmavý mockup
          </Link>
          <Link to="/" className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs transition-colors">
            Domovská stránka
          </Link>
        </div>
      </div>

      <div className="pt-12">
        {/* Light theme wrapper */}
        <div style={LIGHT_VARS as React.CSSProperties}>
          <div style={{ background: 'hsl(220 16% 96%)', minHeight: '100vh', color: 'hsl(222 30% 10%)' }}>

            {/* ═══════════════════════════════════════════════════ */}
            {/* SECTION 1: Dispatcher view */}
            {/* ═══════════════════════════════════════════════════ */}
            <div className="px-6 py-5 border-b" style={{ borderColor: 'hsl(220 14% 80%)', background: 'hsl(0 0% 100%)' }}>
              <h2 className="font-bold text-lg" style={{ fontFamily: "'Exo 2', system-ui" }}>
                Pohled dispečera — přehled zakázek
              </h2>
              <p className="text-sm mt-0.5" style={{ color: 'hsl(222 15% 42%)' }}>Ukázka světlého motivu s reálnými daty</p>
            </div>

            <div className="flex" style={{ minHeight: 'calc(100vh - 48px)' }}>

              {/* ── Sidebar (intentionally stays dark for contrast) ── */}
              <div className="flex flex-col w-56 shrink-0 border-r" style={{ background: 'hsl(222 28% 14%)', borderColor: 'hsl(222 20% 20%)' }}>
                {/* Logo */}
                <div className="px-5 py-5 border-b" style={{ borderColor: 'hsl(222 20% 20%)' }}>
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm" style={{ background: 'hsl(38 90% 40%)', color: 'white' }}>K</div>
                    <div>
                      <div className="text-sm font-bold text-white" style={{ fontFamily: "'Exo 2', system-ui" }}>Kuryr4You</div>
                      <div className="text-xs" style={{ color: 'hsl(210 15% 55%)' }}>Dispečink</div>
                    </div>
                  </div>
                </div>
                {/* Nav items */}
                <nav className="flex-1 p-2 space-y-0.5">
                  {navItems.map(item => (
                    <div key={item.label}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm cursor-pointer transition-all"
                      style={item.active ? {
                        background: 'hsl(38 90% 40% / 0.2)',
                        color: 'hsl(38 90% 55%)',
                        fontWeight: 600,
                      } : {
                        color: 'hsl(210 15% 65%)',
                      }}
                    >
                      <span>{item.icon}</span>
                      <span>{item.label}</span>
                    </div>
                  ))}
                </nav>
                {/* User */}
                <div className="p-3 border-t" style={{ borderColor: 'hsl(222 20% 20%)' }}>
                  <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg" style={{ background: 'hsl(222 20% 20%)' }}>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'hsl(38 90% 40%)', color: 'white' }}>P</div>
                    <div>
                      <div className="text-xs font-semibold text-white">Petr G.</div>
                      <div className="text-[10px]" style={{ color: 'hsl(210 15% 50%)' }}>Dispečer</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Main content ── */}
              <div className="flex-1 overflow-hidden">

                {/* Top bar */}
                <div className="flex items-center justify-between px-6 py-4 border-b" style={{ background: 'hsl(0 0% 100%)', borderColor: 'hsl(220 14% 82%)' }}>
                  <div>
                    <h1 className="text-xl font-bold" style={{ fontFamily: "'Exo 2', system-ui", color: 'hsl(222 30% 10%)' }}>Zakázky</h1>
                    <p className="text-sm" style={{ color: 'hsl(222 15% 42%)' }}>Pátek, 13. června 2026 · 24 aktivních</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors" style={{ background: 'hsl(220 14% 88%)', color: 'hsl(222 25% 25%)' }}>
                      Filtr
                    </button>
                    <button className="px-4 py-2 rounded-lg text-sm font-bold transition-colors" style={{ background: 'hsl(38 90% 40%)', color: 'white' }}>
                      + Nová zakázka
                    </button>
                  </div>
                </div>

                {/* Stats bar */}
                <div className="grid grid-cols-4 gap-4 p-6 pb-4">
                  {[
                    { label: 'Čekají na přiřazení', value: '3', color: 'hsl(38 90% 40%)', bg: 'hsl(38 90% 40% / 0.08)' },
                    { label: 'Na cestě', value: '8', color: 'hsl(199 80% 40%)', bg: 'hsl(199 80% 40% / 0.08)' },
                    { label: 'Doručeno dnes', value: '13', color: 'hsl(142 60% 36%)', bg: 'hsl(142 60% 36% / 0.08)' },
                    { label: 'Příjem dnes', value: '4 820 Kč', color: 'hsl(222 30% 10%)', bg: 'hsl(0 0% 100%)' },
                  ].map(stat => (
                    <div key={stat.label} className="rounded-xl p-4 border" style={{ background: stat.bg, borderColor: 'hsl(220 14% 82%)' }}>
                      <p className="text-xs font-medium mb-1" style={{ color: 'hsl(222 15% 42%)' }}>{stat.label}</p>
                      <p className="text-2xl font-black" style={{ fontFamily: "'Exo 2', system-ui", color: stat.color }}>{stat.value}</p>
                    </div>
                  ))}
                </div>

                {/* Rides table */}
                <div className="px-6 pb-6">
                  <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'hsl(220 14% 82%)', background: 'hsl(0 0% 100%)' }}>
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ borderBottom: '1px solid hsl(220 14% 88%)' }}>
                          {['Č. zakázky', 'Trasa', 'Řidič', 'Stav', 'Cena', 'Čas'].map(h => (
                            <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'hsl(222 15% 42%)' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rides.map((ride, i) => (
                          <tr key={ride.id}
                            className="transition-colors cursor-pointer"
                            style={{
                              borderBottom: i < rides.length - 1 ? '1px solid hsl(220 14% 92%)' : 'none',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'hsl(220 14% 97%)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                          >
                            <td className="px-4 py-3">
                              <span className="font-mono font-bold text-xs" style={{ color: 'hsl(38 90% 40%)' }}>{ride.id}</span>
                            </td>
                            <td className="px-4 py-3 max-w-[200px]">
                              <div className="text-xs font-medium truncate" style={{ color: 'hsl(222 30% 10%)' }}>📍 {ride.from}</div>
                              <div className="text-xs truncate mt-0.5" style={{ color: 'hsl(222 15% 42%)' }}>→ {ride.to}</div>
                            </td>
                            <td className="px-4 py-3">
                              {ride.driver === '—'
                                ? <span className="text-xs italic" style={{ color: 'hsl(222 15% 55%)' }}>Nepřiřazen</span>
                                : <span className="text-xs font-medium" style={{ color: 'hsl(222 30% 10%)' }}>{ride.driver}</span>
                              }
                            </td>
                            <td className="px-4 py-3">
                              <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${statusColors[ride.status]}`}>
                                {statusLabel[ride.status]}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-xs font-semibold" style={{ color: 'hsl(222 30% 10%)' }}>{ride.price}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-xs" style={{ color: 'hsl(222 15% 42%)' }}>{ride.time}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            </div>

            {/* ═══════════════════════════════════════════════════ */}
            {/* SECTION 2: Form / New order */}
            {/* ═══════════════════════════════════════════════════ */}
            <div className="border-t" style={{ borderColor: 'hsl(220 14% 80%)', background: 'hsl(220 16% 96%)' }}>
              <div className="px-6 py-5 border-b" style={{ borderColor: 'hsl(220 14% 80%)', background: 'hsl(0 0% 100%)' }}>
                <h2 className="font-bold text-lg" style={{ fontFamily: "'Exo 2', system-ui" }}>Formulář nové zakázky</h2>
                <p className="text-sm mt-0.5" style={{ color: 'hsl(222 15% 42%)' }}>Ukázka vstupních polí a tlačítek</p>
              </div>
              <div className="p-6 max-w-3xl">
                <div className="rounded-xl border p-6 space-y-5" style={{ background: 'hsl(0 0% 100%)', borderColor: 'hsl(220 14% 82%)' }}>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'hsl(222 15% 42%)' }}>Adresa vyzvednutí</label>
                      <input readOnly value="Náměstí Míru 14, Praha 2" className="w-full px-3 py-2.5 rounded-lg text-sm border outline-none" style={{ background: 'hsl(0 0% 97%)', borderColor: 'hsl(220 14% 80%)', color: 'hsl(222 30% 10%)' }} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'hsl(222 15% 42%)' }}>Adresa doručení</label>
                      <input readOnly value="Holešovice, U Průhonu 6" className="w-full px-3 py-2.5 rounded-lg text-sm border outline-none" style={{ background: 'hsl(0 0% 97%)', borderColor: 'hsl(220 14% 80%)', color: 'hsl(222 30% 10%)' }} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'hsl(222 15% 42%)' }}>Typ zásilky</label>
                      <select className="w-full px-3 py-2.5 rounded-lg text-sm border outline-none appearance-none" style={{ background: 'hsl(0 0% 97%)', borderColor: 'hsl(220 14% 80%)', color: 'hsl(222 30% 10%)' }}>
                        <option>Malý balík</option>
                        <option>Obálka</option>
                        <option>Krabice</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'hsl(222 15% 42%)' }}>Hmotnost (kg)</label>
                      <input readOnly value="2.5" className="w-full px-3 py-2.5 rounded-lg text-sm border outline-none" style={{ background: 'hsl(0 0% 97%)', borderColor: 'hsl(220 14% 80%)', color: 'hsl(222 30% 10%)' }} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'hsl(222 15% 42%)' }}>Poznámka</label>
                    <textarea readOnly value="Křehké zboží, prosím opatrně. Kontakt na příjemce: 777 123 456." rows={2} className="w-full px-3 py-2.5 rounded-lg text-sm border outline-none resize-none" style={{ background: 'hsl(0 0% 97%)', borderColor: 'hsl(220 14% 80%)', color: 'hsl(222 30% 10%)' }} />
                  </div>
                  {/* AI pricing result */}
                  <div className="rounded-xl p-4 border" style={{ background: 'hsl(38 90% 40% / 0.05)', borderColor: 'hsl(38 90% 40% / 0.25)' }}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium mb-0.5" style={{ color: 'hsl(222 15% 42%)' }}>Orientační cena</p>
                        <p className="text-3xl font-black" style={{ fontFamily: "'Exo 2', system-ui", color: 'hsl(38 90% 40%)' }}>340 Kč</p>
                      </div>
                      <div className="text-right text-xs space-y-1" style={{ color: 'hsl(222 15% 42%)' }}>
                        <div>🚗 Osobní auto</div>
                        <div>📍 ~6–9 km</div>
                        <div>⚡ Same-day</div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button className="flex-1 py-2.5 rounded-lg text-sm font-semibold border transition-colors" style={{ background: 'transparent', borderColor: 'hsl(220 14% 80%)', color: 'hsl(222 25% 30%)' }}>
                      Zrušit
                    </button>
                    <button className="flex-1 py-2.5 rounded-lg text-sm font-bold transition-colors" style={{ background: 'hsl(38 90% 40%)', color: 'white' }}>
                      Vytvořit zakázku
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════ */}
            {/* SECTION 3: Driver view */}
            {/* ═══════════════════════════════════════════════════ */}
            <div className="border-t" style={{ borderColor: 'hsl(220 14% 80%)', background: 'hsl(220 16% 96%)' }}>
              <div className="px-6 py-5 border-b" style={{ borderColor: 'hsl(220 14% 80%)', background: 'hsl(0 0% 100%)' }}>
                <h2 className="font-bold text-lg" style={{ fontFamily: "'Exo 2', system-ui" }}>Pohled řidiče — mobilní zobrazení</h2>
                <p className="text-sm mt-0.5" style={{ color: 'hsl(222 15% 42%)' }}>Jak vidí zakázky řidič na telefonu</p>
              </div>
              <div className="p-6 flex justify-center">
                {/* Phone frame */}
                <div className="w-80 rounded-3xl border-4 overflow-hidden shadow-2xl" style={{ borderColor: 'hsl(222 25% 22%)', background: 'hsl(0 0% 100%)' }}>
                  {/* Phone status bar */}
                  <div className="flex items-center justify-between px-5 py-2 text-[10px] font-medium" style={{ background: 'hsl(222 28% 14%)', color: 'hsl(210 15% 70%)' }}>
                    <span>14:42</span>
                    <div className="flex items-center gap-1">
                      <span>●●●</span>
                      <span>WiFi</span>
                      <span>🔋</span>
                    </div>
                  </div>
                  {/* App header */}
                  <div className="px-4 py-3 flex items-center justify-between border-b" style={{ background: 'hsl(222 28% 14%)', borderColor: 'hsl(222 20% 22%)' }}>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold" style={{ background: 'hsl(38 90% 40%)', color: 'white' }}>K</div>
                      <span className="text-sm font-bold text-white" style={{ fontFamily: "'Exo 2', system-ui" }}>Moje zakázky</span>
                    </div>
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'hsl(38 90% 40%)', color: 'white' }}>J</div>
                  </div>
                  {/* Active ride card */}
                  <div className="p-3" style={{ background: 'hsl(220 16% 96%)' }}>
                    <p className="text-[10px] font-semibold uppercase tracking-wide mb-2 px-1" style={{ color: 'hsl(222 15% 42%)' }}>Aktivní zakázka</p>
                    <div className="rounded-xl p-3.5 border shadow-sm" style={{ background: 'hsl(0 0% 100%)', borderColor: 'hsl(220 14% 82%)' }}>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold" style={{ color: 'hsl(38 90% 40%)' }}>K-2481</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-violet-100 text-violet-700 border border-violet-300">Na cestě</span>
                      </div>
                      <div className="space-y-2 mb-3">
                        <div className="flex items-start gap-2">
                          <div className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold mt-0.5 shrink-0" style={{ background: 'hsl(38 90% 40%)', color: 'white' }}>Z</div>
                          <span className="text-[11px] font-medium" style={{ color: 'hsl(222 30% 10%)' }}>Náměstí Míru 14, Praha 2</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <div className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold mt-0.5 shrink-0 bg-green-500 text-white">D</div>
                          <span className="text-[11px] font-medium" style={{ color: 'hsl(222 30% 10%)' }}>Holešovice, U Průhonu 6</span>
                        </div>
                      </div>
                      <button className="w-full py-2 rounded-lg text-xs font-bold" style={{ background: 'hsl(38 90% 40%)', color: 'white' }}>
                        🧭 Navigovat
                      </button>
                    </div>
                    {/* Next ride */}
                    <p className="text-[10px] font-semibold uppercase tracking-wide mb-2 mt-3 px-1" style={{ color: 'hsl(222 15% 42%)' }}>Další zakázka</p>
                    <div className="rounded-xl p-3.5 border" style={{ background: 'hsl(0 0% 100%)', borderColor: 'hsl(220 14% 82%)', opacity: 0.7 }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold" style={{ color: 'hsl(38 90% 40%)' }}>K-2482</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-orange-100 text-orange-700 border border-orange-300">Vyzvednutí</span>
                      </div>
                      <div className="text-[10px]" style={{ color: 'hsl(222 15% 42%)' }}>Wenceslas Square 1 → Dejvice, Evropská 33</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════ */}
            {/* SECTION 4: Dark vs Light comparison */}
            {/* ═══════════════════════════════════════════════════ */}
            <div className="border-t" style={{ borderColor: 'hsl(220 14% 80%)' }}>
              <div className="px-6 py-5 border-b" style={{ borderColor: 'hsl(220 14% 80%)', background: 'hsl(0 0% 100%)' }}>
                <h2 className="font-bold text-lg" style={{ fontFamily: "'Exo 2', system-ui" }}>Komponenty — světlé vs. tmavé</h2>
                <p className="text-sm mt-0.5" style={{ color: 'hsl(222 15% 42%)' }}>Přímé porovnání stejných prvků</p>
              </div>
              <div className="p-6 grid md:grid-cols-2 gap-6">

                {/* Light card */}
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide mb-3 flex items-center gap-2" style={{ color: 'hsl(222 15% 42%)' }}>
                    <span className="w-3 h-3 rounded-full bg-white border-2" style={{ borderColor: 'hsl(220 14% 60%)' }}></span>
                    Světlé téma
                  </p>
                  <div className="rounded-xl border p-5 space-y-4" style={{ background: 'hsl(0 0% 100%)', borderColor: 'hsl(220 14% 82%)' }}>
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold" style={{ fontFamily: "'Exo 2', system-ui", color: 'hsl(222 30% 10%)' }}>Zakázka K-2483</h3>
                      <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-sky-100 text-sky-700 border border-sky-300">Schváleno</span>
                    </div>
                    <div className="space-y-1.5 text-sm" style={{ color: 'hsl(222 30% 10%)' }}>
                      <div className="flex gap-2"><span style={{ color: 'hsl(222 15% 42%)' }}>Z:</span><span>Vinohrady, Mánesova 5</span></div>
                      <div className="flex gap-2"><span style={{ color: 'hsl(222 15% 42%)' }}>Do:</span><span>Letňany, Tupolevova 12</span></div>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: 'hsl(220 14% 88%)' }}>
                      <span className="text-xs" style={{ color: 'hsl(222 15% 42%)' }}>Cena: <strong style={{ color: 'hsl(38 90% 40%)' }}>520 Kč</strong></span>
                      <button className="px-3 py-1.5 text-xs font-semibold rounded-lg" style={{ background: 'hsl(38 90% 40%)', color: 'white' }}>Přiřadit řidiče</button>
                    </div>
                  </div>
                </div>

                {/* Dark card (original) */}
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide mb-3 flex items-center gap-2" style={{ color: 'hsl(222 15% 42%)' }}>
                    <span className="w-3 h-3 rounded-full" style={{ background: 'hsl(222 20% 12%)', border: '2px solid hsl(222 15% 30%)' }}></span>
                    Tmavé téma (stávající)
                  </p>
                  <div className="rounded-xl border p-5 space-y-4" style={{ background: 'hsl(222 18% 11%)', borderColor: 'hsl(222 15% 18%)' }}>
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold" style={{ fontFamily: "'Exo 2', system-ui", color: 'hsl(210 20% 92%)' }}>Zakázka K-2483</h3>
                      <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold" style={{ background: 'hsl(199 89% 48% / 0.15)', color: 'hsl(199 89% 65%)', border: '1px solid hsl(199 89% 48% / 0.3)' }}>Schváleno</span>
                    </div>
                    <div className="space-y-1.5 text-sm" style={{ color: 'hsl(210 20% 92%)' }}>
                      <div className="flex gap-2"><span style={{ color: 'hsl(210 12% 55%)' }}>Z:</span><span>Vinohrady, Mánesova 5</span></div>
                      <div className="flex gap-2"><span style={{ color: 'hsl(210 12% 55%)' }}>Do:</span><span>Letňany, Tupolevova 12</span></div>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: 'hsl(222 15% 18%)' }}>
                      <span className="text-xs" style={{ color: 'hsl(210 12% 55%)' }}>Cena: <strong style={{ color: 'hsl(38 92% 50%)' }}>520 Kč</strong></span>
                      <button className="px-3 py-1.5 text-xs font-semibold rounded-lg" style={{ background: 'hsl(38 92% 50%)', color: 'hsl(222 20% 8%)' }}>Přiřadit řidiče</button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Badges comparison */}
              <div className="px-6 pb-6">
                <div className="rounded-xl border p-5" style={{ background: 'hsl(0 0% 100%)', borderColor: 'hsl(220 14% 82%)' }}>
                  <p className="text-xs font-bold uppercase tracking-wide mb-4" style={{ color: 'hsl(222 15% 42%)' }}>Stavové štítky — světlá varianta</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(statusLabel).map(([key, label]) => (
                      <span key={key} className={`text-xs px-3 py-1.5 rounded-full font-semibold ${statusColors[key]}`}>{label}</span>
                    ))}
                  </div>
                  <p className="text-xs font-bold uppercase tracking-wide mb-4 mt-5" style={{ color: 'hsl(222 15% 42%)' }}>Tlačítka</p>
                  <div className="flex flex-wrap gap-3">
                    <button className="px-4 py-2 rounded-lg text-sm font-bold" style={{ background: 'hsl(38 90% 40%)', color: 'white' }}>Primární akce</button>
                    <button className="px-4 py-2 rounded-lg text-sm font-semibold border" style={{ background: 'transparent', borderColor: 'hsl(220 14% 80%)', color: 'hsl(222 25% 30%)' }}>Sekundární</button>
                    <button className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: 'hsl(142 60% 36%)', color: 'white' }}>Potvrdit</button>
                    <button className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: 'hsl(0 72% 48%)', color: 'white' }}>Zrušit</button>
                    <button className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: 'hsl(220 14% 88%)', color: 'hsl(222 25% 25%)' }}>Neutrální</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom CTA */}
            <div className="border-t p-8 text-center" style={{ borderColor: 'hsl(220 14% 80%)', background: 'hsl(0 0% 100%)' }}>
              <p className="text-lg font-bold mb-2" style={{ fontFamily: "'Exo 2', system-ui", color: 'hsl(222 30% 10%)' }}>Líbí se vám světlé téma?</p>
              <p className="text-sm mb-5" style={{ color: 'hsl(222 15% 42%)' }}>Dejte nám vědět a implementujeme přepínač témat pro celou platformu.</p>
              <div className="flex items-center justify-center gap-3">
                <Link to="/" className="px-5 py-2.5 rounded-lg text-sm font-semibold border transition-colors" style={{ borderColor: 'hsl(220 14% 80%)', color: 'hsl(222 25% 30%)' }}>
                  ← Zpět na tmavou verzi
                </Link>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}

