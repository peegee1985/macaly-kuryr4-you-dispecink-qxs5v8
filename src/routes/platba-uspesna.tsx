import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'

export const Route = createFileRoute('/platba-uspesna')({
  component: PlatbaUspesnaPage,
})

function PlatbaUspesnaPage() {
  // Get order number from URL search params (hydration-safe)
  const [zakazka, setZakazka] = useState('')
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setZakazka(params.get('zakazka') ?? '')
  }, [])

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Minimal nav */}
      <nav className="border-b border-border" style={{ background: 'hsl(222 20% 8%)' }}>
        <div className="max-w-3xl mx-auto px-4 flex items-center h-14">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-primary rounded-md flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
              </svg>
            </div>
            <span className="text-sm font-heading font-bold text-foreground">KURÝR4YOU</span>
          </Link>
        </div>
      </nav>

      {/* Success content */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full text-center">
          {/* Success icon */}
          <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h1 className="font-heading text-3xl font-black uppercase mb-3">Platba proběhla!</h1>

          {zakazka && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-border mb-4">
              <span className="text-muted-foreground text-sm">Číslo zásilky:</span>
              <span className="font-heading font-bold text-foreground">{zakazka}</span>
            </div>
          )}

          <p className="text-muted-foreground mb-6">
            Vaše zásilka byla přijata. Na e-mail jsme odeslali potvrzení s detaily a sledovacím odkazem.
          </p>

          <div className="bg-card border border-border rounded-xl p-5 text-left space-y-3 mb-8">
            <h3 className="font-heading font-semibold text-sm">Co bude dál?</h3>
            <div className="space-y-2">
              {[
                { icon: '📧', text: 'Obdržíte e-mail s potvrzením a sledovacím odkazem' },
                { icon: '📋', text: 'Náš dispečer přiřadí zásilce vhodného kurýra' },
                { icon: '🚗', text: 'Kurýr zásilku vyzvedne ve sjednaném čase' },
                { icon: '📦', text: 'Po doručení obdržíte potvrzení s fotografií' },
              ].map((step) => (
                <div key={step.text} className="flex items-start gap-3">
                  <span className="text-base leading-none mt-0.5">{step.icon}</span>
                  <p className="text-sm text-muted-foreground">{step.text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <a
              href="tel:+420725748507"
              className="inline-flex items-center justify-center gap-2 py-3 px-6 rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
            >
              <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              Máte otázku? +420 725 748 507
            </a>
            <Link
              to="/"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Zpět na hlavní stránku
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
