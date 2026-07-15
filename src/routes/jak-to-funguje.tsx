import { createFileRoute, Link } from '@tanstack/react-router'
import siteMetadata from '@/metadata.json'

export const Route = createFileRoute('/jak-to-funguje')({
  head: () => {
    const meta = siteMetadata['/jak-to-funguje']
    return {
      meta: [
        { title: meta?.title ?? 'Jak to funguje – Kurýr4You' },
        { name: 'description', content: meta?.description ?? 'Kompletní průvodce platformou Kurýr4You. Registrace, objednání kurýra, platba, fakturace a sledování zásilky krok za krokem.' },
      ],
    }
  },
  component: JakToFungujePage,
})

// ─── Shared mockup frame ────────────────────────────────────────────────────

function BrowserFrame({ children, url = 'kuryr4you.cz' }: { children: React.ReactNode; url?: string }) {
  return (
    <div className="rounded-xl overflow-hidden border border-white/10 shadow-2xl" style={{ background: 'hsl(222 22% 6%)' }}>
      {/* Browser chrome */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/8" style={{ background: 'hsl(222 20% 10%)' }}>
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500/70" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
          <div className="w-3 h-3 rounded-full bg-green-500/70" />
        </div>
        <div className="flex-1 mx-3 px-3 py-1 rounded-md text-xs text-muted-foreground truncate" style={{ background: 'hsl(222 20% 14%)' }}>
          🔒 {url}
        </div>
      </div>
      <div className="p-0">{children}</div>
    </div>
  )
}

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto w-64">
      <div className="rounded-[2rem] overflow-hidden border-4 shadow-2xl" style={{ borderColor: 'hsl(222 15% 20%)', background: 'hsl(222 22% 6%)' }}>
        {/* Notch */}
        <div className="flex justify-center pt-3 pb-1" style={{ background: 'hsl(222 20% 10%)' }}>
          <div className="w-20 h-5 rounded-full" style={{ background: 'hsl(222 22% 6%)' }} />
        </div>
        <div>{children}</div>
        {/* Home bar */}
        <div className="flex justify-center py-3" style={{ background: 'hsl(222 22% 6%)' }}>
          <div className="w-16 h-1 rounded-full bg-white/20" />
        </div>
      </div>
    </div>
  )
}

// ─── Section components ─────────────────────────────────────────────────────

function SectionHeader({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="flex flex-col sm:flex-row items-start gap-5 mb-10">
      <div className="flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center font-heading font-black text-2xl text-primary-foreground" style={{ background: 'hsl(38 92% 50%)' }}>
        {number}
      </div>
      <div>
        <h2 className="font-heading text-2xl sm:text-3xl font-black uppercase text-foreground mb-2">{title}</h2>
        <p className="text-muted-foreground leading-relaxed max-w-xl">{description}</p>
      </div>
    </div>
  )
}

function StepItem({ n, text }: { n: number; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0 w-6 h-6 rounded-full border border-primary/50 flex items-center justify-center text-xs font-bold text-primary mt-0.5">
        {n}
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>
    </div>
  )
}

// ─── Mockup: Registration ───────────────────────────────────────────────────

function MockupRegistrace() {
  return (
    <BrowserFrame url="kuryr4you.cz/registrace">
      <div className="p-6 space-y-4" style={{ background: 'hsl(222 20% 8%)' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'hsl(38 92% 50%)' }}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="hsl(222 20% 8%)" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1" />
            </svg>
          </div>
          <div>
            <div className="text-xs font-heading font-bold text-foreground">KURÝR4YOU</div>
            <div className="text-[10px] text-primary">Registrace zákazníka</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-[10px] text-muted-foreground mb-1">Jméno</div>
            <div className="h-7 rounded-md px-2 flex items-center text-[11px] text-foreground/70 border border-white/10" style={{ background: 'hsl(222 15% 13%)' }}>Jan Novák</div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground mb-1">Telefon</div>
            <div className="h-7 rounded-md px-2 flex items-center text-[11px] text-foreground/70 border border-white/10" style={{ background: 'hsl(222 15% 13%)' }}>+420 777...</div>
          </div>
        </div>

        <div>
          <div className="text-[10px] text-muted-foreground mb-1">E-mail</div>
          <div className="h-7 rounded-md px-2 flex items-center text-[11px] text-foreground/70 border border-primary/50" style={{ background: 'hsl(222 15% 13%)' }}>
            <span className="text-primary">jan.novak@firma.cz</span>
            <span className="ml-auto w-2 h-4 bg-primary/70 rounded-sm animate-pulse" />
          </div>
        </div>

        <div>
          <div className="text-[10px] text-muted-foreground mb-1">Heslo</div>
          <div className="h-7 rounded-md px-2 flex items-center text-[11px] border border-white/10" style={{ background: 'hsl(222 15% 13%)' }}>
            <span className="tracking-widest text-muted-foreground">••••••••</span>
          </div>
        </div>

        <div className="flex items-center gap-2 p-2 rounded-lg border border-primary/20" style={{ background: 'hsl(38 92% 50% / 0.08)' }}>
          <div className="w-4 h-4 rounded border-2 border-primary flex items-center justify-center flex-shrink-0">
            <svg className="w-2.5 h-2.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
          </div>
          <span className="text-[10px] text-muted-foreground">Souhlasím s obchodními podmínkami</span>
        </div>

        <button className="w-full h-8 rounded-lg text-xs font-heading font-bold text-primary-foreground" style={{ background: 'hsl(38 92% 50%)' }}>
          Vytvořit účet →
        </button>
      </div>
    </BrowserFrame>
  )
}

// ─── Mockup: Login ──────────────────────────────────────────────────────────

function MockupPrihlaseni() {
  return (
    <BrowserFrame url="kuryr4you.cz/prihlaseni">
      <div className="p-6 space-y-4" style={{ background: 'hsl(222 20% 8%)' }}>
        <div className="text-center mb-2">
          <div className="w-10 h-10 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ background: 'hsl(38 92% 50%)' }}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="hsl(222 20% 8%)" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div className="text-sm font-heading font-bold text-foreground">Přihlášení</div>
          <div className="text-[11px] text-muted-foreground">Zákaznický portál Kurýr4You</div>
        </div>

        <div>
          <div className="text-[10px] text-muted-foreground mb-1">E-mail</div>
          <div className="h-8 rounded-md px-3 flex items-center text-xs border border-white/10" style={{ background: 'hsl(222 15% 13%)' }}>
            <span className="text-foreground/70">jan.novak@firma.cz</span>
          </div>
        </div>
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-[10px] text-muted-foreground">Heslo</span>
            <span className="text-[10px] text-primary cursor-pointer">Zapomenuté heslo?</span>
          </div>
          <div className="h-8 rounded-md px-3 flex items-center text-xs border border-white/10" style={{ background: 'hsl(222 15% 13%)' }}>
            <span className="tracking-widest text-muted-foreground text-sm">••••••••</span>
          </div>
        </div>

        <button className="w-full h-8 rounded-lg text-xs font-heading font-bold text-primary-foreground" style={{ background: 'hsl(38 92% 50%)' }}>
          Přihlásit se →
        </button>

        <div className="text-center">
          <span className="text-[10px] text-muted-foreground">Nemáte účet? </span>
          <span className="text-[10px] text-primary cursor-pointer">Zaregistrujte se</span>
        </div>
      </div>
    </BrowserFrame>
  )
}

// ─── Mockup: Dashboard ──────────────────────────────────────────────────────

function MockupDashboard() {
  return (
    <BrowserFrame url="kuryr4you.cz/zakaznik">
      <div style={{ background: 'hsl(222 20% 8%)' }}>
        {/* Top nav */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/8" style={{ background: 'hsl(222 22% 6%)' }}>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: 'hsl(38 92% 50%)' }}>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="hsl(222 20% 8%)" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1" />
              </svg>
            </div>
            <span className="text-[11px] font-heading font-bold text-foreground">KURÝR4YOU</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold" style={{ background: 'hsl(38 92% 50%)' }}>JN</div>
            <span className="text-[10px] text-muted-foreground">Jan Novák</span>
          </div>
        </div>
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 p-3">
          {[
            { label: 'Zásilky celkem', value: '12' },
            { label: 'V přepravě', value: '2' },
            { label: 'Doručeno', value: '10' },
          ].map((s) => (
            <div key={s.label} className="rounded-lg p-2 border border-white/8 text-center" style={{ background: 'hsl(222 18% 11%)' }}>
              <div className="text-sm font-bold font-heading text-primary">{s.value}</div>
              <div className="text-[9px] text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
        {/* Recent orders */}
        <div className="px-3 pb-3">
          <div className="text-[10px] text-muted-foreground font-semibold mb-2">POSLEDNÍ ZÁSILKY</div>
          <div className="space-y-1.5">
            {[
              { id: '#K-2481', from: 'Praha 1', to: 'Praha 10', status: 'Doručeno', color: 'hsl(142 71% 45%)' },
              { id: '#K-2482', from: 'Praha 4', to: 'Beroun', status: 'V přepravě', color: 'hsl(38 92% 50%)' },
            ].map((o) => (
              <div key={o.id} className="flex items-center gap-2 p-2 rounded-lg border border-white/8" style={{ background: 'hsl(222 18% 11%)' }}>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-heading font-bold text-foreground">{o.id}</div>
                  <div className="text-[9px] text-muted-foreground">{o.from} → {o.to}</div>
                </div>
                <div className="text-[9px] font-semibold px-2 py-0.5 rounded-full" style={{ color: o.color, background: `${o.color}22` }}>{o.status}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </BrowserFrame>
  )
}

// ─── Mockup: Order form ─────────────────────────────────────────────────────

function MockupObjednat() {
  return (
    <BrowserFrame url="kuryr4you.cz/zakaznik/nova-zakazka">
      <div className="p-5 space-y-3" style={{ background: 'hsl(222 20% 8%)' }}>
        <div className="text-sm font-heading font-bold text-foreground">Nová zásilka</div>

        {/* Pickup */}
        <div className="space-y-2 p-3 rounded-xl border border-white/8" style={{ background: 'hsl(222 18% 11%)' }}>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'hsl(142 71% 45% / 0.2)' }}>
              <div className="w-2 h-2 rounded-full" style={{ background: 'hsl(142 71% 45%)' }} />
            </div>
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Vyzvednutí</span>
          </div>
          <div className="h-6 rounded px-2 flex items-center text-[11px] text-foreground/70 border border-white/10" style={{ background: 'hsl(222 15% 14%)' }}>Václavské náměstí 1, Praha 1</div>
          <div className="h-6 rounded px-2 flex items-center text-[11px] text-primary/70 border border-primary/30" style={{ background: 'hsl(222 15% 14%)' }}>Dnes v 14:00</div>
        </div>

        {/* Delivery */}
        <div className="space-y-2 p-3 rounded-xl border border-white/8" style={{ background: 'hsl(222 18% 11%)' }}>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'hsl(0 72% 51% / 0.2)' }}>
              <div className="w-2 h-2 rounded-full" style={{ background: 'hsl(0 72% 51%)' }} />
            </div>
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Doručení</span>
          </div>
          <div className="h-6 rounded px-2 flex items-center text-[11px] text-foreground/70 border border-white/10" style={{ background: 'hsl(222 15% 14%)' }}>Náměstí Míru 5, Praha 2</div>
          <div className="grid grid-cols-2 gap-2">
            <div className="h-6 rounded px-2 flex items-center text-[11px] text-foreground/70 border border-white/10" style={{ background: 'hsl(222 15% 14%)' }}>Příjemce: Novák</div>
            <div className="h-6 rounded px-2 flex items-center text-[11px] text-foreground/70 border border-white/10" style={{ background: 'hsl(222 15% 14%)' }}>+420 777 ...</div>
          </div>
        </div>

        {/* Cargo */}
        <div className="grid grid-cols-3 gap-2">
          {['2 kg', '30×20×15 cm', 'Křehké'].map((v) => (
            <div key={v} className="h-7 rounded px-2 flex items-center justify-center text-[10px] text-muted-foreground border border-white/10" style={{ background: 'hsl(222 18% 11%)' }}>{v}</div>
          ))}
        </div>

        <button className="w-full h-8 rounded-lg text-[11px] font-heading font-bold" style={{ background: 'hsl(38 92% 50%)', color: 'hsl(222 20% 8%)' }}>
          Zjistit cenu a objednat →
        </button>
      </div>
    </BrowserFrame>
  )
}

// ─── Mockup: Pricing ────────────────────────────────────────────────────────

function MockupCena() {
  return (
    <BrowserFrame url="kuryr4you.cz/zakaznik/nova-zakazka">
      <div className="p-5 space-y-3" style={{ background: 'hsl(222 20% 8%)' }}>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: 'hsl(38 92% 50% / 0.2)' }}>
            <svg className="w-3 h-3 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <span className="text-xs font-heading font-bold text-foreground">Kalkulace ceny</span>
          <span className="ml-auto text-[9px] px-2 py-0.5 rounded-full text-primary" style={{ background: 'hsl(38 92% 50% / 0.15)' }}>✓ Vypočteno</span>
        </div>

        <div className="rounded-xl border border-primary/30 p-3 space-y-2" style={{ background: 'hsl(38 92% 50% / 0.08)' }}>
          {[
            { label: 'Základní poplatek', value: '150 Kč' },
            { label: 'Vzdálenost (4.2 km)', value: '63 Kč' },
            { label: 'Příplatek: křehké zboží', value: '50 Kč' },
          ].map((r) => (
            <div key={r.label} className="flex justify-between items-center">
              <span className="text-[10px] text-muted-foreground">{r.label}</span>
              <span className="text-[10px] font-semibold text-foreground">{r.value}</span>
            </div>
          ))}
          <div className="border-t border-primary/20 pt-2 flex justify-between items-center">
            <span className="text-xs font-heading font-bold text-foreground">Celkem</span>
            <span className="text-lg font-heading font-black text-primary">263 Kč</span>
          </div>
        </div>

        <div className="flex gap-2">
          <button className="flex-1 h-8 rounded-lg text-[11px] font-heading font-bold" style={{ background: 'hsl(38 92% 50%)', color: 'hsl(222 20% 8%)' }}>
            Zaplatit kartou →
          </button>
          <button className="h-8 px-3 rounded-lg text-[11px] border border-white/15 text-muted-foreground">
            Faktura
          </button>
        </div>
      </div>
    </BrowserFrame>
  )
}

// ─── Mockup: Stripe Payment ─────────────────────────────────────────────────

function MockupPlatba() {
  return (
    <BrowserFrame url="checkout.stripe.com">
      <div className="p-5 space-y-4" style={{ background: 'hsl(222 20% 8%)' }}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: 'hsl(38 92% 50%)' }}>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="hsl(222 20% 8%)" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1" />
              </svg>
            </div>
            <span className="text-[11px] font-heading font-bold text-foreground">Kurýr4You</span>
          </div>
          <div className="text-right">
            <div className="text-lg font-heading font-black text-primary">318 Kč</div>
            <div className="text-[9px] text-muted-foreground">Kurýrní zásilka</div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-[10px] text-muted-foreground mb-1">Číslo karty</div>
          <div className="h-9 rounded-lg px-3 flex items-center justify-between border border-white/15" style={{ background: 'hsl(222 15% 13%)' }}>
            <span className="text-xs text-muted-foreground tracking-widest">4242 4242 4242 4242</span>
            <svg className="w-6 h-4" viewBox="0 0 48 30" fill="none">
              <rect width="48" height="30" rx="4" fill="#1A1F71"/>
              <text x="8" y="20" fontSize="12" fill="#F7B600" fontWeight="bold">VISA</text>
            </svg>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="h-9 rounded-lg px-3 flex items-center text-xs text-muted-foreground border border-white/15" style={{ background: 'hsl(222 15% 13%)' }}>12 / 28</div>
            <div className="h-9 rounded-lg px-3 flex items-center text-xs text-muted-foreground border border-white/15" style={{ background: 'hsl(222 15% 13%)' }}>CVC: •••</div>
          </div>
        </div>

        <button className="w-full h-9 rounded-lg text-xs font-bold text-white flex items-center justify-center gap-2" style={{ background: '#635BFF' }}>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          Zaplatit 318 Kč
        </button>
        <div className="text-center text-[9px] text-muted-foreground">Zabezpečeno Stripe · PCI DSS Level 1</div>
      </div>
    </BrowserFrame>
  )
}

// ─── Mockup: Tracking (phone) ────────────────────────────────────────────────

function MockupTracking() {
  return (
    <PhoneFrame>
      <div style={{ background: 'hsl(222 20% 8%)' }}>
        {/* Fake map */}
        <div className="relative h-40 overflow-hidden" style={{ background: 'hsl(210 30% 18%)' }}>
          {/* Map grid lines */}
          <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 256 160">
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="hsl(210 20% 40%)" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="256" height="160" fill="url(#grid)" />
            {/* Route */}
            <path d="M 40 130 Q 80 80 128 70 Q 170 60 210 30" stroke="hsl(38 92% 50%)" strokeWidth="3" fill="none" strokeDasharray="6 3" strokeLinecap="round" />
            {/* Driver dot */}
            <circle cx="128" cy="70" r="7" fill="hsl(38 92% 50%)" />
            <circle cx="128" cy="70" r="14" fill="hsl(38 92% 50% / 0.25)" />
            {/* Start */}
            <circle cx="40" cy="130" r="5" fill="hsl(142 71% 45%)" />
            {/* End */}
            <circle cx="210" cy="30" r="5" fill="hsl(0 72% 51%)" />
            {/* Street labels */}
            <text x="60" y="100" fill="hsl(210 20% 55%)" fontSize="7">Václavské nám.</text>
            <text x="150" y="50" fill="hsl(210 20% 55%)" fontSize="7">Náměstí Míru</text>
          </svg>
          {/* Live badge */}
          <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-semibold text-primary" style={{ background: 'hsl(38 92% 50% / 0.15)', border: '1px solid hsl(38 92% 50% / 0.3)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            ŽIVĚ
          </div>
        </div>

        {/* Info panel */}
        <div className="p-3 space-y-2">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-[10px] font-heading font-bold text-foreground">#K-2482 — V přepravě</div>
              <div className="text-[9px] text-muted-foreground">Odhadovaný čas: 14 min</div>
            </div>
            <div className="text-[9px] px-2 py-0.5 rounded-full font-semibold text-primary" style={{ background: 'hsl(38 92% 50% / 0.15)' }}>4.2 km</div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-lg" style={{ background: 'hsl(222 18% 11%)' }}>
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold" style={{ background: 'hsl(38 92% 50%)' }}>MK</div>
            <div>
              <div className="text-[10px] text-foreground font-semibold">Martin Kovář</div>
              <div className="text-[9px] text-muted-foreground">Váš kurýr · ☆ 4.9</div>
            </div>
            <div className="ml-auto w-7 h-7 rounded-lg flex items-center justify-center border border-primary/30">
              <svg className="w-3.5 h-3.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </PhoneFrame>
  )
}

// ─── Mockup: Proof of Delivery ──────────────────────────────────────────────

function MockupPOD() {
  return (
    <BrowserFrame url="kuryr4you.cz/sledovat/K-2482">
      <div className="p-5 space-y-3" style={{ background: 'hsl(222 20% 8%)' }}>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'hsl(142 71% 45% / 0.2)' }}>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="hsl(142 71% 45%)" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span className="text-xs font-heading font-bold text-foreground">Zásilka doručena</span>
          <span className="ml-auto text-[9px] text-muted-foreground">Dnes 15:42</span>
        </div>

        {/* Photo */}
        <div className="rounded-lg overflow-hidden border border-white/10 h-24 flex items-center justify-center relative" style={{ background: 'hsl(222 15% 12%)' }}>
          <svg className="w-8 h-8 text-muted-foreground/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <div className="absolute top-2 left-2 text-[8px] px-1.5 py-0.5 rounded font-semibold" style={{ background: 'hsl(142 71% 45% / 0.2)', color: 'hsl(142 71% 45%)' }}>Foto doručení</div>
        </div>

        {/* Signature */}
        <div className="rounded-lg border border-white/10 p-3 h-16 flex items-end justify-between" style={{ background: 'hsl(222 15% 12%)' }}>
          <svg viewBox="0 0 120 40" className="w-24 h-8">
            <path d="M10 30 Q 20 10 35 20 Q 50 30 65 15 Q 80 5 95 20 Q 108 30 115 25" stroke="hsl(38 92% 50%)" strokeWidth="2" fill="none" strokeLinecap="round"/>
          </svg>
          <span className="text-[8px] text-muted-foreground">Podpis příjemce</span>
        </div>

        <div className="flex gap-2">
          <button className="flex-1 h-7 rounded-lg text-[10px] border border-white/10 text-muted-foreground">Stáhnout PDF</button>
          <button className="flex-1 h-7 rounded-lg text-[10px] font-semibold" style={{ background: 'hsl(38 92% 50%)', color: 'hsl(222 20% 8%)' }}>Sdílet</button>
        </div>
      </div>
    </BrowserFrame>
  )
}

// ─── Mockup: Invoices ───────────────────────────────────────────────────────

function MockupFaktury() {
  return (
    <BrowserFrame url="kuryr4you.cz/zakaznik/faktury">
      <div style={{ background: 'hsl(222 20% 8%)' }}>
        <div className="px-4 pt-4 pb-2">
          <div className="text-sm font-heading font-bold text-foreground mb-1">Faktury a účtenky</div>
          <div className="flex gap-2">
            {['Všechny', 'Zaplaceno', 'Čeká'].map((t, i) => (
              <button key={t} className="text-[10px] px-3 py-1 rounded-full" style={i === 0 ? { background: 'hsl(38 92% 50%)', color: 'hsl(222 20% 8%)' } : { background: 'hsl(222 18% 14%)', color: 'hsl(210 12% 55%)' }}>{t}</button>
            ))}
          </div>
        </div>

        <div className="px-4 pb-4 space-y-2">
          {[
            { id: 'FV-2024-048', date: '10.6.2026', amount: '318 Kč', paid: true, desc: 'Kurýr Praha 1 → Praha 2' },
            { id: 'FV-2024-047', date: '5.6.2026', amount: '520 Kč', paid: true, desc: 'Expresní zásilka Praha 4 → Beroun' },
            { id: 'FV-2024-046', date: '28.5.2026', amount: '1 240 Kč', paid: false, desc: 'Měsíční vyúčtování — 5 zásilek' },
          ].map((inv) => (
            <div key={inv.id} className="flex items-center gap-3 p-3 rounded-xl border border-white/8" style={{ background: 'hsl(222 18% 11%)' }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: inv.paid ? 'hsl(142 71% 45% / 0.15)' : 'hsl(38 92% 50% / 0.15)' }}>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke={inv.paid ? 'hsl(142 71% 45%)' : 'hsl(38 92% 50%)'} strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-heading font-bold text-foreground">{inv.id}</div>
                <div className="text-[9px] text-muted-foreground truncate">{inv.desc}</div>
                <div className="text-[9px] text-muted-foreground">{inv.date}</div>
              </div>
              <div className="text-right">
                <div className="text-[11px] font-bold font-heading text-foreground">{inv.amount}</div>
                <div className="text-[9px]" style={{ color: inv.paid ? 'hsl(142 71% 45%)' : 'hsl(38 92% 50%)' }}>{inv.paid ? '✓ Zaplaceno' : '⏳ Čeká'}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </BrowserFrame>
  )
}

// ─── Mockup: Account settings ───────────────────────────────────────────────

function MockupUcet() {
  return (
    <BrowserFrame url="kuryr4you.cz/zakaznik/nastaveni">
      <div className="p-5 space-y-4" style={{ background: 'hsl(222 20% 8%)' }}>
        {/* Avatar */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-black font-heading" style={{ background: 'hsl(38 92% 50%)', color: 'hsl(222 20% 8%)' }}>JN</div>
          <div>
            <div className="text-sm font-heading font-bold text-foreground">Jan Novák</div>
            <div className="text-[10px] text-muted-foreground">jan.novak@firma.cz</div>
            <div className="text-[9px] px-2 py-0.5 rounded-full mt-1 inline-block font-semibold" style={{ background: 'hsl(38 92% 50% / 0.15)', color: 'hsl(38 92% 50%)' }}>Firemní účet</div>
          </div>
        </div>

        {/* Fields */}
        <div className="space-y-2">
          {[
            { label: 'Jméno a příjmení', value: 'Jan Novák' },
            { label: 'Telefon', value: '+420 777 888 999' },
            { label: 'IČO', value: '12345678' },
            { label: 'Fakturační adresa', value: 'Václavské nám. 1, 110 00 Praha' },
          ].map((f) => (
            <div key={f.label}>
              <div className="text-[9px] text-muted-foreground mb-0.5">{f.label}</div>
              <div className="h-7 rounded-md px-2 flex items-center text-[11px] text-foreground/70 border border-white/10" style={{ background: 'hsl(222 15% 13%)' }}>{f.value}</div>
            </div>
          ))}
        </div>

        <button className="w-full h-7 rounded-lg text-[10px] font-heading font-bold" style={{ background: 'hsl(38 92% 50%)', color: 'hsl(222 20% 8%)' }}>
          Uložit změny
        </button>
      </div>
    </BrowserFrame>
  )
}

// ─── Mockup: Dispatcher Live Map ────────────────────────────────────────────

function MockupDispecerMapa() {
  return (
    <BrowserFrame url="kuryr4you.cz/dispatcer/mapa">
      <div style={{ background: 'hsl(222 20% 8%)' }}>
        {/* Top bar */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-white/8" style={{ background: 'hsl(222 22% 6%)' }}>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: 'hsl(38 92% 50%)' }}>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="hsl(222 20% 8%)" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <span className="text-[10px] font-heading font-bold text-foreground">Živá mapa — Praha</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-[9px] text-primary" style={{ background: 'hsl(38 92% 50% / 0.12)', padding: '2px 6px', borderRadius: 6 }}>
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />4 aktivní
            </div>
            <div className="text-[9px] text-muted-foreground">8 zásilek dnes</div>
          </div>
        </div>

        {/* Map area */}
        <div className="relative" style={{ height: 170, background: 'hsl(210 28% 16%)' }}>
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 320 170" xmlns="http://www.w3.org/2000/svg">
            {/* Grid */}
            <defs>
              <pattern id="dgrid" width="22" height="22" patternUnits="userSpaceOnUse">
                <path d="M 22 0 L 0 0 0 22" fill="none" stroke="hsl(210 18% 25%)" strokeWidth="0.4"/>
              </pattern>
              <radialGradient id="driverGlow1" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="hsl(38 92% 50%)" stopOpacity="0.5"/>
                <stop offset="100%" stopColor="hsl(38 92% 50%)" stopOpacity="0"/>
              </radialGradient>
              <radialGradient id="driverGlow2" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="hsl(142 71% 45%)" stopOpacity="0.5"/>
                <stop offset="100%" stopColor="hsl(142 71% 45%)" stopOpacity="0"/>
              </radialGradient>
            </defs>
            <rect width="320" height="170" fill="url(#dgrid)" />

            {/* Roads */}
            <path d="M 0 85 L 320 85" stroke="hsl(210 20% 30%)" strokeWidth="5" opacity="0.5"/>
            <path d="M 160 0 L 160 170" stroke="hsl(210 20% 30%)" strokeWidth="4" opacity="0.4"/>
            <path d="M 0 130 L 320 40" stroke="hsl(210 20% 28%)" strokeWidth="3" opacity="0.3"/>
            <path d="M 0 40 L 320 130" stroke="hsl(210 20% 28%)" strokeWidth="2.5" opacity="0.25"/>

            {/* Routes */}
            <path d="M 60 120 Q 100 100 130 85" stroke="hsl(38 92% 50%)" strokeWidth="2" fill="none" strokeDasharray="5 3" opacity="0.8"/>
            <path d="M 220 50 Q 190 70 175 85" stroke="hsl(142 71% 45%)" strokeWidth="2" fill="none" strokeDasharray="5 3" opacity="0.8"/>
            <path d="M 80 40 Q 120 60 140 85" stroke="hsl(199 89% 48%)" strokeWidth="2" fill="none" strokeDasharray="5 3" opacity="0.7"/>
            <path d="M 260 140 Q 220 115 190 85" stroke="hsl(260 70% 65%)" strokeWidth="2" fill="none" strokeDasharray="5 3" opacity="0.6"/>

            {/* Driver 1 - amber */}
            <circle cx="130" cy="85" r="16" fill="url(#driverGlow1)"/>
            <circle cx="130" cy="85" r="8" fill="hsl(38 92% 50%)" opacity="0.9"/>
            <text x="127" y="88" fill="hsl(222 20% 8%)" fontSize="7" fontWeight="bold">MK</text>

            {/* Driver 2 - green */}
            <circle cx="175" cy="85" r="16" fill="url(#driverGlow2)"/>
            <circle cx="175" cy="85" r="8" fill="hsl(142 71% 45%)" opacity="0.9"/>
            <text x="172" y="88" fill="hsl(222 20% 8%)" fontSize="7" fontWeight="bold">JP</text>

            {/* Driver 3 - blue */}
            <circle cx="140" cy="85" r="6" fill="hsl(199 89% 48%)" opacity="0.8"/>
            <text x="137" y="88" fill="white" fontSize="6" fontWeight="bold">TN</text>

            {/* Driver 4 - purple */}
            <circle cx="190" cy="85" r="6" fill="hsl(260 70% 65%)" opacity="0.8"/>
            <text x="187" y="88" fill="white" fontSize="6" fontWeight="bold">LK</text>

            {/* Pickup points */}
            <circle cx="60" cy="120" r="4" fill="hsl(142 71% 45%)"/>
            <circle cx="220" cy="50" r="4" fill="hsl(142 71% 45%)"/>
            <circle cx="80" cy="40" r="4" fill="hsl(0 72% 51%)"/>
            <circle cx="260" cy="140" r="4" fill="hsl(0 72% 51%)"/>

            {/* Labels */}
            <text x="60" y="135" fill="hsl(210 20% 55%)" fontSize="6">Václavské nám.</text>
            <text x="190" y="40" fill="hsl(210 20% 55%)" fontSize="6">Vinohrady</text>
            <text x="30" y="55" fill="hsl(210 20% 55%)" fontSize="6">Holešovice</text>
            <text x="250" y="155" fill="hsl(210 20% 55%)" fontSize="6">Smíchov</text>
          </svg>

          {/* Legend overlay */}
          <div className="absolute bottom-2 left-2 space-y-1">
            {[
              { initials: 'MK', color: 'hsl(38 92% 50%)', name: 'Martin K.', status: 'V přepravě' },
              { initials: 'JP', color: 'hsl(142 71% 45%)', name: 'Jana P.', status: 'Volný' },
            ].map(d => (
              <div key={d.initials} className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px]" style={{ background: 'hsl(222 22% 6% / 0.85)' }}>
                <div className="w-3 h-3 rounded-full flex items-center justify-center text-[6px] font-bold" style={{ background: d.color, color: 'hsl(222 20% 8%)' }}>{d.initials}</div>
                <span className="text-foreground font-semibold">{d.name}</span>
                <span className="text-muted-foreground">— {d.status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Order list sidebar */}
        <div className="p-2 space-y-1.5">
          {[
            { id: '#K-2483', route: 'Žižkov → Dejvice', driver: 'MK', priority: 'Expresní', eta: '18 min', color: 'hsl(38 92% 50%)' },
            { id: '#K-2484', route: 'Smíchov → Holešovice', driver: '—', priority: 'Čeká', eta: '—', color: 'hsl(210 12% 55%)' },
          ].map(o => (
            <div key={o.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg border border-white/8" style={{ background: 'hsl(222 18% 11%)' }}>
              <div className="text-[9px] font-heading font-bold text-foreground w-14">{o.id}</div>
              <div className="flex-1 text-[9px] text-muted-foreground">{o.route}</div>
              <div className="text-[8px] px-1.5 py-0.5 rounded font-semibold" style={{ color: o.color, background: `${o.color}22` }}>{o.priority}</div>
              <div className="text-[9px] text-muted-foreground w-10 text-right">{o.eta}</div>
            </div>
          ))}
        </div>
      </div>
    </BrowserFrame>
  )
}

// ─── Mockup: Kanban Board ────────────────────────────────────────────────────

function MockupKanban() {
  const columns = [
    { label: 'Přijato', color: 'hsl(210 12% 55%)', items: ['#K-2485', '#K-2486'] },
    { label: 'Přiřazeno', color: 'hsl(199 89% 48%)', items: ['#K-2483'] },
    { label: 'Vyzvednuto', color: 'hsl(38 92% 50%)', items: ['#K-2481', '#K-2482'] },
    { label: 'Doručeno', color: 'hsl(142 71% 45%)', items: ['#K-2480'] },
  ]
  return (
    <BrowserFrame url="kuryr4you.cz/dispatcer/prehled">
      <div className="p-3" style={{ background: 'hsl(222 20% 8%)' }}>
        <div className="flex items-center justify-between mb-3">
          <div className="text-[10px] font-heading font-bold text-foreground">Kanban — Dnes</div>
          <div className="text-[9px] px-2 py-0.5 rounded-full" style={{ background: 'hsl(38 92% 50% / 0.12)', color: 'hsl(38 92% 50%)' }}>6 zásilek</div>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {columns.map(col => (
            <div key={col.label} className="rounded-lg p-1.5" style={{ background: 'hsl(222 18% 11%)' }}>
              <div className="flex items-center gap-1 mb-2">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: col.color }} />
                <div className="text-[8px] font-semibold truncate" style={{ color: col.color }}>{col.label}</div>
              </div>
              <div className="space-y-1">
                {col.items.map(id => (
                  <div key={id} className="rounded px-1.5 py-1 text-[8px] font-heading font-bold text-foreground border border-white/8" style={{ background: 'hsl(222 20% 8%)' }}>
                    {id}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </BrowserFrame>
  )
}

// ─── Mockup: Driver mobile ───────────────────────────────────────────────────

function MockupRidicApp() {
  return (
    <PhoneFrame>
      <div style={{ background: 'hsl(222 20% 8%)' }}>
        {/* Active task header */}
        <div className="px-3 py-2 border-b border-white/8" style={{ background: 'hsl(222 22% 6%)' }}>
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-heading font-bold text-foreground">Aktivní zásilka</div>
            <div className="flex items-center gap-1 text-[9px] text-primary" style={{ background: 'hsl(38 92% 50% / 0.12)', padding: '2px 6px', borderRadius: 6 }}>
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              LIVE
            </div>
          </div>
        </div>

        {/* Map */}
        <div className="relative" style={{ height: 110, background: 'hsl(210 28% 16%)' }}>
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 110">
            <defs>
              <pattern id="rgrid" width="16" height="16" patternUnits="userSpaceOnUse">
                <path d="M 16 0 L 0 0 0 16" fill="none" stroke="hsl(210 18% 25%)" strokeWidth="0.4"/>
              </pattern>
            </defs>
            <rect width="200" height="110" fill="url(#rgrid)" />
            <path d="M 20 90 L 60 90 L 60 55 L 180 55" stroke="hsl(38 92% 50%)" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            {/* Driver */}
            <circle cx="60" cy="72" r="10" fill="hsl(38 92% 50% / 0.25)"/>
            <circle cx="60" cy="72" r="6" fill="hsl(38 92% 50%)"/>
            <text x="57" y="75" fill="hsl(222 20% 8%)" fontSize="5" fontWeight="bold">▲</text>
            {/* Destination */}
            <circle cx="180" cy="55" r="7" fill="hsl(0 72% 51% / 0.25)"/>
            <circle cx="180" cy="55" r="4" fill="hsl(0 72% 51%)"/>
            <text x="155" y="48" fill="hsl(210 20% 55%)" fontSize="6">Náměstí Míru</text>
          </svg>
          {/* ETA badge */}
          <div className="absolute top-2 right-2 rounded-lg px-2 py-1 text-center" style={{ background: 'hsl(222 22% 6% / 0.9)' }}>
            <div className="text-[8px] text-muted-foreground">ETA</div>
            <div className="text-sm font-heading font-black text-primary">12 min</div>
          </div>
        </div>

        {/* Delivery info */}
        <div className="p-3 space-y-2">
          <div className="rounded-lg p-2 space-y-1.5" style={{ background: 'hsl(222 18% 11%)' }}>
            <div className="flex items-start gap-2">
              <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: 'hsl(0 72% 51% / 0.2)' }}>
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'hsl(0 72% 51%)' }} />
              </div>
              <div>
                <div className="text-[10px] font-semibold text-foreground">Náměstí Míru 5, Praha 2</div>
                <div className="text-[9px] text-muted-foreground">Příjemce: Novák · 3. patro, zvonek vpravo</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <button className="h-8 rounded-lg text-[10px] font-heading font-bold border border-white/15 text-foreground">
              📞 Kontakt
            </button>
            <button className="h-8 rounded-lg text-[10px] font-heading font-bold text-primary-foreground" style={{ background: 'hsl(38 92% 50%)' }}>
              ✓ Doručit
            </button>
          </div>
        </div>
      </div>
    </PhoneFrame>
  )
}

// ─── Mockup: Driver task list ─────────────────────────────────────────────────

function MockupRidicZakazky() {
  return (
    <PhoneFrame>
      <div style={{ background: 'hsl(222 20% 8%)' }}>
        <div className="px-3 py-2 border-b border-white/8" style={{ background: 'hsl(222 22% 6%)' }}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] font-heading font-bold text-foreground">Martin Kovář</div>
              <div className="text-[8px] text-muted-foreground">Směna: 08:00 – 18:00</div>
            </div>
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-black font-heading" style={{ background: 'hsl(38 92% 50%)', color: 'hsl(222 20% 8%)' }}>MK</div>
          </div>
        </div>

        <div className="p-3 space-y-2">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { label: 'Dnes', value: '4' },
              { label: 'Km', value: '38' },
              { label: 'Hodnocení', value: '4.9★' },
            ].map(s => (
              <div key={s.label} className="rounded-lg p-1.5 text-center border border-white/8" style={{ background: 'hsl(222 18% 11%)' }}>
                <div className="text-[11px] font-heading font-bold text-primary">{s.value}</div>
                <div className="text-[8px] text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Task list */}
          <div className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wide">Zásilky na dnes</div>
          {[
            { id: '#K-2481', addr: 'Praha 1 → Praha 10', done: true },
            { id: '#K-2482', addr: 'Praha 4 → Beroun', done: false, active: true },
            { id: '#K-2483', addr: 'Žižkov → Dejvice', done: false },
          ].map(t => (
            <div key={t.id} className="flex items-center gap-2 p-2 rounded-lg border border-white/8" style={{ background: t.active ? 'hsl(38 92% 50% / 0.08)' : 'hsl(222 18% 11%)', borderColor: t.active ? 'hsl(38 92% 50% / 0.3)' : undefined }}>
              <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: t.done ? 'hsl(142 71% 45% / 0.2)' : t.active ? 'hsl(38 92% 50% / 0.2)' : 'hsl(222 15% 18%)' }}>
                {t.done
                  ? <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="hsl(142 71% 45%)" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                  : t.active
                    ? <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    : <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                }
              </div>
              <div className="flex-1">
                <div className="text-[9px] font-heading font-bold" style={{ color: t.active ? 'hsl(38 92% 50%)' : t.done ? 'hsl(210 12% 45%)' : 'hsl(210 12% 85%)' }}>{t.id}</div>
                <div className="text-[8px] text-muted-foreground">{t.addr}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PhoneFrame>
  )
}

// ─── Mockup: Customer rating page ─────────────────────────────────────────────

function MockupHodnoceni() {
  return (
    <PhoneFrame>
      <div style={{ background: 'hsl(222 20% 8%)' }}>
        {/* Header */}
        <div className="px-3 py-2 border-b border-white/8" style={{ background: 'hsl(222 22% 6%)' }}>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'hsl(142 71% 45% / 0.15)' }}>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="hsl(142 71% 45%)" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="text-[10px] font-heading font-bold text-foreground">Zásilka doručena</div>
          </div>
        </div>
        {/* Body */}
        <div className="p-3 space-y-3">
          {/* Route summary */}
          <div className="rounded-lg p-2.5 space-y-2" style={{ background: 'hsl(222 18% 11%)' }}>
            <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'hsl(38 92% 50%)' }} />
              Václavské nám. 1, Praha 1
            </div>
            <div className="w-px h-3 ml-[2px] border-l border-dashed border-white/20" />
            <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'hsl(142 71% 45%)' }} />
              Náměstí Míru 5, Praha 2
            </div>
            <div className="flex justify-between pt-1 text-[9px]">
              <span className="text-muted-foreground">Kurýr: Martin Kovář</span>
              <span className="font-semibold text-foreground">5,2 km</span>
            </div>
          </div>
          {/* Star rating */}
          <div className="text-center space-y-2">
            <div className="text-[10px] font-heading font-semibold text-foreground">Jak hodnotíte doručení?</div>
            <div className="flex justify-center gap-1.5">
              {[1,2,3,4,5].map(i => (
                <svg key={i} className="w-6 h-6" viewBox="0 0 24 24" fill={i <= 4 ? 'hsl(38 92% 50%)' : 'none'} stroke="hsl(38 92% 50%)" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              ))}
            </div>
            <div className="text-[9px] text-primary font-semibold">4 hvězdičky</div>
          </div>
          {/* Comment */}
          <div className="rounded-lg p-2 text-[9px] text-muted-foreground border border-white/8" style={{ background: 'hsl(222 18% 11%)' }}>
            Kurýr byl přesný a zdvořilý, zásilka v pořádku…
          </div>
          {/* Submit */}
          <button className="w-full h-8 rounded-lg text-[10px] font-heading font-bold text-primary-foreground" style={{ background: 'hsl(38 92% 50%)' }}>
            Odeslat hodnocení
          </button>
        </div>
      </div>
    </PhoneFrame>
  )
}

// ─── Mockup: Customer templates ────────────────────────────────────────────────

function MockupSablony() {
  return (
    <BrowserFrame url="kuryr4you.cz/zakaznik/sablony">
      <div className="p-3" style={{ background: 'hsl(222 20% 8%)' }}>
        <div className="flex items-center justify-between mb-3">
          <div className="text-[10px] font-heading font-bold text-foreground">Šablony zásilek</div>
          <div className="flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full" style={{ background: 'hsl(38 92% 50% / 0.12)', color: 'hsl(38 92% 50%)' }}>
            + Nová objednávka
          </div>
        </div>
        <div className="space-y-2">
          {[
            { name: 'Sklad → Showroom', from: 'K Červenému vrchu 25', to: 'Hybernská 10', active: true, tag: 'Pravidelná' },
            { name: 'E-shop objednávka', from: 'Vlastní sklad', to: 'Zákazník', active: true, tag: 'Šablona' },
            { name: 'Výdej dokumentů', from: 'Kancelář Praha 1', to: 'Finanční úřad', active: false, tag: 'Neaktivní' },
          ].map(t => (
            <div key={t.name} className="rounded-lg p-2 border border-white/8 flex items-center gap-2" style={{ background: 'hsl(222 18% 11%)', opacity: t.active ? 1 : 0.6 }}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <div className="text-[10px] font-heading font-bold text-foreground truncate">{t.name}</div>
                  <div className="text-[8px] px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: t.active ? 'hsl(142 71% 45% / 0.12)' : 'hsl(222 15% 18%)', color: t.active ? 'hsl(142 71% 45%)' : 'hsl(210 12% 45%)' }}>{t.tag}</div>
                </div>
                <div className="text-[8px] text-muted-foreground truncate">{t.from} → {t.to}</div>
              </div>
              <button className="text-[8px] px-2 py-1 rounded font-heading font-bold flex-shrink-0 text-primary-foreground" style={{ background: t.active ? 'hsl(38 92% 50%)' : 'hsl(222 15% 18%)', color: t.active ? undefined : 'hsl(210 12% 45%)' }}>
                Objednat
              </button>
            </div>
          ))}
        </div>
        <div className="mt-3 p-2 rounded-lg border border-dashed border-white/15 text-center">
          <div className="text-[9px] text-muted-foreground">Šablona vznikne automaticky při objednávce — zaškrtněte „Uložit jako šablonu"</div>
        </div>
      </div>
    </BrowserFrame>
  )
}

// ─── Mockup: QR code dialog ───────────────────────────────────────────────────

function MockupQRKod() {
  return (
    <BrowserFrame url="kuryr4you.cz/dispatcer/zasilky">
      <div className="p-3" style={{ background: 'hsl(222 20% 8%)' }}>
        {/* Table row */}
        <div className="rounded-lg border border-white/8 overflow-hidden mb-3" style={{ background: 'hsl(222 18% 11%)' }}>
          <div className="px-2 py-1.5 border-b border-white/8 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="font-heading text-[9px] font-bold text-primary">#K-2482</div>
              <div className="text-[8px] px-1.5 py-0.5 rounded-full" style={{ background: 'hsl(38 92% 50% / 0.12)', color: 'hsl(38 92% 50%)' }}>Vyzvednuto</div>
            </div>
            <div className="flex items-center gap-1.5">
              <button className="text-[8px] px-2 py-0.5 rounded border border-white/15 text-muted-foreground">Sledovat</button>
              <button className="text-[8px] px-2 py-0.5 rounded border border-primary/40 text-primary font-semibold">QR</button>
            </div>
          </div>
          <div className="px-2 py-1.5 text-[8px] text-muted-foreground">Praha 4 → Beroun · Martin Kovář</div>
        </div>
        {/* QR modal */}
        <div className="rounded-xl border border-white/15 p-3 flex flex-col items-center gap-2" style={{ background: 'hsl(222 22% 6%)' }}>
          <div className="text-[9px] font-heading font-bold text-foreground">QR — Sledování zásilky #K-2482</div>
          {/* QR code placeholder */}
          <div className="w-20 h-20 rounded-lg p-1.5" style={{ background: 'white' }}>
            <svg viewBox="0 0 21 21" className="w-full h-full" style={{ imageRendering: 'pixelated' }}>
              {/* Simplified QR code visual */}
              <rect width="21" height="21" fill="white"/>
              {/* Finder pattern TL */}
              <rect x="0" y="0" width="7" height="7" fill="black"/>
              <rect x="1" y="1" width="5" height="5" fill="white"/>
              <rect x="2" y="2" width="3" height="3" fill="black"/>
              {/* Finder pattern TR */}
              <rect x="14" y="0" width="7" height="7" fill="black"/>
              <rect x="15" y="1" width="5" height="5" fill="white"/>
              <rect x="16" y="2" width="3" height="3" fill="black"/>
              {/* Finder pattern BL */}
              <rect x="0" y="14" width="7" height="7" fill="black"/>
              <rect x="1" y="15" width="5" height="5" fill="white"/>
              <rect x="2" y="16" width="3" height="3" fill="black"/>
              {/* Random data dots */}
              {[[8,0],[9,0],[10,0],[8,2],[10,2],[9,4],[11,0],[12,0],[8,6],[9,6],[11,6],[12,6],[8,8],[9,8],[10,8],[11,8],[12,8],[8,10],[10,10],[12,10],[8,12],[9,12],[11,12],[8,14],[10,14],[12,14],[9,16],[11,16],[12,16],[8,18],[10,18],[14,8],[14,10],[14,12],[16,8],[18,8],[16,10],[18,10],[16,12],[18,12],[14,14],[16,14],[18,14],[14,16],[16,16],[14,18],[16,18],[18,18]].map(([x,y]) => (
                <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="black"/>
              ))}
            </svg>
          </div>
          <div className="text-[8px] text-muted-foreground text-center">Naskenujte pro otevření sledovací stránky</div>
          <button className="text-[8px] px-3 py-1 rounded font-heading font-bold text-primary-foreground w-full" style={{ background: 'hsl(38 92% 50%)' }}>
            Stáhnout PNG
          </button>
        </div>
      </div>
    </BrowserFrame>
  )
}

// ─── Mockup: Command palette ──────────────────────────────────────────────────

function MockupCommandPalette() {
  return (
    <BrowserFrame url="kuryr4you.cz/dispatcer">
      <div className="relative" style={{ background: 'hsl(222 20% 8%)', minHeight: 220 }}>
        {/* Background content (blurred) */}
        <div className="p-3 opacity-30">
          <div className="grid grid-cols-3 gap-2">
            {['📦 48 zásilek','🚗 5 řidičů','✅ 12 doručeno'].map(s => (
              <div key={s} className="rounded-lg p-2 text-[9px] text-foreground border border-white/8" style={{ background: 'hsl(222 18% 11%)' }}>{s}</div>
            ))}
          </div>
        </div>
        {/* Command palette overlay */}
        <div className="absolute inset-x-3 top-2 rounded-xl border border-white/20 overflow-hidden shadow-2xl" style={{ background: 'hsl(222 22% 9%)' }}>
          <div className="flex items-center gap-2 px-3 py-2 border-b border-white/8">
            <svg className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0" /></svg>
            <span className="text-[10px] text-foreground">K-2482</span>
            <span className="ml-auto text-[8px] text-muted-foreground border border-white/10 px-1 rounded">ESC</span>
          </div>
          <div className="p-1.5 space-y-0.5">
            <div className="text-[8px] text-muted-foreground px-2 py-1 font-semibold uppercase tracking-wide">Zásilky</div>
            {[
              { id: '#K-2482', route: 'Praha 4 → Beroun', status: 'Vyzvednuto', color: 'hsl(38 92% 50%)' },
              { id: '#K-2280', route: 'Praha 1 → Praha 10', status: 'Doručeno', color: 'hsl(142 71% 45%)' },
            ].map(r => (
              <div key={r.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: r.id === '#K-2482' ? 'hsl(222 22% 13%)' : undefined }}>
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: r.color }} />
                <div className="flex-1">
                  <span className="text-[9px] font-heading font-bold text-primary mr-1.5">{r.id}</span>
                  <span className="text-[8px] text-muted-foreground">{r.route}</span>
                </div>
                <div className="text-[8px]" style={{ color: r.color }}>{r.status}</div>
              </div>
            ))}
          </div>
          <div className="border-t border-white/8 px-3 py-1.5 flex items-center gap-3 text-[8px] text-muted-foreground">
            <span className="flex items-center gap-1"><kbd className="px-1 rounded border border-white/10 font-mono">↑↓</kbd> výběr</span>
            <span className="flex items-center gap-1"><kbd className="px-1 rounded border border-white/10 font-mono">↵</kbd> otevřít</span>
          </div>
        </div>
      </div>
    </BrowserFrame>
  )
}

// ─── Main page ───────────────────────────────────────────────────────────────

function JakToFungujePage() {
  const sectionGroups = [
    {
      label: 'Zákazník',
      color: 'hsl(142 71% 45%)',
      sections: [
        { id: 'registrace', label: 'Registrace' },
        { id: 'prihlaseni', label: 'Přihlášení' },
        { id: 'sprava-uctu', label: 'Správa účtu' },
        { id: 'objednani', label: 'Objednání' },
        { id: 'cena', label: 'Ceny' },
        { id: 'platba', label: 'Platba' },
        { id: 'sledovani', label: 'Sledování' },
        { id: 'doruceni', label: 'Doručení & POD' },
        { id: 'faktury', label: 'Faktury' },
        { id: 'sablony', label: 'Šablony' },
      ],
    },
    {
      label: 'Dispečer & Řidič',
      color: 'hsl(38 92% 50%)',
      sections: [
        { id: 'dispecer', label: 'Dispečer' },
        { id: 'ridic', label: 'Řidič' },
        { id: 'hodnoceni', label: 'Hodnocení' },
        { id: 'vyhledavani', label: 'QR & Hledání' },
      ],
    },
    {
      label: 'Integrace',
      color: 'hsl(199 89% 48%)',
      sections: [
        { id: 'api', label: 'API integrace' },
      ],
    },
  ]

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-border" style={{ background: 'hsl(222 20% 8% / 0.97)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-14">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
              </svg>
            </div>
            <span className="text-sm font-heading font-bold text-foreground">KURÝR4YOU</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">← Zpět na web</Link>
            <Link to="/objednat" className="hidden sm:flex px-4 py-2 rounded-lg text-xs font-heading font-bold bg-primary text-primary-foreground hover:opacity-90 transition-opacity">
              Objednat kurýra
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -right-32 -top-20 w-96 h-96 rounded-full opacity-15" style={{ background: 'radial-gradient(circle, hsl(38 92% 50%) 0%, transparent 70%)' }} />
          <div className="absolute -left-20 bottom-0 w-64 h-64 rounded-full opacity-8" style={{ background: 'radial-gradient(circle, hsl(199 89% 48%) 0%, transparent 70%)' }} />
        </div>
        <div className="relative max-w-6xl mx-auto px-4 py-14 md:py-20">
          <div className="inline-flex items-center gap-2 mb-5 px-3 py-1.5 rounded-full border border-primary/40 text-xs font-medium text-primary" style={{ background: 'hsl(38 92% 50% / 0.08)' }}>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
            Průvodce platformou
          </div>
          <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl font-black uppercase leading-none mb-4">
            <span className="text-foreground block">JAK TO</span>
            <span className="text-primary block">FUNGUJE?</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mb-8">
            Vše, co potřebujete vědět o platformě Kurýr4You. Od registrace po vystavení faktury — kompletní průvodce krok za krokem.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/registrace" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-heading font-bold text-sm bg-primary text-primary-foreground hover:opacity-90 transition-opacity">
              Zaregistrovat se zdarma →
            </Link>
            <Link to="/objednat" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-heading font-bold text-sm border border-border text-foreground hover:border-primary/40 transition-colors">
              Objednat bez registrace
            </Link>
          </div>
        </div>
      </section>

      {/* Three Roles Overview */}
      <section className="border-b border-border py-10" style={{ background: 'hsl(222 20% 8%)' }}>
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 text-xs text-muted-foreground mb-4" style={{ background: 'hsl(222 22% 6%)' }}>
              Platforma pro tři role
            </div>
            <h2 className="font-heading text-2xl sm:text-3xl font-black uppercase text-foreground">
              Kdo s platformou <span className="text-primary">pracuje?</span>
            </h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-5">
            {[
              {
                icon: (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                ),
                role: 'Zákazník',
                color: 'hsl(142 71% 45%)',
                bgColor: 'hsl(142 71% 45% / 0.1)',
                desc: 'Registruje se, objednává zásilky, sleduje jejich polohu v reálném čase a stahuje daňové doklady.',
                features: ['Objednávky online 24/7', 'Live sledování na mapě', 'Faktury ke stažení (PDF)', 'Firemní účet s 14denní splatností'],
                anchor: '#registrace',
              },
              {
                icon: (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                ),
                role: 'Dispečer',
                color: 'hsl(38 92% 50%)',
                bgColor: 'hsl(38 92% 50% / 0.1)',
                desc: 'Spravuje všechny zásilky, přiřazuje řidiče, sleduje živou mapu a koordinuje celý provoz z jednoho místa.',
                features: ['Živá mapa všech řidičů', 'Kanban správa zásilek', 'Přiřazení & trasy', 'Analytika a výkony'],
                anchor: '#dispecer',
              },
              {
                icon: (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                  </svg>
                ),
                role: 'Řidič',
                color: 'hsl(199 89% 48%)',
                bgColor: 'hsl(199 89% 48% / 0.1)',
                desc: 'Přijímá zásilky do mobilní aplikace, naviguje k doručení a pořizuje digitální potvrzení předání.',
                features: ['Přehled tras v mobilu', 'GPS navigace', 'Foto + digitální podpis', 'Přehled směn a výdělků'],
                anchor: '#ridic',
              },
            ].map(r => (
              <a key={r.role} href={r.anchor} className="block group rounded-2xl border border-white/10 p-5 transition-all hover:border-white/20" style={{ background: 'hsl(222 22% 6%)' }}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: r.bgColor, color: r.color }}>
                    {r.icon}
                  </div>
                  <div>
                    <div className="text-xs font-semibold" style={{ color: r.color }}>Role</div>
                    <div className="font-heading font-black text-base text-foreground">{r.role}</div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">{r.desc}</p>
                <div className="space-y-1.5">
                  {r.features.map(f => (
                    <div key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: r.color }} />
                      {f}
                    </div>
                  ))}
                </div>
                <div className="mt-4 text-xs font-semibold transition-colors" style={{ color: r.color }}>
                  Zobrazit detail →
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Quick nav */}
      <div className="border-b border-border sticky top-14 z-40" style={{ background: 'hsl(222 22% 6% / 0.98)', backdropFilter: 'blur(8px)' }}>
        <div className="max-w-6xl mx-auto px-4">
          <div className="relative">
            {/* Fade right */}
            <div className="absolute right-0 top-0 bottom-0 w-10 pointer-events-none z-10" style={{ background: 'linear-gradient(to right, transparent, hsl(222 22% 6%))' }} />
            <div className="flex items-center gap-0 overflow-x-auto py-2.5" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {sectionGroups.map((group, gi) => (
                <div key={group.label} className={`flex items-center gap-0 flex-shrink-0 ${gi > 0 ? 'border-l border-white/10 ml-1 pl-1' : ''}`}>
                  {/* Group label */}
                  <span className="flex-shrink-0 text-[9px] font-bold uppercase tracking-wider px-2 py-1" style={{ color: group.color }}>
                    {group.label}
                  </span>
                  {group.sections.map((s) => (
                    <a
                      key={s.id}
                      href={`#${s.id}`}
                      className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
                    >
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: group.color }} />
                      <span className="whitespace-nowrap">{s.label}</span>
                    </a>
                  ))}
                </div>
              ))}
              {/* Spacer for fade */}
              <div className="flex-shrink-0 w-8" />
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-6xl mx-auto px-4 py-16 space-y-24">

        {/* ── 1. Registrace ── */}
        <section id="registrace" className="scroll-mt-28">
          <SectionHeader
            number="1"
            title="Registrace"
            description="Vytvoření zákaznického účtu trvá méně než 2 minuty. Registrace je zcela zdarma a umožní vám spravovat zásilky, sledovat historii a stahovat faktury."
          />
          <div className="grid md:grid-cols-2 gap-10 items-start">
            <div className="space-y-4">
              <StepItem n={1} text={`Otevřete stránku kuryr4you.cz a klikněte na tlačítko „Přihlásit se“ v pravém horním rohu, poté zvolte „Zaregistrujte se“.`} />
              <StepItem n={2} text="Vyplňte své jméno, e-mailovou adresu, telefonní číslo a zvolte heslo. Firemní zákazníci mohou doplnit název firmy a IČO." />
              <StepItem n={3} text={"Zaškrtněte souhlas s obchodními podmínkami a klikněte na „Vytvořit účet“. Na váš e-mail přijde potvrzovací zpráva."} />
              <StepItem n={4} text="Po potvrzení e-mailu se můžete ihned přihlásit a začít objednávat." />

              <div className="mt-6 p-4 rounded-xl border border-primary/20" style={{ background: 'hsl(38 92% 50% / 0.07)' }}>
                <div className="flex items-start gap-3">
                  <svg className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <p className="text-sm text-muted-foreground">
                    <strong className="text-foreground">Firemní zákazníci:</strong> Po registraci požádejte o aktivaci firemního účtu s 14denní fakturou. Schválení provádí náš dispečink zpravidla do 24 hodin.
                  </p>
                </div>
              </div>
            </div>
            <MockupRegistrace />
          </div>
        </section>

        {/* ── 2. Přihlášení ── */}
        <section id="prihlaseni" className="scroll-mt-28">
          <SectionHeader
            number="2"
            title="Přihlášení"
            description="K zákaznickému portálu se přihlásíte kdykoliv pomocí e-mailu a hesla. Portál je dostupný 24/7 na počítači i mobilním zařízení."
          />
          <div className="grid md:grid-cols-2 gap-10 items-start">
            <MockupPrihlaseni />
            <div className="space-y-4">
              <StepItem n={1} text='Na kuryr4you.cz klikněte na tlačítko „Přihlásit se" v navigaci.' />
              <StepItem n={2} text="Zadejte svůj e-mail a heslo. Systém vás automaticky přesměruje na váš zákaznický portál." />
              <StepItem n={3} text='Zapomenuté heslo? Klikněte na odkaz „Zapomenuté heslo?" a na zadaný e-mail vám přijde odkaz pro reset.' />

              <div className="mt-6 p-4 rounded-xl border border-border" style={{ background: 'hsl(222 18% 11%)' }}>
                <div className="text-xs font-heading font-semibold text-foreground mb-2">Dostupné zákaznické portály</div>
                <div className="space-y-1.5">
                  {[
                    { role: 'Zákazník', desc: 'Objednávky, sledování, faktury, správa adresy' },
                    { role: 'Dispečer', desc: 'Správa zásilek, přiřazení řidičů, přehled' },
                    { role: 'Řidič', desc: 'Přehled tras, navigace, potvrzení doručení' },
                  ].map((r) => (
                    <div key={r.role} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                      <div>
                        <span className="text-xs font-semibold text-foreground">{r.role}: </span>
                        <span className="text-xs text-muted-foreground">{r.desc}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── 3. Správa účtu ── */}
        <section id="sprava-uctu" className="scroll-mt-28">
          <SectionHeader
            number="3"
            title="Správa účtu"
            description="V zákaznickém portálu máte přehled o všech zásilkách, fakturách a nastavení profilu na jednom místě."
          />
          <div className="grid md:grid-cols-2 gap-10 items-start">
            <div className="space-y-4">
              <StepItem n={1} text="Po přihlášení se zobrazí přehledný dashboard se statistikami — počet zásilek, stav přepravy a nedávná aktivita." />
              <StepItem n={2} text='V sekci „Nastavení" lze editovat kontaktní údaje, fakturační adresu a IČO pro automatické generování faktur.' />
              <StepItem n={3} text="Firemní zákazníci mohou nastavit více kontaktních osob a různé doručovací adresy uložit jako oblíbené." />
              <StepItem n={4} text="Heslo lze kdykoliv změnit v nastavení účtu. Doporučujeme pravidelnou aktualizaci." />

              <div className="grid grid-cols-2 gap-3 mt-4">
                {[
                  { icon: '📦', label: 'Přehled zásilek', desc: 'Všechny aktivní i historické objednávky' },
                  { icon: '🗺️', label: 'Live tracking', desc: 'Poloha kurýra v reálném čase' },
                  { icon: '🧾', label: 'Faktury & účtenky', desc: 'Stažení PDF dokladů' },
                  { icon: '⚙️', label: 'Nastavení profilu', desc: 'Kontakty, adresy, heslo' },
                ].map((f) => (
                  <div key={f.label} className="p-3 rounded-xl border border-border" style={{ background: 'hsl(222 18% 11%)' }}>
                    <div className="text-lg mb-1">{f.icon}</div>
                    <div className="text-xs font-heading font-bold text-foreground">{f.label}</div>
                    <div className="text-[10px] text-muted-foreground">{f.desc}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <MockupDashboard />
              <MockupUcet />
            </div>
          </div>
        </section>

        {/* ── 4. Objednání kurýra ── */}
        <section id="objednani" className="scroll-mt-28">
          <SectionHeader
            number="4"
            title="Objednání kurýra"
            description="Zásilku objednáte přímo z portálu nebo z landing page bez nutnosti registrace. Celý proces trvá méně než 3 minuty."
          />
          <div className="grid md:grid-cols-2 gap-10 items-start">
            <MockupObjednat />
            <div className="space-y-4">
              <StepItem n={1} text={`V zákaznickém portálu klikněte na „+ Nová zásilka“ nebo navštivte kuryr4you.cz/objednat pro objednávku bez přihlášení.`} />
              <StepItem n={2} text="Zadejte adresu vyzvednutí — ulici, město, číslo popisné. Systém automaticky ověří adresu a doplní GPS souřadnice." />
              <StepItem n={3} text="Zadejte adresu doručení, jméno a telefon příjemce. Přidejte případné poznámky (kód do domu, patro, zvonek)." />
              <StepItem n={4} text="Vyplňte parametry zásilky: hmotnost v kg, rozměry a typ obsahu (standardní / křehké / expresní)." />
              <StepItem n={5} text="Zvolte požadovaný čas vyzvednutí — ihned (same day) nebo naplánujte konkrétní datum a hodinu." />

              <div className="p-4 rounded-xl border border-border space-y-2" style={{ background: 'hsl(222 18% 11%)' }}>
                <div className="text-xs font-heading font-bold text-foreground">Způsoby objednávky</div>
                <div className="space-y-2">
                  {[
                    { type: 'Registrovaný zákazník', desc: 'Plný portál, historie, faktury, uložené adresy, 14denní splatnost', color: 'hsl(142 71% 45%)' },
                    { type: 'Bez registrace', desc: 'Rychlá objednávka, platba kartou, potvrzení na e-mail', color: 'hsl(38 92% 50%)' },
                  ].map((t) => (
                    <div key={t.type} className="flex items-start gap-2">
                      <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: t.color }} />
                      <div>
                        <div className="text-xs font-semibold text-foreground">{t.type}</div>
                        <div className="text-[11px] text-muted-foreground">{t.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── 5. Ceny a kalkulace ── */}
        <section id="cena" className="scroll-mt-28">
          <SectionHeader
            number="5"
            title="Ceny a kalkulace"
            description="Cena je vždy vypočítána automaticky na základě vzdálenosti, hmotnosti a typu zásilky. Žádné skryté poplatky."
          />
          <div className="grid md:grid-cols-2 gap-10 items-start">
            <div className="space-y-4">
              <StepItem n={1} text={"Po vyplnění formuláře klikněte na „Spočítat cenu“. Systém cenu okamžitě vypočítá na základě trasy a parametrů zásilky."} />
              <StepItem n={2} text="Zobrazí se detailní rozpad ceny: základní poplatek, cena za km a případné příplatky za speciální manipulaci." />
              <StepItem n={3} text="Cena je garantovaná — pokud se trasa nezmění, zaplatíte přesně tuto částku." />

              <div className="p-4 rounded-xl border border-border space-y-3" style={{ background: 'hsl(222 18% 11%)' }}>
                <div className="text-xs font-heading font-bold text-foreground">Přehled základních sazeb</div>
                <div className="space-y-1.5">
                  {[
                    { service: 'Základní poplatek', price: '150 Kč' },
                    { service: 'Cena za km (Praha)', price: '15 Kč / km' },
                    { service: 'Cena za km (mimo Prahu)', price: '18 Kč / km' },
                    { service: 'Příplatek: expresní (do 2 h)', price: '+100 Kč' },
                    { service: 'Příplatek: křehké zboží', price: '+50 Kč' },
                    { service: 'Příplatek: nadrozměr (>30 kg)', price: '+80 Kč' },
                  ].map((r) => (
                    <div key={r.service} className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">{r.service}</span>
                      <span className="font-semibold text-foreground">{r.price}</span>
                    </div>
                  ))}
                </div>
                <div className="pt-2 border-t border-border text-[10px] text-muted-foreground">
                  * Firemní zákazníci s aktivní smlouvou mohou mít smluvní ceny.
                </div>
              </div>
            </div>
            <MockupCena />
          </div>
        </section>

        {/* ── 6. Platba ── */}
        <section id="platba" className="scroll-mt-28">
          <SectionHeader
            number="6"
            title="Platba"
            description="Platbu provedete bezpečně kartou přes Stripe nebo vystavíte fakturu se 14denní splatností (firemní zákazníci)."
          />
          <div className="grid md:grid-cols-2 gap-10 items-start">
            <MockupPlatba />
            <div className="space-y-4">
              <StepItem n={1} text="Zvolte způsob platby: kreditní / debetní karta nebo faktura (dostupná pouze pro schválené firemní účty)." />
              <StepItem n={2} text='Platba kartou probíhá přes zabezpečenou bránu Stripe — jsme PCI DSS certifikovaní. Klikněte na „Zaplatit kartou" a vyplňte údaje karty.' />
              <StepItem n={3} text="Po úspěšné platbě obdržíte e-mail s potvrzením objednávky a sledovacím odkazem. Zásilka je ihned zadána do systému." />
              <StepItem n={4} text='Firemní zákazníci mohou zvolit „Faktura 14 dní" — objednávka je vytvořena okamžitě, faktura se automaticky přiřadí do měsíčního vyúčtování.' />

              <div className="grid grid-cols-3 gap-3 mt-4">
                {[
                  { icon: '💳', label: 'Visa / Mastercard' },
                  { icon: '🍎', label: 'Apple Pay' },
                  { icon: '🏢', label: 'Faktura 14 dní' },
                ].map((p) => (
                  <div key={p.label} className="p-3 rounded-xl border border-border text-center" style={{ background: 'hsl(222 18% 11%)' }}>
                    <div className="text-xl mb-1">{p.icon}</div>
                    <div className="text-[10px] font-semibold text-foreground">{p.label}</div>
                  </div>
                ))}
              </div>

              <div className="p-3 rounded-xl border border-border flex items-start gap-3" style={{ background: 'hsl(222 18% 11%)' }}>
                <svg className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                <p className="text-xs text-muted-foreground">Veškeré platby jsou šifrovány pomocí TLS 1.3. Číslo vaší karty nikdy neprochází přes naše servery — zpracovává ho přímo Stripe.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── 7. Sledování zásilky ── */}
        <section id="sledovani" className="scroll-mt-28">
          <SectionHeader
            number="7"
            title="Sledování zásilky"
            description="Sledujte polohu kurýra v reálném čase přímo z mobilu. Sledovací odkaz lze sdílet i s příjemcem zásilky."
          />
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div className="space-y-4">
              <StepItem n={1} text="Po odeslání objednávky obdržíte e-mail se sledovacím odkazem. Odkaz nevyžaduje přihlášení — stačí ho otevřít v prohlížeči." />
              <StepItem n={2} text="Na mapě vidíte aktuální polohu kurýra, plánovanou trasu a odhadovaný čas doručení." />
              <StepItem n={3} text="Kontakt na kurýra je dostupný přímo z aplikace. V případě potřeby se domluvíte přímo telefonem." />
              <StepItem n={4} text="Sledovací odkaz lze jedním klikem sdílet s příjemcem zásilky — ví přesně, kdy má být doma." />

              <div className="p-4 rounded-xl border border-border space-y-2" style={{ background: 'hsl(222 18% 11%)' }}>
                <div className="text-xs font-heading font-bold text-foreground">Stavy zásilky</div>
                {[
                  { status: 'Přijato', desc: 'Objednávka zaznamenána, hledáme kurýra', color: 'hsl(210 12% 55%)' },
                  { status: 'Přiřazeno', desc: 'Kurýr potvrzen, míří na místo vyzvednutí', color: 'hsl(199 89% 48%)' },
                  { status: 'Vyzvednuto', desc: 'Zásilka u kurýra, na cestě k příjemci', color: 'hsl(38 92% 50%)' },
                  { status: 'Doručeno', desc: 'Zásilka předána, potvrzení odesláno e-mailem', color: 'hsl(142 71% 45%)' },
                ].map((s) => (
                  <div key={s.status} className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: s.color }} />
                    <div>
                      <span className="text-xs font-semibold" style={{ color: s.color }}>{s.status}: </span>
                      <span className="text-xs text-muted-foreground">{s.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-center">
              <MockupTracking />
            </div>
          </div>
        </section>

        {/* ── 8. Doručení a POD ── */}
        <section id="doruceni" className="scroll-mt-28">
          <SectionHeader
            number="8"
            title="Doručení a potvrzení předání"
            description="Po doručení zásilky kurýr pořídí fotografii a získá digitální podpis příjemce. Tento doklad obdržíte ihned na e-mail."
          />
          <div className="grid md:grid-cols-2 gap-10 items-start">
            <div className="space-y-4">
              <StepItem n={1} text="Kurýr při předání zásilky otevře aplikaci v telefonu a vyfotografuje doručenou zásilku na místě doručení." />
              <StepItem n={2} text="Příjemce podepíše digitálně přímo na displej kurýrovy aplikace. Podpis je okamžitě uložen do systému." />
              <StepItem n={3} text="Zákazník i odesílatel obdrží automatický e-mail s fotografií, podpisem, GPS souřadnicemi a časem doručení." />
              <StepItem n={4} text="Doklad o doručení (PDF) lze stáhnout kdykoliv z portálu v sekci detail zásilky." />

              <div className="p-4 rounded-xl border border-border" style={{ background: 'hsl(222 18% 11%)' }}>
                <div className="text-xs font-heading font-bold text-foreground mb-2">Co obsahuje Potvrzení o doručení (PDF)</div>
                <div className="space-y-1.5">
                  {[
                    'Datum a čas doručení',
                    'GPS souřadnice místa předání',
                    'Fotografie zásilky',
                    'Digitální podpis příjemce',
                    'Jméno kurýra',
                    'Číslo zásilky a reference',
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <svg className="w-3 h-3 text-primary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <MockupPOD />
          </div>
        </section>

        {/* ── 9. Faktury & účtenky ── */}
        <section id="faktury" className="scroll-mt-28">
          <SectionHeader
            number="9"
            title="Faktury a účtenky"
            description="Všechny daňové doklady jsou dostupné okamžitě ke stažení v zákaznickém portálu. Firemní zákazníci dostávají měsíční souhrnnou fakturu."
          />
          <div className="grid md:grid-cols-2 gap-10 items-start">
            <MockupFaktury />
            <div className="space-y-4">
              <StepItem n={1} text="Po dokončení zásilky je automaticky vystavena daňová účtenka dostupná ke stažení ve formátu PDF." />
              <StepItem n={2} text={"Registrovaní zákazníci najdou všechny doklady v portálu pod sekcí „Faktury & účtenky“, seřazené dle data."} />
              <StepItem n={3} text="Firemní zákazníci s aktivní smlouvou dostávají vždy 1. dne následujícího měsíce souhrnnou fakturu za všechny zásilky." />
              <StepItem n={4} text="Faktura obsahuje: jméno / firmu, IČO, DIČ, seznam všech zásilek s daty a cenami, celkovou částku a datum splatnosti." />

              <div className="p-4 rounded-xl border border-border space-y-3" style={{ background: 'hsl(222 18% 11%)' }}>
                <div className="text-xs font-heading font-bold text-foreground">Typy dokladů</div>
                <div className="space-y-2">
                  {[
                    { type: 'Daňová účtenka', desc: 'Automaticky po každé zásilce — pro fyzické osoby i firmy', icon: '🧾' },
                    { type: 'Faktura (měsíční)', desc: 'Souhrnná faktura pro firemní zákazníky s 14denní splatností', icon: '📑' },
                    { type: 'Potvrzení o doručení', desc: 'Foto + podpis — dokazuje, že zásilka byla doručena', icon: '📦' },
                  ].map((d) => (
                    <div key={d.type} className="flex items-start gap-3">
                      <span className="text-base">{d.icon}</span>
                      <div>
                        <div className="text-xs font-semibold text-foreground">{d.type}</div>
                        <div className="text-[11px] text-muted-foreground">{d.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-xl border border-primary/20 flex items-start gap-3" style={{ background: 'hsl(38 92% 50% / 0.07)' }}>
                <svg className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <p className="text-xs text-muted-foreground">Potřebujete vystavit fakturaci zpětně nebo přeposlat doklad? Napište nám na <span className="text-primary">gottstein@kuryr4you.cz</span></p>
              </div>
            </div>
          </div>
        </section>

        {/* ── 10. Dispečer ── */}
        <section id="dispecer" className="scroll-mt-28">
          <SectionHeader
            number="10"
            title="Pohled dispečera — správa zásilek"
            description="Dispečer má kompletní přehled nad všemi zásilkami a řidiči na jedné obrazovce. Živá mapa, kanban board a přiřazování tras — vše v reálném čase."
          />
          <div className="grid md:grid-cols-2 gap-10 items-start">
            <div className="space-y-4">
              <StepItem n={1} text="Na hlavní mapě dispečer vidí polohu všech aktivních řidičů v reálném čase. Každý řidič je barevně odlišen dle stavu zásilky." />
              <StepItem n={2} text={`Nová objednávka se automaticky zobrazí ve sloupci „Přijato" na kanban boardu. Dispečer ji jedním klikem přiřadí nejvhodnějšímu řidiči.`} />
              <StepItem n={3} text="Systém zobrazí optimální trasu (OSRM open routing) a odhadovaný čas doručení. Dispečer potvrdí přiřazení — řidič dostane notifikaci." />
              <StepItem n={4} text="Zásilka se automaticky posouvá přes kanban sloupce: Přijato → Přiřazeno → Vyzvednuto → Doručeno." />

              <div className="grid grid-cols-2 gap-3 mt-4">
                {[
                  { icon: '🗺️', label: 'Živá mapa', desc: 'GPS všech řidičů najednou' },
                  { icon: '📋', label: 'Kanban board', desc: 'Přehled stavů zásilek' },
                  { icon: '🔀', label: 'Přiřazení tras', desc: 'Optimalizace OSRM' },
                  { icon: '📊', label: 'Analytika', desc: 'Výkony a statistiky' },
                  { icon: '👥', label: 'Správa řidičů', desc: 'Směny, dostupnost' },
                  { icon: '📧', label: 'Notifikace', desc: 'E-maily zákazníkům' },
                  { icon: '📲', label: 'QR kódy', desc: 'QR pro sledovací odkaz' },
                  { icon: '⌘K', label: 'Rychlé hledání', desc: 'Okamžité vyhledání zásilky' },
                ].map(f => (
                  <div key={f.label} className="p-3 rounded-xl border border-border" style={{ background: 'hsl(222 18% 11%)' }}>
                    <div className="text-lg mb-1">{f.icon}</div>
                    <div className="text-xs font-heading font-bold text-foreground">{f.label}</div>
                    <div className="text-[10px] text-muted-foreground">{f.desc}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <MockupDispecerMapa />
              <MockupKanban />
            </div>
          </div>
        </section>

        {/* ── 11. Řidič ── */}
        <section id="ridic" className="scroll-mt-28">
          <SectionHeader
            number="11"
            title="Pohled řidiče — mobilní aplikace"
            description="Řidič pracuje výhradně z mobilního prohlížeče. Vidí přidělené zásilky, naviguje se na místo a potvrzuje doručení fotkou a podpisem."
          />
          <div className="grid md:grid-cols-2 gap-10 items-start">
            <div className="flex flex-col sm:flex-row gap-6 justify-center sm:justify-start">
              <MockupRidicZakazky />
              <MockupRidicApp />
            </div>
            <div className="space-y-4">
              <StepItem n={1} text="Řidič se přihlásí na kuryr4you.cz/ridic z jakéhokoliv smartphonu. Žádná instalace aplikace není potřeba — vše běží v prohlížeči." />
              <StepItem n={2} text="Na hlavní obrazovce vidí seznam zásilek na aktuální směnu: stav (čeká, aktivní, dokončeno), adresu a kontakt na příjemce." />
              <StepItem n={3} text="Po kliknutí na zásilku se otevře navigace s optimální trasou. Odhadovaný čas doručení se průběžně aktualizuje a zákazník ho vidí na svém sledovacím odkazu." />
              <StepItem n={4} text="Na místě doručení řidič vyfotografuje zásilku a příjemce se podepíše prstem na displej. Potvrzení je okamžitě uloženo a odesláno zákazníkovi e-mailem." />

              <div className="p-4 rounded-xl border border-border space-y-3" style={{ background: 'hsl(222 18% 11%)' }}>
                <div className="text-xs font-heading font-bold text-foreground">Funkce řidičské části</div>
                <div className="space-y-2">
                  {[
                    { icon: '📱', label: 'Bez instalace', desc: 'Funguje v jakémkoliv mobilním prohlížeči' },
                    { icon: '🧭', label: 'GPS navigace', desc: 'Optimalizovaná trasa s OSRM routingem' },
                    { icon: '📸', label: 'Foto doručení', desc: 'Pořídí fotku při předání zásilky' },
                    { icon: '✍️', label: 'Digitální podpis', desc: 'Příjemce podepíše přímo na displej' },
                    { icon: '📅', label: 'Sdílený kalendář', desc: 'Přehled směn a dostupnosti kolegů' },
                    { icon: '⭐', label: 'Hodnocení', desc: 'Zákazníci hodnotí doručení' },
                  ].map(f => (
                    <div key={f.label} className="flex items-start gap-3">
                      <span className="text-base">{f.icon}</span>
                      <div>
                        <div className="text-xs font-semibold text-foreground">{f.label}</div>
                        <div className="text-[11px] text-muted-foreground">{f.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-xl border border-primary/20 flex items-start gap-3" style={{ background: 'hsl(38 92% 50% / 0.07)' }}>
                <svg className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <p className="text-xs text-muted-foreground">
                  <strong className="text-foreground">Sdílený kalendář dostupnosti:</strong>{' '}
                  Všichni řidiči vidí, kdo je v jaký den k dispozici. Dispečer jednoduše plánuje směny a zákazníci vědí, kdy jsou kurýři dostupní.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* API Integrace */}
        <section id="api" className="scroll-mt-28">
          <SectionHeader
            number="12"
            title="API integrace pro e-shopy a firmy"
            description="Propojte svůj e-shop nebo informační systém s Kurýr4You přes REST API. Zadávejte zásilky automaticky, dostávejte webhooky o stavu doručení."
          />
          <div className="grid md:grid-cols-2 gap-10 items-start">
            <div className="space-y-6">
              <StepItem n={1} text="Kontaktujte nás a získejte firemní účet se schváleným API přístupem. API klíč vygeneruje dispečer přímo ve vašem profilu — zobrazí se jednou a uložte si ho." />
              <StepItem n={2} text="Při každé objednávce v e-shopu odešlete jeden HTTP POST na /api/v1/order s adresou vyzvednutí, doručení a kontaktními údaji. V odpovědi dostanete číslo zásilky a sledovací odkaz, který pošlete zákazníkovi." />
              <StepItem n={3} text="Nastavte Webhook URL ve svém profilu. Při každé změně stavu zásilky (vyzvednutí → tranzit → doručení) vám přijde POST s JSON payloadem podepsaným HMAC-SHA256 signaturou." />
              <StepItem n={4} text="Sledovací odkaz vložte do e-mailu zákazníkovi nebo ho zobrazujte ve svém portálu. Zákazník vidí polohu kurýra v reálném čase — bez přihlášení, na jakémkoliv zařízení." />

              {/* Stav flow */}
              <div className="p-4 rounded-xl border border-border space-y-3" style={{ background: 'hsl(222 18% 11%)' }}>
                <div className="text-xs font-heading font-bold text-foreground">Stavy zásilky (webhook events)</div>
                <div className="space-y-2">
                  {[
                    { status: 'pending', label: 'Čeká na schválení', color: 'text-yellow-400/80' },
                    { status: 'approved', label: 'Schváleno dispečerem', color: 'text-blue-400/80' },
                    { status: 'assigned', label: 'Přiděleno řidiči', color: 'text-blue-400/80' },
                    { status: 'pickup', label: 'Zásilka vyzvedávána', color: 'text-orange-400/80' },
                    { status: 'transit', label: 'Na cestě k příjemci', color: 'text-primary' },
                    { status: 'delivered', label: 'Doručeno ✓', color: 'text-green-400/80' },
                    { status: 'cancelled', label: 'Zrušeno', color: 'text-red-400/80' },
                  ].map(s => (
                    <div key={s.status} className="flex items-center gap-3">
                      <code className={`text-[11px] font-mono px-2 py-0.5 rounded border border-border ${s.color}`} style={{ background: 'hsl(222 22% 8%)' }}>{s.status}</code>
                      <span className="text-[11px] text-muted-foreground">{s.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {/* Create order */}
              <div className="rounded-xl border border-border overflow-hidden" style={{ background: 'hsl(222 24% 7%)' }}>
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border" style={{ background: 'hsl(222 24% 9%)' }}>
                  <span className="text-xs font-mono font-bold text-primary">POST</span>
                  <span className="text-xs font-mono text-muted-foreground">/api/v1/order</span>
                </div>
                <pre className="p-4 text-xs font-mono leading-relaxed overflow-x-auto text-foreground/80">{`Authorization: Bearer k4y_abc123...
Content-Type: application/json

{
  "pickup": "Václavské nám. 1, Praha 1",
  "delivery": "Náměstí Míru 5, Praha 2",
  "cargoType": "parcel",
  "cargoDescription": "Objednávka #54321",
  "deliveryContactName": "Jan Novák",
  "deliveryContactPhone": "+420 777 123 456",
  "quantity": 1,
  "weight": 2.5
}`}</pre>
                <div className="border-t border-border mx-4" />
                <pre className="px-4 py-3 text-xs font-mono leading-relaxed overflow-x-auto" style={{ color: 'hsl(141 76% 60% / 0.85)' }}>{`HTTP 201 Created
{
  "success": true,
  "rideNumber": "K260615-0042",
  "trackingToken": "a1b2c3...",
  "trackingUrl": "https://kuryr4you.cz/sledovani/a1b2..."
}`}</pre>
              </div>

              {/* Status check */}
              <div className="rounded-xl border border-border overflow-hidden" style={{ background: 'hsl(222 24% 7%)' }}>
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border" style={{ background: 'hsl(222 24% 9%)' }}>
                  <span className="text-xs font-mono font-bold text-blue-400">GET</span>
                  <span className="text-xs font-mono text-muted-foreground">/api/v1/status?token=…</span>
                </div>
                <pre className="p-4 text-xs font-mono leading-relaxed overflow-x-auto" style={{ color: 'hsl(141 76% 60% / 0.85)' }}>{`{
  "rideNumber": "K260615-0042",
  "status": "transit",
  "trackingUrl": "https://kuryr4you.cz/sledovani/...",
  "pickupAddress": "Václavské nám. 1, Praha",
  "deliveryAddress": "Náměstí Míru 5, Praha",
  "requestedDeliveryAt": 1750000000000
}`}</pre>
              </div>

              {/* Webhook payload */}
              <div className="rounded-xl border border-primary/25 overflow-hidden" style={{ background: 'hsl(222 24% 7%)' }}>
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-primary/25" style={{ background: 'hsl(38 92% 50% / 0.06)' }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  <span className="text-xs font-mono font-bold text-primary">WEBHOOK EVENT → váš endpoint</span>
                </div>
                <pre className="p-4 text-xs font-mono leading-relaxed overflow-x-auto text-foreground/80">{`X-Kuryr4You-Event: status_changed
X-Kuryr4You-Signature: sha256=abc123...

{
  "event": "status_changed",
  "status": "delivered",
  "rideNumber": "K260615-0042",
  "trackingUrl": "https://kuryr4you.cz/sledovani/...",
  "timestamp": "2026-06-15T14:32:00Z"
}`}</pre>
              </div>

              <div className="p-3 rounded-xl border border-primary/20 flex items-start gap-3" style={{ background: 'hsl(38 92% 50% / 0.07)' }}>
                <svg className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <p className="text-xs text-muted-foreground">
                  <strong className="text-foreground">API přístup mají pouze schválené firemní účty.</strong>{' '}
                  Pro spuštění integrace napište na{' '}
                  <a href="mailto:petr.gottstein@gmail.com" className="text-primary hover:underline">petr.gottstein@gmail.com</a>{' '}
                  nebo zavolejte na dispečink. API klíč obdržíte do 24 hodin.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── 13. Hodnocení zásilky ── */}
        <section id="hodnoceni" className="scroll-mt-28">
          <SectionHeader
            number="13"
            title="Hodnocení doručení"
            description="Po každém doručení zákazník dostane e-mail s odkazem na hodnocení kurýra. Stačí kliknout — žádné přihlášení, žádný formulář."
          />
          <div className="grid md:grid-cols-2 gap-10 items-start">
            <div className="space-y-4">
              <StepItem n={1} text="Po doručení zásilky systém automaticky odešle zákazníkovi e-mail s potvrzením a unikátním odkazem na hodnocení." />
              <StepItem n={2} text="Zákazník klikne na odkaz — otevře se jednoduchá stránka s trasou zásilky a hvězdičkovým hodnocením (1–5 hvězdiček)." />
              <StepItem n={3} text="Volitelně přidá krátký komentář a odešle hodnocení. Hodnotit lze pouze jednou — odkaz pak expiruje." />
              <StepItem n={4} text="Dispečer vidí průměrné hodnocení každého řidiče v přehledu výkonů. Řidič vidí svůj průměr na hlavní obrazovce." />

              <div className="p-4 rounded-xl border border-border space-y-3" style={{ background: 'hsl(222 18% 11%)' }}>
                <div className="text-xs font-heading font-bold text-foreground">Jak funguje hodnocení</div>
                <div className="space-y-2">
                  {[
                    { icon: '📬', label: 'Automatický e-mail', desc: 'Ihned po označení zásilky jako „Doručeno"' },
                    { icon: '🔗', label: 'Bez přihlášení', desc: 'Odkaz funguje pro kohokoli bez nutnosti účtu' },
                    { icon: '⭐', label: '1–5 hvězdiček', desc: 'Jednoduché hodnocení + volitelný komentář' },
                    { icon: '📊', label: 'Statistiky výkonu', desc: 'Průměr a histogram v profilu řidiče' },
                  ].map(f => (
                    <div key={f.label} className="flex items-start gap-3">
                      <span className="text-base">{f.icon}</span>
                      <div>
                        <div className="text-xs font-semibold text-foreground">{f.label}</div>
                        <div className="text-[11px] text-muted-foreground">{f.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-xl border border-primary/20 flex items-start gap-3" style={{ background: 'hsl(38 92% 50% / 0.07)' }}>
                <svg className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <p className="text-xs text-muted-foreground">
                  <strong className="text-foreground">Hodnocení motivuje řidiče k lepším výkonům.</strong>{' '}
                  Dispečer může využít statistiky hodnocení při plánování prémiových tras nebo bonusového ohodnocení.
                </p>
              </div>
            </div>
            <div className="flex justify-center">
              <MockupHodnoceni />
            </div>
          </div>
        </section>

        {/* ── 14. Šablony zásilek ── */}
        <section id="sablony" className="scroll-mt-28">
          <SectionHeader
            number="14"
            title="Šablony opakujících se zásilek"
            description="Objednáváte pravidelně stejnou trasu? Uložte ji jako šablonu a příště objednáte jedním klikem — bez opakovaného vyplňování formuláře."
          />
          <div className="grid md:grid-cols-2 gap-10 items-start">
            <MockupSablony />
            <div className="space-y-4">
              <StepItem n={1} text={`Při objednávání nové zásilky zaškrtněte „Uložit jako šablonu“ a pojmenujte ji (např. „Sklad → Showroom“).`} />
              <StepItem n={2} text={`Šablona se uloží do sekce „Šablony zásilek“ ve vašem portálu. Máte přehled všech uložených tras na jednom místě.`} />
              <StepItem n={3} text={`Kliknutím na „Objednat“ u šablony se předvyplní celý formulář se všemi adresami a parametry zásilky.`} />
              <StepItem n={4} text="Šablony lze aktivovat / deaktivovat nebo smazat. Firemní zákazníci mohou mít neomezený počet šablon." />

              <div className="p-4 rounded-xl border border-border space-y-3" style={{ background: 'hsl(222 18% 11%)' }}>
                <div className="text-xs font-heading font-bold text-foreground">Ideální pro pravidelné přepravy</div>
                <div className="space-y-2">
                  {[
                    { icon: '🏭', label: 'Sklad → Odběratel', desc: 'Pravidelné rozvážky zboží' },
                    { icon: '🛒', label: 'E-shop objednávky', desc: 'Standardní balík od vás k zákazníkovi' },
                    { icon: '📁', label: 'Firemní dokumenty', desc: 'Smlouvy, faktury, zásilky mezi pobočkami' },
                    { icon: '🔄', label: 'Opakované dovozy', desc: 'Pravidelný odběr od dodavatele' },
                  ].map(f => (
                    <div key={f.label} className="flex items-start gap-3">
                      <span className="text-base">{f.icon}</span>
                      <div>
                        <div className="text-xs font-semibold text-foreground">{f.label}</div>
                        <div className="text-[11px] text-muted-foreground">{f.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── 15. QR kódy & rychlé vyhledávání ── */}
        <section id="vyhledavani" className="scroll-mt-28">
          <SectionHeader
            number="15"
            title="QR kódy a rychlé vyhledávání"
            description="Dispečer má k dispozici nástroje, které zrychlují každodenní práci — QR kód ke každé zásilce a okamžité vyhledávání přes celou platformu."
          />
          <div className="grid md:grid-cols-2 gap-10 items-start">
            <div className="space-y-4">
              <div>
                <div className="text-sm font-heading font-bold text-foreground mb-3 flex items-center gap-2">
                  <div className="w-5 h-5 rounded flex items-center justify-center text-xs" style={{ background: 'hsl(38 92% 50%)', color: 'hsl(222 20% 8%)' }}>QR</div>
                  QR kód sledování
                </div>
                <div className="space-y-3">
                  <StepItem n={1} text='V přehledu zásilek klikněte na tlačítko „QR" u jakékoli zásilky — okamžitě se zobrazí QR kód.' />
                  <StepItem n={2} text="QR kód nasměruje příjemce přímo na sledovací stránku zásilky — bez zadávání URL nebo čísla zásilky." />
                  <StepItem n={3} text="QR kód lze stáhnout jako PNG a vytisknout na štítek balíku nebo přiložit k průvodce zásilky." />
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <div className="text-sm font-heading font-bold text-foreground mb-3 flex items-center gap-2">
                  <div className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-mono" style={{ background: 'hsl(199 89% 48% / 0.15)', color: 'hsl(199 89% 48%)' }}>⌘K</div>
                  Globální vyhledávání
                </div>
                <div className="space-y-3">
                  <StepItem n={1} text='Stiskněte ⌘K (Mac) nebo Ctrl+K (Windows/Linux) odkudkoliv v dispečerském portálu.' />
                  <StepItem n={2} text="Začněte psát číslo zásilky, jméno zákazníka nebo adresu — výsledky se zobrazují okamžitě v reálném čase." />
                  <StepItem n={3} text="Z výsledků se jedním klikem přejde přímo na detail zásilky nebo profil zákazníka. ESC zavře paletu." />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <MockupQRKod />
              <MockupCommandPalette />
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="rounded-2xl border border-primary/20 p-10 text-center relative overflow-hidden" style={{ background: 'linear-gradient(135deg, hsl(38 92% 50% / 0.1) 0%, hsl(222 20% 8%) 60%)' }}>
          <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full opacity-20 pointer-events-none" style={{ background: 'radial-gradient(circle, hsl(38 92% 50%) 0%, transparent 70%)' }} />
          <div className="relative">
            <h2 className="font-heading text-3xl sm:text-4xl font-black uppercase text-foreground mb-3">
              Připraveni začít?
            </h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Objednejte první zásilku — bez registrace, ihned, za jasnou cenu.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/objednat"
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-heading font-bold text-sm bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 10V7" /></svg>
                Objednat kurýra bez registrace
              </Link>
              <Link
                to="/registrace"
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-heading font-bold text-sm border border-border text-foreground hover:border-primary/50 transition-colors"
              >
                Vytvořit firemní účet
              </Link>
            </div>
            <p className="mt-5 text-xs text-muted-foreground">
              Potřebujete poradit? Zavolejte <a href="tel:+420725748507" className="text-primary hover:underline">+420 725 748 507</a> — dispečink 24/7
            </p>
          </div>
        </section>

      </div>

      {/* Footer */}
      <footer className="border-t border-border py-8 mt-8" style={{ background: 'hsl(222 22% 6%)' }}>
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-muted-foreground">
          <span>© 2006 Kurýr4You by Gotty s.r.o.</span>
          <div className="flex gap-4">
            <Link to="/" className="hover:text-foreground transition-colors">← Zpět na hlavní stránku</Link>
            <a href="tel:+420725748507" className="hover:text-foreground transition-colors">+420 725 748 507</a>
          </div>
        </div>
      </footer>

    </div>
  )
}
