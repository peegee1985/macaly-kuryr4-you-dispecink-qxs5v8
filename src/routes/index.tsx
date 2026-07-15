import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useConvexAuth } from 'convex/react'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import { FuelPricesSection } from '@/components/FuelPricesSection'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const me = useQuery(api.users.getMe)
  const navigate = useNavigate()

  useEffect(() => {
    if (!isLoading && isAuthenticated && me !== undefined) {
      if (!me) {
        navigate({ to: '/dokoncit-registraci' })
        return
      }
      if (me.role === 'dispatcher') navigate({ to: '/dispatcer' })
      else if (me.role === 'driver') navigate({ to: '/ridic' })
      else if (me.role === 'service_driver') navigate({ to: '/ridic/vending' })
      else if (me.role === 'vending_supervisor') navigate({ to: '/vending-portal' })
      else if (me.role === 'customer') navigate({ to: '/zakaznik' })
    }
  }, [isAuthenticated, isLoading, me, navigate])

  if (isLoading || (isAuthenticated && me === undefined)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (isAuthenticated) return null

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <div style={{ background: 'hsl(222 22% 6%)' }} className="border-b border-border py-2">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between">
          <a href="tel:+420725748507" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            +420 725 748 507
          </a>
          <div className="flex items-center gap-3">
            {/* Social icons */}
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" /></svg>
            </a>
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
            </a>
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.174-.105-.949-.2-2.403.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24.009 12.017 24c6.621 0 11.985-5.367 11.985-11.987C24.002 5.367 18.638.001 12.017.001z" /></svg>
            </a>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-border" style={{ background: 'hsl(222 20% 8% / 0.97)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-16">
          {/* Logo */}
          <a href="#" className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-heading font-bold text-foreground leading-none">KURÝR4YOU</div>
              <div className="text-xs text-muted-foreground leading-none mt-0.5">Same Day Delivery & Taxi</div>
            </div>
          </a>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#sluzby" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Služby</a>
            <a href="#o-nas" className="text-sm text-muted-foreground hover:text-foreground transition-colors">O nás</a>
            <Link to="/jak-to-funguje" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Jak to funguje?</Link>
            <a href="#kontakt" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Kontakt</a>
          </div>

          {/* CTA buttons */}
          <div className="flex items-center gap-2">
            <Link
              to="/objednat"
              className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-heading font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 10V7" />
              </svg>
              Objednat kurýra
            </Link>
            <Link
              to="/prihlaseni"
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-heading font-semibold text-foreground border border-border hover:border-primary/50 transition-colors"
              style={{ background: 'hsl(217 91% 55%)' }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Přihlásit se
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden" style={{ background: 'hsl(20 30% 10%)' }}>
        {/* Geometric shapes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -right-32 -top-32 w-96 h-96 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, hsl(38 92% 50%) 0%, transparent 70%)' }} />
          <div className="absolute right-16 top-8 w-64 h-64 rounded-full opacity-10 border border-primary/30" />
          <div className="absolute right-32 top-24 w-40 h-40 rounded-full opacity-8 border border-primary/20" />
          <div className="absolute -left-16 bottom-0 w-48 h-48 rounded-full opacity-5" style={{ background: 'radial-gradient(circle, hsl(38 92% 50%) 0%, transparent 70%)' }} />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 py-20 md:py-28">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full border border-primary/40 text-xs font-medium text-primary" style={{ background: 'hsl(38 92% 50% / 0.1)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            NONSTOP 24/7 — Same Day Delivery Praha
          </div>

          {/* Headline */}
          <h1 className="font-heading text-5xl sm:text-6xl md:text-7xl font-black leading-none mb-6 uppercase">
            <span className="text-foreground block">KURÝR &amp; TAXI</span>
            <span className="text-primary block">SAME DAY</span>
            <span className="text-foreground block">DELIVERY</span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg text-muted-foreground max-w-lg mb-4">
            Flexibilně, včas a za rozumnou cenu. Rodinná firma s 20 lety zkušeností v oblasti kurýrních a balíkových služeb.
          </p>
          <p className="text-sm text-muted-foreground/70 mb-8">
            Nákladní doprava do 3,5t · Kurýrní a balíková služba · Same Day Delivery · Taxi
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-wrap gap-3">
            <Link
              to="/objednat"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-heading font-bold text-sm bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Objednat online
            </Link>
            <a
              href="tel:+420725748507"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-heading font-semibold text-sm border border-border text-foreground hover:border-primary/50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              +420 725 748 507
            </a>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section style={{ background: 'hsl(222 22% 6%)' }} className="border-y border-border">
        <div className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {[
            { value: '20+', label: 'let zkušeností' },
            { value: '24/7', label: 'nonstop provoz' },
            { value: '30min', label: 'express doručení' },
            { value: '3.5t', label: 'max. nosnost' },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="text-3xl font-heading font-black text-primary">{stat.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Services */}
      <section id="sluzby" className="py-20 max-w-6xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="font-heading text-3xl font-black uppercase text-foreground mb-3">Co nabízíme</h2>
          <p className="text-muted-foreground">Komplexní služby v oblasti nákladní autodopravy pro firmy i jednotlivce.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            {
              tag: 'Rush 30/60/90 min',
              title: 'Express kurýr',
              desc: 'Expresní doručení do 30 minut. Kdy potřebujete zásilku co nejrychleji.',
              icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              ),
            },
            {
              tag: 'Tentýž den',
              title: 'Same Day Delivery',
              desc: 'Objednejte ráno, doručíme ještě dnes. Ideální pro firmy a e-shopy.',
              icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ),
            },
            {
              tag: 'B2B služby',
              title: 'Pravidelný svoz',
              desc: 'Denní svozová trasa pro vaši firmu. Smluvní podmínky a platba na fakturu.',
              icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1" />
                </svg>
              ),
            },
            {
              tag: 'E-shop doprava',
              title: '4E-shop',
              desc: 'Kurýrní služby pro e-shopy. Rozvozy balíků vašim zákazníkům.',
              icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 10V7" />
                </svg>
              ),
            },
            {
              tag: 'Bezpečný převoz',
              title: 'Pojištěná zásilka',
              desc: 'Každá zásilka je pojištěna. Dodávky L1H1 až L4H3, do 3,5 tuny.',
              icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              ),
            },
            {
              tag: 'Live tracking',
              title: 'GPS sledování',
              desc: 'Sledujte svou zásilku v reálném čase. SMS a e-mail notifikace.',
              icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              ),
            },
          ].map((service) => (
            <div key={service.title} className="p-6 rounded-xl border border-border bg-card hover:border-primary/30 transition-colors group">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4 text-primary" style={{ background: 'hsl(38 92% 50% / 0.12)' }}>
                {service.icon}
              </div>
              <div className="text-xs font-medium text-primary uppercase tracking-wider mb-1">{service.tag}</div>
              <h3 className="font-heading font-bold text-foreground text-lg mb-2">{service.title}</h3>
              <p className="text-sm text-muted-foreground">{service.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* B2B API Integration */}
      <section id="api-integrace" className="py-24 border-t border-border" style={{ background: 'hsl(222 20% 8%)' }}>
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col lg:flex-row gap-14 items-start">
            {/* Left: text */}
            <div className="flex-1 min-w-0">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 mb-6" style={{ background: 'hsl(38 92% 50% / 0.08)' }}>
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-xs font-heading font-bold uppercase tracking-widest text-primary">REST API &amp; Webhooks</span>
              </div>
              <h2 className="font-heading text-4xl sm:text-5xl font-black uppercase leading-tight mb-5">
                <span className="text-foreground">Napojte svůj</span>
                <br />
                <span className="text-primary">e-shop za hodiny</span>
              </h2>
              <p className="text-muted-foreground text-lg mb-8 max-w-lg">
                Máte e-shop nebo interní systém? Propojte ho s Kurýr4You jedním API voláním — bez manuální práce, bez telefonování.
                Zákazník nakoupí, objednávka létí k nám, zásilka dorazí.
              </p>

              <div className="space-y-5 mb-10">
                {[
                  {
                    icon: (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    ),
                    title: 'REST API',
                    desc: 'Objednávka jedním HTTP POST voláním. JSON formát, Bearer token autentizace.',
                  },
                  {
                    icon: (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                    ),
                    title: 'Webhooks v reálném čase',
                    desc: 'Dostávejte push notifikaci na váš server při každé změně stavu zásilky — vyzvednutí, tranzit, doručení.',
                  },
                  {
                    icon: (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                      </svg>
                    ),
                    title: 'Tracking API',
                    desc: 'Sledovací odkaz pro každou zásilku — vložte ho do e-mailu zákazníkovi nebo do vlastního portálu.',
                  },
                  {
                    icon: (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    ),
                    title: 'HMAC podpis webhooků',
                    desc: 'Každý webhook je podepsán SHA-256 HMAC — ověřte, že notifikace přišla opravdu od nás.',
                  },
                  {
                    icon: (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    ),
                    title: 'Platba na fakturu',
                    desc: 'Firemní zákazníci dostávají souhrnnou fakturu za 14 dní — žádné platby kartou za každou zásilku.',
                  },
                ].map(f => (
                  <div key={f.title} className="flex items-start gap-4">
                    <div className="w-9 h-9 flex-shrink-0 rounded-lg flex items-center justify-center text-primary" style={{ background: 'hsl(38 92% 50% / 0.12)' }}>
                      {f.icon}
                    </div>
                    <div>
                      <div className="font-heading font-bold text-sm text-foreground">{f.title}</div>
                      <div className="text-sm text-muted-foreground mt-0.5">{f.desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <a
                  href="mailto:petr.gottstein@gmail.com?subject=API%20integrace%20%E2%80%94%20z%C3%A1jem&body=Dobr%C3%BD%20den%2C%20m%C3%A1m%20z%C3%A1jem%20o%20API%20integraci%20pro%20sv%C5%AFj%20e-shop."
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-heading font-bold text-sm bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  Kontaktovat pro API přístup
                </a>
                <Link
                  to="/jak-to-funguje"
                  hash="api"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-heading font-bold text-sm border border-border text-foreground hover:border-primary/50 transition-colors"
                >
                  Dokumentace API →
                </Link>
              </div>
            </div>

            {/* Right: code mockup */}
            <div className="flex-1 min-w-0 lg:max-w-[520px] w-full">
              {/* Terminal mockup */}
              <div className="rounded-xl border border-border overflow-hidden shadow-2xl" style={{ background: 'hsl(222 24% 7%)' }}>
                {/* Title bar */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-border" style={{ background: 'hsl(222 24% 9%)' }}>
                  <span className="w-3 h-3 rounded-full bg-red-500/60" />
                  <span className="w-3 h-3 rounded-full bg-yellow-500/60" />
                  <span className="w-3 h-3 rounded-full bg-green-500/60" />
                  <span className="ml-2 text-xs text-muted-foreground font-mono">POST /api/v1/order</span>
                </div>
                <div className="p-5 font-mono text-xs leading-relaxed overflow-x-auto">
                  <div className="text-muted-foreground mb-1"># Vytvoření zásilky z e-shopu</div>
                  <div><span className="text-primary font-bold">curl</span> <span className="text-foreground">-X POST \</span></div>
                  <div className="pl-4"><span className="text-yellow-400/90">"https://api.kuryr4you.cz/api/v1/order"</span> <span className="text-foreground">\</span></div>
                  <div className="pl-4"><span className="text-foreground">-H </span><span className="text-green-400/90">"Authorization: Bearer k4y_abc123..."</span> <span className="text-foreground">\</span></div>
                  <div className="pl-4"><span className="text-foreground">-H </span><span className="text-green-400/90">"Content-Type: application/json"</span> <span className="text-foreground">\</span></div>
                  <div className="pl-4 text-foreground">-d '<span className="text-blue-300/90">{"{"}</span></div>
                  <div className="pl-8"><span className="text-blue-300/90">"pickup"</span><span className="text-foreground">: </span><span className="text-yellow-400/90">"Václavské nám. 1, Praha"</span><span className="text-foreground">,</span></div>
                  <div className="pl-8"><span className="text-blue-300/90">"delivery"</span><span className="text-foreground">: </span><span className="text-yellow-400/90">"Náměstí Míru 5, Praha"</span><span className="text-foreground">,</span></div>
                  <div className="pl-8"><span className="text-blue-300/90">"cargoType"</span><span className="text-foreground">: </span><span className="text-yellow-400/90">"parcel"</span><span className="text-foreground">,</span></div>
                  <div className="pl-8"><span className="text-blue-300/90">"deliveryContactName"</span><span className="text-foreground">: </span><span className="text-yellow-400/90">"Jan Novák"</span><span className="text-foreground">,</span></div>
                  <div className="pl-8"><span className="text-blue-300/90">"deliveryContactPhone"</span><span className="text-foreground">: </span><span className="text-yellow-400/90">"+420 777 000 111"</span></div>
                  <div className="pl-4 text-blue-300/90">{"}"}'</div>
                </div>
                {/* Response */}
                <div className="border-t border-border mx-5 mb-1" />
                <div className="px-5 pb-5 font-mono text-xs leading-relaxed">
                  <div className="text-muted-foreground mb-1"># HTTP 201 — odpověď</div>
                  <div className="text-blue-300/90">{"{"}</div>
                  <div className="pl-4"><span className="text-blue-300/90">"success"</span><span className="text-foreground">: </span><span className="text-green-400/90">true</span><span className="text-foreground">,</span></div>
                  <div className="pl-4"><span className="text-blue-300/90">"rideNumber"</span><span className="text-foreground">: </span><span className="text-yellow-400/90">"K260615-0042"</span><span className="text-foreground">,</span></div>
                  <div className="pl-4"><span className="text-blue-300/90">"trackingUrl"</span><span className="text-foreground">: </span><span className="text-yellow-400/90">"https://kuryr4you.cz/sledovani/abc..."</span></div>
                  <div className="text-blue-300/90">{"}"}</div>
                </div>
              </div>

              {/* Webhook event */}
              <div className="mt-4 rounded-xl border border-primary/20 overflow-hidden" style={{ background: 'hsl(222 24% 7%)' }}>
                <div className="flex items-center gap-3 px-4 py-3 border-b border-primary/20" style={{ background: 'hsl(38 92% 50% / 0.06)' }}>
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-xs text-primary font-mono font-bold">WEBHOOK EVENT → váš server</span>
                </div>
                <div className="p-4 font-mono text-xs leading-relaxed">
                  <div className="text-blue-300/90">{"{"}</div>
                  <div className="pl-4"><span className="text-blue-300/90">"event"</span><span className="text-foreground">: </span><span className="text-yellow-400/90">"status_changed"</span><span className="text-foreground">,</span></div>
                  <div className="pl-4"><span className="text-blue-300/90">"status"</span><span className="text-foreground">: </span><span className="text-green-400/90">"delivered"</span><span className="text-foreground">,</span></div>
                  <div className="pl-4"><span className="text-blue-300/90">"rideNumber"</span><span className="text-foreground">: </span><span className="text-yellow-400/90">"K260615-0042"</span><span className="text-foreground">,</span></div>
                  <div className="pl-4"><span className="text-blue-300/90">"trackingUrl"</span><span className="text-foreground">: </span><span className="text-yellow-400/90">"https://..."</span><span className="text-foreground">,</span></div>
                  <div className="pl-4"><span className="text-blue-300/90">"timestamp"</span><span className="text-foreground">: </span><span className="text-yellow-400/90">"2026-06-15T14:32:00Z"</span></div>
                  <div className="text-blue-300/90">{"}"}</div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3">
                {[
                  { label: 'Latence', value: '< 100ms' },
                  { label: 'Uptime SLA', value: '99.9 %' },
                  { label: 'Formát', value: 'JSON' },
                ].map(stat => (
                  <div key={stat.label} className="rounded-lg border border-border p-3 text-center" style={{ background: 'hsl(222 24% 9%)' }}>
                    <div className="font-heading font-black text-lg text-primary">{stat.value}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About */}
      <section id="o-nas" className="py-20 border-t border-border" style={{ background: 'hsl(222 18% 9%)' }}>
        <div className="max-w-6xl mx-auto px-4 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="font-heading text-4xl font-black uppercase leading-tight mb-6">
              <span className="text-foreground">Rodinná firma</span>
              <br />
              <span className="text-primary">s dlouholetou tradicí</span>
            </h2>
            <p className="text-muted-foreground mb-4">
              Autodopravě do 3,5 tuny se věnujeme přes 20 let a máme bohaté zkušenosti s kurýrními a balíkovými službami. Naši řidiči jsou školení a zkušení profesionálové.
            </p>
            <p className="text-muted-foreground mb-8">
              U nás je vaše zásilka v naprostém bezpečí — ať už potřebujete doručit květinu nebo paletu cihel. Samozřejmostí je pojištění nákladu.
            </p>
            <ul className="space-y-3">
              {[
                'Výhodné ceny a platba na fakturu',
                'Expresní kurýrní služby od 30 minut',
                'GPS lokace a notifikace SMS/email',
                'Platba online, kartou u řidiče nebo převodem',
              ].map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm text-muted-foreground">
                  <svg className="w-5 h-5 text-primary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Widget card */}
          <div className="flex justify-center md:justify-end">
            <div className="w-72 rounded-2xl border border-border bg-card p-6 shadow-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
                  <svg className="w-7 h-7 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                  </svg>
                </div>
                <div>
                  <div className="font-heading font-bold text-foreground">KURÝR4YOU</div>
                  <div className="text-xs text-muted-foreground">Same Day Delivery & Taxi</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <Link
                  to="/registrace"
                  className="flex items-center justify-center gap-1.5 py-3 rounded-lg text-sm font-heading font-bold bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 10V7" />
                  </svg>
                  Kurýr
                </Link>
                <Link
                  to="/registrace"
                  className="flex items-center justify-center gap-1.5 py-3 rounded-lg text-sm font-heading font-bold text-white hover:opacity-90 transition-opacity"
                  style={{ background: 'hsl(217 91% 55%)' }}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                  Taxi
                </Link>
              </div>
              <a
                href="tel:+420725748507"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                +420 725 748 507
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Quick order CTA – bez registrace */}
      <section className="py-16 border-t border-border" style={{ background: 'hsl(222 20% 7%)' }}>
        <div className="max-w-6xl mx-auto px-4">
          <div className="bg-card border border-primary/30 rounded-2xl p-8 md:p-10 flex flex-col md:flex-row items-center gap-8">
            {/* Left: text */}
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-full border border-primary/40 text-xs font-medium text-primary" style={{ background: 'hsl(38 92% 50% / 0.1)' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                BEZ REGISTRACE
              </div>
              <h2 className="font-heading text-3xl md:text-4xl font-black uppercase mb-4 leading-tight">
                Objednejte kurýra<br />
                <span className="text-primary">ihned online</span>
              </h2>
              <p className="text-muted-foreground mb-2">
                Nepotřebujete účet. Vyplňte formulář, AI cena se spočítá automaticky a zaplaťte kartou. Potvrzení přijde na e-mail.
              </p>
              <ul className="space-y-1.5 mb-6">
                {[
                  'Cena spočítána AI podle trasy a zásilky',
                  'Platba kartou přes Stripe – bezpečně',
                  'Potvrzení + sledovací odkaz na e-mail',
                  'Stejná kvalita jako pro registrované zákazníky',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <svg className="w-4 h-4 text-primary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                to="/objednat"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-heading font-bold text-sm bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 10V7" />
                </svg>
                Objednat bez registrace
              </Link>
            </div>
            {/* Right: visual */}
            <div className="flex-shrink-0 hidden md:flex flex-col gap-3 w-60">
              {[
                { step: '1', label: 'Vyplníte adresy a zásilku' },
                { step: '2', label: 'AI spočítá cenu za sekundu' },
                { step: '3', label: 'Zaplatíte kartou online' },
                { step: '4', label: 'Kurýr zásilku vyzvedne' },
              ].map((s) => (
                <div key={s.step} className="flex items-center gap-3 p-3 bg-background rounded-lg border border-border">
                  <span className="w-7 h-7 bg-primary/20 rounded-md flex items-center justify-center text-primary text-xs font-bold font-heading flex-shrink-0">{s.step}</span>
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Login portals */}
      <section className="py-16 border-t border-border">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-6">Přihlášení</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              to="/prihlaseni"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 bg-card transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Portál pro řidiče
            </Link>
            <Link
              to="/prihlaseni"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 bg-card transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 10V7" />
              </svg>
              Zákaznický portál
            </Link>
            <Link
              to="/prihlaseni"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 bg-card transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
              Dispečerský panel
            </Link>
          </div>
        </div>
      </section>

      {/* Fuel Prices Section */}
      <FuelPricesSection />

      {/* Footer */}
      <footer id="kontakt" className="border-t border-border py-12" style={{ background: 'hsl(222 22% 6%)' }}>
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-8">
            {/* Logo + address */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-heading font-bold text-foreground">KURÝR4YOU</div>
                  <div className="text-xs text-muted-foreground">Same Day Delivery & Taxi</div>
                </div>
              </div>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>Gotty s.r.o. · IČO: 21930431</p>
                <p>Podhájská pole 758/15</p>
                <p>Praha 8 – Bohnice, 18100</p>
              </div>
            </div>

            {/* Quick links */}
            <div>
              <h4 className="font-heading font-bold text-foreground text-sm uppercase tracking-wider mb-4">Navigace</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <Link to="/jak-to-funguje" className="flex items-center gap-2 hover:text-foreground transition-colors">
                  <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                  Jak to funguje?
                </Link>
                <Link to="/objednat" className="flex items-center gap-2 hover:text-foreground transition-colors">
                  <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 10V7" /></svg>
                  Objednat kurýra
                </Link>
                <Link to="/prihlaseni" className="flex items-center gap-2 hover:text-foreground transition-colors">
                  <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  Přihlásit se
                </Link>
                <Link to="/registrace" className="flex items-center gap-2 hover:text-foreground transition-colors">
                  <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                  Registrace
                </Link>
              </div>
            </div>

            {/* Contact */}
            <div>
              <h4 className="font-heading font-bold text-foreground text-sm uppercase tracking-wider mb-4">Kontakt</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <a href="tel:+420725748507" className="flex items-center gap-2 hover:text-foreground transition-colors">
                  <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  +420 725 748 507
                </a>
                <a href="mailto:info@kuryr4you.cz" className="flex items-center gap-2 hover:text-foreground transition-colors">
                  <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  info@kuryr4you.cz
                </a>
                <a href="mailto:objednavky@kuryr4you.cz" className="flex items-center gap-2 hover:text-foreground transition-colors">
                  <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  objednavky@kuryr4you.cz
                </a>
              </div>
            </div>

            {/* Work with us */}
            <div>
              <h4 className="font-heading font-bold text-foreground text-sm uppercase tracking-wider mb-4">Pracujte s námi</h4>
              <p className="text-sm text-muted-foreground mb-3">Přijímáme nové řidiče! Napište nám nebo zavolejte.</p>
              <a href="mailto:gottstein@kuryr4you.cz" className="text-sm text-primary hover:underline">
                gottstein@kuryr4you.cz
              </a>
              <div className="flex items-center gap-3 mt-4">
                <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" /></svg>
                </a>
                <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                </a>
                <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.174-.105-.949-.2-2.403.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24.009 12.017 24c6.621 0 11.985-5.367 11.985-11.987C24.002 5.367 18.638.001 12.017.001z" /></svg>
                </a>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-muted-foreground">
            <span>© 2006 Kurýr4You by Gotty s.r.o.</span>
            <div className="flex gap-4">
              <a href="#" className="hover:text-foreground transition-colors">Zásady ochrany soukromí</a>
              <a href="#" className="hover:text-foreground transition-colors">Cookies</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
